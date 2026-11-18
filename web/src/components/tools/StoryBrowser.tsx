"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { storyCopy } from "@/data/storyCopy";
import type { StoryMeta } from "@/data/stories/types";
import { localePath, type Locale } from "@/data/tools";

type BodyFilter = "all" | "m" | "f";
type ToneFilter = "all" | "sweet" | "tease" | "hard";
type LengthFilter = "all" | "short" | "mid" | "long";

function bodyLabel(body: "m" | "f", copy: ReturnType<typeof getCopy>) {
  return body === "m" ? copy.filters.forMen : copy.filters.forWomen;
}

function toneLabel(tone: string, copy: ReturnType<typeof getCopy>) {
  if (tone === "sweet") return copy.filters.tones.sweet;
  if (tone === "hard") return copy.filters.tones.hard;
  return copy.filters.tones.tease;
}

function getCopy(locale: Locale) {
  return storyCopy[locale];
}

export function StoryBrowser({
  locale,
  stories,
}: {
  locale: Locale;
  stories: StoryMeta[];
}) {
  const copy = getCopy(locale);
  const router = useRouter();
  const [body, setBody] = useState<BodyFilter>("all");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [length, setLength] = useState<LengthFilter>("all");

  const filtered = useMemo(
    () =>
      stories.filter((story) => {
        if (body !== "all" && story.body !== body) return false;
        if (tone !== "all" && story.tone !== tone) return false;
        if (length === "short" && story.mins > 10) return false;
        if (length === "mid" && (story.mins < 11 || story.mins > 15)) return false;
        if (length === "long" && story.mins < 16) return false;
        return true;
      }),
    [stories, body, tone, length],
  );

  function surprise() {
    const pool = filtered.length ? filtered : stories;
    if (!pool.length) return;
    const story = pool[Math.floor(Math.random() * pool.length)];
    router.push(`${localePath(locale, "/story")}/${story.id}`);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", copy.filters.all],
            ["m", copy.filters.forMen],
            ["f", copy.filters.forWomen],
          ] as [BodyFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setBody(value)}
            aria-pressed={body === value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              body === value
                ? "bg-accent text-white"
                : "border border-card-border text-muted-strong hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["all", copy.filters.all],
            ["sweet", copy.filters.tones.sweet],
            ["tease", copy.filters.tones.tease],
            ["hard", copy.filters.tones.hard],
          ] as [ToneFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTone(value)}
            aria-pressed={tone === value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              tone === value
                ? "bg-accent text-white"
                : "border border-card-border text-muted-strong hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", copy.filters.durations.all],
              ["short", copy.filters.durations.short],
              ["mid", copy.filters.durations.mid],
              ["long", copy.filters.durations.long],
            ] as [LengthFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLength(value)}
              aria-pressed={length === value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                length === value
                  ? "bg-accent text-white"
                  : "border border-card-border text-muted-strong hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={surprise}
          className="cursor-pointer rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent"
        >
          {copy.filters.surprise}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">
        {filtered.length} {copy.filters.stories}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6 text-center text-sm text-muted">
          {copy.filters.noResults}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {filtered.map((story) => (
            <li
              key={story.id}
              className="card rounded-2xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-bold text-accent">
                  {toneLabel(story.tone, copy)}
                </span>
                <span>{bodyLabel(story.body, copy)}</span>
                <span>~{story.mins} {copy.filters.minutes}</span>
              </div>
              <h2 className="mt-2 text-lg font-bold leading-snug text-foreground">
                {story.title}
              </h2>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-strong">
                {story.blurb}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {story.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-card-border px-2 py-0.5 text-[10px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href={`${localePath(locale, "/story")}/${story.id}`}
                className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-accent hover:underline"
              >
                {copy.filters.start} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
