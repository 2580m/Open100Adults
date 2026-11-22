import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev =
  process.argv.includes("--dev") || process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const metricsPort = process.env.CLOUDFLARED_METRICS_PORT || "20241";
const DISABLED_FLAGS = new Set(["false", "0", "no", "off"]);

function isDisabled(val) {
  return DISABLED_FLAGS.has(String(val ?? "").trim().toLowerCase());
}

const tunnelEnabled = !isDisabled(process.env.ENABLE_TUNNEL ?? "true");
const envPublicOrigin = String(process.env.PUBLIC_SHARE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

// ---- Cloudflare Quick Tunnel Public Origin Poller ----
let detectedTunnelOrigin = null;
let tunnelPollTimer = null;

async function pollTunnelOnce() {
  if (!tunnelEnabled || envPublicOrigin) return;
  try {
    const res = await fetch(`http://127.0.0.1:${metricsPort}/quicktunnel`, {
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.hostname === "string" && data.hostname.trim()) {
        const clean = data.hostname
          .trim()
          .replace(/^https?:\/\//i, "")
          .replace(/\/+$/, "");
        if (clean) {
          detectedTunnelOrigin = `https://${clean}`;
        }
      }
    }
  } catch {
    // Tunnel may still be initializing or disabled locally.
  }
}

function scheduleTunnelPoll(delayMs) {
  if (!tunnelEnabled || envPublicOrigin) return;
  if (tunnelPollTimer) clearTimeout(tunnelPollTimer);
  tunnelPollTimer = setTimeout(async () => {
    await pollTunnelOnce();
    scheduleTunnelPoll(detectedTunnelOrigin ? 30_000 : 2_000);
  }, delayMs);
  tunnelPollTimer.unref?.();
}

function getPublicOriginInfo() {
  if (envPublicOrigin) {
    return {
      publicOrigin: envPublicOrigin,
      origin: envPublicOrigin,
      tunnelEnabled,
      tunnelReady: true,
      source: "env",
    };
  }
  return {
    publicOrigin: detectedTunnelOrigin,
    origin: detectedTunnelOrigin,
    tunnelEnabled,
    tunnelReady: Boolean(detectedTunnelOrigin),
    source: detectedTunnelOrigin ? "tunnel" : "none",
  };
}

if (tunnelEnabled && !envPublicOrigin) {
  scheduleTunnelPoll(500);
}

// ---- Caching Proxy for /voice/* & /story-voice/* ----
const VOICE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_VOICE_CACHE_ENTRIES = 200;
const voiceCache = new Map();
const PUBLIC_DIR = path.join(__dirname, "public");

const AUDIO_MIME = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".json": "application/json; charset=utf-8",
};

async function handleVoiceRequest(res, pathname, search) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const localPath = path.join(PUBLIC_DIR, safePath);
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    const ext = path.extname(localPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": AUDIO_MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    });
    fs.createReadStream(localPath).pipe(res);
    return;
  }

  const targetUrl = `https://100adults.com${pathname}${search}`;
  const now = Date.now();
  const cached = voiceCache.get(targetUrl);
  if (cached && now - cached.at < VOICE_CACHE_TTL_MS) {
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(cached.body);
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      res.writeHead(upstream.status, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(`Upstream ${upstream.status}`);
      return;
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    const ext = path.extname(pathname).toLowerCase();
    const contentType =
      upstream.headers.get("content-type") ||
      AUDIO_MIME[ext] ||
      "application/octet-stream";
    if (voiceCache.size >= MAX_VOICE_CACHE_ENTRIES) {
      const oldestKey = voiceCache.keys().next().value;
      if (oldestKey) voiceCache.delete(oldestKey);
    }
    voiceCache.set(targetUrl, { body, contentType, at: now });
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Voice proxy error: ${String(err)}`);
  }
}

// ---- /rws & /api/rgate Real-Time Relay ----
const HEX32_RE = /^[0-9a-f]{32}$/;
const rooms = new Map();

function genHex32() {
  return crypto.randomBytes(16).toString("hex");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function sendWs(ws, obj) {
  if (!ws || ws.readyState !== 1) return false;
  try {
    ws.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

function safeCloseWs(ws, code, reason) {
  if (!ws) return;
  try {
    if (ws.readyState === 0 || ws.readyState === 1) {
      ws.close(code, reason);
    }
  } catch {
    try {
      ws.terminate();
    } catch {}
  }
}

function promoteQueue(room) {
  if (room.ended) return;
  if (room.controllerWs && room.controllerWs.readyState === 1) return;
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  room.queue = room.queue.filter((x) => x.readyState === 1);
  const nextWs = room.queue.shift();
  if (!nextWs) {
    room.turnSid = "";
    room.turnUntil = 0;
    broadcastWatch(room);
    return;
  }
  const TURN_MS = 15000;
  room.turnSid = nextWs._sid || "";
  room.turnUntil = Date.now() + TURN_MS;
  sendWs(nextWs, { t: "turn", ms: TURN_MS });
  broadcastWatch(room);
  room.turnTimer = setTimeout(() => {
    room.turnTimer = null;
    if (
      !room.ended &&
      (!room.controllerWs || room.controllerWs.readyState !== 1) &&
      room.turnSid === (nextWs._sid || "")
    ) {
      sendWs(nextWs, { t: "missed" });
      room.turnSid = "";
      room.turnUntil = 0;
      promoteQueue(room);
    }
  }, TURN_MS);
  room.turnTimer.unref?.();
}

function broadcastWatch(room) {
  const n = room.watchers.size;
  const of = room.queue.length;
  const ctl = Boolean(room.controllerWs && room.controllerWs.readyState === 1);
  const pl = Boolean(room.playerWs && room.playerWs.readyState === 1);
  const basePayload = { t: "watch", n, of, ctl, pl };
  sendWs(room.playerWs, basePayload);
  sendWs(room.controllerWs, basePayload);
  for (const w of room.watchers) {
    const idx = room.queue.indexOf(w);
    const payload = idx >= 0 ? { ...basePayload, pos: idx + 1 } : basePayload;
    sendWs(w, payload);
  }
}

function toLobbyEntry(room) {
  const entry = {
    room: room.room,
    key: room.controller,
    lang: room.lang || "en",
    body: room.body || "male",
    at: room.createdAt,
    mins: room.mins || 10,
    diff: room.diff || "normal",
    wish: Array.isArray(room.wish) ? room.wish : [],
    ph: room.ph || "setup",
  };
  if (typeof room.xm === "number") entry.xm = room.xm;
  if (room.lim && typeof room.lim === "object") entry.lim = room.lim;
  if (room.ph === "play" && typeof room.lf === "number") entry.lf = room.lf;
  return entry;
}

function buildLobbyResponse() {
  const seeking = [];
  const watchable = [];
  const by = {};

  for (const room of rooms.values()) {
    if (!room.open || !room.listed || room.ended || room.away) continue;
    const playerOnline = Boolean(
      room.playerWs && room.playerWs.readyState === 1,
    );
    if (!playerOnline) continue;

    const controllerOnline = Boolean(
      room.controllerWs && room.controllerWs.readyState === 1,
    );
    const entry = toLobbyEntry(room);

    if (!controllerOnline) {
      seeking.push(entry);
      const l = entry.lang || "en";
      by[l] = (by[l] || 0) + 1;
    } else if (watchable.length < 20) {
      watchable.push(entry);
    }
  }

  return {
    ag: 0,
    n: seeking.length,
    by,
    rooms: seeking,
    watch: watchable,
  };
}

function getRoomGate(room, role, key, sid = "") {
  if (!room) return { status: 404, body: { error: "not_found" } };
  const validKey =
    role === "player" ? key === room.player : key === room.controller;
  if (!validKey) return { status: 403, body: { error: "forbidden" } };
  if (role === "watch" && !room.open) {
    return { status: 403, body: { error: "forbidden" } };
  }

  if (room.ended) {
    return { status: 200, body: { s: "ended", w: 0, q: 0 } };
  }

  if (role !== "player" && role !== "watch") {
    const controllerActive = Boolean(
      room.controllerWs && room.controllerWs.readyState === 1,
    );
    if (controllerActive && (!sid || sid !== room.controllerSid)) {
      return {
        status: 200,
        body: { s: "busy", w: room.open ? 1 : 0, q: room.queue.length },
      };
    }
    if (room.away) {
      return { status: 200, body: { s: "away", w: 0, q: 0 } };
    }
  }

  return {
    status: 200,
    body: { s: "open", w: room.open ? 1 : 0, q: room.queue.length },
  };
}

function endRoom(room) {
  if (room.ended) return;
  room.ended = true;
  room.listed = false;
  room.endedAt = Date.now();
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  sendWs(room.playerWs, { t: "end" });
  sendWs(room.controllerWs, { t: "end" });
  for (const w of room.watchers) {
    sendWs(w, { t: "end" });
    safeCloseWs(w, 4000, "ended");
  }
  safeCloseWs(room.playerWs, 4000, "ended");
  safeCloseWs(room.controllerWs, 4000, "ended");
  room.watchers.clear();
  room.queue = [];
}

const gcTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    const hasSockets =
      (room.playerWs && room.playerWs.readyState === 1) ||
      (room.controllerWs && room.controllerWs.readyState === 1) ||
      room.watchers.size > 0;
    if (room.ended && now - (room.endedAt || room.updatedAt) > 10 * 60 * 1000) {
      rooms.delete(id);
    } else if (!hasSockets && now - room.updatedAt > 2 * 60 * 60 * 1000) {
      rooms.delete(id);
    }
  }
}, 60_000);
gcTimer.unref?.();

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, _req, ctx) => {
  const { room, role, sid, params } = ctx;
  room.updatedAt = Date.now();

  if (role === "player") {
    if (room.playerWs && room.playerWs !== ws) {
      safeCloseWs(room.playerWs, 4000, "replaced");
    }
    room.playerWs = ws;
    room.away = false;
    room.lastHere = Date.now();

    const listParam = params.get("list");
    if (listParam === "1" && room.open) room.listed = true;
    else if (listParam === "0") room.listed = false;

    const langParam = params.get("lang");
    if (langParam) room.lang = langParam.slice(0, 8);
    const bodyParam = params.get("body");
    if (bodyParam) room.body = bodyParam.slice(0, 8);

    const peerOnline = Boolean(
      room.controllerWs && room.controllerWs.readyState === 1,
    );
    sendWs(ws, {
      t: "hello",
      role: "player",
      peer: peerOnline,
      open: room.open,
    });
    sendWs(room.controllerWs, { t: "peer", online: true });
    broadcastWatch(room);

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      room.updatedAt = Date.now();

      if (msg.t === "ping") {
        sendWs(ws, { t: "pong" });
        return;
      }
      if (msg.t === "unlisted") {
        room.listed = false;
        return;
      }
      if (msg.t === "lobby") {
        if (room.open && !room.ended) room.listed = true;
        return;
      }
      if (msg.t === "end") {
        endRoom(room);
        return;
      }
      if (msg.t === "state") {
        room.lastState = msg;
        if (msg.phase === "setup" || msg.phase === "play") {
          room.ph = msg.phase;
        }
        if (typeof msg.left === "number" && Number.isFinite(msg.left)) {
          room.lf = Math.max(0, Math.round(msg.left / 1000));
        }
        if (
          typeof msg.total === "number" &&
          Number.isFinite(msg.total) &&
          msg.total > 0
        ) {
          room.mins = Math.max(1, Math.min(180, Math.round(msg.total / 60000)));
        }
        if (typeof msg.body === "string" && msg.body) {
          room.body = msg.body.slice(0, 8);
        }
        if (typeof msg.lang === "string" && msg.lang) {
          room.lang = msg.lang.slice(0, 8);
        }
        if (typeof msg.mode === "string" && msg.mode) {
          room.diff = msg.mode.slice(0, 8);
        }
        if (Array.isArray(msg.wish)) {
          room.wish = msg.wish;
        }
        if (typeof msg.xm === "number") {
          room.xm = msg.xm;
        }
        if (msg.lim && typeof msg.lim === "object") {
          room.lim = msg.lim;
        }
        sendWs(room.controllerWs, msg);
        for (const w of room.watchers) sendWs(w, msg);
        return;
      }

      sendWs(room.controllerWs, msg);
      if (
        msg.t === "signal" ||
        msg.t === "thx" ||
        msg.t === "line" ||
        msg.t === "hi"
      ) {
        for (const w of room.watchers) sendWs(w, msg);
      }
    });

    ws.on("close", () => {
      if (room.playerWs === ws) {
        room.playerWs = null;
        room.updatedAt = Date.now();
        sendWs(room.controllerWs, { t: "peer", online: false });
        broadcastWatch(room);
      }
    });
    return;
  }

  if (role === "controller") {
    const activeController = Boolean(
      room.controllerWs &&
        room.controllerWs !== ws &&
        room.controllerWs.readyState === 1,
    );
    if (activeController) {
      if (sid && sid === room.controllerSid) {
        safeCloseWs(room.controllerWs, 4000, "replaced");
      } else {
        safeCloseWs(ws, 4000, room.open ? "full" : "busy");
        return;
      }
    }

    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
    room.turnSid = "";
    room.turnUntil = 0;
    room.controllerWs = ws;
    room.controllerSid = sid || "";
    const peerOnline = Boolean(room.playerWs && room.playerWs.readyState === 1);

    sendWs(ws, {
      t: "hello",
      role: "controller",
      peer: peerOnline,
      open: room.open,
    });
    if (room.lastState) {
      sendWs(ws, room.lastState);
    }
    sendWs(room.playerWs, { t: "peer", online: true });
    broadcastWatch(room);

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      room.updatedAt = Date.now();

      if (msg.t === "ping") {
        sendWs(ws, { t: "pong" });
        return;
      }
      if (msg.t === "end") {
        endRoom(room);
        return;
      }

      sendWs(room.playerWs, msg);
      for (const w of room.watchers) sendWs(w, msg);
    });

    ws.on("close", () => {
      if (room.controllerWs === ws) {
        room.controllerWs = null;
        room.controllerSid = "";
        room.updatedAt = Date.now();
        sendWs(room.playerWs, { t: "peer", online: false });
        promoteQueue(room);
      }
    });
    return;
  }

  if (role === "watch") {
    ws._sid = sid || "";
    room.watchers.add(ws);
    const peerOnline = Boolean(room.playerWs && room.playerWs.readyState === 1);
    sendWs(ws, { t: "hello", role: "watch", peer: peerOnline, open: true });
    if (room.lastState) {
      sendWs(ws, room.lastState);
    }
    broadcastWatch(room);

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      room.updatedAt = Date.now();

      if (msg.t === "ping") {
        sendWs(ws, { t: "pong" });
        return;
      }
      if (msg.t === "queue") {
        if (msg.on) {
          if (!room.queue.includes(ws)) room.queue.push(ws);
        } else {
          room.queue = room.queue.filter((x) => x !== ws);
        }
        broadcastWatch(room);
        return;
      }
      if (msg.t === "hi") {
        sendWs(room.playerWs, msg);
        sendWs(room.controllerWs, msg);
      }
    });

    ws.on("close", () => {
      room.watchers.delete(ws);
      room.queue = room.queue.filter((x) => x !== ws);
      broadcastWatch(room);
    });
  }
});

function handleRwsHttp(res, pathname, url) {
  if (pathname === "/rws/new") {
    const open = url.searchParams.get("open") === "1";
    const roomId = genHex32();
    const playerKey = genHex32();
    const controllerKey = genHex32();
    const now = Date.now();
    rooms.set(roomId, {
      room: roomId,
      player: playerKey,
      controller: controllerKey,
      open,
      listed: open,
      ended: false,
      away: false,
      createdAt: now,
      updatedAt: now,
      lastHere: now,
      lang: "en",
      body: "male",
      mins: 10,
      diff: "normal",
      wish: [],
      xm: undefined,
      lim: undefined,
      ph: "setup",
      lf: undefined,
      lastState: null,
      playerWs: null,
      controllerWs: null,
      controllerSid: "",
      watchers: new Set(),
      queue: [],
    });
    return sendJson(res, 200, {
      room: roomId,
      player: playerKey,
      controller: controllerKey,
      open,
    });
  }

  if (pathname === "/rws/lobby") {
    return sendJson(res, 200, buildLobbyResponse());
  }

  const hereMatch = pathname.match(/^\/rws\/([0-9a-f]{32})\/here$/);
  if (hereMatch) {
    const room = rooms.get(hereMatch[1]);
    if (!room) return sendJson(res, 404, { error: "not_found" });
    const key = url.searchParams.get("key") || "";
    if (key !== room.player) return sendJson(res, 403, { error: "forbidden" });
    room.lastHere = Date.now();
    room.updatedAt = Date.now();
    const ph = url.searchParams.get("ph");
    if (ph === "setup" || ph === "play") room.ph = ph;
    const leftRaw = url.searchParams.get("left");
    if (leftRaw !== null) {
      const n = Number(leftRaw);
      if (Number.isFinite(n) && n >= 0) room.lf = Math.round(n);
    }
    room.away = url.searchParams.get("away") === "1";
    return sendJson(res, 200, { l: room.listed && !room.ended ? 1 : 0 });
  }

  const roomMatch = pathname.match(/^\/rws\/([0-9a-f]{32})$/);
  if (roomMatch) {
    const room = rooms.get(roomMatch[1]);
    const role = url.searchParams.get("role") || "controller";
    const key = url.searchParams.get("key") || "";
    const sid = url.searchParams.get("sid") || "";
    const gate = getRoomGate(room, role, key, sid);
    return sendJson(res, gate.status, gate.body);
  }

  return sendJson(res, 404, { error: "not_found" });
}

// ---- DG-LAB Socket Control V3 Relay (/dglab-ws) ----
const dglabClients = new Map();
const dglabRelations = new Map(); // controllerClientId -> appTargetId

function findDglabRelation(id) {
  for (const [cId, tId] of dglabRelations.entries()) {
    if (cId === id || tId === id) return [cId, tId];
  }
  return null;
}

const dglabWss = new WebSocketServer({ noServer: true });

dglabWss.on("connection", (ws, _req, routeTargetId) => {
  const connId = crypto.randomUUID();
  ws._dglabId = connId;
  ws._dglabRouteTarget = routeTargetId || "";
  dglabClients.set(connId, ws);

  sendWs(ws, {
    type: "bind",
    clientId: connId,
    targetId: "",
    message: "targetId",
  });

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(String(raw));
    } catch {
      sendWs(ws, { type: "error", clientId: "", targetId: "", message: "403" });
      return;
    }
    if (!data || typeof data !== "object") {
      sendWs(ws, { type: "error", clientId: "", targetId: "", message: "403" });
      return;
    }

    const type = String(data.type || "");
    const cId = String(data.clientId || ws._dglabRouteTarget || "");
    const tId = String(data.targetId || (cId && cId !== connId ? connId : ""));

    if (type === "heartbeat") {
      const rel = findDglabRelation(connId);
      const partnerId = rel ? (rel[0] === connId ? rel[1] : rel[0]) : "";
      sendWs(ws, {
        type: "heartbeat",
        clientId: connId,
        targetId: partnerId,
        message: "200",
      });
      return;
    }

    if (type === "bind") {
      if (data.message !== "DGLAB") {
        sendWs(ws, {
          type: "bind",
          clientId: cId,
          targetId: tId,
          message: "403",
        });
        return;
      }
      if (!cId || !tId || !dglabClients.has(cId) || !dglabClients.has(tId)) {
        sendWs(ws, {
          type: "bind",
          clientId: cId,
          targetId: tId,
          message: "401",
        });
        return;
      }
      if (findDglabRelation(cId) || findDglabRelation(tId)) {
        sendWs(ws, {
          type: "bind",
          clientId: cId,
          targetId: tId,
          message: "400",
        });
        return;
      }
      dglabRelations.set(cId, tId);
      const okPayload = {
        type: "bind",
        clientId: cId,
        targetId: tId,
        message: "200",
      };
      sendWs(dglabClients.get(cId), okPayload);
      sendWs(dglabClients.get(tId), okPayload);
      return;
    }

    if (type === "msg" || type === "cmd" || type === "clientMsg") {
      if (!cId || !tId || dglabRelations.get(cId) !== tId) {
        sendWs(ws, {
          type: "msg",
          clientId: cId,
          targetId: tId,
          message: "402",
        });
        return;
      }
      const cWs = dglabClients.get(cId);
      const tWs = dglabClients.get(tId);
      const peer = ws === cWs ? tWs : cWs;
      if (!peer || peer.readyState !== 1) {
        sendWs(ws, {
          type: "msg",
          clientId: cId,
          targetId: tId,
          message: "404",
        });
        return;
      }
      sendWs(peer, {
        type: "msg",
        clientId: cId,
        targetId: tId,
        message: String(data.message ?? ""),
      });
      return;
    }

    sendWs(ws, { type: "error", clientId: cId, targetId: tId, message: "403" });
  });

  const cleanup = () => {
    dglabClients.delete(connId);
    const rel = findDglabRelation(connId);
    if (rel) {
      const [cId, tId] = rel;
      dglabRelations.delete(cId);
      const partnerId = cId === connId ? tId : cId;
      sendWs(dglabClients.get(partnerId), {
        type: "break",
        clientId: cId,
        targetId: tId,
        message: "209",
      });
    }
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
});

const dglabHeartbeatTimer = setInterval(() => {
  for (const [id, ws] of dglabClients.entries()) {
    if (ws.readyState !== 1) continue;
    const rel = findDglabRelation(id);
    const partnerId = rel ? (rel[0] === id ? rel[1] : rel[0]) : "";
    sendWs(ws, {
      type: "heartbeat",
      clientId: id,
      targetId: partnerId,
      message: "200",
    });
  }
}, 30_000);
dglabHeartbeatTimer.unref?.();

// ---- Boot Next.js App + HTTP/WS Server ----
const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

await app.prepare();
const nextUpgradeHandler =
  typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : null;

const server = http.createServer(async (req, res) => {
  const reqHost = req.headers.host || `127.0.0.1:${port}`;
  let url;
  try {
    url = new URL(req.url || "/", `http://${reqHost}`);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  const pathname = url.pathname;

  if (pathname === "/") {
    const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
    const target = acceptLang.includes("zh") ? "/zh" : "/en";
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  if (pathname === "/api/rgate/public-url") {
    return sendJson(res, 200, { ok: true, ...getPublicOriginInfo() });
  }

  if (pathname === "/api/dglab/info") {
    return sendJson(res, 200, {
      ok: true,
      wsPath: "/dglab-ws",
      activeClients: dglabClients.size,
      activePairs: dglabRelations.size,
      ...getPublicOriginInfo(),
    });
  }

  if (pathname === "/api/rgate/lobby") {
    return sendJson(res, 200, buildLobbyResponse());
  }

  const rgateRoomMatch = pathname.match(/^\/api\/rgate\/([0-9a-f]{32})$/);
  if (rgateRoomMatch) {
    const room = rooms.get(rgateRoomMatch[1]);
    const key = url.searchParams.get("k") || "";
    const sid = url.searchParams.get("sid") || "";
    const gate = getRoomGate(room, "controller", key, sid);
    return sendJson(res, gate.status, gate.body);
  }

  if (pathname === "/rws" || pathname.startsWith("/rws/")) {
    handleRwsHttp(res, pathname, url);
    return;
  }

  if (pathname.startsWith("/voice/") || pathname.startsWith("/story-voice/")) {
    await handleVoiceRequest(res, pathname, url.search);
    return;
  }

  await handle(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const reqHost = req.headers.host || `127.0.0.1:${port}`;
  let url;
  try {
    url = new URL(req.url || "/", `http://${reqHost}`);
  } catch {
    socket.destroy();
    return;
  }

  const dglabMatch = url.pathname.match(/^\/dglab-ws(?:\/([A-Za-z0-9_-]+))?$/);
  if (dglabMatch) {
    dglabWss.handleUpgrade(req, socket, head, (ws) => {
      dglabWss.emit("connection", ws, req, dglabMatch[1] || "");
    });
    return;
  }

  const match = url.pathname.match(/^\/rws\/([0-9a-f]{32})$/);
  if (!match) {
    if (nextUpgradeHandler) {
      void nextUpgradeHandler(req, socket, head);
    } else {
      socket.destroy();
    }
    return;
  }

  const room = rooms.get(match[1]);
  const role = url.searchParams.get("role") || "controller";
  const key = url.searchParams.get("key") || "";
  const sid = url.searchParams.get("sid") || "";

  if (!["player", "controller", "watch"].includes(role)) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!room) {
      safeCloseWs(ws, 4000, "forbidden");
      return;
    }
    const validKey =
      role === "player" ? key === room.player : key === room.controller;
    if (!validKey || (role === "watch" && !room.open)) {
      safeCloseWs(ws, 4000, "forbidden");
      return;
    }
    if (room.ended) {
      safeCloseWs(ws, 4000, "ended");
      return;
    }
    wss.emit("connection", ws, req, {
      room,
      role,
      sid,
      params: url.searchParams,
    });
  });
});

server.listen(port, hostname, () => {
  console.log(
    `Open100Adults Next.js + /rws server listening at http://${hostname}:${port}/zh (dev=${dev})`,
  );
});
