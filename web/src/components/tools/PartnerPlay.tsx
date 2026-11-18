"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SundomeGame } from "@/components/tools/SundomeGame";
import { PARTNER_TEXT } from "@/data/partnerCopy";
import { localePath, type Locale } from "@/data/tools";
import {
  decodePartner,
  formatStartAt,
  partnerPhase,
  type PartnerPayload,
} from "@/lib/partnerSync";

export function PartnerPlay({ lang }: { lang: Locale }) {
  const t = PARTNER_TEXT[lang];
  const [payload, setPayload] = useState<PartnerPayload | null | undefined>(
    undefined,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const decodeFromLocation = async () => {
      const hash = window.location.hash;
      const decoded = hash ? await decodePartner(hash) : null;
      if (active) setPayload(decoded);
    };
    void decodeFromLocation();
    const onHash = () => void decodeFromLocation();
    window.addEventListener("hashchange", onHash);
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHash);
      window.clearInterval(id);
    };
  }, []);

  if (payload === undefined) {
    return <p className="mt-6 text-sm text-muted">…</p>;
  }

  if (payload === null) {
    return (
      <div
        className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6"
        data-sundome-partner-invalid
      >
        <h2 className="text-lg font-bold text-foreground">{t.invalid}</h2>
        <Link
          href={localePath(lang, "/sundome")}
          className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
        >
          {t.endedCta}
        </Link>
      </div>
    );
  }

  const ph = partnerPhase(payload.startAt, payload.s.duration, now);
  if (ph.phase === "after") {
    return (
      <div
        className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6"
        data-sundome-partner-ended
      >
        <h2 className="text-lg font-bold text-foreground">{t.ended}</h2>
        <p className="mt-1 text-xs text-muted">
          {formatStartAt(payload.startAt, lang)}
        </p>
        <Link
          href={localePath(lang, "/sundome")}
          className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
        >
          {t.endedCta}
        </Link>
      </div>
    );
  }

  const formatMmSs = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-card-border bg-card-bg p-5">
        <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
          {t.badge}
        </span>
        <h2 className="mt-2 text-xl font-bold text-foreground">
          {t.guestTitle}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-strong">
          {t.guestLead}
        </p>
        <p className="mt-2 text-sm font-bold tabular-nums text-foreground">
          {ph.phase === "before"
            ? t.countdown.replace("{t}", formatMmSs(ph.untilStartMs))
            : ph.elapsedMs < 10000
              ? t.startingNow
              : t.lateJoin.replace("{t}", formatMmSs(ph.elapsedMs))}
        </p>
      </div>

      <SundomeGame locale={lang} partner={payload} />
    </div>
  );
}
