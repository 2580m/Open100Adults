"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  sundomeCopy,
  type CommandType,
  type CustomCommand,
  type SundomeCommand,
  type SundomeDifficulty,
  type SundomeEnding,
} from "@/data/sundomeCopy";
import {
  IS_STATIC_EXPORT,
  localePath,
  type Locale,
  type VariantKey,
} from "@/data/tools";

type Phase =
  | "idle"
  | "playing"
  | "paused"
  | "permission"
  | "denied"
  | "ruined"
  | "finished";

type SampleSource = "samples" | "alt-samples";

interface SampleItem {
  cid: string;
  title: string;
  actress?: string;
  image?: string;
  mp4?: string;
}

const DURATIONS = [3, 5, 10, 15, 20, 30] as const;
const SAMPLE_PAGE_SIZE = 8;

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function adaptVariantText(
  text: string,
  variant: VariantKey | undefined,
  locale: Locale,
): string {
  if (variant !== "women" && variant !== "lesbian") return text;
  if (locale === "zh") {
    return text
      .replaceAll("可以射", "可以高潮")
      .replaceAll("不许射", "不许高潮")
      .replaceAll("废射", "毁灭高潮")
      .replaceAll("射前", "高潮前")
      .replaceAll("握紧", "轻揉")
      .replaceAll("不许握", "不许重按")
      .replaceAll("从根部到顶端", "从外侧到敏感处")
      .replaceAll("沿着柱身", "沿着敏感处")
      .replaceAll("沿柱身", "沿敏感处")
      .replaceAll("顶端", "敏感点");
  }
  return text
    .replace(/\bstrokes\b/gi, "touches")
    .replace(/\bstroke\b/gi, "touch")
    .replace(/\bshaft\b/gi, "sensitive area")
    .replace(/\btip\b/gi, "clit")
    .replace(/\bhead\b/gi, "clit")
    .replace(/\bgrip\b/gi, "pressure")
    .replace(/\bcome\b/gi, "finish");
}

export function SundomeGame({
  locale,
  variant,
}: {
  locale: Locale;
  variant?: VariantKey;
}) {
  const copy = sundomeCopy[locale];

  const [hydrated, setHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [durationMode, setDurationMode] = useState<number | "custom">(5);
  const [customMinutes, setCustomMinutes] = useState("10");
  const [difficulty, setDifficulty] = useState<SundomeDifficulty>("normal");
  const [ending, setEnding] = useState<SundomeEnding>("lottery");
  const [metronome, setMetronome] = useState(true);
  const [voice, setVoice] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [customText, setCustomText] = useState("");
  const [customType, setCustomType] = useState<CommandType>("stroke");
  const [customBpm, setCustomBpm] = useState("80");

  const [current, setCurrent] = useState<SundomeCommand | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [commandRemaining, setCommandRemaining] = useState(0);
  const [edges, setEdges] = useState(0);
  const [edgeBonus, setEdgeBonus] = useState(0);
  const [permissionLeft, setPermissionLeft] = useState(10);
  const [overtimeNotice, setOvertimeNotice] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoVolume, setVideoVolume] = useState(0.6);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [sampleSource, setSampleSource] = useState<SampleSource>("samples");
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesError, setSamplesError] = useState(false);
  const [sampleQuery, setSampleQuery] = useState("");
  const [samplePage, setSamplePage] = useState(0);
  const [videoPlayError, setVideoPlayError] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const remainingRef = useRef(0);
  const commandRemainingRef = useRef(0);
  const commandIndexRef = useRef(0);
  const lastCommandRef = useRef<string | null>(null);
  const edgeBonusRef = useRef(0);
  const edgesRef = useRef(0);
  const totalRef = useRef(300);
  const voiceRef = useRef(voice);
  const customCommandsRef = useRef(customCommands);
  const difficultyRef = useRef(difficulty);
  const endingRef = useRef(ending);

  voiceRef.current = voice;
  customCommandsRef.current = customCommands;
  difficultyRef.current = difficulty;
  endingRef.current = ending;

  useEffect(() => {
    if (window.sessionStorage.getItem("sundome:age") === "1") {
      setAccepted(true);
    }
    const raw = window.localStorage.getItem("sundome:custom");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CustomCommand[];
        if (Array.isArray(parsed)) {
          setCustomCommands(
            parsed.filter(
              (item) =>
                item &&
                typeof item.text === "string" &&
                (item.type === "stroke" || item.type === "slow" || item.type === "stop") &&
                typeof item.bpm === "number",
            ),
          );
        }
      } catch {
        // Ignore malformed custom commands.
      }
    }
    const saved = window.localStorage.getItem("sundome:settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          difficulty?: SundomeDifficulty;
          ending?: SundomeEnding;
          voice?: boolean;
          metronome?: boolean;
          volume?: number;
        };
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.ending) setEnding(parsed.ending);
        if (typeof parsed.voice === "boolean") setVoice(parsed.voice);
        if (typeof parsed.metronome === "boolean") setMetronome(parsed.metronome);
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
      } catch {
        // Ignore malformed settings.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("sundome:custom", JSON.stringify(customCommands));
  }, [customCommands, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      "sundome:settings",
      JSON.stringify({ difficulty, ending, voice, metronome, volume }),
    );
  }, [difficulty, ending, voice, metronome, volume, hydrated]);

  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.state !== "closed") {
        void audioRef.current.close();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume;
  }, [videoVolume, videoUrl]);

  useEffect(() => {
    if (!videoUrl) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function ensureAudio() {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = new Ctor();
    }
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume();
    }
  }

  function click() {
    const ctx = audioRef.current;
    if (!ctx || ctx.state === "closed") return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume * 0.25), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  function speak(text: string) {
    if (!voiceRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "zh" ? "zh-CN" : "en-US";
    utterance.rate = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function poolForType(type: CommandType): SundomeCommand[] {
    const base = copy.commands[type].map((item) => ({
      ...item,
      text: adaptVariantText(item.text, variant, locale),
    }));
    const custom = customCommandsRef.current.filter((item) => item.type === type);
    return [...base, ...custom];
  }

  function pickCommand(forceRest: boolean): SundomeCommand {
    let type: CommandType;
    if (forceRest) {
      type = "stop";
    } else if (Math.random() < 0.28) {
      type = "slow";
    } else {
      type = "stroke";
    }
    let options = poolForType(type).filter(
      (item) => item.text !== lastCommandRef.current,
    );
    if (!options.length) options = poolForType(type);
    const chosen = randomOf(options);
    lastCommandRef.current = chosen.text;
    return chosen;
  }

  function nextCommand(forceRest = false) {
    commandIndexRef.current += 1;
    const restEvery = copy.difficulties[difficultyRef.current].restEvery;
    const isRest = forceRest || commandIndexRef.current % restEvery === 0;
    const command = pickCommand(isRest);
    const duration =
      command.type === "stop"
        ? 18 + Math.floor(Math.random() * 8)
        : 28 + Math.floor(Math.random() * 14);
    commandRemainingRef.current = duration;
    setCommandRemaining(duration);
    setCurrent(command);
    speak(command.text);
  }

  function grantPermission() {
    setPhase("permission");
    setPermissionLeft(10);
    const rawLine =
      locale === "zh" ? "可以射了。你有十秒。" : "You may come. You have ten seconds.";
    speak(adaptVariantText(rawLine, variant, locale));
  }

  function resolveEnd() {
    const config = copy.difficulties[difficultyRef.current];
    const chance = Math.min(100, config.chance + edgeBonusRef.current);
    const roll = Math.random() * 100;
    const currentEnding = endingRef.current;

    if (currentEnding === "allowed") {
      grantPermission();
      return;
    }
    if (currentEnding === "denied") {
      setPhase("denied");
      return;
    }
    if (currentEnding === "ruined") {
      setPhase("ruined");
      setPermissionLeft(10);
      return;
    }
    if (currentEnding === "overtime") {
      if (roll < chance) {
        grantPermission();
      } else {
        remainingRef.current = 120;
        totalRef.current = 120;
        setRemaining(120);
        setOvertimeNotice(true);
        window.setTimeout(() => setOvertimeNotice(false), 4000);
      }
      return;
    }

    if (roll < chance) grantPermission();
    else setPhase("denied");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      remainingRef.current -= 1;
      commandRemainingRef.current -= 1;

      if (remainingRef.current <= 0) {
        remainingRef.current = 0;
        setRemaining(0);
        resolveEnd();
        return;
      }

      if (commandRemainingRef.current <= 0) {
        nextCommand();
      }

      setRemaining(remainingRef.current);
      setCommandRemaining(Math.max(0, commandRemainingRef.current));
    }, 1000);
    return () => window.clearInterval(timer);
    // The interval is tied to the playing phase; settings are locked while playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "permission" && phase !== "ruined") return;
    const timer = window.setInterval(() => {
      setPermissionLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setPhase("finished");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (metronome !== true || phase !== "playing" || !current) return;
    if (current.type === "stop") return;
    const interval = 60_000 / current.bpm;
    let cancelled = false;
    let timer = 0;
    function tick() {
      if (cancelled) return;
      click();
      timer = window.setTimeout(tick, interval);
    }
    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome, phase, current, volume]);

  function beginGame() {
    ensureAudio();
    const minutes =
      durationMode === "custom"
        ? Math.min(180, Math.max(1, Number(customMinutes) || 10))
        : durationMode;
    const total = Math.round(minutes * 60);
    totalRef.current = total;
    remainingRef.current = total;
    commandRemainingRef.current = 0;
    commandIndexRef.current = 0;
    lastCommandRef.current = null;
    edgeBonusRef.current = 0;
    edgesRef.current = 0;
    setEdges(0);
    setEdgeBonus(0);
    setRemaining(total);
    setOvertimeNotice(false);
    setPhase("playing");
    nextCommand(false);
  }

  function startGame() {
    if (!accepted) {
      setGateOpen(true);
      return;
    }
    beginGame();
  }

  function quitGame() {
    setPhase("idle");
    setCurrent(null);
    setRemaining(0);
    setCommandRemaining(0);
    setEdges(0);
    setEdgeBonus(0);
    edgeBonusRef.current = 0;
    edgesRef.current = 0;
    setOvertimeNotice(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function togglePause() {
    setPhase((value) => {
      if (value === "playing") return "paused";
      if (value === "paused") return "playing";
      return value;
    });
  }

  function handleEdge() {
    if (phase !== "playing" || !current || current.type === "stop") return;
    edgesRef.current += 1;
    edgeBonusRef.current = Math.min(20, edgeBonusRef.current + 5);
    setEdges(edgesRef.current);
    setEdgeBonus(edgeBonusRef.current);
    const cooldown: SundomeCommand = {
      text: copy.status.edgeCooldown,
      type: "stop",
      bpm: 40,
    };
    lastCommandRef.current = cooldown.text;
    commandRemainingRef.current = 20;
    setCommandRemaining(20);
    setCurrent(cooldown);
    speak(cooldown.text);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (phase === "playing" || phase === "paused") togglePause();
      }
      if (event.key === "e" || event.key === "E") {
        handleEdge();
      }
      if (event.key === "Escape") {
        if (phase !== "idle") quitGame();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function fetchSampleSource(source: SampleSource): Promise<SampleItem[]> {
    if (IS_STATIC_EXPORT) return [];
    const response = await fetch(`/api/sundome-lab/${source}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { items?: SampleItem[] };
    return Array.isArray(data.items)
      ? data.items.filter((item) => item && item.mp4)
      : [];
  }

  async function loadSamples(source: SampleSource, allowFallback = false) {
    if (IS_STATIC_EXPORT) return;
    setSampleSource(source);
    setSamplePage(0);
    setSamplesLoading(true);
    setSamplesError(false);
    try {
      const items = await fetchSampleSource(source);
      if (items.length === 0 && allowFallback && source === "samples") {
        setSampleSource("alt-samples");
        const fallbackItems = await fetchSampleSource("alt-samples");
        setSamples(fallbackItems);
      } else {
        setSamples(items);
      }
    } catch {
      if (allowFallback && source === "samples") {
        try {
          setSampleSource("alt-samples");
          const fallbackItems = await fetchSampleSource("alt-samples");
          setSamples(fallbackItems);
          return;
        } catch {
          // Fall through to error state.
        }
      }
      setSamplesError(true);
    } finally {
      setSamplesLoading(false);
    }
  }

  async function openSamples() {
    if (IS_STATIC_EXPORT) return;
    if (!accepted) {
      setGateOpen(true);
      return;
    }
    if (samplesOpen) {
      setSamplesOpen(false);
      return;
    }
    setSamplesOpen(true);
    if (samples.length || samplesLoading) return;
    await loadSamples(sampleSource, true);
  }

  const filteredSamples = samples.filter((item) => {
    if (!sampleQuery.trim()) return true;
    const haystack = `${item.title} ${item.actress ?? ""}`.toLowerCase();
    return haystack.includes(sampleQuery.trim().toLowerCase());
  });
  const samplePageCount = Math.max(
    1,
    Math.ceil(filteredSamples.length / SAMPLE_PAGE_SIZE),
  );
  const safeSamplePage = Math.min(samplePage, samplePageCount - 1);
  const visibleSamples = filteredSamples.slice(
    safeSamplePage * SAMPLE_PAGE_SIZE,
    safeSamplePage * SAMPLE_PAGE_SIZE + SAMPLE_PAGE_SIZE,
  );

  const difficultyConfig = copy.difficulties[difficulty];
  const chance = Math.min(100, difficultyConfig.chance + edgeBonus);
  const progress = totalRef.current
    ? Math.min(100, (remaining / totalRef.current) * 100)
    : 0;

  const colorClass =
    current?.type === "stop"
      ? "from-[#ff4d6d]/30 to-[#ff4d6d]/5 border-[#ff4d6d]/50"
      : current?.type === "slow"
        ? "from-[#e6b061]/25 to-[#e6b061]/5 border-[#e6b061]/40"
        : "from-[#6ee7a8]/25 to-[#6ee7a8]/5 border-[#6ee7a8]/40";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card rounded-2xl p-4 sm:p-6" data-sundome-app>
          {phase === "idle" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="font-display text-3xl text-foreground">
                {copy.status.ready}
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-strong">
                {copy.status.readyHint}
              </p>
              <button
                type="button"
                onClick={startGame}
                className="mt-5 cursor-pointer rounded-2xl bg-accent px-8 py-4 text-base font-bold text-white"
              >
                {accepted ? copy.actions.start : copy.gate.confirm}
              </button>
              <p className="mt-3 text-[11px] text-muted">{copy.gate.body}</p>
            </div>
          ) : phase === "permission" ||
            phase === "denied" ||
            phase === "ruined" ||
            phase === "finished" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                {adaptVariantText(
                  phase === "permission"
                    ? copy.status.permission
                    : phase === "denied"
                      ? copy.status.denied
                      : phase === "ruined"
                        ? copy.status.ruined
                        : copy.status.finished,
                  variant,
                  locale,
                )}
              </p>
              <p className="mt-2 font-display text-4xl text-accent">
                {phase === "permission"
                  ? `${permissionLeft}s`
                  : phase === "denied"
                    ? "✕"
                    : phase === "ruined"
                      ? `${permissionLeft}s`
                      : "✓"}
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-strong">
                {phase === "permission"
                  ? copy.status.permissionHint
                  : phase === "denied"
                    ? copy.status.deniedHint
                    : phase === "ruined"
                      ? copy.status.ruinedHint
                      : copy.status.readyHint}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={startGame}
                  className="cursor-pointer rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white"
                >
                  {copy.status.playAgain}
                </button>
                <button
                  type="button"
                  onClick={quitGame}
                  className="cursor-pointer rounded-2xl border border-card-border px-5 py-3 text-sm font-bold text-muted-strong"
                >
                  {copy.actions.quit}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {copy.status.timeLeft}:{" "}
                  <span className="font-bold text-foreground">
                    {formatTime(remaining)}
                  </span>
                </span>
                <span>
                  {copy.status.edges}:{" "}
                  <span className="font-bold text-foreground">{edges}</span>
                </span>
                <span>
                  {copy.status.chance}:{" "}
                  <span className="font-bold text-accent">{chance}%</span>
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-category-bg">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f5a3c8] to-[#b8a4ff]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div
                className={`mt-4 rounded-3xl border bg-gradient-to-b p-6 text-center transition-colors ${colorClass}`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-strong">
                  {current ? copy.types[current.type] : copy.status.ready}
                </p>
                <p className="mt-3 min-h-[72px] text-xl font-bold leading-snug text-foreground sm:text-2xl">
                  {current?.text ?? copy.status.readyHint}
                </p>
                {current && current.type !== "stop" ? (
                  <span
                    className="beat mx-auto mt-4 block h-3 w-3 rounded-full bg-accent"
                    style={{ animationDuration: `${60 / current.bpm}s` }}
                  />
                ) : (
                  <span className="mx-auto mt-4 block h-3 w-3 rounded-full bg-[#ff4d6d]" />
                )}
                <p className="mt-2 text-[11px] text-muted">
                  {current?.type === "stop"
                    ? copy.types.stop
                    : `${current?.bpm ?? 0} BPM · ${formatTime(commandRemaining)}`}
                </p>
              </div>

              {overtimeNotice ? (
                <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-center text-xs font-bold text-accent">
                  {copy.status.overtimeHint}
                </p>
              ) : null}

              {phase === "paused" ? (
                <p className="mt-2 rounded-xl bg-category-bg px-3 py-2 text-center text-xs font-bold text-muted-strong">
                  {copy.status.paused}
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleEdge}
                  disabled={current?.type === "stop" || phase !== "playing"}
                  className="cursor-pointer rounded-2xl bg-accent px-3 py-3 text-sm font-bold text-white disabled:cursor-default disabled:opacity-50"
                >
                  {copy.actions.edged}
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  className="cursor-pointer rounded-2xl border border-card-border px-3 py-3 text-sm font-bold text-foreground"
                >
                  {phase === "paused" ? copy.actions.resume : copy.actions.pause}
                </button>
                <button
                  type="button"
                  onClick={quitGame}
                  className="cursor-pointer rounded-2xl border border-card-border px-3 py-3 text-sm font-bold text-muted-strong"
                >
                  {copy.actions.quit}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                {adaptVariantText(copy.actions.edgedHint, variant, locale)}
              </p>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="card rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.settings.duration}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={phase === "playing" || phase === "paused"}
                  onClick={() => setDurationMode(minutes)}
                  aria-pressed={durationMode === minutes}
                  className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:cursor-default ${
                    durationMode === minutes
                      ? "bg-accent text-white"
                      : "border border-card-border text-muted-strong"
                  }`}
                >
                  {minutes}m
                </button>
              ))}
              <button
                type="button"
                disabled={phase === "playing" || phase === "paused"}
                onClick={() => setDurationMode("custom")}
                aria-pressed={durationMode === "custom"}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:cursor-default ${
                  durationMode === "custom"
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted-strong"
                }`}
              >
                {copy.settings.customMinutes}
              </button>
            </div>
            {durationMode === "custom" ? (
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
            ) : null}

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.settings.difficulty}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(["easy", "normal", "hard", "brutal"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={phase === "playing" || phase === "paused"}
                  onClick={() => setDifficulty(option)}
                  aria-pressed={difficulty === option}
                  className={`cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold disabled:cursor-default ${
                    difficulty === option
                      ? "bg-accent text-white"
                      : "border border-card-border text-muted-strong"
                  }`}
                >
                  {copy.difficulties[option].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              {difficultyConfig.description}
            </p>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.settings.ending}
            </p>
            <select
              value={ending}
              disabled={phase === "playing" || phase === "paused"}
              onChange={(event) => setEnding(event.target.value as SundomeEnding)}
              className="mt-2 w-full cursor-pointer rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            >
              {(
                ["lottery", "allowed", "denied", "ruined", "overtime"] as const
              ).map((option) => (
                <option key={option} value={option}>
                  {copy.endings[option].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted">
              {adaptVariantText(copy.endings[ending].description, variant, locale)}
            </p>

            <label className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-strong">
              {copy.settings.metronome}
              <input
                type="checkbox"
                checked={metronome}
                onChange={(event) => setMetronome(event.target.checked)}
                className="h-4 w-4 accent-[#f5a3c8]"
              />
            </label>
            <label className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-strong">
              {copy.settings.voice}
              <input
                type="checkbox"
                checked={voice}
                onChange={(event) => setVoice(event.target.checked)}
                className="h-4 w-4 accent-[#f5a3c8]"
              />
            </label>
            <label className="mt-3 block text-[11px] text-muted">
              {copy.settings.volume}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="mt-1 w-full accent-[#f5a3c8]"
              />
            </label>
          </div>

          <div className="card rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.settings.custom}
            </p>
            <div className="mt-2 space-y-2">
              <input
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder={copy.settings.customText}
                disabled={phase === "playing" || phase === "paused"}
                className="w-full rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-accent"
              />
              <div className="flex gap-2">
                <select
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value as CommandType)}
                  disabled={phase === "playing" || phase === "paused"}
                  className="flex-1 cursor-pointer rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                >
                  {(["stroke", "slow", "stop"] as const).map((type) => (
                    <option key={type} value={type}>
                      {copy.types[type]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={customBpm}
                  onChange={(event) => setCustomBpm(event.target.value)}
                  disabled={phase === "playing" || phase === "paused"}
                  className="w-20 rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                />
                <button
                  type="button"
                  disabled={
                    !customText.trim() ||
                    phase === "playing" ||
                    phase === "paused"
                  }
                  onClick={() => {
                    const text = customText.trim();
                    if (!text) return;
                    setCustomCommands((items) => [
                      ...items,
                      {
                        text,
                        type: customType,
                        bpm: Math.min(200, Math.max(20, Number(customBpm) || 80)),
                      },
                    ]);
                    setCustomText("");
                  }}
                  className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white disabled:cursor-default disabled:opacity-50"
                >
                  {copy.settings.add}
                </button>
              </div>
            </div>
            {customCommands.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">{copy.settings.noCustom}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {customCommands.map((item, index) => (
                  <li
                    key={`${item.text}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-search-bg px-2 py-1 text-[11px] text-muted-strong"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.text}</span>
                    <span className="shrink-0 text-muted">
                      {copy.types[item.type]} · {item.bpm}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomCommands((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="shrink-0 cursor-pointer text-[#ff8399]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{copy.video.title}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-foreground"
            >
              {copy.video.local}
            </button>
            {!IS_STATIC_EXPORT ? (
              <button
                type="button"
                onClick={openSamples}
                className="cursor-pointer rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-foreground"
              >
                {copy.video.samples}
              </button>
            ) : null}
            {videoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setVideoUrl(null);
                  setVideoName(null);
                  setVideoPlayError(false);
                }}
                className="cursor-pointer rounded-lg border border-[#ff4d6d]/40 px-3 py-1.5 text-xs font-bold text-[#ff8399]"
              >
                {copy.video.clear}
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
            setVideoUrl(URL.createObjectURL(file));
            setVideoName(file.name);
            setVideoPlayError(false);
            event.target.value = "";
          }}
        />

        {videoUrl ? (
          <div className="mt-3">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              loop
              playsInline
              muted={videoMuted}
              onError={() => setVideoPlayError(true)}
              onLoadedData={() => setVideoPlayError(false)}
              className="max-h-[360px] w-full rounded-xl bg-black"
            />
            {videoPlayError ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/10 px-3 py-2 text-xs text-[#ff8399]">
                <span>
                  {locale === "zh"
                    ? "当前视频源无法播放（可能受地区或格式限制）。"
                    : "This video could not be played (check format or network)."}
                </span>
                {!IS_STATIC_EXPORT ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSamplesOpen(true);
                      void loadSamples("alt-samples", false);
                    }}
                    className="cursor-pointer rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {locale === "zh" ? "切换到备用源 (DUGA)" : "Switch to Alt source"}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              {videoName ? <span className="max-w-[40%] truncate">{videoName}</span> : null}
              <button
                type="button"
                onClick={() => setVideoMuted((value) => !value)}
                className="cursor-pointer rounded-lg border border-card-border px-2 py-1 font-bold text-muted-strong"
              >
                {videoMuted ? copy.video.unmute : copy.video.mute}
              </button>
              <label className="flex items-center gap-2">
                {copy.video.volume}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={videoVolume}
                  onChange={(event) => setVideoVolume(Number(event.target.value))}
                  className="accent-[#f5a3c8]"
                />
              </label>
            </div>
          </div>
        ) : null}

        {!IS_STATIC_EXPORT && samplesOpen ? (
          <div className="mt-3 rounded-2xl border border-card-border bg-search-bg p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-lg border border-card-border bg-background p-0.5">
                {(
                  [
                    ["samples", locale === "zh" ? "主源 (FANZA)" : "FANZA"],
                    ["alt-samples", locale === "zh" ? "备用源 (DUGA)" : "DUGA (Alt)"],
                  ] as const
                ).map(([source, label]) => (
                  <button
                    key={source}
                    type="button"
                    disabled={samplesLoading}
                    onClick={() => void loadSamples(source, false)}
                    aria-pressed={sampleSource === source}
                    className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-bold disabled:cursor-default ${
                      sampleSource === source
                        ? "bg-accent text-white"
                        : "text-muted-strong hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={sampleQuery}
                onChange={(event) => {
                  setSampleQuery(event.target.value);
                  setSamplePage(0);
                }}
                placeholder={copy.video.search}
                className="min-w-[180px] flex-1 rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted/60 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setSamplesOpen(false)}
                className="cursor-pointer rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-muted-strong"
              >
                {copy.actions.close}
              </button>
            </div>

            {samplesLoading ? (
              <p className="mt-3 text-xs text-muted">{copy.video.loading}</p>
            ) : samplesError ? (
              <p className="mt-3 text-xs text-[#ff8399]">{copy.video.error}</p>
            ) : filteredSamples.length === 0 ? (
              <p className="mt-3 text-xs text-muted">{copy.video.noResults}</p>
            ) : (
              <>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleSamples.map((item) => (
                    <li
                      key={item.cid}
                      className="overflow-hidden rounded-xl border border-card-border bg-card-bg"
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-video w-full bg-black" />
                      )}
                      <div className="p-2">
                        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-foreground">
                          {item.title}
                        </p>
                        {item.actress ? (
                          <p className="mt-0.5 text-[10px] text-muted">
                            {item.actress}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setVideoPlayError(false);
                            setVideoUrl(item.mp4 ?? null);
                            setVideoName(item.title);
                            setVideoMuted(false);
                          }}
                          className="mt-1.5 w-full cursor-pointer rounded-lg bg-accent px-2 py-1.5 text-[10px] font-bold text-white"
                        >
                          {copy.video.pick}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted">
                  <button
                    type="button"
                    disabled={safeSamplePage === 0}
                    onClick={() => setSamplePage((value) => Math.max(0, value - 1))}
                    className="cursor-pointer rounded-lg border border-card-border px-2 py-1 font-bold disabled:cursor-default disabled:opacity-40"
                  >
                    {copy.video.prev}
                  </button>
                  <span>
                    {copy.video.page} {safeSamplePage + 1} / {samplePageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safeSamplePage >= samplePageCount - 1}
                    onClick={() =>
                      setSamplePage((value) => Math.min(samplePageCount - 1, value + 1))
                    }
                    className="cursor-pointer rounded-lg border border-card-border px-2 py-1 font-bold disabled:cursor-default disabled:opacity-40"
                  >
                    {copy.video.next}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {gateOpen && !accepted ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl border border-card-border bg-background-elevated p-6">
            <h2 className="text-xl font-bold text-foreground">{copy.gate.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-strong">
              {copy.gate.body}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.setItem("sundome:age", "1");
                  setAccepted(true);
                  setGateOpen(false);
                  beginGame();
                }}
                className="cursor-pointer rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white"
              >
                {copy.gate.confirm}
              </button>
              <Link
                href={localePath(locale, "")}
                className="rounded-2xl border border-card-border px-4 py-3 text-center text-sm font-bold text-muted-strong"
              >
                {copy.gate.under18}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-muted">
        {locale === "zh"
          ? "空格暂停 · E 报告边缘 · Esc 退出"
          : "Space pauses · E reports an edge · Esc quits"}
      </p>
      <p className="text-[11px] text-muted">{copy.disclaimer}</p>
      <p className="text-[11px] text-muted">
        {copy.status.command}: {copy.types.stroke} / {copy.types.slow} /{" "}
        {copy.types.stop}
      </p>
    </div>
  );
}
