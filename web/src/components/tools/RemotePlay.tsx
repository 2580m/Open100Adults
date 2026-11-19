"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CtlNoticeBanner } from "@/components/tools/RemoteCtlSettingsModal";
import { RemoteLobby } from "@/components/tools/RemoteLobby";
import { Phrase } from "@/components/tools/RemoteShared";
import { SundomeGame } from "@/components/tools/SundomeGame";
import { REMOTE_PAGE } from "@/data/remoteFullCopy";
import type { Locale } from "@/data/tools";
import {
  controllerHref,
  lobbyPageHref,
  makeInvite,
  parseJoinHash,
} from "@/lib/remoteProtocol";

type RemoteStep = "" | "play" | "play-link" | "play-open" | "control" | "join";
const VALID_STEPS: RemoteStep[] = [
  "",
  "play",
  "play-link",
  "play-open",
  "control",
];

export function RemotePlay({ lang }: { lang: Locale }) {
  const f = REMOTE_PAGE[lang];
  const [step, setStep] = useState<RemoteStep>("");
  const [joinCreds, setJoinCreds] = useState<{ room: string; key: string } | null>(
    null,
  );
  const [inviteState, setInviteState] = useState<"" | "making" | "failed">("");

  useEffect(() => {
    const syncHash = () => {
      const parsedJoin = parseJoinHash(window.location.hash);
      setJoinCreds(parsedJoin);
      if (parsedJoin) {
        setStep("join");
        return;
      }
      const raw = window.location.hash.replace(/^#/, "") as RemoteStep;
      setStep(VALID_STEPS.includes(raw) ? raw : "");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  const go = (next: RemoteStep) => {
    const nextUrl = next
      ? `#${next}`
      : window.location.pathname + window.location.search;
    window.history.pushState(null, "", nextUrl);
    setStep(next);
    window.setTimeout(() => {
      document
        .querySelector("[data-remote-page-step]")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 30);
  };

  const handleMakeInvite = async () => {
    setInviteState("making");
    try {
      const creds = await makeInvite();
      window.location.href = controllerHref(window.location.origin, lang, {
        room: creds.room,
        controller: creds.controller,
        player: creds.player,
      });
    } catch {
      setInviteState("failed");
    }
  };

  const renderBack = (target: RemoteStep) => (
    <button
      type="button"
      onClick={() => go(target)}
      className="cursor-pointer rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted-strong hover:text-foreground"
      data-remote-page-back
    >
      ‹ {f.back}
    </button>
  );

  const renderStepHead = (
    n: number,
    m: number,
    heading: string,
    backTo?: RemoteStep,
  ) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p
          className="text-[11px] font-bold tabular-nums tracking-[0.15em] text-accent"
          data-remote-step-no={`${n}/${m}`}
        >
          {f.step.replace("{n}", String(n)).replace("{m}", String(m))}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-foreground">{heading}</h2>
      </div>
      {backTo !== undefined && renderBack(backTo)}
    </div>
  );

  const renderChoice = ({
    onClick,
    kicker,
    title,
    out,
    body,
    primary,
    attrs,
    recommended = false,
  }: {
    onClick: () => void;
    kicker: string;
    title: string;
    out: string;
    body: string;
    primary: boolean;
    attrs: Record<string, string>;
    recommended?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      {...attrs}
      className="block w-full cursor-pointer rounded-3xl border border-card-border bg-card-bg p-5 text-left transition-transform hover:scale-[1.01] [word-break:keep-all] [overflow-wrap:anywhere]"
    >
      {kicker &&
        (recommended ? (
          <span
            className="rpri inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            data-remote-recommended-badge
          >
            {kicker}
          </span>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">
            {kicker}
          </span>
        ))}
      <span className="mt-1 block text-xl font-bold text-foreground">
        {title}
      </span>
      <span
        className="mt-1.5 block text-sm font-bold leading-relaxed text-foreground"
        data-remote-out
      >
        <Phrase text={out} />
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-strong">
        <Phrase text={body} />
      </span>
      <span
        className={`mt-4 block w-full rounded-xl px-6 py-3.5 text-center text-base font-bold ${
          primary ? "rpri" : "border border-card-border text-foreground"
        }`}
      >
        {title} ›
      </span>
    </button>
  );

  const showGuide = !step.startsWith("play-") && step !== "join";

  return (
    <div data-sundome-remote-page>
      {step === "join" && joinCreds ? (
        <div className="mt-6 scroll-mt-20" data-remote-page-step="join">
          <SundomeGame locale={lang} remoteInvite={joinCreds} />
        </div>
      ) : step === "play-link" || step === "play-open" ? (
        <div className="mt-6 scroll-mt-20" data-remote-page-step={step}>
          <SundomeGame
            locale={lang}
            remoteOnly={step === "play-open" ? "open" : "link"}
            onRemoteBack={() => go("play")}
          />
        </div>
      ) : step === "control" ? (
        <div className="mt-6 scroll-mt-20" data-remote-page-step="control">
          {renderStepHead(2, 2, f.ctlPick, "")}
          <p className="mt-1 text-sm leading-relaxed text-muted-strong [word-break:keep-all]">
            <Phrase text={f.ctlLead} />
          </p>
          <div className="mt-4">
            <RemoteLobby
              lang={lang}
              where="page"
              onSelf={() => go("play")}
              refreshHere
              ctlSettings
            />
          </div>
          <Link
            href={lobbyPageHref(lang)}
            className="mt-2 inline-block cursor-pointer text-xs text-muted-strong underline underline-offset-4 hover:text-foreground"
            data-remote-list-link
          >
            {f.listOpen} ›
          </Link>

          <div
            className="mt-4 rounded-2xl border border-card-border bg-card-bg p-4 [word-break:keep-all] [overflow-wrap:anywhere]"
            data-remote-invite
          >
            <p className="text-sm font-bold text-foreground">{f.inviteTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-strong">
              <Phrase text={f.inviteBody} />
            </p>
            <button
              type="button"
              onClick={() => void handleMakeInvite()}
              disabled={inviteState === "making"}
              className="mt-3 w-full cursor-pointer rounded-xl border border-card-border px-4 py-3 text-sm font-bold text-foreground disabled:cursor-wait disabled:opacity-60"
              data-remote-invite-make
            >
              {inviteState === "making" ? f.inviteMaking : f.inviteBtn}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              <Phrase
                text={inviteState === "failed" ? f.inviteFailed : f.inviteRemake}
              />
            </p>
          </div>

          <p
            className="mt-3 rounded-xl border border-card-border px-4 py-3 text-xs leading-relaxed text-muted-strong [word-break:keep-all]"
            data-remote-page-link-note
          >
            <Phrase text={f.ctlLinkNote} />
          </p>
        </div>
      ) : step === "play" ? (
        <div className="mt-6 scroll-mt-20" data-remote-page-step="play">
          {renderStepHead(2, 4, f.kindQ, "")}
          <div className="mt-3 grid gap-3">
            {renderChoice({
              onClick: () => go("play-open"),
              kicker: f.recommended,
              title: f.openTitle,
              out: f.openOut,
              body: f.openBody,
              primary: true,
              recommended: true,
              attrs: {
                "data-remote-kind": "open",
                "data-remote-recommended": "",
              },
            })}
            {renderChoice({
              onClick: () => go("play-link"),
              kicker: "",
              title: f.linkTitle,
              out: f.linkOut,
              body: f.linkBody,
              primary: false,
              attrs: { "data-remote-kind": "link" },
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 scroll-mt-20" data-remote-page-step="role">
          <CtlNoticeBanner lang={lang} className="mb-4" />
          {renderStepHead(1, 4, f.roleQ)}
          <div className="mt-3 grid gap-3">
            {renderChoice({
              onClick: () => go("play"),
              kicker: f.playKicker,
              title: f.playTitle,
              out: f.playOut,
              body: f.playBody,
              primary: true,
              attrs: { "data-remote-role": "play" },
            })}
            {renderChoice({
              onClick: () => go("control"),
              kicker: f.ctlKicker,
              title: f.ctlTitle,
              out: f.ctlOut,
              body: f.ctlBody,
              primary: false,
              attrs: { "data-remote-role": "control" },
            })}
          </div>
        </div>
      )}

      {showGuide && (
        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-foreground">{f.howTitle}</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {f.steps.map(([title, body], idx) => (
                <li
                  key={title}
                  className="rounded-2xl border border-card-border bg-card-bg p-4"
                >
                  <p className="text-xs font-bold text-accent">
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">{f.canTitle}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {f.can.map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-card-border bg-card-bg p-4"
                >
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-strong">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">{f.safeTitle}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-strong">
              {f.safe.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
