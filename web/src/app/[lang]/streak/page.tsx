import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StreakCounter } from "@/components/tools/StreakCounter";
import { streakCopy } from "@/data/streakCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = streakCopy[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/streak` },
  };
}

export default async function StreakPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = streakCopy[lang];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-base text-muted-strong">{copy.tagline}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.lead}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {copy.badges.map((badge) => (
            <li
              key={badge}
              className="rounded-full border border-card-border bg-category-bg px-2.5 py-1 text-[11px] font-medium text-muted-strong"
            >
              {badge}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <StreakCounter locale={lang} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.howTo.title}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {copy.howTo.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-card-border bg-card-bg p-4"
            >
              <span className="font-display text-2xl italic text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-sm font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">
          {copy.dayByDay.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.dayByDay.intro}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {copy.dayByDay.items.map((item) => (
            <li
              key={item.day}
              className="rounded-2xl border border-card-border bg-card-bg p-4"
            >
              <span className="font-display text-2xl italic text-accent">
                {item.day}
              </span>
              <h3 className="mt-1 text-sm font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.tips.title}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {copy.tips.items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-card-border bg-card-bg p-4"
            >
              <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.faq.title}</h2>
        <div className="mt-3">
          {copy.faq.items.map((item) => (
            <div
              key={item.q}
              className="border-b border-card-border py-4 last:border-b-0"
            >
              <h3 className="text-sm font-bold text-foreground">
                <span className="mr-2 font-display italic text-accent">Q.</span>
                {item.q}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-strong">
                <span className="mr-2 font-display italic text-accent-2">A.</span>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 border-t border-card-border pt-4 text-xs leading-relaxed text-muted">
        {copy.disclaimer}
      </p>
    </main>
  );
}
