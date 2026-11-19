import type { Rank } from "@/lib/stats";

export interface CalculatorPageCopy {
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  rankTable: {
    title: string;
    intro: string;
    rows: { rank: Rank; label: string; detail: string }[];
  };
  howTo: {
    title: string;
    steps: { title: string; body: string }[];
  };
  data: { title: string; paragraphs: string[] };
  faq: { title: string; items: { q: string; a: string }[] };
  disclaimer: string;
}

export function CalculatorPage({
  copy,
  children,
}: {
  copy: CalculatorPageCopy;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
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

      <section className="mt-6">{children}</section>

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
        <h2 className="text-xl font-bold text-foreground">
          {copy.rankTable.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.rankTable.intro}
        </p>
        <ul className="mt-4 divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border">
          {copy.rankTable.rows.map((row) => (
            <li
              key={row.rank}
              className="flex items-center gap-3 bg-card-bg px-4 py-3"
            >
              <span className="w-10 shrink-0 font-display text-xl text-accent">
                {row.rank}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-foreground">
                {row.label}
              </span>
              <span className="shrink-0 text-xs text-muted">{row.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.data.title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-strong">
          {copy.data.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
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
