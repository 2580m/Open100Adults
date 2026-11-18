"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  LIMITS_TEXT,
  REMOTE_CONSTANTS,
  REMOTE_LOBBY,
  REMOTE_MORE,
  REMOTE_PAGE,
  REMOTE_READY,
  REMOTE_TEXT,
  REMOTE_V2,
  REMOTE_WISH,
} from "@/data/remoteFullCopy";
import type { Locale } from "@/data/tools";
import {
  CtlSettingsModal,
  GearIcon,
} from "@/components/tools/RemoteCtlSettingsModal";
import {
  fetchLobby,
  lobbyHref,
  type LobbyEntry,
  type LobbySnapshot,
  type RemoteLimits,
} from "@/lib/remoteProtocol";

function formatLimitSummary(
  lang: Locale,
  lim: RemoteLimits | undefined,
  body: string,
): string[] {
  if (!lim) return [];
  const parts: string[] = [];
  const lt = LIMITS_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const partLabels = rm.part as Record<string, string>;
  const gripLabels = REMOTE_V2[lang].grip5 as Record<string, string>;

  if (lim.ap?.length) {
    const isFemale = body === "female" || body === "lesbian";
    const expected = isFemale
      ? ["clit", "inside", "nipple"]
      : ["shaft", "glans", "balls", "nipple"];
    const diff = expected.filter((x) => !lim.ap?.includes(x as never));
    if (lim.ap.length === 1) {
      parts.push(lt.only.replace("{x}", partLabels[lim.ap[0]] ?? lim.ap[0]));
    } else if (diff.length) {
      for (const d of diff) {
        parts.push(lt.ng.replace("{x}", partLabels[d] ?? d));
      }
    }
  }
  if (lim.nh) parts.push(lt.harshShort);
  if (lim.gm) {
    parts.push(
      `${lt.gripCap}: ${lt.capUpTo.replace("{x}", gripLabels[lim.gm] ?? lim.gm)}`,
    );
  }
  if (lim.sm) {
    const cap =
      lim.sm === "mid" ? "60" : lim.sm === "fast" ? "100" : "140";
    parts.push(`${lt.speedCap}: ${cap} BPM`);
  }
  if (lim.nn) parts.push(lt.nowNgShort);
  return parts;
}

export function RemoteLobby({
  lang,
  where = "list",
  onSelf,
  skip,
  ctlSettings = false,
}: {
  lang: Locale;
  where?: "page" | "list" | "gate" | "after";
  onSelf?: () => void;
  refreshHere?: boolean;
  skip?: string;
  ctlSettings?: boolean;
}) {
  const lob = REMOTE_LOBBY[lang];
  const v2 = REMOTE_V2[lang];
  const wishMap = REMOTE_WISH[lang].tag as Record<string, string>;
  void where;

  const [snap, setSnap] = useState<LobbySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchLobby();
      setSnap(next);
    } catch {
      // Keep previous snapshot cleanly.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(id);
  }, [load]);

  const rooms = (snap?.rooms ?? []).filter((e) => !skip || e.room !== skip);
  const watch = (snap?.watch ?? []).filter((e) => !skip || e.room !== skip);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const statusFor = (e: LobbyEntry) => {
    if (e.ph === "play") {
      const leftMin = e.lf != null ? Math.floor(e.lf / 60) : -1;
      return {
        k: "play",
        text: REMOTE_PAGE[lang].soloStart || (lang === "zh" ? "正在游戏中" : "Playing"),
        left: leftMin >= 1 ? `${leftMin}m` : "",
      };
    }
    return {
      k: e.ph === "setup" ? "ready" : "wait",
      text:
        e.ph === "setup"
          ? REMOTE_READY[lang].linking || (lang === "zh" ? "等待开始" : "Waiting to start")
          : lob.wait,
      left: "",
    };
  };

  const diffName = (diff: string) => {
    const map = lob.diff as Record<string, string>;
    return map[diff] ?? "";
  };

  const bodyName = (body: string) => {
    const map = lob.body as Record<string, string>;
    return map[body] ?? body;
  };

  return (
    <div
      className="rounded-2xl border border-card-border bg-card-bg p-4"
      data-remote-lobby
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {lob.title}
            <span className="ml-2 text-xs font-normal tabular-nums text-muted-strong">
              {lob.count.replace("{n}", String(rooms.length))}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {ctlSettings ? (
            <button
              type="button"
              data-remote-ctl-settings
              aria-label={lang === "zh" ? "操作盘设置" : "Controller settings"}
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-card-border text-muted-strong hover:text-foreground"
            >
              <span className="h-4 w-4">
                <GearIcon />
              </span>
            </button>
          ) : null}
          <button
            type="button"
            data-lobby-refresh
            onClick={() => void load()}
            className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-bold text-foreground hover:border-accent/50"
          >
            {loading ? "…" : lob.refresh}
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {loading
            ? lang === "zh"
              ? "正在刷新列表…"
              : "Refreshing lobby…"
            : lob.empty}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-card-border">
          {rooms.map((e) => {
            const st = statusFor(e);
            const limits = formatLimitSummary(lang, e.lim, e.body);
            return (
              <li
                key={e.room}
                className="py-2.5"
                data-lobby-room
                data-lobby-status={st.k}
              >
                <span
                  data-lobby-room-status
                  className={`block text-[11px] font-bold leading-snug ${
                    st.k === "ready"
                      ? "text-emerald-400"
                      : st.k === "play"
                        ? "text-amber-400"
                        : "text-muted-strong"
                  }`}
                >
                  ● {st.text}
                  {st.left ? (
                    <span className="ml-1 tabular-nums">({st.left})</span>
                  ) : null}
                </span>

                <div className="mt-0.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">
                    <span className="font-bold">{bodyName(e.body)}</span>
                    <span
                      className="ml-2 whitespace-nowrap tabular-nums text-muted-strong"
                      data-lobby-room-info
                    >
                      {[
                        e.mins > 0 ? lob.mins.replace("{n}", String(e.mins)) : "",
                        diffName(e.diff),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>

                    {(limits.length > 0 || (e.xm != null && e.xm >= 0)) && (
                      <span
                        className="mt-0.5 block text-[11px] text-muted-strong"
                        data-lobby-room-limits
                      >
                        {[
                          ...limits,
                          ...(e.xm != null && e.xm >= 0
                            ? [v2.lobbyExt.replace("{n}", String(e.xm))]
                            : []),
                        ].join(" · ")}
                      </span>
                    )}

                    {e.wish.length > 0 && (
                      <span
                        className="mt-1 flex flex-wrap gap-1"
                        data-lobby-room-wish
                      >
                        {e.wish.map((w) => (
                          <span
                            key={w}
                            className="whitespace-nowrap rounded-full border border-card-border px-2 py-0.5 text-[11px] text-muted-strong"
                          >
                            {wishMap[w] ?? w}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  <a
                    href={lobbyHref(origin, lang, e)}
                    data-lobby-join
                    className="rpri shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold"
                  >
                    {lob.join}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {watch.length > 0 && (
        <div
          className="mt-3 border-t border-card-border pt-3"
          data-lobby-watch
        >
          <p className="text-xs font-bold text-muted-strong">
            {v2.lobbyWatchTitle}
          </p>
          <p
            className="mt-0.5 text-[11px] leading-relaxed text-muted"
            data-lobby-watch-sub
          >
            {v2.lobbyWatchSub}
          </p>
          <ul className="mt-1 divide-y divide-card-border">
            {watch.map((e) => (
              <li
                key={e.room}
                className="flex items-center gap-2 py-2"
                data-lobby-watch-room
              >
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">
                  <span className="font-bold">{bodyName(e.body)}</span>
                  <span className="ml-2 whitespace-nowrap tabular-nums text-muted-strong">
                    {[
                      e.mins > 0 ? lob.mins.replace("{n}", String(e.mins)) : "",
                      diffName(e.diff),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <a
                  href={lobbyHref(origin, lang, e)}
                  data-lobby-watch-join
                  className="rpri shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold"
                >
                  {v2.lobbyWatch}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {where === "page" && (
        <Link
          href={`/${lang}/sundome/remote#play`}
          onClick={(ev) => {
            if (onSelf) {
              ev.preventDefault();
              onSelf();
            }
          }}
          data-lobby-self
          className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-accent/60 bg-accent-soft px-4 py-3 hover:border-accent"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground">
              {lob.selfCta}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-strong">
              {lob.selfSub}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg text-accent">
            ›
          </span>
        </Link>
      )}

      <CtlSettingsModal
        lang={lang}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
