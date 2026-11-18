import Link from "next/link";

import { getDictionary } from "@/data/i18n";
import {
  FOOTER_TOOL_KEYS,
  TOOL_META,
  localePath,
  type Locale,
} from "@/data/tools";

export function Footer({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-14 border-t border-card-border py-10">
      <div className="mx-auto max-w-6xl px-4">
        <nav
          aria-label={dict.footer.toolsAria}
          className="mb-8 border-b border-card-border pb-8"
        >
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
            {dict.footer.index}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2.5">
            {FOOTER_TOOL_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={localePath(locale, TOOL_META[key].path)}
                  className="text-sm text-muted-strong transition-colors hover:text-accent"
                >
                  {dict.header.tools[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            {dict.header.tagline}
          </span>
          <p className="text-sm text-muted-strong">{dict.footer.ageGate}</p>
          <p className="text-xs text-muted">
            © {year}{" "}
            <span className="font-display italic text-foreground-soft">
              100Adults
            </span>
            <span className="mx-2 text-card-border">|</span>
            {dict.footer.brandSuffix}
          </p>

          <nav
            aria-label={dict.footer.legalAria}
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted"
          >
            <Link
              href={localePath(locale, "/2257")}
              className="transition-colors hover:text-foreground"
            >
              {dict.footer.statement2257}
            </Link>
            <Link
              href={localePath(locale, "/dmca")}
              className="transition-colors hover:text-foreground"
            >
              {dict.footer.dmca}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
