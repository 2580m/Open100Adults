import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SundomePage } from "@/components/tools/SundomePage";
import { sundomeCopy } from "@/data/sundomeCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = sundomeCopy[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/sundome` },
  };
}

export default async function SundomeIndexPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <SundomePage locale={lang} />;
}
