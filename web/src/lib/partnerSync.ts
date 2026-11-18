import type { CustomCommand, SundomeDifficulty, SundomeEnding } from "@/data/sundomeCopy";
import { localePath, type Locale, type VariantKey } from "@/data/tools";
import { PARTNER_VERSION } from "@/data/partnerCopy";

export const PARTNER_APP = "100adults-sundome-partner";
const MIN_START_AT = Date.UTC(2026, 0, 1);
const MAX_START_AT = Date.UTC(2100, 0, 1);

export interface PartnerSettingsPayload {
  duration: number;
  difficulty: SundomeDifficulty;
  ending: SundomeEnding;
  custom?: CustomCommand[];
}

export interface PartnerPayload {
  app: typeof PARTNER_APP;
  v: number;
  seed: number;
  startAt: number;
  s: PartnerSettingsPayload;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): number {
  try {
    if (typeof globalThis.crypto?.getRandomValues === "function") {
      return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    }
  } catch {}
  return Math.floor(0x100000000 * Math.random()) >>> 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodePartner(payload: PartnerPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(bytes);
}

export async function decodePartner(hash: string): Promise<PartnerPayload | null> {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return null;
  try {
    const bytes = fromBase64Url(raw);
    const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
    if (!json || typeof json !== "object") return null;
    if (json.app !== PARTNER_APP || json.v !== PARTNER_VERSION) return null;
    if (
      typeof json.seed !== "number" ||
      !Number.isInteger(json.seed) ||
      json.seed < 0 ||
      json.seed > 0xffffffff
    ) {
      return null;
    }
    if (
      typeof json.startAt !== "number" ||
      !Number.isInteger(json.startAt) ||
      json.startAt < MIN_START_AT ||
      json.startAt > MAX_START_AT
    ) {
      return null;
    }
    const sRaw =
      json.s && typeof json.s === "object"
        ? (json.s as Record<string, unknown>)
        : {};
    const duration =
      typeof sRaw.duration === "number" && sRaw.duration >= 1 && sRaw.duration <= 180
        ? Math.floor(sRaw.duration)
        : 10;
    const difficulty =
      sRaw.difficulty === "easy" ||
      sRaw.difficulty === "normal" ||
      sRaw.difficulty === "hard" ||
      sRaw.difficulty === "brutal"
        ? sRaw.difficulty
        : "normal";
    const ending =
      sRaw.ending === "lottery" ||
      sRaw.ending === "allowed" ||
      sRaw.ending === "denied" ||
      sRaw.ending === "ruined" ||
      sRaw.ending === "overtime"
        ? sRaw.ending
        : "lottery";
    const custom: CustomCommand[] = Array.isArray(sRaw.custom)
      ? sRaw.custom
          .filter(
            (c): c is CustomCommand =>
              Boolean(c) &&
              typeof c === "object" &&
              typeof (c as CustomCommand).text === "string" &&
              ((c as CustomCommand).type === "stroke" ||
                (c as CustomCommand).type === "slow" ||
                (c as CustomCommand).type === "stop") &&
              typeof (c as CustomCommand).bpm === "number",
          )
          .slice(0, 20)
      : [];
    return {
      app: PARTNER_APP,
      v: PARTNER_VERSION,
      seed: json.seed,
      startAt: json.startAt,
      s: { duration, difficulty, ending, custom },
    };
  } catch {
    return null;
  }
}

export function partnerPhase(
  startAt: number,
  durationMin: number,
  now = Date.now(),
): {
  phase: "before" | "during" | "after";
  elapsedMs: number;
  untilStartMs: number;
} {
  const until = startAt - now;
  if (until > 0) {
    return { phase: "before", elapsedMs: 0, untilStartMs: until };
  }
  const elapsed = now - startAt;
  return {
    phase: elapsed < durationMin * 60_000 ? "during" : "after",
    elapsedMs: elapsed,
    untilStartMs: 0,
  };
}

export function formatStartAt(startAt: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startAt));
  } catch {
    return new Date(startAt).toISOString().slice(11, 16);
  }
}

export function partnerShareUrl(
  origin: string,
  locale: Locale,
  variant: VariantKey | undefined,
  startAt: number,
  hash: string,
): string {
  const base = variant ? `/sundome/${variant}` : "/sundome";
  const path =
    locale === "zh"
      ? `${localePath(locale, "/sundome/p")}`
      : `${localePath(locale, "/sundome/p")}`;
  const qs = new URLSearchParams({ t: String(startAt) });
  if (variant) qs.set("v", variant);
  void base;
  return `${origin}${path}?${qs.toString()}#${hash}`;
}
