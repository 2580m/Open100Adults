import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/data/tools";

import { en } from "./en";
import type { Dictionary } from "./types";
import { zh } from "./zh";

export { DEFAULT_LOCALE, isLocale, LOCALES };
export type { Locale };

export const DICTIONARIES: Record<Locale, Dictionary> = { en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Narrow an arbitrary route param to a supported locale, falling back to en. */
export function resolveLocale(raw: string | undefined): Locale {
  if (raw && isLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}
