"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getDictionary } from "@/data/i18n";
import {
  HEADER_BAR_TOOLS,
  NAV_SECTIONS,
  TOOL_META,
  assetPath,
  localePath,
  type Locale,
} from "@/data/tools";

import { ChevronRightIcon, CloseIcon, MenuIcon } from "./icons";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // A navigation settles on a new pathname; drop the menu so it does not
  // linger over the next page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onDesktop(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [menuOpen]);

  const homeHref = localePath(locale, "");

  function isActive(path: string) {
    return pathname === localePath(locale, path);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/60 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <div className="relative mx-auto max-w-6xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            href={homeHref}
            aria-label={dict.header.logoAria}
            className="group flex shrink-0 items-baseline gap-2.5 transition-opacity hover:opacity-90"
          >
            <span
              className="font-display text-2xl leading-none tracking-tight"
              data-site-logo="true"
            >
              <span className="neon-soft italic">100</span>
              <span className="text-foreground">Adults</span>
            </span>
            <span className="hidden rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-[0.15em] text-accent sm:inline">
              {dict.header.tagline}
            </span>
          </Link>

          <nav
            aria-label={dict.header.navAria}
            className="ml-auto hidden items-center gap-1 lg:flex"
          >
            {HEADER_BAR_TOOLS.map((key) => {
              const href = localePath(locale, TOOL_META[key].path);
              return (
                <Link
                  key={key}
                  href={href}
                  data-header-bar-item={key}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive(TOOL_META[key].path)
                      ? "bg-category-bg-hover text-foreground"
                      : "text-foreground-soft hover:bg-category-bg-hover hover:text-foreground"
                  } ${key === "remote" ? "hidden xl:inline-flex" : ""}`}
                >
                  {dict.header.tools[key]}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
            <LanguageSwitcher locale={locale} />
            <button
              type="button"
              aria-label={
                menuOpen ? dict.header.menuClose : dict.header.menuOpen
              }
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((value) => !value)}
              className="glass flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground-soft transition-colors hover:text-foreground lg:hidden"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="site-menu"
            aria-label={dict.header.menuAria}
            className="absolute inset-x-0 top-full h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 sm:inset-x-auto sm:right-4 sm:mt-2 sm:h-auto sm:max-h-[calc(100dvh-5.5rem)] sm:w-[min(40rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-card-border sm:p-4 sm:shadow-2xl sm:shadow-black/60"
          >
            <div className="grid gap-x-6 sm:grid-cols-2">
              {NAV_SECTIONS.map((section) => (
                <section
                  key={section.key}
                  className="border-b border-card-border py-3 last:border-b-0 sm:border-b-0 sm:py-2"
                >
                  <h2 className="px-1 text-[11px] font-medium tracking-[0.2em] text-muted">
                    {dict.header.sections[section.key]}
                  </h2>
                  <ul className="mt-1">
                    {section.tools.map((key) => {
                      const meta = TOOL_META[key];
                      return (
                        <li key={key}>
                          <Link
                            href={localePath(locale, meta.path)}
                            data-header-tool={key}
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-category-bg-hover"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={assetPath(meta.icon)}
                              alt=""
                              width={36}
                              height={36}
                              loading="lazy"
                              className="h-9 w-9 shrink-0 rounded-[10px]"
                            />
                            <span className="min-w-0 flex-1 text-[15px] font-bold text-foreground [overflow-wrap:anywhere] [word-break:keep-all]">
                              {dict.header.tools[key]}
                            </span>
                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
