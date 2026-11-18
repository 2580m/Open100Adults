import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalArticle } from "@/components/LegalArticle";
import { getDictionary, isLocale } from "@/data/i18n";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = getDictionary(lang).legalMeta.statement2257;
  return { title: copy.title, description: copy.metaDescription };
}

export default async function Statement2257Page({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LegalArticle copy={getDictionary(lang).legalMeta.statement2257} />;
}
