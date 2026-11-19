import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PartnerPlay } from "@/components/tools/PartnerPlay";
import { PARTNER_TEXT } from "@/data/partnerCopy";
import { isLocale } from "@/data/tools";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = PARTNER_TEXT[lang];
  return {
    title: t.guestTitle,
    description: t.guestLead,
    alternates: { canonical: `/${lang}/sundome/p` },
  };
}

export default async function PartnerPlayPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <PartnerPlay lang={lang} />
    </main>
  );
}
