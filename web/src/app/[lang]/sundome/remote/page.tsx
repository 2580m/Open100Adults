import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemotePlay } from "@/components/tools/RemotePlay";
import { REMOTE_PAGE } from "@/data/remoteFullCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const f = REMOTE_PAGE[lang];
  return {
    title: f.title,
    description: f.lead,
    alternates: { canonical: `/${lang}/sundome/remote` },
  };
}

export default async function RemotePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const f = REMOTE_PAGE[lang];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">
          {f.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          {f.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {f.lead}
        </p>
      </section>

      <RemotePlay lang={lang} />
    </main>
  );
}
