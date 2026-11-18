import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const PORT = Number(process.env.PORT || 3000);
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
const METRICS_PORT = process.env.CLOUDFLARED_METRICS_PORT || "20241";
const DISABLED_FLAGS = new Set(["false", "0", "no", "off"]);

function isDisabled(val) {
  return DISABLED_FLAGS.has(String(val ?? "").trim().toLowerCase());
}

const TUNNEL_ENABLED = !isDisabled(process.env.ENABLE_TUNNEL ?? "true");
const ENV_PUBLIC_ORIGIN = String(process.env.PUBLIC_SHARE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
};

const NO_ADS_STYLE = `<style id="local-no-ads">
[data-ad-close],
[data-arrow-ad],
[data-bance-ad],
[data-bance-slot],
[data-fam-ad],
[data-hilltop-ad],
[data-hilltop-slot],
[data-ts-ad],
[data-ts-slot],
[data-top-ads],
[data-top-glass-sites],
[data-myfans-zone],
[data-fanszukan-pick],
[data-koemimi-featured],
[data-koemimi-hero],
[data-koemimi-push],
[data-peek-banner],
[data-peek-fixed],
[data-sundome-next-block],
[data-sundome-next],
[data-sundome-preroll],
[data-sundome-vpn-notice],
[data-x-follow-arm],
[data-zh-follow-line],
[data-zh-suggest],
a[data-zh-script-choice],
div:has(> a[data-zh-script-choice]),
li:has(> a[data-header-tool="voice"]),
a[data-header-tool="voice"],
a[href*="koemimi.com"],
a[href*="chiramin.com"],
a[href*="fanszukan.com"],
a[href*="mfco.link"],
a[href*="bed16.com"],
a[href*="bothsheet.com"],
a[href*="expressvpn.com"],
a[href*="privateinternetaccess.com"],
a[href*="x.com/cunzhi_game"],
aside:has(a[href*="koemimi.com"]),
aside:has(a[href*="x.com/cunzhi_game"]) {
  display: none !important;
}
</style>`;

// ---- Public Origin / Cloudflare Tunnel Poller ----
let detectedTunnelOrigin = null;
let tunnelPollTimer = null;

async function pollTunnelOnce() {
  if (!TUNNEL_ENABLED || ENV_PUBLIC_ORIGIN) return;
  try {
    const res = await fetch(`http://127.0.0.1:${METRICS_PORT}/quicktunnel`, {
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
    // Cloudflared might still be booting or metrics port unavailable locally.
  }
}

function scheduleTunnelPoll(delayMs) {
  if (!TUNNEL_ENABLED || ENV_PUBLIC_ORIGIN) return;
  if (tunnelPollTimer) clearTimeout(tunnelPollTimer);
  tunnelPollTimer = setTimeout(async () => {
    await pollTunnelOnce();
    scheduleTunnelPoll(detectedTunnelOrigin ? 30_000 : 2_000);
  }, delayMs);
  tunnelPollTimer.unref?.();
}

function getPublicOriginInfo() {
  if (ENV_PUBLIC_ORIGIN) {
    return {
      publicOrigin: ENV_PUBLIC_ORIGIN,
      tunnelEnabled: TUNNEL_ENABLED,
      tunnelReady: true,
      source: "env",
    };
  }
  return {
    publicOrigin: detectedTunnelOrigin,
    tunnelEnabled: TUNNEL_ENABLED,
    tunnelReady: Boolean(detectedTunnelOrigin),
    source: detectedTunnelOrigin ? "cloudflared" : "none",
  };
}

if (TUNNEL_ENABLED && !ENV_PUBLIC_ORIGIN) {
  scheduleTunnelPoll(500);
}

// ---- JSON / Body Helpers ----
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({ raw });
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

// ---- Caches for Upstream Proxies ----
const LAB_CACHE_TTL_MS = 5 * 60 * 1000;
const MANIFEST_CACHE_TTL_MS = 60 * 60 * 1000;
const VOICE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_VOICE_CACHE_ENTRIES = 200;

const labCache = new Map();
const manifestCache = new Map();
const voiceCache = new Map();

function sanitizeSundomeLabItem(item) {
  if (!item || typeof item !== "object") return item;
  const copy = { ...item };
  if ("chiramin" in copy) copy.chiramin = "";
  if ("url" in copy) copy.url = "";
  return copy;
}

async function handleSundomeLabProxy(res, pathname, search) {
  const targetUrl = `https://100adults.com${pathname}${search}`;
  const now = Date.now();
  const cached = labCache.get(targetUrl);
  if (cached && now - cached.at < LAB_CACHE_TTL_MS) {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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
      return sendJson(res, upstream.status, {
        ok: false,
        error: `Upstream ${upstream.status}`,
      });
    }
    const raw = await upstream.text();
    let payloadStr = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map(sanitizeSundomeLabItem);
      }
      payloadStr = JSON.stringify(parsed);
    } catch {
      // Keep original text if not JSON
    }
    const body = Buffer.from(payloadStr, "utf8");
    labCache.set(targetUrl, { body, at: now });
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    if (cached) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(cached.body);
      return;
    }
    sendJson(res, 502, { ok: false, error: String(err) });
  }
}

async function handleManifestProxy(res, pathname, search) {
  const targetUrl = `https://100adults.com${pathname}${search}`;
  const now = Date.now();
  const cached = manifestCache.get(targetUrl);
  if (cached && now - cached.at < MANIFEST_CACHE_TTL_MS) {
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Cache-Control": "no-store",
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
    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get("content-type") || "application/json; charset=utf-8";
    if (upstream.ok) {
      manifestCache.set(targetUrl, { body, contentType, at: now });
    }
    res.writeHead(upstream.status, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    sendJson(res, 502, { ok: false, error: String(err) });
  }
}

async function handleVoiceProxy(res, pathname, search) {
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
      signal: AbortSignal.timeout(20_000),
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
      MIME_TYPES[ext] ||
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

// ---- /rws & /api/rgate Remote Control Relay ----
const HEX32_RE = /^[0-9a-f]{32}$/;
const rooms = new Map();

function genHex32() {
  return crypto.randomBytes(16).toString("hex");
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

// Periodic room garbage collection
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
        if (typeof msg.total === "number" && Number.isFinite(msg.total) && msg.total > 0) {
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
        broadcastWatch(room);
      }
    });
    return;
  }

  if (role === "watch") {
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

// ---- API Request Dispatcher ----
async function handleApi(req, res, pathname, url) {
  if (pathname === "/api/rgate/public-url") {
    return sendJson(res, 200, { ok: true, ...getPublicOriginInfo() });
  }

  if (pathname === "/api/rgate/lobby") {
    return sendJson(res, 200, buildLobbyResponse());
  }

  if (pathname.startsWith("/api/rgate/")) {
    const roomId = pathname.slice("/api/rgate/".length);
    if (!HEX32_RE.test(roomId)) {
      return sendJson(res, 404, { error: "not_found" });
    }
    const key = url.searchParams.get("k") || "";
    const sid = url.searchParams.get("sid") || "";
    const room = rooms.get(roomId);
    const gate = getRoomGate(room, "controller", key, sid);
    return sendJson(res, gate.status, gate.body);
  }

  if (pathname.startsWith("/api/sundome-lab/")) {
    return handleSundomeLabProxy(res, pathname, url.search);
  }

  if (pathname === "/api/featured") {
    return sendJson(res, 200, { ok: true, items: [] });
  }

  if (pathname === "/api/manifest") {
    return handleManifestProxy(res, pathname, url.search);
  }

  if (pathname === "/api/story-vote") {
    const votesFile = path.join(DATA_DIR, "story-votes.json");
    const votes = readJson(votesFile, {});
    if (req.method === "POST") {
      const body = await readBody(req);
      const slug = String(body.slug || body.id || "default");
      const choice = String(body.choice || body.vote || "like");
      votes[slug] ??= {};
      votes[slug][choice] = (votes[slug][choice] || 0) + 1;
      writeJson(votesFile, votes);
      return sendJson(res, 200, { ok: true, slug, counts: votes[slug] });
    }
    return sendJson(res, 200, { ok: true, votes });
  }

  if (pathname === "/api/sundome-request") {
    if (req.method === "POST") {
      const body = await readBody(req);
      const reqFile = path.join(DATA_DIR, "sundome-requests.json");
      const list = readJson(reqFile, []);
      list.push({ ...body, createdAt: new Date().toISOString() });
      writeJson(reqFile, list);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "Not found" });
}

function handleRwsHttp(req, res, pathname, url) {
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
      xm: void 0,
      lim: void 0,
      ph: "setup",
      lf: void 0,
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

// ---- Static Resolver & HTML Injection ----
function resolveStaticFile(pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const exact = path.join(PUBLIC_DIR, safePath);
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) {
    return exact;
  }
  const htmlCandidate = path.join(PUBLIC_DIR, safePath + ".html");
  if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
    return htmlCandidate;
  }
  const indexCandidate = path.join(PUBLIC_DIR, safePath, "index.html");
  if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
    return indexCandidate;
  }
  return null;
}

function buildPublicOriginScript() {
  const info = getPublicOriginInfo();
  const initialJson = JSON.stringify(info.publicOrigin ?? null);
  const enabledLiteral = info.tunnelEnabled ? "true" : "false";
  return `<script id="open100-public-origin">(function(){window.__OPEN100_PUBLIC_ORIGIN__=${initialJson};var enabled=${enabledLiteral};if(!window.__OPEN100_PUBLIC_ORIGIN__&&enabled){var poll=function(){fetch("/api/rgate/public-url",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d&&d.publicOrigin){window.__OPEN100_PUBLIC_ORIGIN__=d.publicOrigin}else if(d&&d.tunnelEnabled){setTimeout(poll,2000)}}).catch(function(){setTimeout(poll,3000)})};setTimeout(poll,1000)}})();</script>`;
}

const server = http.createServer(async (req, res) => {
  const reqHost = req.headers.host || `127.0.0.1:${PORT}`;
  const url = new URL(req.url || "/", `http://${reqHost}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (pathname === "/") {
    const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
    const target = acceptLang.includes("zh") ? "/zh" : "/en";
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/rws/")) {
      const cleanPath = url.pathname.replace(/\/+$/, "") || "/";
      res.writeHead(302, { Location: `${cleanPath}${url.search}` });
      res.end();
      return;
    }
    pathname = pathname.slice(0, -1);
  }

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname, url);
    return;
  }

  if (pathname === "/rws" || pathname.startsWith("/rws/")) {
    handleRwsHttp(req, res, pathname, url);
    return;
  }

  const filePath = resolveStaticFile(pathname);
  if (!filePath) {
    if (
      pathname.startsWith("/voice/") ||
      pathname.startsWith("/story-voice/")
    ) {
      await handleVoiceProxy(res, pathname, url.search);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`404 Not Found: ${pathname}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  if (ext === ".html") {
    let html = fs.readFileSync(filePath, "utf8");
    const injection = `${NO_ADS_STYLE}${buildPublicOriginScript()}`;
    html = html.replace("</head>", `${injection}</head>`);
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache",
    });
    res.end(html);
    return;
  }

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.on("upgrade", (req, socket, head) => {
  const reqHost = req.headers.host || `127.0.0.1:${PORT}`;
  let url;
  try {
    url = new URL(req.url || "/", `http://${reqHost}`);
  } catch {
    socket.destroy();
    return;
  }

  const match = url.pathname.match(/^\/rws\/([0-9a-f]{32})$/);
  if (!match) {
    socket.destroy();
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

server.listen(PORT, HOSTNAME, () => {
  console.log(`Open100Adults server running at http://${HOSTNAME}:${PORT}/zh`);
});
