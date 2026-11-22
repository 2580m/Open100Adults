import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DglabPanel } from "@/components/tools/DglabPanel";
import { DGLAB_COPY } from "@/data/dglabCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const c = DGLAB_COPY[lang];
  return {
    title: c.pageTitle,
    description: c.pageLead,
    alternates: { canonical: `/${lang}/dglab` },
  };
}

export default async function DglabConsolePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const c = DGLAB_COPY[lang];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">
          {c.pageEyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          {c.pageTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {c.pageLead}
        </p>
      </section>

      <section className="mt-6">
        <DglabPanel locale={lang} />
      </section>
    </main>
  );
}
