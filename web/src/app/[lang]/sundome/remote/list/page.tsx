import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemoteRoomList } from "@/components/tools/RemoteRoomList";
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
    title: `${f.listTitle} · ${f.title}`,
    description: f.listLead,
    alternates: { canonical: `/${lang}/sundome/remote/list` },
  };
}

export default async function RemoteListPage({ params }: PageProps) {
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
          {f.listTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {f.listLead}
        </p>
      </section>

      <section className="mt-6">
        <RemoteRoomList locale={lang} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">{f.safeTitle}</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-strong">
          {f.safe.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
