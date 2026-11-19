import { BoardGame } from "@/components/tools/BoardGame";
import { boardCopy, type SquareKind } from "@/data/boardCopy";
import type { Locale } from "@/data/tools";

const SQUARE_ORDER: Exclude<SquareKind, "start" | "finish">[] = [
  "task",
  "edge",
  "rest",
  "tough",
  "rule",
  "snake",
  "ladder",
  "temptation",
  "card",
  "back",
];

export function BoardPage({ locale }: { locale: Locale }) {
  const copy = boardCopy[locale];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
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
        <BoardGame locale={locale} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{copy.howTo.title}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <h2 className="text-xl font-bold text-foreground">{copy.squares.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.squares.intro}
        </p>
        <ul className="mt-4 divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border">
          {SQUARE_ORDER.map((kind) => (
            <li
              key={kind}
              className="flex items-start gap-3 bg-card-bg px-4 py-3"
            >
              <span className="mt-0.5 w-16 shrink-0 text-xs font-bold text-accent">
                {copy.legend[kind]}
              </span>
              <span className="text-xs leading-relaxed text-muted-strong">
                {copy.squareDescriptions[kind]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">
          {copy.verdictTable.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.verdictTable.intro}
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-card-border">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead className="bg-category-bg text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">
                  {copy.verdictTable.headers.result}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {copy.verdictTable.headers.range50}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {copy.verdictTable.headers.range100}
                </th>
              </tr>
            </thead>
            <tbody>
              {copy.verdictTable.rows.map((row) => (
                <tr
                  key={row.result}
                  className="border-t border-card-border text-muted-strong"
                >
                  <td className="px-3 py-2 font-bold text-foreground">
                    {row.result}
                  </td>
                  <td className="px-3 py-2">{row.range50}</td>
                  <td className="px-3 py-2">{row.range100}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
