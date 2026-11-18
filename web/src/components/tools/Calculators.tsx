"use client";

import { useMemo, useState } from "react";

import type {
  PartnersCopy,
  SizeCopy,
  StaminaCopy,
} from "@/data/calculatorCopy";
import {
  AGE_BANDS,
  computePartners,
  computeSize,
  computeStamina,
  toCm,
  type AgeBand,
  type PercentileResult,
  type Rank,
  type SizeState,
} from "@/lib/stats";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  );
}

function shareText(value: number): string {
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function parseNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function RankBadge({ rank, name }: { rank: Rank; name: string }) {
  return (
    <div>
      <span className="inline-flex items-center rounded-xl bg-accent-soft px-3 py-1 font-display text-3xl leading-none text-accent">
        {rank}
      </span>
      <p className="mt-1 text-sm font-bold text-foreground">{name}</p>
    </div>
  );
}

interface ResultCardProps {
  result: PercentileResult;
  labels: {
    eyebrow: string;
    rank: string;
    top: string;
    bottom: string;
    oneIn: string;
    score: string;
  };
  rankNames: Record<Rank, string>;
  items: { label: string; value: string }[];
}

function ResultCard({ result, labels, rankNames, items }: ResultCardProps) {
  const pct = Math.min(99.9, Math.max(0.1, result.pct));
  return (
    <div className="rounded-2xl border border-card-border bg-search-bg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{labels.eyebrow}</p>
          <div className="mt-2 flex items-end gap-3">
            <RankBadge rank={result.rank} name={rankNames[result.rank]} />
            <p className="pb-1 text-xs text-muted">
              {labels.rank} · {labels.score} {result.t.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-tight text-accent">
            {fmt(result.top ? labels.top : labels.bottom, {
              p: shareText(result.share),
            })}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {fmt(labels.oneIn, { n: result.oneIn.toLocaleString() })}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-2 rounded-full bg-category-bg">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#f5a3c8] to-[#b8a4ff]"
          style={{ width: `${pct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-4 w-1 rounded-full bg-foreground"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-card-border bg-card-bg px-3 py-2"
          >
            <dt className="text-muted">{item.label}</dt>
            <dd className="mt-0.5 font-bold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-card-border bg-search-bg p-8 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 flex rounded-xl border border-card-border bg-search-bg p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
              value === option.value
                ? "bg-accent text-white"
                : "text-muted-strong hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-xl border border-card-border bg-search-bg px-3 py-2.5 text-lg font-bold text-foreground outline-none placeholder:text-muted/60 focus:border-accent";

export function SizeCalculator({
  copy,
}: {
  copy: SizeCopy;
}) {
  const [state, setState] = useState<SizeState>("e");
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [length, setLength] = useState("");
  const [girth, setGirth] = useState("");
  const [girthMode, setGirthMode] = useState<"girth" | "diameter">("girth");

  const rawLength = parseNumber(length);
  const rawGirth = parseNumber(girth);

  const result = useMemo(() => {
    if (rawLength === null || rawGirth === null) return null;
    const lengthCm = toCm(rawLength, unit);
    const girthCm =
      girthMode === "diameter" ? toCm(rawGirth, unit) * Math.PI : toCm(rawGirth, unit);
    return computeSize(state, lengthCm, girthCm);
  }, [rawLength, rawGirth, unit, state, girthMode]);

  function changeUnit(next: "cm" | "in") {
    if (next === unit) return;
    const factor = next === "in" ? 1 / 2.54 : 2.54;
    setLength((value) =>
      value === "" ? value : String(Math.round(Number(value) * factor * 10) / 10),
    );
    setGirth((value) =>
      value === "" ? value : String(Math.round(Number(value) * factor * 10) / 10),
    );
    setUnit(next);
  }

  const empty =
    rawLength === null || rawGirth === null
      ? copy.form.empty
      : copy.form.rangeHint;

  return (
    <div className="card rounded-2xl p-5 sm:p-7" data-size-app>
      <div className="grid gap-3 sm:grid-cols-2">
        <Segmented
          label={copy.form.stateLabel}
          value={state}
          options={[
            { value: "e", label: copy.form.erect },
            { value: "f", label: copy.form.flaccid },
          ]}
          onChange={setState}
        />
        <Segmented
          label={copy.form.unitLabel}
          value={unit}
          options={[
            { value: "cm", label: copy.form.cm },
            { value: "in", label: copy.form.inch },
          ]}
          onChange={changeUnit}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-muted">
            {copy.form.length} ({unit})
          </span>
          <input
            inputMode="decimal"
            value={length}
            onChange={(event) =>
              /^\d*\.?\d*$/.test(event.target.value) &&
              setLength(event.target.value)
            }
            placeholder={unit === "cm" ? "13.1" : "5.2"}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">
            {girthMode === "diameter" ? copy.form.diameter : copy.form.girth} ({unit})
          </span>
          <input
            inputMode="decimal"
            value={girth}
            onChange={(event) =>
              /^\d*\.?\d*$/.test(event.target.value) &&
              setGirth(event.target.value)
            }
            placeholder={unit === "cm" ? "11.7" : "4.6"}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">{copy.form.rangeHint}</p>
        <button
          type="button"
          onClick={() =>
            setGirthMode((mode) => (mode === "girth" ? "diameter" : "girth"))
          }
          aria-pressed={girthMode === "diameter"}
          className="shrink-0 cursor-pointer text-[11px] font-bold text-accent underline underline-offset-2"
        >
          {girthMode === "diameter" ? copy.form.girth : copy.form.diameter}
        </button>
      </div>

      <div className="mt-4">
        {result ? (
          <ResultCard
            result={result}
            labels={copy.result}
            rankNames={copy.rankNames}
            items={[
              {
                label: copy.result.length,
                value: `${result.len.cm.toFixed(1)} cm · ${Math.round(result.len.pct)}%`,
              },
              {
                label: copy.result.girth,
                value: `${result.gir.cm.toFixed(1)} cm · ${Math.round(result.gir.pct)}%`,
              },
            ]}
          />
        ) : (
          <EmptyCard text={empty} />
        )}
      </div>
    </div>
  );
}

export function StaminaCalculator({ copy }: { copy: StaminaCopy }) {
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const min = parseNumber(minutes);
  const sec = parseNumber(seconds);

  const totalMinutes = useMemo(() => {
    if (min === null && sec === null) return null;
    return (min ?? 0) + (sec ?? 0) / 60;
  }, [min, sec]);

  const result = useMemo(
    () => (totalMinutes === null ? null : computeStamina(totalMinutes)),
    [totalMinutes],
  );

  const empty =
    totalMinutes === null ? copy.form.empty : copy.form.range;

  return (
    <div className="card rounded-2xl p-5 sm:p-7" data-stamina-app>
      <p className="text-sm font-bold text-foreground">{copy.form.label}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-muted">{copy.form.min}</span>
          <input
            inputMode="numeric"
            value={minutes}
            onChange={(event) =>
              /^\d{0,3}$/.test(event.target.value) && setMinutes(event.target.value)
            }
            placeholder="5"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">{copy.form.sec}</span>
          <input
            inputMode="numeric"
            value={seconds}
            onChange={(event) => {
              const raw = event.target.value;
              if (/^\d{0,2}$/.test(raw) && Number(raw || 0) < 60) setSeconds(raw);
            }}
            placeholder="30"
            className={inputClass}
          />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-muted">{copy.form.hint}</p>

      <div className="mt-4">
        {result ? (
          <ResultCard
            result={result}
            labels={copy.result}
            rankNames={copy.rankNames}
            items={[
              {
                label: copy.result.time,
                value:
                  totalMinutes !== null
                    ? formatClock(totalMinutes * 60)
                    : "—",
              },
            ]}
          />
        ) : (
          <EmptyCard text={empty} />
        )}
      </div>
    </div>
  );
}

export function PartnersCalculator({ copy }: { copy: PartnersCopy }) {
  const [count, setCount] = useState("");
  const [age, setAge] = useState<AgeBand>("all");

  const parsed = parseNumber(count);
  const result = useMemo(
    () =>
      parsed === null || !Number.isInteger(parsed)
        ? null
        : computePartners(parsed, age),
    [parsed, age],
  );

  return (
    <div className="card rounded-2xl p-5 sm:p-7" data-partners-app>
      <label className="block">
        <span className="text-sm font-bold text-foreground">
          {copy.form.label}
        </span>
        <div className="mt-2 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={count}
            onChange={(event) =>
              /^\d{0,3}$/.test(event.target.value) && setCount(event.target.value)
            }
            placeholder="6"
            className={inputClass}
          />
          <span className="shrink-0 text-sm text-muted">{copy.form.unit}</span>
        </div>
      </label>
      <p className="mt-2 text-[11px] text-muted">{copy.form.hint}</p>

      <label className="mt-4 block">
        <span className="text-xs text-muted">{copy.form.compare}</span>
        <select
          value={age}
          onChange={(event) => setAge(event.target.value as AgeBand)}
          className="mt-1 w-full cursor-pointer rounded-xl border border-card-border bg-search-bg px-3 py-2.5 text-sm font-bold text-foreground outline-none focus:border-accent"
        >
          {AGE_BANDS.map((band) => (
            <option key={band} value={band}>
              {copy.form.ages[band]}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        {result ? (
          <ResultCard
            result={result}
            labels={copy.result}
            rankNames={copy.rankNames}
            items={[
              { label: copy.result.count, value: String(result.n) },
              {
                label: copy.form.compare,
                value: copy.form.ages[result.age],
              },
              {
                label: copy.result.same.replace(/\{p\}%?/, "").trim(),
                value: `${result.same < 10 ? result.same.toFixed(1) : Math.round(result.same)}%`,
              },
            ]}
          />
        ) : (
          <EmptyCard text={copy.form.empty} />
        )}
      </div>
    </div>
  );
}
