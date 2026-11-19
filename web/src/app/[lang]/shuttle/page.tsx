import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShuttlePage } from "@/components/tools/ShuttlePage";
import { shuttleCopy } from "@/data/shuttleCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = shuttleCopy[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/shuttle` },
  };
}

export default async function ShuttleIndexPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ShuttlePage locale={lang} />;
}
