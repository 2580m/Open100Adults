"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/data/i18n";
import { storyMeta } from "@/data/stories/meta";
import { LOCALES, type Locale } from "@/data/tools";

import { CheckIcon, GlobeIcon } from "./icons";

const LOCALE_PREFIX = /^\/(en|zh)(?=\/|$)/;
const STORY_ROUTE = /^\/(?:en|zh)\/story\/([^/]+)\/?$/;
const STORY_SLUGS: Record<Locale, Set<string>> = {
  en: new Set(storyMeta.en.map((item) => item.id)),
  zh: new Set(storyMeta.zh.map((item) => item.id)),
};

function swapLocale(pathname: string, target: Locale): string {
  const storyMatch = STORY_ROUTE.exec(pathname);
  if (storyMatch && !STORY_SLUGS[target].has(storyMatch[1])) {
    return `/${target}/story`;
  }
  if (LOCALE_PREFIX.test(pathname)) {
    return pathname.replace(LOCALE_PREFIX, `/${target}`);
  }
  return pathname === "/" ? `/${target}` : `/${target}${pathname}`;
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const dict = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={dict.header.languageAria}
        onClick={() => setOpen((value) => !value)}
        className="glass flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium text-foreground-soft transition-colors hover:text-foreground"
      >
        <GlobeIcon />
        <span>{dict.header.languageShort}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={dict.header.languageAria}
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-card-border bg-background-elevated p-1 shadow-2xl shadow-black/60"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <Link
                key={code}
                role="menuitem"
                href={swapLocale(pathname, code)}
                aria-current={active ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-category-bg-hover ${
                  active ? "text-accent" : "text-foreground-soft"
                }`}
              >
                <span>{dict.language[code]}</span>
                {active ? <CheckIcon className="h-3.5 w-3.5" /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
