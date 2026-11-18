import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RemoteController } from "@/components/tools/RemoteController";
import { REMOTE_TEXT } from "@/data/remoteFullCopy";
import { isLocale } from "@/data/tools";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: REMOTE_TEXT[lang].title,
    description: REMOTE_TEXT[lang].lead,
  };
}

export default async function RemoteControllerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <RemoteController lang={lang} />
    </main>
  );
}
