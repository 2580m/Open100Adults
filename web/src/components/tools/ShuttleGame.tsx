"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  SHUTTLE_LEVELS,
  SHUTTLE_MAX,
  type ShuttleCopy,
} from "@/data/shuttleCopy";
import { localePath, type Locale } from "@/data/tools";

const SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const BEST_KEY = "shuttle:best";
const NOTES_PER_SHUTTLE = 8;

type Status = "idle" | "countdown" | "playing" | "finished";
type Leg = "out" | "back";
type Mode = "stops" | "continuous";

interface PlayState {
  level: number;
  completed: number;
  total: number;
  note: number;
  leg: Leg;
}

export function ShuttleGame({
  copy,
  locale,
  variant,
}: {
  copy: ShuttleCopy;
  locale: Locale;
  variant?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [countdown, setCountdown] = useState(3);
  const [level, setLevel] = useState(1);
  const [completedInLevel, setCompletedInLevel] = useState(0);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState(0);
  const [leg, setLeg] = useState<Leg>("out");
  const [mode, setMode] = useState<Mode>("stops");
  const [best, setBest] = useState<number | null>(null);
  const [result, setResult] = useState<{ total: number; level: number } | null>(
    null,
  );
  const [gateOpen, setGateOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [cameArmed, setCameArmed] = useState(false);

  const bestKey = variant ? `shuttle:best:${variant}` : BEST_KEY;
  const audioRef = useRef<AudioContext | null>(null);
  const playRef = useRef<PlayState>({
    level: 1,
    completed: 0,
    total: 0,
    note: 0,
    leg: "out",
  });
  const cancelledRef = useRef(false);
  const cameTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem("shuttle:age") === "1") {
      setAccepted(true);
    }
    const stored = Number(window.localStorage.getItem(bestKey) ?? 0);
    setBest(Number.isFinite(stored) && stored > 0 ? stored : null);
  }, [bestKey]);

  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.state !== "closed") {
        void audioRef.current.close();
      }
      if (cameTimerRef.current) window.clearTimeout(cameTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "countdown") return;
    if (countdown <= 0) {
      setStatus("playing");
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 800);
    return () => window.clearTimeout(timer);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== "playing") return;

    cancelledRef.current = false;
    const state: PlayState = { level: 1, completed: 0, total: 0, note: 0, leg: "out" };
    playRef.current = state;
    setLevel(1);
    setCompletedInLevel(0);
    setTotal(0);
    setNote(0);
    setLeg("out");

    let timer = 0;

    function schedule(delay: number) {
      timer = window.setTimeout(tick, delay);
    }

    function finishRun(shuttles: number, reachedLevel: number) {
      cancelledRef.current = true;
      window.clearTimeout(timer);
      setResult({ total: shuttles, level: Math.min(reachedLevel, SHUTTLE_LEVELS.length) });
      setStatus("finished");
      const previous = Number(window.localStorage.getItem(bestKey) ?? 0);
      if (shuttles > previous) {
        window.localStorage.setItem(bestKey, String(shuttles));
        setBest(shuttles);
      }
    }

    function tick() {
      if (cancelledRef.current) return;
      const config = SHUTTLE_LEVELS[state.level - 1];
      const interval = (config.seconds * 1000) / NOTES_PER_SHUTTLE;
      const frequencies = state.leg === "out" ? SCALE : [...SCALE].reverse();
      beep(frequencies[state.note], Math.min(0.22, (interval / 1000) * 0.55));

      setLevel(state.level);
      setTotal(state.total);
      setCompletedInLevel(state.completed);
      setNote(state.note);
      setLeg(state.leg);

      state.note += 1;
      if (state.note >= NOTES_PER_SHUTTLE) {
        state.note = 0;
        state.total += 1;
        state.completed += 1;
        state.leg = state.leg === "out" ? "back" : "out";

        if (state.completed >= config.shuttles) {
          state.completed = 0;
          state.level += 1;
          if (state.level > SHUTTLE_LEVELS.length) {
            finishRun(state.total, SHUTTLE_LEVELS.length);
            return;
          }
          setLevel(state.level);
          setTotal(state.total);
          setCompletedInLevel(0);
          setNote(0);
          setLeg(state.leg);
          schedule(interval + 1200);
          return;
        }

        setTotal(state.total);
        setCompletedInLevel(state.completed);
        setNote(0);
        setLeg(state.leg);
      }

      schedule(interval);
    }

    schedule(80);

    return () => {
      cancelledRef.current = true;
      window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "playing" || !("wakeLock" in navigator)) return;
    type WakeLockNavigator = Navigator & {
      wakeLock?: { request(type: string): Promise<{ release(): Promise<void> }> };
    };
    let sentinel: { release(): Promise<void> } | undefined;
    (navigator as WakeLockNavigator).wakeLock
      ?.request("screen")
      .then((lock) => {
        sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      void sentinel?.release().catch(() => undefined);
    };
  }, [status]);

  function ensureAudio() {
    type AudioWindow = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = new Ctor();
    }
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume();
    }
  }

  function beep(frequency: number, duration: number) {
    const ctx = audioRef.current;
    if (!ctx || ctx.state === "closed") return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function beginCountdown() {
    ensureAudio();
    setResult(null);
    setCountdown(3);
    setStatus("countdown");
  }

  function handleStart() {
    if (!accepted) {
      setGateOpen(true);
      return;
    }
    beginCountdown();
  }

  function finishNow() {
    if (status !== "playing") return;
    cancelledRef.current = true;
    const state = playRef.current;
    setResult({
      total: state.total,
      level: Math.min(state.level, SHUTTLE_LEVELS.length),
    });
    setStatus("finished");
    const previous = Number(window.localStorage.getItem(bestKey) ?? 0);
    if (state.total > previous) {
      window.localStorage.setItem(bestKey, String(state.total));
      setBest(state.total);
    }
  }

  function handleCame() {
    if (status !== "playing") return;
    if (!cameArmed) {
      setCameArmed(true);
      if (cameTimerRef.current) window.clearTimeout(cameTimerRef.current);
      cameTimerRef.current = window.setTimeout(() => setCameArmed(false), 3000);
      return;
    }
    setCameArmed(false);
    finishNow();
  }

  const config = SHUTTLE_LEVELS[Math.min(level, SHUTTLE_LEVELS.length) - 1];
  const handsOff = mode === "stops" && leg === "back" && status === "playing";
  const progress = config ? (completedInLevel / config.shuttles) * 100 : 0;

  return (
    <div className="space-y-4">
      <div
        className={`card rounded-2xl p-5 transition-colors sm:p-7 ${
          handsOff ? "border-[#ff4d6d]/60 bg-[#ff4d6d]/10" : ""
        }`}
        data-shuttle-app
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              {copy.labels.mode}
            </span>
            {(["stops", "continuous"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={status === "playing" || status === "countdown"}
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:cursor-default disabled:opacity-60 ${
                  mode === option
                    ? "bg-accent text-white"
                    : "border border-card-border text-muted-strong"
                }`}
              >
                {option === "stops" ? copy.labels.withStops : copy.labels.continuous}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {copy.labels.best}:{" "}
            <span className="font-bold text-foreground">
              {best === null ? copy.labels.noBest : best}
            </span>
          </p>
        </div>

        {status === "idle" ? (
          <div className="mt-8 text-center">
            <p className="font-display text-5xl text-foreground">21</p>
            <p className="mt-1 text-sm text-muted-strong">{copy.labels.gateTitle}</p>
            <p className="mt-1 text-xs text-muted">
              {copy.labels.total}: {SHUTTLE_MAX}
              {variant ? ` · ${variant}` : ""}
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-5 cursor-pointer rounded-2xl bg-accent px-8 py-4 text-base font-bold text-white"
            >
              {accepted ? copy.labels.start : copy.labels.confirm}
            </button>
            <p className="mt-3 text-[11px] text-muted">{copy.labels.gateBody}</p>
          </div>
        ) : null}

        {status === "countdown" ? (
          <div className="mt-8 flex flex-col items-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {copy.labels.ready}
            </p>
            <p className="font-display text-8xl text-accent">
              {countdown > 0 ? countdown : 1}
            </p>
          </div>
        ) : null}

        {status === "playing" ? (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-card-border bg-search-bg px-2 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {copy.labels.level}
                </p>
                <p className="font-display text-3xl text-foreground">{level}</p>
              </div>
              <div className="rounded-xl border border-card-border bg-search-bg px-2 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {copy.labels.total}
                </p>
                <p className="font-display text-3xl text-accent">{total}</p>
              </div>
              <div className="rounded-xl border border-card-border bg-search-bg px-2 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {copy.labels.shuttles}
                </p>
                <p className="font-display text-3xl text-foreground">
                  {completedInLevel}/{config.shuttles}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span
                className={`text-sm font-bold ${
                  handsOff ? "text-[#ff4d6d]" : "text-accent"
                }`}
              >
                {handsOff
                  ? copy.labels.handsOff
                  : leg === "out"
                    ? copy.labels.outbound
                    : copy.labels.back}
              </span>
              <span className="text-xs text-muted">
                {copy.labels.notesCol}: {config.notesPerMin}
              </span>
            </div>

            <div className="mt-2 flex gap-1.5">
              {Array.from({ length: NOTES_PER_SHUTTLE }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= note
                      ? handsOff
                        ? "bg-[#ff4d6d]"
                        : "bg-accent"
                      : "bg-category-bg"
                  }`}
                />
              ))}
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-category-bg">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f5a3c8] to-[#b8a4ff] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              {handsOff ? copy.labels.handsOff : copy.labels.stroke}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCame}
                className="flex-1 cursor-pointer rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white"
              >
                {cameArmed ? copy.labels.cameConfirm : copy.labels.came}
              </button>
              <button
                type="button"
                onClick={finishNow}
                className="cursor-pointer rounded-2xl border border-card-border px-4 py-3 text-sm font-bold text-muted-strong"
              >
                {copy.labels.stop}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted">
              {copy.labels.cameHint}
            </p>
          </div>
        ) : null}

        {status === "finished" && result ? (
          <div className="mt-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              {copy.labels.finished}
            </p>
            <p className="mt-1 text-sm text-muted-strong">{copy.labels.result}</p>
            <p className="font-display text-7xl text-accent">{result.total}</p>
            <p className="text-sm text-muted">
              {copy.labels.level} {result.level}
            </p>
            {result.total > 0 && result.total >= (best ?? 0) ? (
              <p className="mt-1 text-xs text-accent-2">{copy.labels.saved}</p>
            ) : null}
            <button
              type="button"
              onClick={beginCountdown}
              className="mt-4 cursor-pointer rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-white"
            >
              {copy.labels.playAgain}
            </button>
          </div>
        ) : null}
      </div>

      {gateOpen && !accepted ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shuttle-gate-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-card-border bg-background-elevated p-6">
            <h2
              id="shuttle-gate-title"
              className="text-xl font-bold text-foreground"
            >
              {copy.labels.gateTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-strong">
              {copy.labels.gateBody}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.setItem("shuttle:age", "1");
                  setAccepted(true);
                  setGateOpen(false);
                  beginCountdown();
                }}
                className="cursor-pointer rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white"
              >
                {copy.labels.confirm}
              </button>
              <Link
                href={localePath(locale, "")}
                className="rounded-2xl border border-card-border px-4 py-3 text-center text-sm font-bold text-muted-strong"
              >
                {copy.labels.under18}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
