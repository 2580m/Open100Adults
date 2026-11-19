import type { LegalPageCopy } from "@/data/i18n/types";

export function LegalArticle({ copy }: { copy: LegalPageCopy }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {copy.title}
      </h1>
      <p className="mt-2 text-xs text-muted">{copy.updated}</p>

      <article className="mt-8 space-y-8">
        {copy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-foreground">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-strong">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
