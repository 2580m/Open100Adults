import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardPage } from "@/components/tools/BoardPage";
import { boardCopy } from "@/data/boardCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = boardCopy[lang];
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/board` },
  };
}

export default async function BoardRoute({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <BoardPage locale={lang} />;
}
