import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRightIcon } from "@/components/icons";
import { getDictionary, isLocale } from "@/data/i18n";
import type { Dictionary } from "@/data/i18n/types";
import {
  NAV_SECTIONS,
  NEW_TOOL_KEYS,
  TOOL_META,
  TOOL_VARIANTS,
  assetPath,
  localePath,
  type HomeToolKey,
  type Locale,
  type VariantKey,
} from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

function ToolRow({
  locale,
  tool,
  dict,
}: {
  locale: Locale;
  tool: HomeToolKey;
  dict: Dictionary;
}) {
  const meta = TOOL_META[tool];
  const isNew = NEW_TOOL_KEYS.includes(tool);
  const tag = dict.home.tags[tool];

  return (
    <Link
      href={localePath(locale, meta.path)}
      data-top-row={tool}
      className="flex cursor-pointer items-center gap-3 py-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetPath(meta.icon)}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="h-10 w-10 shrink-0 rounded-xl"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-foreground [overflow-wrap:anywhere] [word-break:keep-all]">
          <span>{dict.header.tools[tool]}</span>
          {isNew ? (
            <span className="ml-1.5 whitespace-nowrap rounded-full bg-accent px-1.5 py-px align-[2px] text-[9.5px] font-bold text-white">
              {dict.home.newBadge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-muted-strong [overflow-wrap:anywhere] [word-break:keep-all]">
          {dict.home.descriptions[tool]}
        </span>
      </span>
      {tag ? (
        <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
          {tag}
        </span>
      ) : null}
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function VariantButtons({
  locale,
  tool,
  labels,
  className = "mt-2",
}: {
  locale: Locale;
  tool: "sundome" | "shuttle";
  labels: Record<VariantKey, string>;
  className?: string;
}) {
  const variants = TOOL_VARIANTS[tool];
  if (!variants?.length) return null;

  return (
    <div
      className={`grid gap-1.5 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))`,
      }}
    >
      {variants.map((variant) => (
        <Link
          key={variant}
          href={`${localePath(locale, TOOL_META[tool].path)}/${variant}`}
          data-version-link={variant}
          className="flex h-11 min-w-0 cursor-pointer items-center justify-center gap-0.5 whitespace-nowrap rounded-2xl border border-card-border bg-foreground/[0.06] px-1 text-[clamp(11px,3.3vw,12.5px)] font-bold text-foreground transition-colors hover:border-accent/60"
        >
          {labels[variant]}
          <ChevronRightIcon className="hidden h-3.5 w-3.5 shrink-0 text-muted min-[400px]:block" />
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const dict = getDictionary(locale);
  const sundome = TOOL_META.sundome;

  const otherSections = NAV_SECTIONS.filter(
    (section) => section.key !== "solo",
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <section className="mb-6">
        <p className="text-[11px] font-medium tracking-[0.4em] text-muted">
          {dict.home.eyebrow}
        </p>
        <h1 className="mt-1.5 text-[30px] leading-tight">
          {dict.home.titleLead}
          {locale === "en" ? " " : null}
          <span className="bg-gradient-to-r from-[#f5a3c8] to-[#b8a4ff] bg-clip-text text-transparent">
            {dict.home.titleAccent}
          </span>
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-strong">
          <span className="h-1.5 w-1.5 rounded-full bg-[#86e3bb] shadow-[0_0_8px_#86e3bb]" />
          <span className="whitespace-nowrap">{dict.home.playedThisWeek}</span>
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span className="whitespace-nowrap text-muted">
            {dict.home.freeNoSignup}
          </span>
        </p>

        <div className="mt-3 rounded-3xl border border-card-border bg-card-bg px-4 pb-2 pt-4">
          <h2 className="text-xl">{dict.header.sections.solo}</h2>

          <div className="mt-3 border-b border-card-border pb-3.5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetPath(sundome.icon)}
                alt=""
                width={52}
                height={52}
                className="h-[52px] w-[52px] shrink-0 rounded-2xl"
              />
              <span className="min-w-0 flex-1">
                <span className="font-display block text-[19px] text-foreground [word-break:keep-all]">
                  {dict.header.tools.sundome}
                </span>
                <span className="mt-0.5 block text-xs text-muted-strong [overflow-wrap:anywhere] [word-break:keep-all]">
                  {dict.home.descriptions.sundome}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
                {dict.home.tags.sundome}
              </span>
            </div>
            <Link
              href={localePath(locale, sundome.path)}
              className="mt-3 flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-accent px-3 text-center text-base font-bold text-white"
            >
              {dict.home.startMale}
            </Link>
            <VariantButtons
              locale={locale}
              tool="sundome"
              labels={dict.home.variantLabels.sundome}
            />
          </div>

          <div>
            <ToolRow locale={locale} tool="shuttle" dict={dict} />
            <VariantButtons
              locale={locale}
              tool="shuttle"
              labels={dict.home.variantLabels.shuttle}
              className="-mt-1 mb-3"
            />
          </div>

          <div className="border-t border-card-border">
            <ToolRow locale={locale} tool="board" dict={dict} />
          </div>
        </div>
      </section>

      {otherSections.map((section) => {
        const hint = dict.home.sectionHints[section.key];
        return (
          <section
            key={section.key}
            className="mt-3 rounded-3xl border border-card-border bg-card-bg px-4 pb-2 pt-4"
          >
            <h2 className="text-xl">{dict.header.sections[section.key]}</h2>
            {hint ? (
              <p className="mt-0.5 text-xs text-muted-strong [word-break:keep-all]">
                {hint}
              </p>
            ) : null}
            <div className="mt-1">
              {section.tools.map((tool, index) => (
                <div
                  key={tool}
                  className={index === 0 ? undefined : "border-t border-card-border"}
                >
                  <ToolRow locale={locale} tool={tool} dict={dict} />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-24">
        <header className="relative mb-6">
          <span
            aria-hidden="true"
            className="font-display pointer-events-none absolute -top-5 right-0 select-none text-6xl italic leading-none text-foreground/5 sm:-top-8 sm:text-8xl"
          >
            A
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
              {dict.home.about.label}
            </span>
            <div className="h-px flex-1 self-center bg-card-border" />
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {dict.home.about.title}
          </h2>
        </header>
        <p className="max-w-3xl border-l-2 border-accent/50 pl-5 text-sm leading-relaxed text-muted-strong sm:text-base">
          {dict.home.about.body}
        </p>
      </section>

      <section className="mt-20">
        <header className="relative mb-2">
          <span
            aria-hidden="true"
            className="font-display pointer-events-none absolute -top-5 right-0 select-none text-6xl italic leading-none text-foreground/5 sm:-top-8 sm:text-8xl"
          >
            B
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
              {dict.home.faq.label}
            </span>
            <div className="h-px flex-1 self-center bg-card-border" />
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {dict.home.faq.title}
          </h2>
        </header>
        <div>
          {dict.home.faq.items.map((item) => (
            <div
              key={item.q}
              className="border-b border-card-border py-5 last:border-b-0"
            >
              <h3 className="mb-2 flex items-start gap-3 text-base font-semibold text-foreground">
                <span className="font-display shrink-0 text-lg italic leading-none text-accent">
                  Q.
                </span>
                {item.q}
              </h3>
              <p className="flex items-start gap-3 text-sm leading-relaxed text-muted-strong">
                <span className="font-display shrink-0 text-lg italic leading-none text-accent-2">
                  A.
                </span>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
