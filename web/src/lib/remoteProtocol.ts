"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  REMOTE_CONSTANTS,
  REMOTE_V2,
} from "@/data/remoteFullCopy";
import { localePath, type Locale, type VariantKey } from "@/data/tools";

export type BodyKind = "male" | "female" | "gay" | "lesbian";
export type BodyPart =
  | "shaft"
  | "glans"
  | "balls"
  | "nipple"
  | "clit"
  | "inside"
  | "anal";
export type Grip5 = "feather" | "soft" | "normal" | "hard" | "harder";
export type GripWire = "none" | "soft" | "hard";
export type GripWireX = "feather" | "harder";
export type DriveLevelKey = "stop" | "vslow" | "slow" | "mid" | "fast" | "vfast";
export type RemoteWishKey = (typeof REMOTE_CONSTANTS.REMOTE_WISHES)[number];
export type CtlLayout = "disc" | "slider";

export interface RemoteLimits {
  ap?: BodyPart[];
  nh?: boolean;
  gm?: "normal" | "hard";
  sm?: "mid" | "fast" | "vfast";
  nn?: boolean;
}

export interface RoomCredentials {
  room: string;
  player: string;
  controller: string;
  open: boolean;
}

export interface LobbyEntry {
  room: string;
  key: string;
  lang: string;
  body: string;
  at: number;
  mins: number;
  diff: string;
  wish: RemoteWishKey[];
  xm?: number;
  lim?: RemoteLimits;
  ph?: "setup" | "play";
  lf?: number;
}

export interface LobbySnapshot {
  rooms: LobbyEntry[];
  watch: LobbyEntry[];
  n: number;
  by: Record<string, number>;
  ageSec: number;
  fetchedAt: number;
}

export type RemoteRole = "player" | "controller" | "watch";

export type RemoteStatus =
  | "connecting"
  | "open"
  | "closed"
  | "busy"
  | "away"
  | "ended"
  | "replaced"
  | "next"
  | "forbidden";

export type RemoteMessage =
  | {
      t: "state";
      phase: "setup" | "play" | "reward" | "done";
      auto?: number;
      ack?: number;
      hid?: boolean;
      text?: string;
      mode?: string;
      left?: number;
      total?: number;
      edges?: number;
      count?: number;
      body?: string;
      lang?: string;
      outcome?: string;
      paused?: boolean;
      bpm?: number;
      setBpm?: number;
      part?: BodyPart;
      grip?: GripWire;
      gx?: GripWireX;
      il?: number;
      first?: boolean;
      at?: number;
      xm?: number;
      xu?: number;
      lim?: RemoteLimits;
      level?: number;
      v?: number;
      drive?: "stop" | number;
      tl?: number;
      edge?: boolean;
      cool?: boolean;
      wish?: RemoteWishKey[];
    }
  | { t: "drive"; k: "auto" | "stop" | number }
  | { t: "cmd"; k: "fast" | "slow" | "stop" | "go" }
  | { t: "verdict"; k: "allow" | "deny" }
  | { t: "penalty"; k: "extend" | "restart" }
  | { t: "signal"; k: string }
  | { t: "level"; k: number }
  | { t: "bpm"; k: number }
  | { t: "part"; k: BodyPart | "none" }
  | { t: "grip"; k: GripWire; x?: GripWireX }
  | { t: "now" }
  | { t: "watch"; n: number; of: number; pos?: number; ctl?: boolean; pl?: boolean; turn?: number }
  | { t: "turn"; ms: number }
  | { t: "missed" }
  | { t: "thx"; k: "thanks" | "fun" | "again" }
  | { t: "say"; text: string }
  | { t: "line"; k: number }
  | { t: "hi"; n: number }
  | { t: "queue"; on: boolean }
  | { t: "unlisted" }
  | { t: "lobby" }
  | { t: "end" }
  | { t: "hello"; role: RemoteRole; peer: boolean; open: boolean }
  | { t: "peer"; online: boolean }
  | { t: "ping" }
  | { t: "pong" };

export const HEX32_RE = /^[0-9a-f]{32}$/;

export const ALL_BODY_PARTS: BodyPart[] = [
  "shaft",
  "glans",
  "balls",
  "nipple",
  "clit",
  "inside",
  "anal",
];

export const HARSH_CATS = new Set([2, 5, 6, 8, 10]);

export const SPEED_CAP_BPM: Record<"mid" | "fast" | "vfast" | "vmax", number> = {
  mid: 119,
  fast: 159,
  vfast: 180,
  vmax: 300,
};

export function variantToBody(variant?: VariantKey): BodyKind {
  if (variant === "women") return "female";
  if (variant === "gay") return "gay";
  if (variant === "lesbian") return "lesbian";
  return "male";
}

export function cleanWishes(raw: unknown): RemoteWishKey[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>(REMOTE_CONSTANTS.REMOTE_WISHES);
  const out: RemoteWishKey[] = [];
  for (const item of raw) {
    if (
      typeof item === "string" &&
      valid.has(item) &&
      !out.includes(item as RemoteWishKey)
    ) {
      out.push(item as RemoteWishKey);
      if (out.length >= REMOTE_CONSTANTS.REMOTE_WISH_MAX) break;
    }
  }
  return out;
}

export function cleanLimits(raw: unknown): RemoteLimits {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: RemoteLimits = {};
  if (Array.isArray(obj.ap)) {
    const ap = ALL_BODY_PARTS.filter((p) => obj.ap && Array.isArray(obj.ap) && obj.ap.includes(p));
    if (ap.length) out.ap = ap;
  }
  if (obj.nh === true || obj.nh === 1) out.nh = true;
  if (obj.gm === "normal" || obj.gm === "hard") out.gm = obj.gm;
  if (obj.sm === "mid" || obj.sm === "fast" || obj.sm === "vfast") {
    out.sm = obj.sm;
  }
  if (obj.nn === true || obj.nn === 1) out.nn = true;
  return out;
}

export function allowedParts(parts: BodyPart[], lim?: RemoteLimits): BodyPart[] {
  if (!lim?.ap?.length) return parts;
  const filtered = parts.filter((p) => p === "anal" || lim.ap!.includes(p));
  return filtered.some((p) => p !== "anal") ? filtered : parts;
}

export function capBpm(bpm: number, lim?: RemoteLimits): number {
  return lim?.sm ? Math.min(bpm, SPEED_CAP_BPM[lim.sm]) : bpm;
}

export function gripAllowed(grip: Grip5, lim?: RemoteLimits): boolean {
  if (!lim?.gm) return true;
  const order = REMOTE_CONSTANTS.GRIP5 as readonly string[];
  return order.indexOf(grip) <= order.indexOf(lim.gm);
}

export function grip5Of(wire?: GripWire, gx?: GripWireX): Grip5 {
  if (gx) return gx;
  return wire === "soft" ? "soft" : wire === "hard" ? "hard" : "normal";
}

export function gripWire(grip: Grip5): { k: GripWire; x?: GripWireX } {
  if (grip === "normal") return { k: "none" };
  if (grip === "feather") return { k: "soft", x: "feather" };
  if (grip === "harder") return { k: "hard", x: "harder" };
  return { k: grip };
}

export function clampRemoteBpm(bpm: number): number {
  return Math.min(
    REMOTE_CONSTANTS.REMOTE_BPM_MAX,
    Math.max(20, 10 * Math.round(bpm / 10)),
  );
}

export function remotePartsOf(body: string, extra?: string[]): BodyPart[] {
  const base: BodyPart[] =
    body === "female" || body === "lesbian"
      ? ["clit", "inside", "nipple"]
      : ["shaft", "glans", "balls", "nipple"];
  return extra?.includes("anal") ? [...base, "anal"] : base;
}

export function plainLine(line: string): string {
  return line.replace(/\|/g, "");
}

export function reactCatsOf(body: string): string[][] {
  const isFemale = body === "female" || body === "lesbian";
  return [
    ["good", "more", "wow", "shiver", "voice", "shake", "shy", "love"],
    ["faster", "slower", "keep", "halt", "harder", "ease", "tease", "rest"],
    isFemale
      ? ["spot", "here", "p_clit", "p_inside", "p_nipple", "p_deep", "p_all", "p_entrance"]
      : ["spot", "here", "p_shaft", "p_glans", "p_balls", "p_nipple", "p_all", "p_tip"],
    ["limit", "held", "beg", "wait", "done", "again", "praise", "scold"],
    ["askext", "harsh", "sorry", "mercy", "tears", "thanks", "please", "stillwant"],
    ["close", "happy", isFemale ? "wet" : "hardon", "cant", "dunno", "yours", "chain", "bully"],
  ];
}

export function parseControllerHash(
  hash: string,
): { room: string; key: string; open: boolean; player?: string } | null {
  const raw = hash.replace(/^#(?:c\.)?/, "");
  const parts = raw.split(".");
  if (parts.length < 2) return null;
  const [room, key, third] = parts;
  if (!HEX32_RE.test(room) || !HEX32_RE.test(key)) return null;
  return {
    room,
    key,
    open: third === "o",
    player: third && HEX32_RE.test(third) ? third : undefined,
  };
}

export function parseJoinHash(hash: string): { room: string; key: string } | null {
  const raw = hash.replace(/^#/, "");
  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== "join") return null;
  const [, room, key] = parts;
  if (!HEX32_RE.test(room) || !HEX32_RE.test(key)) return null;
  return { room, key };
}

export function controllerHref(
  origin: string,
  lang: Locale,
  cred: { room: string; controller: string; open?: boolean; player?: string },
): string {
  const open = !!cred.open;
  const suffix = cred.player ? `.${cred.player}` : open ? ".o" : "";
  return `${origin}${localePath(lang, "/sundome/c")}?m=${open ? "open" : "link"}#c.${cred.room}.${cred.controller}${suffix}`;
}

export function inviteHref(
  origin: string,
  lang: Locale,
  cred: { room: string; player: string },
): string {
  return `${origin}${localePath(lang, "/sundome/remote")}?m=join#join.${cred.room}.${cred.player}`;
}

export function lobbyHref(origin: string, lang: Locale, entry: LobbyEntry): string {
  return controllerHref(origin, lang, {
    room: entry.room,
    controller: entry.key,
    open: true,
  });
}

export function lobbyPageHref(lang: Locale): string {
  return localePath(lang, "/sundome/remote/list");
}

export function remoteSeatId(): string {
  const gen = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  try {
    const key = "sundome:remote-sid";
    const cur = window.localStorage.getItem(key);
    if (cur && /^[0-9a-f]{16}$/.test(cur)) return cur;
    const next = gen();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return gen();
  }
}

export function loadLimits(): RemoteLimits | null {
  try {
    const raw = window.localStorage.getItem("sundome:remote-limits");
    return raw ? cleanLimits(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLimits(lim: RemoteLimits): void {
  try {
    window.localStorage.setItem("sundome:remote-limits", JSON.stringify(lim));
  } catch {}
}

export function loadExtMax(): number {
  try {
    const n = Number(window.localStorage.getItem("sundome:remote-ext-max"));
    return (REMOTE_CONSTANTS.EXT_CHOICES as readonly number[]).includes(n)
      ? n
      : 3;
  } catch {
    return 3;
  }
}

export function saveExtMax(v: number): void {
  try {
    window.localStorage.setItem("sundome:remote-ext-max", String(v));
  } catch {}
}

export async function createRemoteRoom(open = false): Promise<RoomCredentials> {
  const res = await fetch(`/rws/new${open ? "?open=1" : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`remote room ${res.status}`);
  const data = (await res.json()) as Partial<RoomCredentials>;
  if (
    typeof data.room !== "string" ||
    !HEX32_RE.test(data.room) ||
    typeof data.player !== "string" ||
    !HEX32_RE.test(data.player) ||
    typeof data.controller !== "string" ||
    !HEX32_RE.test(data.controller)
  ) {
    throw new Error("remote room shape");
  }
  return {
    room: data.room,
    player: data.player,
    controller: data.controller,
    open: Boolean(data.open),
  };
}

export function loadInvite(): (RoomCredentials & { at: number }) | null {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem("sundome:invite") ?? "null",
    ) as (RoomCredentials & { at: number }) | null;
    if (
      raw &&
      HEX32_RE.test(raw.room) &&
      HEX32_RE.test(raw.player) &&
      HEX32_RE.test(raw.controller) &&
      Date.now() - raw.at < 86400_000
    ) {
      return raw;
    }
  } catch {}
  return null;
}

export async function makeInvite(): Promise<RoomCredentials> {
  const prev = loadInvite();
  if (prev) {
    await new Promise<void>((resolve) => {
      try {
        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(
          `${proto}://${window.location.host}/rws/${prev.room}?role=player&key=${prev.player}&list=0`,
        );
        const done = () => {
          try {
            ws.close(1000, "bye");
          } catch {}
          resolve();
        };
        ws.onopen = () => {
          ws.send('{"t":"end"}');
          window.setTimeout(done, 250);
        };
        ws.onerror = done;
        window.setTimeout(done, 2500);
      } catch {
        resolve();
      }
    });
  }
  const fresh = await createRemoteRoom(false);
  try {
    window.localStorage.setItem(
      "sundome:invite",
      JSON.stringify({ ...fresh, at: Date.now() }),
    );
  } catch {}
  return fresh;
}

export async function fetchLobby(): Promise<LobbySnapshot> {
  const res = await fetch("/rws/lobby", { cache: "no-store" });
  if (!res.ok) throw new Error(`lobby ${res.status}`);
  const data = (await res.json()) as {
    ag?: number;
    n?: number;
    by?: Record<string, number>;
    rooms?: unknown[];
    watch?: unknown[];
  };

  const mapList = (arr: unknown[]): LobbyEntry[] =>
    arr
      .filter(
        (e): e is Record<string, unknown> =>
          Boolean(e) &&
          typeof e === "object" &&
          typeof (e as { room?: unknown }).room === "string" &&
          HEX32_RE.test((e as { room: string }).room) &&
          typeof (e as { key?: unknown }).key === "string" &&
          HEX32_RE.test((e as { key: string }).key),
      )
      .map((e) => ({
        room: String(e.room),
        key: String(e.key),
        lang: typeof e.lang === "string" ? e.lang.slice(0, 8) : "en",
        body: typeof e.body === "string" ? e.body.slice(0, 8) : "male",
        at: typeof e.at === "number" ? e.at : Date.now(),
        mins:
          typeof e.mins === "number" && e.mins >= 1 && e.mins <= 180
            ? Math.floor(e.mins)
            : 10,
        diff: typeof e.diff === "string" ? e.diff.slice(0, 8) : "normal",
        wish: cleanWishes(e.wish),
        xm:
          typeof e.xm === "number" && Number.isInteger(e.xm)
            ? e.xm
            : undefined,
        lim: e.lim ? cleanLimits(e.lim) : undefined,
        ph: e.ph === "setup" || e.ph === "play" ? e.ph : undefined,
        lf:
          typeof e.lf === "number" && e.lf >= 0 && e.lf < 21600
            ? Math.floor(e.lf)
            : undefined,
      }));

  const rooms = mapList(Array.isArray(data.rooms) ? data.rooms : []);
  const watch = mapList(Array.isArray(data.watch) ? data.watch : []).slice(0, 20);
  const by: Record<string, number> = {};
  if (data.by && typeof data.by === "object") {
    for (const [k, v] of Object.entries(data.by)) {
      if (typeof v === "number" && v > 0) by[k] = Math.floor(v);
    }
  }
  return {
    rooms,
    watch,
    n: Math.max(rooms.length, typeof data.n === "number" ? data.n : 0),
    by,
    ageSec: typeof data.ag === "number" ? data.ag : 0,
    fetchedAt: Date.now(),
  };
}

function getHeldRoom(): string | null {
  try {
    return window.localStorage.getItem("sundome:remote-held");
  } catch {
    return null;
  }
}

function setHeldRoom(room: string): void {
  try {
    window.localStorage.setItem("sundome:remote-held", room);
  } catch {}
}

export class RemoteLink {
  room: string;
  role: RemoteRole;
  key: string;
  onMessage: (msg: RemoteMessage) => void;
  onStatus: (status: RemoteStatus) => void;
  sid: string;
  extra: string;
  ws: WebSocket | null = null;
  stopped = false;
  retry = 0;
  pingTimer: number | null = null;
  reconnectTimer: number | null = null;
  queue: string[] = [];
  gateInfo = { w: false, q: -1 };
  hereInfo: (() => { ph: "setup" | "play"; left?: number }) | null = null;
  hereTimer: number | null = null;
  hereSoon: number | null = null;
  hereOff = false;
  peerOn = false;

  private onVis = () => {
    if (this.hereTimer) {
      if (document.visibilityState === "hidden") void this.here(true);
      else void this.here(false);
    }
  };

  constructor(
    room: string,
    role: RemoteRole,
    key: string,
    onMessage: (msg: RemoteMessage) => void,
    onStatus: (status: RemoteStatus) => void,
    sid = "",
    extra = "",
  ) {
    this.room = room;
    this.role = role;
    this.key = key;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.sid = sid;
    this.extra = extra;
  }

  private query(): string {
    return `role=${this.role}&key=${this.key}${this.sid ? `&sid=${this.sid}` : ""}${this.role === "controller" ? "&r=3" : ""}${this.extra}`;
  }

  private takeGate(data: { w?: number | boolean; q?: number } | null): void {
    this.gateInfo = {
      w: data?.w === 1 || data?.w === true,
      q: typeof data?.q === "number" && data.q >= 0 ? Math.floor(data.q) : -1,
    };
  }

  openNow(): void {
    this.stopped = false;
    this.open();
  }

  start(): void {
    this.stopped = false;
    if (this.role === "watch") {
      this.open();
      return;
    }
    if (this.role === "controller" && getHeldRoom() !== this.room) {
      fetch(`/api/rgate/${this.room}?k=${this.key}`, { cache: "no-store" })
        .then(async (res) => {
          const data = res.ok
            ? ((await res.json().catch(() => null)) as {
                s?: string;
                w?: number;
                q?: number;
              } | null)
            : null;
          if (data?.s === "busy" || data?.s === "away" || data?.s === "ended") {
            this.takeGate(data);
            this.stopped = true;
            this.onStatus(data.s);
            return;
          }
          if (data?.s === "open") {
            this.open();
            return;
          }
          this.check();
        })
        .catch(() => this.check());
      return;
    }
    this.check();
  }

  private check(): void {
    fetch(`/rws/${this.room}?${this.query()}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 403 || res.status === 404) {
          this.stopped = true;
          this.onStatus("forbidden");
          return;
        }
        const data =
          res.status === 200
            ? ((await res.json().catch(() => null)) as {
                s?: string;
                w?: number;
                q?: number;
              } | null)
            : null;
        if (data?.s === "busy" || data?.s === "away" || data?.s === "ended") {
          this.takeGate(data);
          this.stopped = true;
          this.onStatus(data.s);
          return;
        }
        this.open();
      })
      .catch(() => this.open());
  }

  private open(): void {
    if (this.stopped) return;
    this.onStatus("connecting");
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${window.location.host}/rws/${this.room}?${this.query()}`,
    );
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.onStatus("open");
      for (const raw of this.queue.splice(0)) {
        ws.send(raw);
      }
      this.pingTimer = window.setInterval(
        () => this.sendRaw('{"t":"ping"}'),
        20_000,
      );
      this.hereStart();
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: RemoteMessage | null = null;
      try {
        msg = JSON.parse(ev.data) as RemoteMessage;
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
      if (msg.t === "hello") {
        this.peerOn = msg.peer;
        if (this.role === "controller") setHeldRoom(this.room);
      } else if (msg.t === "peer") {
        this.peerOn = msg.online;
      }
      this.onMessage(msg);
    };

    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      if (this.pingTimer) {
        window.clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.hereStop();
      this.ws = null;

      if (ev.code === 4000) {
        this.stopped = true;
        if (this.role === "controller" && getHeldRoom() === this.room) {
          setHeldRoom("");
        }
        if (ev.reason === "full" && this.role === "controller") {
          this.gateInfo = { w: true, q: -1 };
          this.onStatus("busy");
          return;
        }
        if (this.role === "watch") {
          this.onStatus(
            ev.reason === "ended"
              ? "ended"
              : ev.reason === "replaced"
                ? "replaced"
                : "forbidden",
          );
          return;
        }
        const reason = ev.reason;
        this.onStatus(
          reason === "busy" ||
            reason === "away" ||
            reason === "ended" ||
            reason === "next" ||
            reason === "forbidden"
            ? reason
            : "replaced",
        );
        return;
      }

      if (this.stopped) {
        this.onStatus("closed");
        return;
      }
      this.onStatus("closed");
      const delay = Math.min(15_000, 1000 * 2 ** this.retry++);
      this.reconnectTimer = window.setTimeout(() => this.open(), delay);
    };

    ws.onerror = () => {
      if (this.retry >= 4) {
        this.stopped = true;
        this.onStatus("forbidden");
      }
    };
  }

  private listed(): boolean {
    return (
      this.role === "player" &&
      !this.hereOff &&
      this.extra.includes("&list=1")
    );
  }

  private hereStart(): void {
    this.hereStop();
    if (!this.listed()) return;
    document.addEventListener("visibilitychange", this.onVis);
    this.hereTimer = window.setInterval(
      () => void this.here(false),
      REMOTE_CONSTANTS.REMOTE_STATE_MS,
    );
    this.nudgeHere(1200);
  }

  private hereStop(): void {
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.hereTimer) window.clearInterval(this.hereTimer);
    if (this.hereSoon) window.clearTimeout(this.hereSoon);
    this.hereTimer = null;
    this.hereSoon = null;
  }

  nudgeHere(delayMs = 800): void {
    if (!this.hereTimer || this.hereSoon) return;
    this.hereSoon = window.setTimeout(() => {
      this.hereSoon = null;
      void this.here(false);
    }, delayMs);
  }

  private async here(away: boolean): Promise<void> {
    if (
      !this.listed() ||
      (!away &&
        (this.ws?.readyState !== WebSocket.OPEN ||
          document.visibilityState === "hidden"))
    ) {
      return;
    }
    const info = this.hereInfo?.() ?? { ph: "setup" };
    const qs = `key=${this.key}&ph=${info.ph}${info.ph === "play" && info.left != null ? `&left=${Math.max(0, Math.round(info.left))}` : ""}&iv=${Math.round(REMOTE_CONSTANTS.REMOTE_STATE_MS / 1000)}${away ? "&away=1" : ""}`;
    try {
      const res = await fetch(`/rws/${this.room}/here?${qs}`, {
        cache: "no-store",
        keepalive: away,
      });
      if (res.status === 403 || res.status === 404) {
        this.hereOff = true;
        this.hereStop();
      }
    } catch {}
  }

  relist(nextExtra: string): void {
    if (nextExtra === this.extra) return;
    this.extra = nextExtra;
    const isList = nextExtra.includes("&list=1");
    this.send({ t: isList ? "lobby" : "unlisted" });
    if (isList) this.hereStart();
    else this.hereStop();
  }

  sendRaw(raw: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else if (!this.stopped && this.queue.length < 20) {
      this.queue.push(raw);
    }
  }

  send(msg: RemoteMessage): void {
    this.sendRaw(JSON.stringify(msg));
  }

  end(): void {
    this.stopped = true;
    this.hereStop();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send('{"t":"end"}');
    }
    const cur = this.ws;
    window.setTimeout(() => {
      try {
        cur?.close(1000, "ended");
      } catch {}
    }, 150);
    this.ws = null;
  }

  stop(): void {
    this.stopped = true;
    this.hereStop();
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    try {
      this.ws?.close(1000, "stop");
    } catch {}
    this.ws = null;
  }
}

// ---- Public Origin Discovery Hook (Cloudflare Tunnel / PUBLIC_SHARE_URL) ----
export function usePublicOrigin(): {
  publicOrigin: string | null;
  tunnelEnabled: boolean;
  tunnelReady: boolean;
} {
  const [state, setState] = useState<{
    publicOrigin: string | null;
    tunnelEnabled: boolean;
    tunnelReady: boolean;
  }>({
    publicOrigin: null,
    tunnelEnabled: false,
    tunnelReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function probe() {
      try {
        const res = await fetch("/api/rgate/public-url", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          publicOrigin?: string | null;
          origin?: string | null;
          tunnelEnabled?: boolean;
          tunnelReady?: boolean;
        };
        if (cancelled) return;
        const orig = data.publicOrigin ?? data.origin ?? null;
        const enabled = Boolean(data.tunnelEnabled);
        setState({
          publicOrigin: orig,
          tunnelEnabled: enabled,
          tunnelReady: Boolean(orig),
        });
        if (!orig && enabled) {
          timer = window.setTimeout(probe, 2000);
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(probe, 3000);
      }
    }

    void probe();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return state;
}

// ---- Controller & Signal Preferences (localStorage synced) ----
export interface CtlPrefs {
  layout: CtlLayout;
  favs: number[];
  hide: number[];
}

export interface ReactPrefs {
  favs: string[];
}

const VALID_LINE_IDS = new Set<number>(
  (REMOTE_CONSTANTS.LINE_CATS as readonly (readonly number[])[]).flat(),
);
const VALID_REACT_IDS = new Set<string>([
  ...reactCatsOf("male").flat(),
  ...reactCatsOf("female").flat(),
]);

function dedupe<T>(arr: T[]): T[] {
  return arr.filter((item, idx) => arr.indexOf(item) === idx);
}

const DEFAULT_CTL_PREFS: CtlPrefs = { layout: "disc", favs: [], hide: [] };
const DEFAULT_REACT_PREFS: ReactPrefs = { favs: [] };

let ctlPrefsCache: CtlPrefs | null = null;
const ctlListeners = new Set<() => void>();

function sanitizeCtlPrefs(raw: unknown): CtlPrefs {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const favs = Array.isArray(obj.favs)
    ? dedupe(
        obj.favs.filter(
          (x): x is number => typeof x === "number" && VALID_LINE_IDS.has(x),
        ),
      ).slice(0, REMOTE_CONSTANTS.CTL_FAV_MAX)
    : [];
  let hide = Array.isArray(obj.hide)
    ? dedupe(
        obj.hide.filter(
          (x): x is number =>
            typeof x === "number" &&
            Number.isInteger(x) &&
            x >= 0 &&
            x < REMOTE_CONSTANTS.LINE_CATS.length,
        ),
      ).sort((a, b) => a - b)
    : [];
  if (hide.length >= REMOTE_CONSTANTS.LINE_CATS.length) hide = [];
  return {
    layout: obj.layout === "slider" ? "slider" : "disc",
    favs,
    hide,
  };
}

function readCtlPrefs(): CtlPrefs {
  if (ctlPrefsCache) return ctlPrefsCache;
  if (typeof window === "undefined") return DEFAULT_CTL_PREFS;
  try {
    const raw = window.localStorage.getItem("sundome:remote-ctl-prefs");
    if (raw) {
      ctlPrefsCache = sanitizeCtlPrefs(JSON.parse(raw));
      return ctlPrefsCache;
    }
  } catch {}
  ctlPrefsCache = DEFAULT_CTL_PREFS;
  return ctlPrefsCache;
}

export function setCtlPrefs(next: CtlPrefs): void {
  ctlPrefsCache = sanitizeCtlPrefs(next);
  try {
    window.localStorage.setItem(
      "sundome:remote-ctl-prefs",
      JSON.stringify(ctlPrefsCache),
    );
  } catch {}
  ctlListeners.forEach((fn) => fn());
}

export function useCtlPrefs(): CtlPrefs {
  return useSyncExternalStore(
    (cb) => {
      ctlListeners.add(cb);
      return () => ctlListeners.delete(cb);
    },
    readCtlPrefs,
    () => DEFAULT_CTL_PREFS,
  );
}

let reactPrefsCache: ReactPrefs | null = null;
const reactListeners = new Set<() => void>();

function sanitizeReactPrefs(raw: unknown): ReactPrefs {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const favs = Array.isArray(obj.favs)
    ? dedupe(
        obj.favs.filter(
          (x): x is string => typeof x === "string" && VALID_REACT_IDS.has(x),
        ),
      ).slice(0, REMOTE_CONSTANTS.REACT_FAV_MAX)
    : [];
  return { favs };
}

function readReactPrefs(): ReactPrefs {
  if (reactPrefsCache) return reactPrefsCache;
  if (typeof window === "undefined") return DEFAULT_REACT_PREFS;
  try {
    const raw = window.localStorage.getItem("sundome:remote-react-prefs");
    if (raw) {
      reactPrefsCache = sanitizeReactPrefs(JSON.parse(raw));
      return reactPrefsCache;
    }
  } catch {}
  reactPrefsCache = DEFAULT_REACT_PREFS;
  return reactPrefsCache;
}

export function setReactPrefs(next: ReactPrefs): void {
  reactPrefsCache = sanitizeReactPrefs(next);
  try {
    window.localStorage.setItem(
      "sundome:remote-react-prefs",
      JSON.stringify(reactPrefsCache),
    );
  } catch {}
  reactListeners.forEach((fn) => fn());
}

export function useReactPrefs(): ReactPrefs {
  return useSyncExternalStore(
    (cb) => {
      reactListeners.add(cb);
      return () => reactListeners.delete(cb);
    },
    readReactPrefs,
    () => DEFAULT_REACT_PREFS,
  );
}

export function moveIn<T>(arr: T[], item: T, delta: number): T[] {
  const idx = arr.indexOf(item);
  const next = idx + delta;
  if (idx < 0 || next < 0 || next >= arr.length) return arr;
  const copy = arr.slice();
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  return copy;
}

export function toggleIn<T>(arr: T[], item: T, max: number): T[] {
  if (arr.includes(item)) return arr.filter((x) => x !== item);
  if (arr.length >= max) return arr;
  return [...arr, item];
}

export function reactFavsOf(prefs: ReactPrefs, body: string): string[] {
  const cats = reactCatsOf(body);
  const flat = new Set(cats.flat());
  const validFavs = prefs.favs.filter((k) => flat.has(k));
  if (validFavs.length) return validFavs;
  const fallback =
    body === "female" || body === "lesbian"
      ? ["good", "more", "limit", "held", "faster", "slower", "p_clit", "beg"]
      : ["good", "more", "limit", "held", "faster", "slower", "p_glans", "beg"];
  return fallback.filter((k) => flat.has(k));
}

export function formatShortTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ctlFavsList(prefs: CtlPrefs, lang: Locale): number[] {
  const cats = REMOTE_CONSTANTS.LINE_CATS as readonly (readonly number[])[];
  const totalLines = REMOTE_V2[lang].lines.length;
  if (prefs.favs.length) {
    return prefs.favs.filter((id) => id >= 0 && id < totalLines);
  }
  const hidden = new Set(prefs.hide);
  const defaults: number[] = [];
  cats.forEach((group, ci) => {
    if (!hidden.has(ci)) {
      for (const id of group.slice(0, 2)) {
        if (id < totalLines && !defaults.includes(id)) defaults.push(id);
      }
    }
  });
  return defaults.slice(0, 12);
}
