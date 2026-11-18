"use client";

import { Fragment, useEffect, useState } from "react";

import {
  LIMITS_TEXT,
  REMOTE_CONSTANTS,
  REMOTE_DRIVE,
  REMOTE_MORE,
  REMOTE_V2,
} from "@/data/remoteFullCopy";
import type { Locale } from "@/data/tools";
import {
  SPEED_CAP_BPM,
  type DriveLevelKey,
  type RemoteLimits,
} from "@/lib/remoteProtocol";

/** Splits pipe-delimited original strings (`|`) into `<wbr />` line breaks. */
export function Phrase({ text }: { text: string }) {
  const parts = text.split("|");
  return (
    <>
      {parts.map((part, idx) => (
        <Fragment key={idx}>
          {idx > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** Splits pipe-delimited text into explicit `<br />` breaks. */
export function Broken({ text }: { text: string }) {
  const parts = text.split("|");
  return (
    <>
      {parts.map((part, idx) => (
        <Fragment key={idx}>
          {idx > 0 && <br />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

export function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3 6.2 20.4l1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function WatchPill({ n, lang }: { n: number; lang: Locale }) {
  return (
    <span className="rw-eye" data-remote-watching={n}>
      <EyeIcon />
      {REMOTE_V2[lang].watching.replace("{n}", String(n))}
    </span>
  );
}

export function RemoteElapsed({
  since,
  fmt,
}: {
  since: number | null;
  fmt: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!since) return null;
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <b
      className="ml-1.5 whitespace-nowrap tabular-nums text-foreground"
      data-remote-elapsed
    >
      {fmt.replace("{s}", String(sec))}
    </b>
  );
}

export function driveLevelOf(bpm: number): DriveLevelKey {
  const { DRIVE_BPM } = REMOTE_CONSTANTS;
  if (bpm <= 0) return "stop";
  if (bpm < (DRIVE_BPM.vslow + DRIVE_BPM.slow) / 2) return "vslow";
  if (bpm < (DRIVE_BPM.slow + DRIVE_BPM.mid) / 2) return "slow";
  if (bpm < (DRIVE_BPM.mid + DRIVE_BPM.fast) / 2) return "mid";
  if (bpm < (DRIVE_BPM.fast + DRIVE_BPM.vfast) / 2) return "fast";
  return "vfast";
}

export function formatMmSs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "--:--";
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export function limitSummary(
  lang: Locale,
  lim: RemoteLimits | undefined,
  body: string,
): string[] {
  if (!lim) return [];
  const lt = LIMITS_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const partLabels = rm.part as Record<string, string>;
  const gripLabels = REMOTE_V2[lang].grip5 as Record<string, string>;
  const driveLabels = REMOTE_DRIVE[lang].level as Record<string, string>;
  const out: string[] = [];

  if (lim.ap?.length) {
    const isFem = body === "female" || body === "lesbian";
    const expected = isFem
      ? ["clit", "inside", "nipple"]
      : ["shaft", "glans", "balls", "nipple"];
    const diff = expected.filter((x) => !lim.ap?.includes(x as never));
    if (lim.ap.length === 1) {
      out.push(lt.only.replace("{x}", partLabels[lim.ap[0]] ?? lim.ap[0]));
    } else if (diff.length) {
      for (const d of diff) {
        out.push(lt.ng.replace("{x}", partLabels[d] ?? d));
      }
    }
  }
  if (lim.nh) out.push(lt.harshShort);
  if (lim.gm) {
    out.push(`${lt.gripCap}: ${lt.capUpTo.replace("{x}", gripLabels[lim.gm] ?? lim.gm)}`);
  }
  if (lim.sm) {
    out.push(
      `${lt.speedCap}: ${lt.capUpTo.replace("{x}", driveLabels[lim.sm] ?? `${SPEED_CAP_BPM[lim.sm] ?? 140}`)}`,
    );
  }
  if (lim.nn) out.push(lt.nowNgShort);
  return out;
}
