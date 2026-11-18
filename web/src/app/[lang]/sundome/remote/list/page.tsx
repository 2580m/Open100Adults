import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemoteRoomList } from "@/components/tools/RemoteRoomList";
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
    title: `${copy.list.title} · ${copy.title}`,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/sundome/remote/list` },
  };
}

export default async function RemoteListPage({ params }: PageProps) {
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
          {copy.list.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {copy.list.lead}
        </p>
      </section>

      <section className="mt-6">
        <RemoteRoomList locale={lang} />
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
