import type { Locale } from "@/data/tools";

import { enStories } from "./en";
import { zhStories } from "./zh";
import type { Story } from "./types";

export function getStory(locale: Locale, slug: string): Story | undefined {
  const map = locale === "zh" ? zhStories : enStories;
  return map[slug];
}

export function storySlugs(locale: Locale): string[] {
  return Object.keys(locale === "zh" ? zhStories : enStories);
}
