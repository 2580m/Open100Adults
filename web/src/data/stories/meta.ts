import enMeta from "./en/index.json";
import zhMeta from "./zh/index.json";
import type { Locale } from "@/data/tools";
import type { StoryMeta } from "./types";

export const storyMeta: Record<Locale, StoryMeta[]> = {
  en: enMeta as StoryMeta[],
  zh: zhMeta as StoryMeta[],
};
