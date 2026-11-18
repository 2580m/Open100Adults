"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  REMOTE_CONSTANTS,
  REMOTE_CTL,
  REMOTE_V2,
} from "@/data/remoteFullCopy";
import type { Locale } from "@/data/tools";
import {
  moveIn,
  plainLine,
  reactCatsOf,
  setCtlPrefs,
  setReactPrefs,
  toggleIn,
  useCtlPrefs,
  useReactPrefs,
} from "@/lib/remoteProtocol";

export function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function LayoutPreview({ kind }: { kind: "disc" | "slider" }) {
  if (kind === "disc") {
    return (
      <svg
        viewBox="0 0 96 56"
        className="h-12 w-full text-accent"
        aria-hidden="true"
        data-remote-layout-pic="disc"
      >
        <circle
          cx="48"
          cy="28"
          r="24"
          fill="rgba(255,255,255,.08)"
          stroke="currentColor"
          strokeOpacity=".35"
        />
        <path d="M31 11l34 34M65 11L31 45" stroke="currentColor" strokeOpacity=".25" />
        <circle cx="48" cy="28" r="9" fill="currentColor" />
        <circle cx="9" cy="18" r="6" fill="rgba(255,255,255,.14)" />
        <circle cx="9" cy="38" r="6" fill="rgba(255,255,255,.14)" />
        <circle cx="87" cy="18" r="6" fill="rgba(255,255,255,.14)" />
        <circle cx="87" cy="38" r="6" fill="rgba(255,255,255,.14)" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 96 56"
      className="h-12 w-full text-accent"
      aria-hidden="true"
      data-remote-layout-pic="slider"
    >
      <rect x="6" y="9" width="84" height="5" rx="2.5" fill="rgba(255,255,255,.16)" />
      <rect x="6" y="9" width="52" height="5" rx="2.5" fill="currentColor" fillOpacity=".7" />
      <circle cx="58" cy="11.5" r="6" fill="#241530" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="27" width="84" height="5" rx="2.5" fill="rgba(255,255,255,.16)" />
      <rect x="6" y="27" width="34" height="5" rx="2.5" fill="currentColor" fillOpacity=".7" />
      <circle cx="40" cy="29.5" r="6" fill="#241530" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="42" width="30" height="10" rx="5" fill="currentColor" />
      <rect x="40" y="42" width="14" height="10" rx="5" fill="rgba(255,255,255,.16)" />
      <rect x="58" y="42" width="14" height="10" rx="5" fill="rgba(255,255,255,.16)" />
      <rect x="76" y="42" width="14" height="10" rx="5" fill="rgba(255,255,255,.16)" />
    </svg>
  );
}

export function CtlNoticeBanner({
  lang,
  className = "",
}: {
  lang: Locale;
  className?: string;
}) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem("sundome:ctl-notice") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;

  return (
    <div
      data-remote-ctl-notice
      className={`flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent-soft/60 px-3 py-2 text-xs text-foreground ${className}`}
    >
      <span className="min-w-0 leading-relaxed">
        <span className="mr-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
          NEW
        </span>
        {lang === "zh"
          ? "手柄的样式和常用短句的收藏，现在可以自己设置了"
          : "Controller pad layout and favorite quick phrases can now be customized"}
      </span>
      <button
        type="button"
        data-remote-ctl-notice-close
        aria-label={REMOTE_CTL[lang].close}
        onClick={() => {
          setHidden(true);
          try {
            window.localStorage.setItem("sundome:ctl-notice", "1");
          } catch {}
        }}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm text-muted-strong hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}

export function CtlSettingsModal({
  lang,
  open,
  onClose,
}: {
  lang: Locale;
  open: boolean;
  onClose: () => void;
}) {
  const prefs = useCtlPrefs();
  const c = REMOTE_CTL[lang];
  const v2 = REMOTE_V2[lang];
  const [catIdx, setCatIdx] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const cats = REMOTE_CONSTANTS.LINE_CATS as readonly (readonly number[])[];
  const activeCatLines = cats[catIdx] ?? cats[0];

  const modal = (
    <div
      data-remote-settings="ctl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.settings}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-card-border bg-background-elevated text-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <h2 className="text-lg font-bold">{c.settings}</h2>
          <button
            type="button"
            data-remote-settings-close
            onClick={onClose}
            className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-bold text-muted-strong hover:text-foreground"
          >
            {c.close}
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {c.layout}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {(["disc", "slider"] as const).map((kind) => {
                const active = prefs.layout === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    data-remote-layout-pick={kind}
                    aria-pressed={active}
                    onClick={() => setCtlPrefs({ ...prefs, layout: kind })}
                    className={`cursor-pointer rounded-2xl border p-3 text-left transition-colors ${
                      active
                        ? "border-accent bg-accent-soft/60"
                        : "border-card-border bg-card-bg hover:border-accent/40"
                    }`}
                  >
                    <LayoutPreview kind={kind} />
                    <p className="mt-2 font-bold text-foreground">
                      {kind === "disc" ? c.disc : c.slider}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-strong">
                      {kind === "disc" ? c.discSub : c.sliderSub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground">{c.fav}</p>
              <span className="text-[11px] tabular-nums text-muted">
                {prefs.favs.length} / {REMOTE_CONSTANTS.CTL_FAV_MAX}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{c.favLead}</p>

            {prefs.favs.length === 0 ? (
              <p className="mt-2 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-[11px] text-muted">
                {c.favEmpty}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5" data-remote-fav-list>
                {prefs.favs.map((lineId) => (
                  <li
                    key={lineId}
                    data-remote-fav-item
                    className="flex items-center gap-1.5 rounded-xl border border-card-border bg-card-bg px-3 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {plainLine(v2.lines[lineId] ?? "")}
                    </span>
                    <button
                      type="button"
                      data-remote-fav-up
                      onClick={() =>
                        setCtlPrefs({
                          ...prefs,
                          favs: moveIn(prefs.favs, lineId, -1),
                        })
                      }
                      aria-label={c.up}
                      className="cursor-pointer rounded border border-card-border px-1.5 py-0.5 text-[10px]"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      data-remote-fav-down
                      onClick={() =>
                        setCtlPrefs({
                          ...prefs,
                          favs: moveIn(prefs.favs, lineId, 1),
                        })
                      }
                      aria-label={c.down}
                      className="cursor-pointer rounded border border-card-border px-1.5 py-0.5 text-[10px]"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      data-remote-fav-remove
                      onClick={() =>
                        setCtlPrefs({
                          ...prefs,
                          favs: prefs.favs.filter((x) => x !== lineId),
                        })
                      }
                      aria-label={c.remove}
                      className="cursor-pointer rounded border border-card-border px-1.5 py-0.5 text-[10px] text-[#ff8399]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-bold text-foreground">{c.all}</p>
            <p className="mt-0.5 text-[11px] text-muted">{c.allLead}</p>

            <div className="mt-2 flex flex-wrap gap-1.5" data-remote-prefs-cat>
              {v2.lineCats.map((catName, idx) => {
                const isHidden = prefs.hide.includes(idx);
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setCatIdx(idx)}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      catIdx === idx
                        ? "rpri"
                        : "border border-card-border text-muted-strong"
                    } ${isHidden ? "opacity-50 line-through" : ""}`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl border border-card-border bg-card-bg px-3 py-2">
              <span className="font-bold text-muted-strong">
                {v2.lineCats[catIdx]}
              </span>
              <button
                type="button"
                data-remote-cat-show
                onClick={() => {
                  const has = prefs.hide.includes(catIdx);
                  const nextHide = has
                    ? prefs.hide.filter((x) => x !== catIdx)
                    : [...prefs.hide, catIdx];
                  setCtlPrefs({ ...prefs, hide: nextHide });
                }}
                className="cursor-pointer rounded-full border border-card-border px-2.5 py-0.5 text-[11px] font-bold text-accent"
              >
                {c.show}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {activeCatLines.map((id) => {
                const starred = prefs.favs.includes(id);
                const disabled =
                  !starred && prefs.favs.length >= REMOTE_CONSTANTS.CTL_FAV_MAX;
                return (
                  <button
                    key={id}
                    type="button"
                    data-remote-fav-line={id}
                    disabled={disabled}
                    onClick={() =>
                      setCtlPrefs({
                        ...prefs,
                        favs: toggleIn(
                          prefs.favs,
                          id,
                          REMOTE_CONSTANTS.CTL_FAV_MAX,
                        ),
                      })
                    }
                    className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-medium disabled:opacity-40 ${
                      starred
                        ? "border-accent bg-accent-soft text-foreground"
                        : "border-card-border bg-card-bg text-muted-strong"
                    }`}
                  >
                    <span className="truncate">{plainLine(v2.lines[id] ?? "")}</span>
                    <span className="shrink-0 text-accent">
                      {starred ? "★" : "☆"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-card-border pt-3">
            <button
              type="button"
              data-remote-prefs-reset
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                setCtlPrefs({ layout: "disc", favs: [], hide: [] });
                setConfirmReset(false);
              }}
              className="cursor-pointer rounded-full border border-[#ff4d6d]/40 px-3 py-1.5 text-[11px] font-bold text-[#ff8399]"
            >
              {confirmReset ? c.resetAgain : c.reset}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export function ReactSettingsModal({
  lang,
  body,
  open,
  onClose,
}: {
  lang: Locale;
  body: string;
  open: boolean;
  onClose: () => void;
}) {
  const prefs = useReactPrefs();
  const c = REMOTE_CTL[lang];
  const v2 = REMOTE_V2[lang];
  const [catIdx, setCatIdx] = useState(0);

  if (!open || typeof document === "undefined") return null;

  const cats = reactCatsOf(body);
  const currentList = cats[catIdx] ?? cats[0];
  const labels = v2.react as Record<string, string>;

  const modal = (
    <div
      data-remote-settings="react"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.reactSettings}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-card-border bg-background-elevated text-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <h2 className="text-lg font-bold">{c.reactSettings}</h2>
          <button
            type="button"
            data-remote-settings-close
            onClick={onClose}
            className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-bold text-muted-strong hover:text-foreground"
          >
            {c.close}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          <p className="text-[11px] text-muted">{c.reactLead}</p>

          <div className="flex flex-wrap gap-1.5">
            {prefs.favs.map((key) => (
              <span
                key={key}
                data-remote-fav-react={key}
                className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[11px] font-bold"
              >
                {plainLine(labels[key] ?? key)}
                <button
                  type="button"
                  onClick={() =>
                    setReactPrefs({
                      favs: prefs.favs.filter((x) => x !== key),
                    })
                  }
                  className="ml-0.5 cursor-pointer text-accent"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {v2.reactCats.map((name, idx) => (
              <button
                key={name}
                type="button"
                onClick={() => setCatIdx(idx)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  catIdx === idx
                    ? "rpri"
                    : "border border-card-border text-muted-strong"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {currentList.map((key) => {
              const on = prefs.favs.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!on && prefs.favs.length >= REMOTE_CONSTANTS.REACT_FAV_MAX}
                  onClick={() =>
                    setReactPrefs({
                      favs: toggleIn(
                        prefs.favs,
                        key,
                        REMOTE_CONSTANTS.REACT_FAV_MAX,
                      ),
                    })
                  }
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-[11px] font-bold disabled:opacity-40 ${
                    on
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-card-border bg-card-bg text-muted-strong"
                  }`}
                >
                  <span>{plainLine(labels[key] ?? key)}</span>
                  <span className="text-accent">{on ? "★" : "☆"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
