import voiceMapZhRaw from "@/data/voiceMapZh.json";
import type { Locale } from "@/data/tools";

export type VoiceActorId = "m" | "m2" | "m3" | "m4" | "f" | "f2" | "f3";

interface VoiceMapData {
  voices: Record<string, { label?: string }>;
  [actor: string]: Record<string, string | { label?: string }>;
}

const voiceMapZh = voiceMapZhRaw as unknown as VoiceMapData;

export const ZH_ACTORS: VoiceActorId[] = ["m", "m2", "m3", "m4", "f", "f2", "f3"];

export function defaultVoiceActor(gender: "male" | "female" = "female"): VoiceActorId {
  return gender === "male" ? "m" : "f";
}

export function voiceActorLabels(): Record<VoiceActorId, string> {
  return {
    m: String(voiceMapZh.voices?.m?.label ?? "云希（明亮）"),
    m2: String(voiceMapZh.voices?.m2?.label ?? "云健（低沉）"),
    m3: String(voiceMapZh.voices?.m3?.label ?? "云扬（沉稳）"),
    m4: String(voiceMapZh.voices?.m4?.label ?? "云哲"),
    f: String(voiceMapZh.voices?.f?.label ?? "晓伊（活泼）"),
    f2: String(voiceMapZh.voices?.f2?.label ?? "晓晓（温柔）"),
    f3: String(voiceMapZh.voices?.f3?.label ?? "晓臻"),
  };
}

export function voiceFileUrl(
  text: string,
  actor: VoiceActorId,
  lang: Locale,
): string | null {
  if (lang !== "zh") return null;
  const clean = text.trim();
  if (!clean) return null;
  const tbl = voiceMapZh[actor] as Record<string, string> | undefined;
  const id = tbl?.[clean];
  if (id) return `/voice/zh/${actor}/${id}.mp3`;
  const fbActor = actor.startsWith("m") ? "m" : "f";
  if (fbActor !== actor) {
    const fbId = (voiceMapZh[fbActor] as Record<string, string> | undefined)?.[clean];
    if (fbId) return `/voice/zh/${fbActor}/${fbId}.mp3`;
  }
  return null;
}

let audioEl: HTMLAudioElement | null = null;
let playSeq = 0;

function getPlayer(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.setAttribute("data-sundome-voice-player", "");
  }
  return audioEl;
}

export function stopVoiceFiles(): void {
  playSeq++;
  if (audioEl && !audioEl.paused) {
    try {
      audioEl.pause();
    } catch {}
  }
}

export async function playVoiceOrSpeech(
  text: string,
  opts: {
    lang: Locale;
    actor?: VoiceActorId;
    volume?: number;
    rate?: number;
  },
): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  stopVoiceFiles();
  try {
    window.speechSynthesis?.cancel();
  } catch {}

  const seq = ++playSeq;
  const src = voiceFileUrl(clean, opts.actor ?? "f", opts.lang);
  const el = src ? getPlayer() : null;

  if (el && src) {
    const ok = await new Promise<boolean>((resolve) => {
      let done = false;
      let started = false;
      const finish = (val: boolean) => {
        if (done) return;
        done = true;
        el.removeEventListener("ended", onEnd);
        el.removeEventListener("error", onErr);
        el.removeEventListener("playing", onPlay);
        window.clearTimeout(timer);
        resolve(val);
      };
      const onEnd = () => finish(true);
      const onErr = () => finish(started);
      const onPlay = () => {
        started = true;
      };
      const timer = window.setTimeout(() => {
        if (!started) finish(false);
      }, 3200);
      el.addEventListener("ended", onEnd);
      el.addEventListener("error", onErr);
      el.addEventListener("playing", onPlay);
      try {
        el.src = src;
        el.volume = Math.max(0, Math.min(1, opts.volume ?? 0.8));
        el.playbackRate = opts.rate ?? 1;
        const p = el.play();
        p?.catch(() => finish(false));
      } catch {
        finish(false);
      }
    });
    if (ok || seq !== playSeq) return;
  }

  // Fallback to Web SpeechSynthesis
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = opts.lang === "zh" ? "zh-CN" : "en-US";
    utt.rate = opts.rate ?? 1.02;
    utt.volume = Math.max(0, Math.min(1, opts.volume ?? 0.8));
    window.speechSynthesis.speak(utt);
  } catch {}
}
