import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StoryPlayer } from "@/components/tools/StoryPlayer";
import { getStory } from "@/data/stories/server";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const story = getStory(lang, slug);
  if (!story) return {};
  return {
    title: story.title,
    description: story.blurb.slice(0, 180),
    alternates: { canonical: `/${lang}/story/${slug}` },
  };
}

export default async function StoryDetailPage({ params }: PageProps) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const story = getStory(lang, slug);
  if (!story) {
    const other = lang === "zh" ? "en" : "zh";
    if (getStory(other, slug)) {
      redirect(`/${lang}/story`);
    }
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <StoryPlayer story={story} locale={lang} />
    </main>
  );
}
