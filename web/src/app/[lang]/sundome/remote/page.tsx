import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemotePlay } from "@/components/tools/RemotePlay";
import { remoteCopy } from "@/data/remoteCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = remoteCopy[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/sundome/remote` },
  };
}

export default async function RemotePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = remoteCopy[lang];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
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
        <RemotePlay locale={lang} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.howTo.title}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
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
        <h2 className="text-xl font-bold text-foreground">{copy.safety.title}</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-strong">
          {copy.safety.items.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </section>

      <p className="mt-10 border-t border-card-border pt-4 text-xs leading-relaxed text-muted">
        {copy.disclaimer}
      </p>
    </main>
  );
}
