"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  STREAK_TITLES,
  streakCopy,
  type SlipTag,
  type StreakMode,
} from "@/data/streakCopy";
import type { Locale } from "@/data/tools";

const DAY_MS = 86_400_000;
const STORE_KEY = "streak:data";
const MODES: StreakMode[] = ["full", "edge", "porn"];
const SLIP_TAGS: SlipTag[] = ["bored", "stress", "bed", "sns", "alcohol", "other"];

interface PastStreak {
  s: number;
  e: number;
  tag: SlipTag;
}

interface StreakData {
  v: 1;
  mode: StreakMode;
  start: number | null;
  past: PastStreak[];
  kept: string[];
  urges: string[];
  celebrated: number[];
}

function emptyData(): StreakData {
  return {
    v: 1,
    mode: "full",
    start: null,
    past: [],
    kept: [],
    urges: [],
    celebrated: [],
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateInputValue(ms: number): string {
  return dayKey(ms);
}

function parseDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isMode(value: unknown): value is StreakMode {
  return typeof value === "string" && MODES.includes(value as StreakMode);
}

function isTag(value: unknown): value is SlipTag {
  return typeof value === "string" && SLIP_TAGS.includes(value as SlipTag);
}

function normalize(input: unknown): StreakData | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const start =
    typeof raw.start === "number" && Number.isFinite(raw.start) ? raw.start : null;
  const past: PastStreak[] = Array.isArray(raw.past)
    ? raw.past.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Record<string, unknown>;
        if (
          typeof entry.s === "number" &&
          typeof entry.e === "number" &&
          isTag(entry.tag)
        ) {
          return [{ s: entry.s, e: entry.e, tag: entry.tag }];
        }
        return [];
      })
    : [];
  const kept = Array.isArray(raw.kept)
    ? raw.kept.filter((item): item is string => typeof item === "string")
    : [];
  const urges = Array.isArray(raw.urges)
    ? raw.urges.filter((item): item is string => typeof item === "string")
    : [];
  const celebrated = Array.isArray(raw.celebrated)
    ? raw.celebrated.filter(
        (item): item is number => typeof item === "number" && Number.isFinite(item),
      )
    : [];

  return {
    v: 1,
    mode: isMode(raw.mode) ? raw.mode : "full",
    start,
    past,
    kept,
    urges,
    celebrated,
  };
}

function computeStats(data: StreakData, now: number) {
  const current = data.start
    ? Math.max(0, Math.floor((now - data.start) / DAY_MS))
    : 0;
  const pastDays = data.past.map((entry) =>
    Math.max(0, Math.floor((entry.e - entry.s) / DAY_MS)),
  );
  const longest = Math.max(current, ...pastDays, 0);
  const total = current + pastDays.reduce((sum, days) => sum + days, 0);
  const prefix = dayKey(now).slice(0, 7);
  const thisMonth = data.kept.filter((key) => key.startsWith(prefix)).length;

  const byTag = Object.fromEntries(SLIP_TAGS.map((tag) => [tag, 0])) as Record<
    SlipTag,
    number
  >;
  for (const entry of data.past) byTag[entry.tag] += 1;

  const periods = [0, 0, 0, 0];
  for (const urge of data.urges) {
    const date = new Date(urge);
    if (Number.isNaN(date.getTime())) continue;
    periods[Math.min(3, Math.floor(date.getHours() / 6))] += 1;
  }

  return {
    current,
    longest,
    total,
    thisMonth,
    slips: data.past.length,
    byTag,
    periods,
  };
}

export function StreakCounter({ locale }: { locale: Locale }) {
  const copy = streakCopy[locale];
  const labels = copy.labels;
  const titles = STREAK_TITLES[locale];

  const [data, setData] = useState<StreakData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipTag, setSlipTag] = useState<SlipTag | null>(null);
  const [urgeRemaining, setUrgeRemaining] = useState<number | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) {
      setData(emptyData());
      return;
    }
    try {
      setData(normalize(JSON.parse(raw)) ?? emptyData());
    } catch {
      setData(emptyData());
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (urgeRemaining === null || urgeRemaining <= 0) return;
    const timer = window.setTimeout(
      () => setUrgeRemaining((value) => (value === null ? null : Math.max(0, value - 1))),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [urgeRemaining]);

  const stats = useMemo(
    () => (data ? computeStats(data, now) : null),
    [data, now],
  );

  const calendar = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1);
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const leading = first.getDay();
    const kept = new Set(data?.kept ?? []);
    const slips = new Set(
      (data?.past ?? []).map((entry) => dayKey(entry.e)),
    );
    const cells: {
      day: number | null;
      key: string | null;
      kept: boolean;
      slipped: boolean;
    }[] = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push({ day: null, key: null, kept: false, slipped: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${viewMonth.year}-${pad(viewMonth.month + 1)}-${pad(day)}`;
      cells.push({ day, key, kept: kept.has(key), slipped: slips.has(key) });
    }
    return cells;
  }, [data, viewMonth]);

  if (!data || !stats) {
    return (
      <div className="card rounded-2xl p-8 text-center text-sm text-muted">
        {labels.notStarted}
      </div>
    );
  }

  const todayStamp = dayKey(now);
  const keptToday = data.kept.includes(todayStamp);
  const reached = titles.filter((title) => stats.current >= title.days);
  const currentTitle = reached.length ? reached[reached.length - 1] : null;
  const nextTitle = titles.find((title) => stats.current < title.days) ?? null;
  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "long" },
  );
  const weekdays =
    locale === "zh" ? ["日", "一", "二", "三", "四", "五", "六"] : ["S", "M", "T", "W", "T", "F", "S"];

  function update(change: (current: StreakData) => StreakData) {
    setData((value) => (value ? change(value) : value));
  }

  function startStreak() {
    update((value) => ({ ...value, start: Date.now() }));
    setNow(Date.now());
  }

  function keepToday() {
    update((value) =>
      value.kept.includes(todayStamp)
        ? value
        : { ...value, kept: [...value.kept, todayStamp] },
    );
  }

  function confirmSlip() {
    if (!slipTag) return;
    const end = Date.now();
    update((value) => ({
      ...value,
      past: [
        ...value.past,
        { s: value.start ?? end, e: end, tag: slipTag },
      ],
      start: end,
      celebrated: [],
    }));
    setSlipOpen(false);
    setSlipTag(null);
    setNow(end);
  }

  function triggerUrge() {
    update((value) => ({
      ...value,
      urges: [...value.urges, new Date().toISOString()],
    }));
    setUrgeRemaining(90);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "100adults-streak.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed = normalize(JSON.parse(await file.text()));
      if (!parsed) {
        setImportMessage(labels.importError);
        return;
      }
      setData(parsed);
      setImportMessage(labels.imported);
    } catch {
      setImportMessage(labels.importError);
    }
  }

  function deleteAll() {
    if (!window.confirm(labels.confirmDelete)) return;
    const fresh = emptyData();
    setData(fresh);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  }

  const urgeElapsed = urgeRemaining === null ? 0 : 90 - urgeRemaining;
  const urgeCycle = urgeElapsed % 14;
  const urgePhase =
    urgeRemaining === 0
      ? labels.urgeDone
      : urgeCycle < 4
        ? labels.breatheIn
        : urgeCycle < 8
          ? labels.hold
          : labels.breatheOut;
  const maxTag = Math.max(1, ...SLIP_TAGS.map((tag) => stats.byTag[tag]));
  const maxPeriod = Math.max(1, ...stats.periods);

  return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-5 sm:p-7" data-streak-app>
        <div className="flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update((value) => ({ ...value, mode }))}
              aria-pressed={data.mode === mode}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                data.mode === mode
                  ? "bg-accent text-white"
                  : "border border-card-border text-muted-strong hover:text-foreground"
              }`}
            >
              {copy.modes[mode].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{copy.modes[data.mode].description}</p>

        <div className="mt-6 flex items-end gap-3">
          <span className="font-display text-7xl leading-none text-foreground">
            {stats.current}
          </span>
          <span className="pb-2 text-sm text-muted">{labels.days}</span>
        </div>
        <p className="mt-1 text-sm text-muted-strong">
          {data.start
            ? `${labels.startedOn} ${new Date(data.start).toLocaleDateString(
                locale === "zh" ? "zh-CN" : "en-US",
                { year: "numeric", month: "short", day: "numeric" },
              )}`
            : labels.notStarted}
          {currentTitle ? ` · ${currentTitle.title}` : ""}
          {nextTitle ? ` · ${labels.days} ${nextTitle.days}` : ""}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {data.start === null ? (
            <button
              type="button"
              onClick={startStreak}
              className="cursor-pointer rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white"
            >
              {labels.start}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={keepToday}
                disabled={keptToday}
                className="cursor-pointer rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white disabled:cursor-default disabled:opacity-60"
              >
                {keptToday ? labels.keptTodayDone : labels.keptToday}
              </button>
              <button
                type="button"
                onClick={() => setSlipOpen((value) => !value)}
                className="cursor-pointer rounded-2xl border border-card-border px-5 py-3 text-sm font-bold text-muted-strong transition-colors hover:border-accent/60 hover:text-foreground"
              >
                {labels.slip}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={triggerUrge}
            className="cursor-pointer rounded-2xl bg-[#ff4d6d] px-5 py-3 text-sm font-bold text-white"
          >
            {labels.urgeHit}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{labels.urgeHint}</p>

        {data.start !== null ? (
          <label className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            {labels.changeStart}
            <input
              type="date"
              value={dateInputValue(data.start)}
              max={dateInputValue(Date.now())}
              onChange={(event) => {
                const parsed = parseDateInput(event.target.value);
                if (parsed !== null) {
                  update((value) => ({
                    ...value,
                    start: Math.min(parsed, Date.now()),
                  }));
                }
              }}
              className="rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
            />
          </label>
        ) : null}

        {slipOpen ? (
          <div className="mt-4 rounded-2xl border border-card-border bg-search-bg p-4">
            <p className="text-sm font-bold text-foreground">{labels.slipTitle}</p>
            <p className="mt-1 text-xs text-muted">{labels.slipPrompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SLIP_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSlipTag(tag)}
                  aria-pressed={slipTag === tag}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    slipTag === tag
                      ? "bg-accent text-white"
                      : "border border-card-border text-muted-strong hover:text-foreground"
                  }`}
                >
                  {labels.slipTagsLabels[tag]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmSlip}
                disabled={!slipTag}
                className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:cursor-default disabled:opacity-50"
              >
                {labels.slipConfirm}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSlipOpen(false);
                  setSlipTag(null);
                }}
                className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-muted-strong"
              >
                {labels.cancel}
              </button>
            </div>
          </div>
        ) : null}

        {urgeRemaining !== null ? (
          <div className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft p-4">
            <div className="flex items-center gap-4">
              <span className="font-display text-4xl text-accent">
                {urgeRemaining}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{urgePhase}</p>
                <p className="text-xs text-muted">{labels.urgeHint}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-strong">
              {labels.urgeActions.map((action) => (
                <li key={action}>· {action}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setUrgeRemaining(null)}
              className="mt-3 cursor-pointer text-xs font-bold text-accent underline underline-offset-2"
            >
              {labels.cancel}
            </button>
          </div>
        ) : null}

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            {labels.titles}
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {titles.map((title) => {
              const done = stats.current >= title.days;
              return (
                <li
                  key={title.days}
                  className={`rounded-xl border px-2 py-2 text-center ${
                    done
                      ? "border-accent/40 bg-accent-soft text-foreground"
                      : "border-card-border text-muted"
                  }`}
                >
                  <span className="block text-[11px] text-muted">
                    {title.days}
                  </span>
                  <span className="block text-[11px] font-bold">
                    {title.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              {labels.calendar}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setViewMonth(({ year, month }) =>
                    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
                  )
                }
                className="glass flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-strong"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setViewMonth(({ year, month }) =>
                    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
                  )
                }
                className="glass flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-strong"
              >
                ›
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">{monthLabel}</p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
            {weekdays.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendar.map((cell, index) => (
              <div
                key={cell.key ?? `blank-${index}`}
                className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                  cell.day === null
                    ? ""
                    : cell.slipped
                      ? "bg-[#ff4d6d]/30 font-bold text-foreground"
                      : cell.kept
                        ? "bg-accent-soft font-bold text-accent"
                        : "border border-card-border text-muted-strong"
                }`}
              >
                {cell.day}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-soft" />
              {labels.kept}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d6d]/40" />
              {labels.slipped}
            </span>
          </div>
        </section>

        <section className="card rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground">{labels.stats}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {[
              [labels.current, stats.current],
              [labels.best, stats.longest],
              [labels.total, stats.total],
              [labels.keptThisMonth, stats.thisMonth],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-card-border bg-search-bg px-3 py-2"
              >
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="font-display text-2xl text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-xs font-bold text-foreground">
            {labels.slipTags} · {stats.slips}
          </p>
          {stats.slips === 0 ? (
            <p className="mt-1 text-[11px] text-muted">{labels.nothingLogged}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {SLIP_TAGS.map((tag) => {
                const count = stats.byTag[tag];
                if (!count) return null;
                return (
                  <li key={tag} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 shrink-0 text-muted">
                      {labels.slipTagsLabels[tag]}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-category-bg">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${(count / maxTag) * 100}%` }}
                      />
                    </span>
                    <span className="w-4 text-right text-muted">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-xs font-bold text-foreground">
            {labels.whenUrges}
          </p>
          {data.urges.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">{labels.nothingLogged}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {(["night", "morning", "afternoon", "evening"] as const).map(
                (period, index) => {
                  const count = stats.periods[index];
                  return (
                    <li key={period} className="flex items-center gap-2 text-[11px]">
                      <span className="w-12 shrink-0 text-muted">
                        {labels.periods[period]}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-category-bg">
                        <span
                          className="block h-full rounded-full bg-[#f5a3c8]"
                          style={{ width: `${(count / maxPeriod) * 100}%` }}
                        />
                      </span>
                      <span className="w-4 text-right text-muted">{count}</span>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </section>
      </div>

      <section className="card rounded-2xl p-5">
        <h2 className="text-base font-bold text-foreground">{labels.saveRestore}</h2>
        <p className="mt-1 text-xs text-muted">{labels.saveNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground"
          >
            {labels.exportJson}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground"
          >
            {labels.importJson}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={deleteAll}
            className="cursor-pointer rounded-xl border border-[#ff4d6d]/40 px-4 py-2 text-xs font-bold text-[#ff8399]"
          >
            {labels.deleteAll}
          </button>
        </div>
        {importMessage ? (
          <p className="mt-2 text-xs text-muted-strong">{importMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
