"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { storyCopy } from "@/data/storyCopy";
import type { Story, StoryPhase } from "@/data/stories/types";
import { localePath, type Locale } from "@/data/tools";

type Phase =
  | "idle"
  | "prepare"
  | "stroke"
  | "slow"
  | "rest"
  | "cooldown"
  | "ask"
  | "build"
  | "choice"
  | "count"
  | "allow"
  | "ruin"
  | "deny"
  | "after"
  | "oops"
  | "ending";

type EndingKind = "allow" | "ruin" | "deny" | "oops";

function firstPlayable(story: Story, from: number): number {
  for (let index = from; index < story.segs.length; index += 1) {
    const segment = story.segs[index];
    if (!segment.route && segment.G) return index;
  }
  return -1;
}

export function StoryPlayer({
  story,
  locale,
}: {
  story: Story;
  locale: Locale;
}) {
  const copy = storyCopy[locale];
  const player = copy.player;

  const [accepted, setAccepted] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [segIndex, setSegIndex] = useState(0);
  const [edges, setEdges] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [countLeft, setCountLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [voice, setVoice] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [endingKind, setEndingKind] = useState<EndingKind | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceIndexRef = useRef<Record<string, string> | null>(null);
  const edgesRef = useRef(0);

  useEffect(() => {
    if (window.sessionStorage.getItem("story:age") === "1") setAccepted(true);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/story-voice/${encodeURIComponent(locale)}/${encodeURIComponent(story.id)}/index.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, string> | null) => {
        if (active && data && typeof data === "object") {
          voiceIndexRef.current = data;
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (voiceAudioRef.current) {
        try {
          voiceAudioRef.current.pause();
        } catch {}
      }
    };
  }, [locale, story.id]);

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

  const segment = story.segs[segIndex];
  const phaseData: StoryPhase | null = useMemo(() => {
    switch (phase) {
      case "prepare":
        return story.segs[0]?.P ?? null;
      case "stroke":
        return segment?.G ?? null;
      case "slow":
        return segment?.Y ?? null;
      case "rest":
        return segment?.R ?? null;
      case "cooldown":
        return segment?.X ?? { c: player.cooldown, d: 20 };
      case "build":
        return story.finale.build ?? null;
      case "allow":
        return story.finale.allow ?? null;
      case "ruin":
        return story.finale.ruin ?? null;
      case "deny":
        return story.finale.deny ?? null;
      case "after":
        return story.finale.after ?? null;
      default:
        return null;
    }
  }, [phase, story, segment, player]);

  function fill(text: string | undefined): string {
    if (!text) return "";
    return text
      .replaceAll("{m}", story.names.m ?? "them")
      .replaceAll("{n}", story.names.n ?? "you")
      .replaceAll("{M}", story.names.m ?? "Them")
      .replaceAll("{N}", story.names.n ?? "You");
  }

  const lines = useMemo(() => {
    if (phase === "oops") return (story.oops?.t ?? []).map(fill);
    return (phaseData?.t ?? []).map(fill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseData, story]);

  const commandText = useMemo(() => {
    if (phase === "ask") return fill(segment?.ask?.q);
    if (phase === "choice") return fill(story.finale.judge?.q);
    if (phase === "oops") return fill(story.oops?.c) || player.hints.came;
    if (phase === "count") return fill(story.finale.count?.c);
    if (phase === "allow" && !story.finale.allow?.c) {
      return player.endingKinds.allow;
    }
    if (phase === "ruin" && !story.finale.ruin?.c) {
      return player.stages.ruin;
    }
    if (phase === "deny" && !story.finale.deny?.c) {
      return player.stages.deny;
    }
    return fill(phaseData?.c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseData, segment, story, player]);

  const stageLabel =
    phase === "prepare"
      ? player.stages.prepare
      : phase === "stroke"
        ? player.stages.stroke
        : phase === "slow"
          ? player.stages.slow
          : phase === "rest"
            ? player.stages.rest
            : phase === "cooldown"
              ? player.stages.cooldown
              : phase === "ask"
                ? player.stages.ask
                : phase === "build"
                  ? player.stages.build
                  : phase === "choice"
                    ? player.stages.choice
                    : phase === "count"
                      ? player.stages.count
                      : phase === "allow"
                        ? player.stages.allow
                        : phase === "ruin"
                          ? player.stages.ruin
                          : phase === "deny"
                            ? player.stages.deny
                            : phase === "after"
                              ? player.stages.after
                              : phase === "oops"
                                ? player.stages.oops
                                : player.ending;

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
    oscillator.frequency.value = 660;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  function speak(text: string) {
    if (!voice || !text || typeof window === "undefined") {
      return;
    }
    if (voiceAudioRef.current) {
      try {
        voiceAudioRef.current.pause();
      } catch {}
    }
    const mapped = voiceIndexRef.current?.[text.trim()];
    if (mapped && typeof Audio !== "undefined") {
      try {
        const el = voiceAudioRef.current ?? new Audio();
        voiceAudioRef.current = el;
        el.src = mapped.startsWith("/")
          ? mapped
          : `/story-voice/${encodeURIComponent(locale)}/${encodeURIComponent(story.id)}/${mapped}`;
        void el.play().catch(() => {
          if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = locale === "zh" ? "zh-CN" : "en-US";
            u.rate = 0.98;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          }
        });
        return;
      } catch {}
    }
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "zh" ? "zh-CN" : "en-US";
    utterance.rate = 0.98;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function beginStroke(index: number) {
    const next = story.segs[index];
    if (!next) {
      beginFinale();
      return;
    }
    setSegIndex(index);
    setPhase("stroke");
    setTimeLeft(next.G?.d ?? 60);
    setLineIndex(0);
  }

  function beginSlow(index: number) {
    const next = story.segs[index];
    setPhase("slow");
    setTimeLeft(next?.Y?.d ?? 15);
    setLineIndex(0);
  }

  function beginRest(index: number) {
    const next = story.segs[index];
    setPhase("rest");
    setTimeLeft(next?.R?.d ?? 20);
    setLineIndex(0);
  }

  function beginCooldown(index: number) {
    const next = story.segs[index];
    setPhase("cooldown");
    setTimeLeft(next?.X?.d ?? 20);
    setLineIndex(0);
  }

  function beginFirstPlayable() {
    const index = firstPlayable(story, 0);
    if (index >= 0) beginStroke(index);
    else beginFinale();
  }

  function nextAfterSegment() {
    const index = firstPlayable(story, segIndex + 1);
    if (index >= 0) beginStroke(index);
    else beginFinale();
  }

  function finishSegment() {
    if (segment?.ask) {
      setPhase("ask");
      setTimeLeft(null);
      return;
    }
    nextAfterSegment();
  }

  function beginFinale() {
    if (story.finale.build) {
      setPhase("build");
      setTimeLeft(story.finale.build.d ?? 30);
      setLineIndex(0);
      return;
    }
    judge();
  }

  function beginAllow(fromCount = false) {
    if (!fromCount && story.finale.count) {
      setPhase("count");
      setTimeLeft(null);
      setCountLeft(story.finale.count.from);
      setLineIndex(0);
      return;
    }
    setPhase("allow");
    setTimeLeft(null);
    setLineIndex(0);
  }

  function beginRuin() {
    setPhase("ruin");
    setTimeLeft(story.finale.ruin?.d ?? 40);
    setLineIndex(0);
  }

  function beginDeny() {
    setPhase("deny");
    setTimeLeft(story.finale.deny?.d ?? 40);
    setLineIndex(0);
  }

  function finishEnding(kind: EndingKind) {
    setEndingKind(kind);
    setPhase("ending");
    setTimeLeft(null);
    setPaused(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function judge() {
    const judge = story.finale.judge;
    if (!judge || judge.type === "always") {
      beginAllow();
      return;
    }
    if (judge.type === "choice") {
      setPhase("choice");
      setTimeLeft(null);
      setLineIndex(0);
      return;
    }
    const marks = story.marks;
    if (!marks) {
      beginAllow();
      return;
    }
    if (edgesRef.current >= marks.allow) beginAllow();
    else if (edgesRef.current >= marks.allow - marks.ruin) beginRuin();
    else beginDeny();
  }

  function startStory() {
    if (!accepted) {
      setGateOpen(true);
      return;
    }
    ensureAudio();
    setEdges(0);
    edgesRef.current = 0;
    setEndingKind(null);
    setPaused(false);
    setCountLeft(null);
    const first = story.segs[0];
    if (first?.P) {
      setSegIndex(0);
      setPhase("prepare");
      setTimeLeft(first.P.d ?? 20);
      setLineIndex(0);
    } else {
      beginFirstPlayable();
    }
  }

  function quitStory() {
    setPhase("idle");
    setTimeLeft(null);
    setCountLeft(null);
    setPaused(false);
    setLineIndex(0);
    setEdges(0);
    edgesRef.current = 0;
    setEndingKind(null);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function handleEdge() {
    if (phase !== "stroke" && phase !== "slow") return;
    edgesRef.current += 1;
    setEdges(edgesRef.current);
    beginCooldown(segIndex);
  }

  function handleCame() {
    if (phase === "allow" || phase === "after") {
      finishEnding("allow");
      return;
    }
    if (
      phase === "idle" ||
      phase === "ending" ||
      phase === "ruin" ||
      phase === "deny" ||
      phase === "oops"
    ) {
      return;
    }
    setPhase("oops");
    setTimeLeft(20);
    setLineIndex(0);
  }

  function onTimerEnd() {
    switch (phase) {
      case "prepare":
        beginFirstPlayable();
        break;
      case "stroke":
        if (segment?.Y) beginSlow(segIndex);
        else if (segment?.R) beginRest(segIndex);
        else finishSegment();
        break;
      case "slow":
        if (segment?.R) beginRest(segIndex);
        else finishSegment();
        break;
      case "rest":
      case "cooldown": {
        const marks = story.marks;
        if (phase === "cooldown" && marks && edgesRef.current >= marks.allow) {
          beginFinale();
        } else if (phase === "cooldown") {
          beginStroke(segIndex);
        } else {
          finishSegment();
        }
        break;
      }
      case "build":
        judge();
        break;
      case "ruin":
        finishEnding("ruin");
        break;
      case "deny":
        finishEnding("deny");
        break;
      case "after":
        finishEnding("allow");
        break;
      case "oops":
        finishEnding("oops");
        break;
      case "allow":
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (paused || timeLeft === null) return;
    if (timeLeft <= 0) {
      onTimerEnd();
      return;
    }
    const timer = window.setTimeout(
      () => setTimeLeft((value) => (value === null ? null : Math.max(0, value - 1))),
      1000,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, paused, phase]);

  useEffect(() => {
    setLineIndex(0);
  }, [phase, segIndex]);

  useEffect(() => {
    if (lines.length <= 1) return;
    const interval = window.setInterval(
      () => setLineIndex((index) => (index + 1) % lines.length),
      5200,
    );
    return () => window.clearInterval(interval);
  }, [lines]);

  useEffect(() => {
    if (!voice || paused) return;
    const line = lines[lineIndex % Math.max(1, lines.length)];
    if (line) speak(line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex, voice, lines, paused]);

  useEffect(() => {
    if (phase === "ending" || phase === "idle") return;
    if (paused) return;
    let bpm = 0;
    if (phase === "stroke" || phase === "slow") {
      bpm = segment?.bpm ?? phaseData?.bpm ?? 70;
    } else if (phase === "build") {
      bpm = phaseData?.bpm ?? 90;
    }
    if (!bpm) return;
    const interval = 60_000 / bpm;
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
  }, [phase, paused, segment, phaseData]);

  useEffect(() => {
    if (phase !== "count" || paused || countLeft === null) return;
    if (countLeft <= 0) {
      beginAllow(true);
      return;
    }
    const delay = (story.finale.count?.beat ?? 2) * 1000;
    const timer = window.setTimeout(() => {
      click();
      setCountLeft((value) => (value === null ? null : value - 1));
    }, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, countLeft, story.finale.count]);

  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (event: KeyboardEvent) => {
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
      if (phase !== "idle" && phase !== "ending") {
        setPaused((value) => !value);
      }
    }
    if (!paused && (event.key === "e" || event.key === "E")) handleEdge();
    if (!paused && (event.key === "c" || event.key === "C")) handleCame();
    if (event.key === "Escape" && phase !== "idle") quitStory();
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandlerRef.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const ending = endingKind ? story.endings[endingKind] : undefined;
  const afterText =
    endingKind === "allow"
      ? fill(story.finale.after?.c)
      : endingKind === "oops"
        ? fill(story.oops?.c)
        : "";

  if (phase === "idle") {
    return (
      <div className="card rounded-3xl p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground">
          {story.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-strong">
          {story.blurb}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-card-border px-2 py-0.5 text-[10px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          ~{story.mins} {copy.filters.minutes} ·{" "}
          {Object.keys(story.endings).length} {locale === "zh" ? "种结局" : "endings"}
        </p>
        <button
          type="button"
          onClick={startStory}
          className="mt-5 cursor-pointer rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-white"
        >
          {accepted ? player.start : player.confirm}
        </button>
        <p className="mt-3 text-[11px] text-muted">{player.gateBody}</p>
        <Link
          href={localePath(locale, "/story")}
          className="mt-5 block text-xs font-bold text-accent hover:underline"
        >
          ← {player.backToStories}
        </Link>

        {gateOpen && !accepted ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-3xl border border-card-border bg-background-elevated p-6">
              <h2 className="text-xl font-bold text-foreground">
                {player.gateTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-strong">
                {player.gateBody}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.sessionStorage.setItem("story:age", "1");
                    setAccepted(true);
                    setGateOpen(false);
                    ensureAudio();
                    setEdges(0);
                    edgesRef.current = 0;
                    setEndingKind(null);
                    setPaused(false);
                    setCountLeft(null);
                    const first = story.segs[0];
                    if (first?.P) {
                      setSegIndex(0);
                      setPhase("prepare");
                      setTimeLeft(first.P.d ?? 20);
                      setLineIndex(0);
                    } else {
                      beginFirstPlayable();
                    }
                  }}
                  className="cursor-pointer rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white"
                >
                  {player.confirm}
                </button>
                <Link
                  href={localePath(locale, "/story")}
                  className="rounded-2xl border border-card-border px-4 py-3 text-center text-sm font-bold text-muted-strong"
                >
                  {player.under18}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === "ending" && endingKind) {
    return (
      <div className="card rounded-3xl p-6 text-center sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
          {player.endingKinds[endingKind]}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          {ending ? fill(ending.title) : player.ending}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-strong">
          {ending ? fill(ending.line) : ""}
        </p>
        {afterText ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">{afterText}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          {player.edgeCount}: {edges}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={startStory}
            className="cursor-pointer rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white"
          >
            {player.playAgain}
          </button>
          <Link
            href={localePath(locale, "/story")}
            className="rounded-2xl border border-card-border px-5 py-3 text-sm font-bold text-muted-strong"
          >
            {player.backToStories}
          </Link>
        </div>
      </div>
    );
  }

  const showBeat = phase === "stroke" || phase === "slow" || phase === "build";
  const bpm =
    phase === "build" ? phaseData?.bpm ?? 90 : segment?.bpm ?? phaseData?.bpm ?? 70;
  const canEdge = phase === "stroke" || phase === "slow";
  const isQuestion = phase === "ask" || phase === "choice";
  const canContinue =
    phase === "prepare" ||
    phase === "stroke" ||
    phase === "slow" ||
    phase === "rest" ||
    phase === "cooldown" ||
    phase === "build" ||
    phase === "ruin" ||
    phase === "deny" ||
    phase === "after" ||
    phase === "oops";

  return (
    <div className="space-y-3" data-story-player>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
            {stageLabel}
          </p>
          <p className="truncate text-xs text-muted">{segment?.name}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>
            {player.edgeCount}: <span className="font-bold text-foreground">{edges}</span>
          </span>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="cursor-pointer rounded-lg border border-card-border px-2.5 py-1 font-bold text-muted-strong"
          >
            {paused ? player.resume : player.pause}
          </button>
          <button
            type="button"
            onClick={() => setVoice((value) => !value)}
            aria-pressed={voice}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 font-bold ${
              voice
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-card-border text-muted-strong"
            }`}
          >
            {player.voice} {voice ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={quitStory}
            className="cursor-pointer rounded-lg border border-card-border px-2.5 py-1 font-bold text-muted-strong"
          >
            {player.quit}
          </button>
        </div>
      </div>

      <div className="card rounded-3xl p-5 sm:p-7">
        <p className="text-lg font-bold leading-snug text-foreground sm:text-xl">
          {commandText}
        </p>

        {phase === "count" ? (
          <p className="mt-4 text-center font-display text-6xl text-accent">
            {countLeft ?? 0}
          </p>
        ) : null}

        {lines.length ? (
          <p className="mt-4 border-l-2 border-accent/50 pl-4 text-sm italic leading-relaxed text-muted-strong">
            “{lines[lineIndex % lines.length]}”
          </p>
        ) : null}

        {showBeat ? (
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
            <span
              className="beat block h-2.5 w-2.5 rounded-full bg-accent"
              style={{ animationDuration: `${60 / Math.max(20, bpm)}s` }}
            />
            {bpm} BPM
            {timeLeft !== null ? ` · ${timeLeft}s` : ""}
          </div>
        ) : timeLeft !== null ? (
          <p className="mt-4 text-[11px] text-muted">{timeLeft}s</p>
        ) : null}

        {paused ? (
          <p className="mt-4 rounded-xl bg-category-bg px-3 py-2 text-center text-xs font-bold text-muted-strong">
            {player.hints.paused}
          </p>
        ) : null}

        {phase === "ask" && segment?.ask ? (
          <div className="mt-5 grid gap-2">
            {segment.ask.options.map((option) => (
              <button
                key={`${option.label}-${option.route}`}
                type="button"
                onClick={() => {
                  if (option.route) {
                    const target = story.segs.findIndex(
                      (item) =>
                        item.name === option.route || item.route === option.route,
                    );
                    if (target >= 0) {
                      beginStroke(target);
                      return;
                    }
                  }
                  nextAfterSegment();
                }}
                className="cursor-pointer rounded-xl border border-card-border bg-search-bg px-4 py-3 text-left text-sm font-bold text-foreground transition-colors hover:border-accent/60"
              >
                {fill(option.label)}
              </button>
            ))}
          </div>
        ) : null}

        {phase === "choice" ? (
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => beginAllow()}
              className="cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white"
            >
              {fill(story.finale.judge?.yes) || "Yes"}
            </button>
            <button
              type="button"
              onClick={beginDeny}
              className="cursor-pointer rounded-xl border border-card-border px-4 py-3 text-sm font-bold text-muted-strong"
            >
              {fill(story.finale.judge?.no) || "No"}
            </button>
          </div>
        ) : null}

        {!isQuestion ? (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleEdge}
              disabled={!canEdge || paused}
              className="cursor-pointer rounded-xl bg-accent px-3 py-2.5 text-xs font-bold text-white disabled:cursor-default disabled:opacity-40"
            >
              {player.edge}
            </button>
            <button
              type="button"
              onClick={onTimerEnd}
              disabled={!canContinue || paused}
              className="cursor-pointer rounded-xl border border-card-border px-3 py-2.5 text-xs font-bold text-foreground disabled:cursor-default disabled:opacity-40"
            >
              {player.next}
            </button>
            <button
              type="button"
              onClick={handleCame}
              disabled={paused}
              className="cursor-pointer rounded-xl border border-[#ff4d6d]/40 px-3 py-2.5 text-xs font-bold text-[#ff8399] disabled:cursor-default disabled:opacity-40"
            >
              {player.came}
            </button>
          </div>
        ) : null}

        <p className="mt-2 text-[10px] text-muted">
          {canEdge ? player.hints.edge : player.hints.came}
        </p>
      </div>

      <div className="flex justify-between text-[11px] text-muted">
        <Link
          href={localePath(locale, "/story")}
          className="font-bold text-accent hover:underline"
        >
          ← {player.backToStories}
        </Link>
        <span>{story.title}</span>
      </div>
    </div>
  );
}
