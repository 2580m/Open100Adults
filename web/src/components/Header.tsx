"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [extOpen, setExtOpen] = useState(false);
  const [extCenterX, setExtCenterX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const extBtnRef = useRef<HTMLButtonElement | null>(null);

  const updateExtCenter = useCallback(() => {
    const container = containerRef.current;
    const btn = extBtnRef.current;
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (cRect.width <= 0 || bRect.width <= 0) return;
    const rawCenter = bRect.left - cRect.left + bRect.width / 2;
    const clamped = Math.max(115, Math.min(cRect.width - 115, rawCenter));
    setExtCenterX(Math.round(clamped));
  }, []);

  // A navigation settles on a new pathname; drop menus so they do not
  // linger over the next page.
  useEffect(() => {
    setMenuOpen(false);
    setExtOpen(false);
  }, [pathname]);

  useEffect(() => {
    updateExtCenter();
    window.addEventListener("resize", updateExtCenter);
    return () => {
      window.removeEventListener("resize", updateExtCenter);
    };
  }, [updateExtCenter]);

  useEffect(() => {
    if (!menuOpen && !extOpen) return;

    const isSmall = !window.matchMedia("(min-width: 640px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (menuOpen && isSmall) {
      document.body.style.overflow = "hidden";
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setExtOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
        setExtOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      if (menuOpen && isSmall) {
        document.body.style.overflow = previousOverflow;
      }
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, extOpen]);

  const homeHref = localePath(locale, "");

  function isActive(path: string) {
    return pathname === localePath(locale, path);
  }

  const onHardwareRoute =
    isActive(TOOL_META.dglab.path) || isActive(TOOL_META.buttplug.path);

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/60 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <div ref={containerRef} className="relative mx-auto max-w-6xl">
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
            <Link
              href={homeHref}
              data-header-bar-item="home"
              className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive("")
                  ? "bg-category-bg-hover text-foreground"
                  : "text-foreground-soft hover:bg-category-bg-hover hover:text-foreground"
              }`}
            >
              {locale === "zh" ? "主页" : "Home"}
            </Link>
            {HEADER_BAR_TOOLS.map((key) => {
              if (key === "dglab") {
                const highlighted = extOpen || onHardwareRoute;
                return (
                  <button
                    key="external"
                    ref={extBtnRef}
                    type="button"
                    aria-expanded={extOpen}
                    aria-controls="external-hardware-bar"
                    data-header-bar-item="external"
                    onClick={() => {
                      setMenuOpen(false);
                      updateExtCenter();
                      setExtOpen((v) => !v);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      highlighted
                        ? "border-accent/55 bg-accent-soft text-foreground shadow-sm shadow-accent/15"
                        : "border-transparent text-foreground-soft hover:bg-category-bg-hover hover:text-foreground"
                    }`}
                  >
                    <span>{locale === "zh" ? "外部联动" : "Hardware"}</span>
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${
                        extOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                );
              }
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
              data-site-menu-toggle=""
              onClick={() => {
                setExtOpen(false);
                setMenuOpen((value) => !value);
              }}
              className="glass relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground-soft transition-transform duration-150 hover:text-foreground active:scale-95"
            >
              <span
                aria-hidden="true"
                className={`absolute flex items-center justify-center transition-[opacity,transform,rotate,scale] duration-200 ease-out ${
                  menuOpen
                    ? "rotate-90 scale-75 opacity-0"
                    : "rotate-0 scale-100 opacity-100"
                }`}
              >
                <MenuIcon />
              </span>
              <span
                aria-hidden="true"
                className={`absolute flex items-center justify-center transition-[opacity,transform,rotate,scale] duration-200 ease-out ${
                  menuOpen
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-75 opacity-0"
                }`}
              >
                <CloseIcon />
              </span>
            </button>
          </div>
        </div>

        <div
          id="external-hardware-bar"
          aria-hidden={!extOpen}
          className={`hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:grid ${
            extOpen
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-card-border/60">
              <div
                className="w-fit -translate-x-1/2"
                style={{
                  marginLeft: extCenterX !== null ? `${extCenterX}px` : "50%",
                }}
              >
                <div
                  className={`flex items-center gap-2 whitespace-nowrap py-2 transition-[opacity,translate] duration-300 ease-out ${
                    extOpen ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0"
                  }`}
                >
                {(
                  [
                    {
                      key: "dglab",
                      label: "DG-LAB",
                      href: localePath(locale, TOOL_META.dglab.path),
                      active: isActive(TOOL_META.dglab.path),
                    },
                    {
                      key: "buttplug",
                      label: "Buttplug.io",
                      href: localePath(locale, TOOL_META.buttplug.path),
                      active: isActive(TOOL_META.buttplug.path),
                    },
                  ] as const
                ).map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    tabIndex={extOpen ? undefined : -1}
                    data-header-sub-item={item.key}
                    onClick={() => setExtOpen(false)}
                    className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                      item.active
                        ? "border-accent/45 bg-accent-soft text-accent"
                        : "border-transparent text-foreground-soft hover:bg-category-bg-hover hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav
          id="site-menu"
          aria-label={dict.header.menuAria}
          aria-hidden={!menuOpen}
          className={`absolute inset-x-0 top-full z-50 h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] origin-top overflow-y-auto overscroll-contain bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 transition-[opacity,transform,translate,scale] duration-250 ease-out sm:inset-x-auto sm:right-4 sm:mt-2 sm:h-auto sm:max-h-[calc(100dvh-5.5rem)] sm:w-[min(40rem,calc(100vw-2rem))] sm:origin-top-right sm:rounded-2xl sm:border sm:border-card-border sm:bg-background sm:p-4 sm:shadow-2xl sm:shadow-black/60 ${
            menuOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-95 opacity-0"
          }`}
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
                          tabIndex={menuOpen ? undefined : -1}
                          onClick={() => setMenuOpen(false)}
                          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-category-bg-hover"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={assetPath(meta.icon)}
                            alt=""
                            width={36}
                            height={36}
                            decoding="async"
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
      </div>
    </header>
  );
}
