"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CtlSettingsModal,
  GearIcon,
} from "@/components/tools/RemoteCtlSettingsModal";
import { RemoteLobby } from "@/components/tools/RemoteLobby";
import {
  Phrase,
  RemoteElapsed,
  StarIcon,
  WatchPill,
  driveLevelOf,
  formatMmSs,
  limitSummary,
} from "@/components/tools/RemoteShared";
import {
  REMOTE_AFTER,
  REMOTE_CONSTANTS,
  REMOTE_CTL,
  REMOTE_DRIVE,
  REMOTE_LOBBY,
  REMOTE_MORE,
  REMOTE_PAGE,
  REMOTE_READY,
  REMOTE_TEXT,
  REMOTE_V2,
  REMOTE_WISH,
} from "@/data/remoteFullCopy";
import { localePath, type Locale } from "@/data/tools";
import {
  HARSH_CATS,
  RemoteLink,
  allowedParts,
  grip5Of,
  gripWire,
  inviteHref,
  lobbyPageHref,
  parseControllerHash,
  plainLine,
  remotePartsOf,
  remoteSeatId,
  useCtlPrefs,
  usePublicOrigin,
  type BodyPart,
  type Grip5,
  type RemoteMessage,
  type RemoteStatus,
} from "@/lib/remoteProtocol";

type RemoteState = Extract<RemoteMessage, { t: "state" }>;

const SIG_RGB: Record<string, string> = {
  go: "134, 227, 187",
  slow: "244, 212, 140",
  stop: "255, 152, 168",
  paused: "120, 110, 120",
};

const DESKTOP_MQ = "(min-width: 1024px)";

function signalTextOf(lang: Locale, k: string): string {
  const t = REMOTE_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const v2 = REMOTE_V2[lang];
  if (k === "limit") return t.sigLimit;
  if (k === "held") return t.sigHeld;
  if (k === "beg") return t.sigBeg;
  if (k === "came") return t.gotCame;
  const sigMap = rm.sig as Record<string, string>;
  if (sigMap[k]) return sigMap[k];
  const reactMap = v2.react as Record<string, string>;
  if (reactMap[k]) return plainLine(reactMap[k]);
  return k;
}

function outcomeTextOf(lang: Locale, outcome?: string): string {
  const t = REMOTE_TEXT[lang];
  if (outcome === "success") return t.doneSuccess;
  if (outcome === "fail") return t.doneFail;
  if (outcome === "ruin") return t.doneRuin;
  if (outcome === "lost") return t.doneLost;
  return t.ended;
}

function nowTextOf(lang: Locale, state: RemoteState | null): string {
  if (!state) return "";
  if (!state.lang || state.lang === lang) return state.text ?? "";
  const drv = REMOTE_DRIVE[lang];
  if (state.cool) return drv.nowCool;
  if (state.edge) return drv.nowEdge;
  if (state.drive != null) {
    const lv =
      state.drive === "stop" ? "stop" : driveLevelOf(Number(state.drive));
    return drv.now[lv];
  }
  const m = state.mode === "slow" || state.mode === "stop" ? state.mode : "go";
  return drv.nowAuto[m];
}

function RemoteRange({
  id,
  label,
  names,
  value,
  disabled,
  dim,
  always,
  extra,
  note,
  onCommit,
}: {
  id: string;
  label: string;
  names: string[];
  value: number;
  disabled: boolean;
  dim?: boolean;
  always?: boolean;
  extra?: ReactNode;
  note?: string;
  onCommit: (idx: number) => void;
}) {
  const max = Math.max(0, names.length - 1);
  const [dragging, setDragging] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestRef = useRef({ value, always, onCommit, disabled });
  latestRef.current = { value, always, onCommit, disabled };
  const lastChangeAt = useRef(0);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onChange = () => {
      const p = pendingRef.current;
      pendingRef.current = null;
      setDragging(null);
      if (
        p !== null &&
        !latestRef.current.disabled &&
        (p !== latestRef.current.value || latestRef.current.always)
      ) {
        lastChangeAt.current = Date.now();
        latestRef.current.onCommit(p);
      }
    };
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  const v = Math.min(max, dragging ?? Math.max(0, value));
  return (
    <div
      className={`rb${dim ? " rb-dim" : ""}${disabled ? " rb-off" : ""}`}
      style={{ ["--v" as string]: max ? v / max : 0 }}
      data-remote-bar-box={id}
    >
      <div className="rb-h">
        <label htmlFor={`rb-${id}`}>{label}</label>
        <b data-remote-bar-name={id}>
          {dragging === null && note ? note : (names[v] ?? "")}
        </b>
        {extra}
      </div>
      <div className="rb-track">
        <span className="rb-ticks" aria-hidden="true">
          {names.map((n, idx) => (
            <i key={n + idx} className={idx <= v ? "on" : ""} />
          ))}
        </span>
        <input
          ref={inputRef}
          id={`rb-${id}`}
          type="range"
          min={0}
          max={max}
          step={1}
          value={v}
          disabled={disabled}
          aria-valuetext={names[v] ?? ""}
          data-remote-bar={id}
          data-value={Math.min(max, Math.max(0, value))}
          onChange={(e) => {
            const val = Number(e.target.value);
            pendingRef.current = val;
            setDragging(val);
          }}
          onClick={() => {
            if (
              latestRef.current.always &&
              !latestRef.current.disabled &&
              pendingRef.current === null &&
              Date.now() - lastChangeAt.current > 400
            ) {
              latestRef.current.onCommit(Math.max(0, latestRef.current.value));
            }
          }}
        />
      </div>
      <div className="rb-ends" aria-hidden="true">
        <span>{names[0]}</span>
        <span>{names[max]}</span>
      </div>
    </div>
  );
}

function WedgeArrow({ deg }: { deg: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path d="M12 6l7 10H5z" fill="currentColor" />
    </svg>
  );
}

function RemoteFull({
  lang,
  q,
  n,
  onWatch,
  onOther,
  selfHref,
}: {
  lang: Locale;
  q: number;
  n: number;
  onWatch: () => void;
  onOther?: () => void;
  selfHref: string;
}) {
  const v2 = REMOTE_V2[lang];
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={rootRef}
      className="rw rw-full"
      data-sundome-remote-controller
      data-remote-gate="full"
    >
      <h2 className="rw-title">
        <Phrase text={v2.fullTitle} />
      </h2>
      <p className="rw-lead">
        <Phrase text={v2.fullLead} />
      </p>
      {(n > 0 || q > 0) && (
        <p className="rw-stats">
          {n > 0 && <WatchPill n={n} lang={lang} />}
          {q > 0 && (
            <span className="rw-eye rw-eye-q">
              {v2.queueLen.replace("{n}", String(q))}
            </span>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={onWatch}
        className="rw-choice rw-choice-p"
        data-remote-watch-join
      >
        <b>{v2.fullWatch}</b>
        <span>
          <Phrase
            text={
              q >= 0
                ? v2.fullWatchSub.replace("{n}", String(q + 1))
                : v2.fullWatchSub0
            }
          />
        </span>
      </button>
      {onOther && (
        <button
          type="button"
          onClick={onOther}
          className="rw-choice"
          data-remote-back-lobby
        >
          <b>{v2.fullOther}</b>
          <span>
            <Phrase text={v2.fullOtherSub} />
          </span>
        </button>
      )}
      <Link href={selfHref} className="rw-self" data-remote-play-self>
        {REMOTE_TEXT[lang].playSelf}
      </Link>
    </div>
  );
}

interface WatchLogItem {
  k: "c" | "r";
  text: string;
  at: number;
}

function RemoteWatch({
  lang,
  state,
  linked,
  peer,
  ended,
  closed,
  info,
  log,
  level,
  said,
  nowText,
  outcomeText,
  who,
  left,
  idleLeft,
  missed,
  onQueue,
  onOther,
}: {
  lang: Locale;
  state: RemoteState | null;
  linked: boolean;
  peer: boolean;
  ended: boolean;
  closed: RemoteStatus | null;
  info: { n: number; of: number; pos?: number; ctl?: boolean } | null;
  log: WatchLogItem[];
  level: number | null;
  said: { k: "sig" | "line"; text: string } | null;
  nowText: string;
  outcomeText: string;
  who: string;
  left: number | undefined;
  idleLeft: number | null;
  missed: boolean;
  onQueue: (on: boolean) => void;
  onOther?: () => void;
}) {
  const v2 = REMOTE_V2[lang];
  const t = REMOTE_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const drv = REMOTE_DRIVE[lang];
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const playing = !!state && state.phase === "play" && peer;
  const sigRgb = playing
    ? state.paused
      ? SIG_RGB.paused
      : SIG_RGB[state.mode ?? ""] ?? null
    : null;
  const pos = info?.pos ?? 0;
  const speedIdx =
    state?.drive != null
      ? REMOTE_CONSTANTS.DRIVE_LEVELS.indexOf(
          state.drive === "stop" ? "stop" : driveLevelOf(Number(state.drive)),
        )
      : state?.mode === "stop"
        ? 0
        : state?.bpm
          ? REMOTE_CONSTANTS.DRIVE_LEVELS.indexOf(driveLevelOf(state.bpm))
          : -1;
  const gripIdx = REMOTE_CONSTANTS.GRIP5.indexOf(
    grip5Of(state?.grip, state?.gx),
  );
  const statusNote = ended
    ? v2.watchEnded
    : closed === "forbidden"
      ? v2.watchNoSeat
      : closed === "replaced"
        ? t.replaced
        : linked
          ? peer
            ? ""
            : t.waiting
          : info
            ? t.reconnecting
            : v2.watchConnecting;
  const queueDesc =
    missed && pos === 0
      ? v2.missed
      : pos === 0
        ? v2.notQueued
        : pos === 1
          ? idleLeft !== null && info?.ctl
            ? v2.posNext.replace("{s}", String(idleLeft))
            : v2.posNextFree
          : v2.posWait.replace("{n}", String(pos - 1));

  return (
    <div
      ref={rootRef}
      className="rw rw-watch"
      style={sigRgb ? ({ ["--sig" as string]: sigRgb } as React.CSSProperties) : undefined}
      data-sundome-remote-controller
      data-remote-watch
      data-remote-watch-pos={pos}
    >
      <div
        className="rw-top"
        data-remote-status={ended ? "ended" : linked ? "watch" : "connecting"}
      >
        {statusNote ? (
          <span className="rw-status">{statusNote}</span>
        ) : (
          <span className="rp-who" data-remote-who>
            <i aria-hidden="true" />
            {who}
          </span>
        )}
        {info && info.n > 0 && <WatchPill n={info.n} lang={lang} />}
      </div>

      <section
        className="rp-hero rw-hero"
        aria-live="polite"
        data-remote-state={state?.phase ?? "none"}
      >
        {state && state.phase !== "setup" && (
          <span className="rw-nums">
            <span>
              {t.left} <b>{formatMmSs(left)}</b>
            </span>
            <span>
              {t.edges} <b data-remote-edges>{state.edges ?? 0}</b>
            </span>
          </span>
        )}
        {state && state.phase !== "setup" ? (
          state.phase === "done" ? (
            <p className="rp-w rp-w-s" data-remote-outcome={state.outcome ?? ""}>
              {outcomeText}
            </p>
          ) : state.phase === "reward" ? (
            <p className="rp-w rp-w-s">{v2.rewardNow}</p>
          ) : (
            <p
              className={`rp-w${nowText.length > 30 ? " rp-w-long" : ""}`}
              data-remote-text
            >
              {nowText}
              {state.paused && <span className="rp-paused">({t.paused})</span>}
            </p>
          )
        ) : (
          <p className="rp-w rp-w-s">{state ? t.phaseSetup : t.waiting}</p>
        )}

        {playing && (
          <span className="rp-meta">
            <span>
              {drv.title}
              <span className="rp-seg" aria-hidden="true">
                {REMOTE_CONSTANTS.DRIVE_LEVELS.map((lv, idx) => (
                  <i
                    key={lv}
                    className={speedIdx > 0 && idx <= speedIdx ? "on" : ""}
                  />
                ))}
              </span>
            </span>
            <span>
              {rm.gripTitle}
              <span className="rp-dot5" aria-hidden="true">
                {REMOTE_CONSTANTS.GRIP5.map((g, idx) => (
                  <i key={g} className={idx <= gripIdx ? "on" : ""} />
                ))}
              </span>
            </span>
            {state.part && <span>{rm.part[state.part] ?? state.part}</span>}
            {level != null && (
              <span data-remote-level={level}>
                {rm.levelLabel}{" "}
                <b>
                  {level}/{REMOTE_CONSTANTS.REMOTE_LEVELS}
                </b>
              </span>
            )}
          </span>
        )}

        {said && (
          <span
            key={said.k + said.text}
            className={`rp-said animate-fade-in${said.k === "sig" ? " rp-said-sig" : ""}`}
          >
            {said.text}
          </span>
        )}
      </section>

      {!ended && !closed && (
        <div
          className={`rw-q${pos === 1 ? " rw-q-next" : ""}`}
          data-remote-queue={pos}
        >
          {pos > 0 && (
            <span className="rw-qn">
              {v2.pos.replace("{n}", String(pos))}
            </span>
          )}
          <span className="rw-qt" data-remote-queue-text>
            <Phrase text={queueDesc} />
          </span>
        </div>
      )}

      <div className="rw-log" data-remote-log aria-live="polite">
        {log.length ? (
          log.map((item, idx) => (
            <p
              key={`${item.at}-${idx}`}
              className="animate-fade-in"
              data-remote-log-item={item.k}
            >
              <span className={item.k === "c" ? "rw-tag-c" : "rw-tag-r"}>
                {item.k === "c" ? v2.logCtl : v2.logPeer}
              </span>
              {item.text}
            </p>
          ))
        ) : (
          <p className="rw-log-empty">{v2.logEmpty}</p>
        )}
      </div>

      <div className="rw-two">
        {!ended && !closed && (
          <button
            type="button"
            onClick={() => onQueue(pos === 0)}
            className="rw-btn"
            data-remote-queue-toggle={pos === 0 ? "join" : "leave"}
          >
            {pos === 0 ? v2.joinQueue : v2.leaveQueue}
          </button>
        )}
        {onOther && (
          <button
            type="button"
            onClick={onOther}
            className={`rw-btn${ended || closed ? " rw-btn-p" : ""}`}
            data-remote-other
          >
            {v2.findOther}
          </button>
        )}
      </div>
      <p className="rw-note">
        <Phrase text={v2.watchNote} />
      </p>
    </div>
  );
}

interface PadViewProps {
  lang: Locale;
  state: RemoteState | null;
  stateAt: number;
  who: string;
  live: boolean;
  playing: boolean;
  open: boolean;
  left: number | undefined;
  nowText: string;
  outcomeText: string;
  statusText: string;
  level: number | null;
  wish: string[];
  limitText: string[];
  signalText: string | null;
  signalKey: string | null;
  lineNow: number | null;
  grip5: Grip5;
  verdict: "allow" | "deny" | null;
  driveNow: "auto" | "stop" | number;
  ack: boolean;
  miss: boolean;
  gainMs: number | null;
  extLeft: number | null;
  watchN: number;
  queueLen: number;
  idleLeft: number | null;
  idleRuleS: number;
  idleFirst: boolean;
  turnFresh: boolean;
  nextIn: number | null;
  say: string;
  setSay: (s: string) => void;
  thxSent: string | null;
  thxGot: string | null;
  ended: boolean;
  waitMoreLabel?: string;
  onWaitMore?: () => void;
  otherLabel?: string;
  onOther?: () => void;
  onDrive: (k: "auto" | "stop" | number) => void;
  onGrip5: (g: Grip5) => void;
  onPart: (p: BodyPart) => void;
  onVerdict: (v: "allow" | "deny") => void;
  onExtend: () => void;
  onRestart: () => void;
  onNow: () => void;
  onLine: (k: number) => void;
  onSay: (text: string) => void;
  onThx: (k: "thanks" | "fun" | "again") => void;
  onEnd: () => void;
  onNextPerson?: () => void;
}

function ControllerDeck(props: PadViewProps) {
  const { lang, state } = props;
  const r = REMOTE_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const drv = REMOTE_DRIVE[lang];
  const v2 = REMOTE_V2[lang];
  const ctlCopy = REMOTE_CTL[lang];
  const afterCopy = REMOTE_AFTER[lang];
  const prefs = useCtlPrefs();
  const isSlider = prefs.layout === "slider";

  const [pageIdx, setPageIdx] = useState(0);
  const pagerRef = useRef<HTMLDivElement | null>(null);
  const catsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_MQ).matches : false,
  );
  const [nowArm, setNowArm] = useState(false);
  const [quitArm, setQuitArm] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!nowArm) return;
    const id = window.setTimeout(() => setNowArm(false), 2500);
    return () => window.clearTimeout(id);
  }, [nowArm]);

  useEffect(() => {
    if (!quitArm) return;
    const id = window.setTimeout(() => setQuitArm(false), 2500);
    return () => window.clearTimeout(id);
  }, [quitArm]);

  useEffect(() => {
    const docEl = document.documentElement;
    const prev = docEl.style.overflow;
    docEl.style.overflow = "hidden";
    return () => {
      docEl.style.overflow = prev;
    };
  }, []);

  const lim = state?.lim;
  const isHarsh = (ci: number) => !!lim?.nh && HARSH_CATS.has(ci);
  const visibleCats = REMOTE_CONSTANTS.LINE_CATS.map((ks, ci) => ({
    ks: [...ks],
    ci,
  })).filter((c) => !isHarsh(c.ci));

  const favKeys = prefs.favs.filter(
    (k) =>
      !!v2.lines[k] &&
      !REMOTE_CONSTANTS.LINE_CATS.some((cat, ci) => isHarsh(ci) && cat.includes(k as never)),
  );
  const shownCats = visibleCats.filter((c) => !prefs.hide.includes(c.ci));
  const groups = [
    ...(favKeys.length ? [{ ks: favKeys, ci: -1 }] : []),
    ...(shownCats.length || favKeys.length ? shownCats : visibleCats),
  ];

  const pages = groups.flatMap((g) =>
    Array.from({ length: Math.ceil(g.ks.length / 4) }, (_, j) => ({
      ci: g.ci,
      j,
      ks: g.ks.slice(4 * j, 4 * j + 4),
    })),
  );
  const activeCi = pages[Math.min(pageIdx, Math.max(0, pages.length - 1))]?.ci ?? groups[0]?.ci ?? 0;
  const activeCatPages = pages
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.ci === activeCi);

  const jumpPage = (idx: number, smooth = true) => {
    const el = pagerRef.current;
    if (el) {
      el.scrollTo({
        left: idx * (el.clientWidth + 8),
        behavior: smooth ? "smooth" : "auto",
      });
    }
    setPageIdx(idx);
  };

  const twoRowCats = groups.length > 8;
  const catCols = twoRowCats
    ? Math.ceil(groups.length / 2)
    : Math.min(4, Math.max(1, groups.length));

  useEffect(() => {
    const el = catsRef.current;
    const onBtn = el?.querySelector<HTMLButtonElement>("button.on");
    if (!el || !onBtn) return;
    const l = onBtn.offsetLeft - 6;
    const rr = onBtn.offsetLeft + onBtn.offsetWidth + 6;
    if (l < el.scrollLeft) el.scrollLeft = l;
    else if (rr > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = rr - el.clientWidth;
    }
  }, [activeCi, twoRowCats, isDesktop]);

  useEffect(() => {
    const el = pagerRef.current;
    if (!el || !pages.length) return;
    const clamped = Math.min(pageIdx, pages.length - 1);
    el.scrollTo({
      left: Math.max(0, clamped) * (el.clientWidth + 8),
      behavior: "auto",
    });
    if (clamped !== pageIdx && clamped >= 0) setPageIdx(clamped);
  }, [isDesktop, pages.length, pageIdx]);

  const currentSpeedKey =
    state && state.phase === "play"
      ? props.driveNow !== "auto"
        ? props.driveNow === "stop"
          ? "stop"
          : driveLevelOf(Number(props.driveNow))
        : state.mode === "stop"
          ? "stop"
          : driveLevelOf(state.bpm || 100)
      : null;
  const speedIdx = currentSpeedKey
    ? REMOTE_CONSTANTS.DRIVE_LEVELS.indexOf(currentSpeedKey)
    : -1;
  const setSpeedLevel = (lv: (typeof REMOTE_CONSTANTS.DRIVE_LEVELS)[number]) =>
    props.onDrive(lv === "stop" ? "stop" : REMOTE_CONSTANTS.DRIVE_BPM[lv]);

  const maxSpeedIdx = lim?.sm
    ? REMOTE_CONSTANTS.DRIVE_LEVELS.indexOf(lim.sm)
    : REMOTE_CONSTANTS.DRIVE_LEVELS.length - 1;
  const curBpm =
    typeof props.driveNow === "number" ? props.driveNow : state?.bpm || 0;
  const atVfastMax =
    speedIdx === REMOTE_CONSTANTS.DRIVE_LEVELS.length - 1 &&
    maxSpeedIdx === REMOTE_CONSTANTS.DRIVE_LEVELS.length - 1;
  const speedAtCeiling =
    speedIdx >= maxSpeedIdx &&
    !(atVfastMax && curBpm < REMOTE_CONSTANTS.REMOTE_BPM_MAX);

  const stepFaster = () => {
    if (atVfastMax) {
      props.onDrive(
        Math.min(
          REMOTE_CONSTANTS.REMOTE_BPM_MAX,
          Math.max(REMOTE_CONSTANTS.DRIVE_BPM.vfast, curBpm) + 20,
        ),
      );
      return;
    }
    const nextIdx = speedIdx <= 0 ? 3 : Math.min(maxSpeedIdx, speedIdx + 1);
    setSpeedLevel(REMOTE_CONSTANTS.DRIVE_LEVELS[nextIdx]);
  };

  const stepSlower = () => {
    const prevIdx = Math.max(0, (speedIdx < 0 ? 3 : speedIdx) - 1);
    setSpeedLevel(REMOTE_CONSTANTS.DRIVE_LEVELS[prevIdx]);
  };

  const isStopped = currentSpeedKey === "stop";
  const isAuto = props.driveNow === "auto";
  const heroSigRgb =
    props.live && state && state.phase === "play"
      ? state.paused
        ? SIG_RGB.paused
        : SIG_RGB[state.mode ?? ""] ?? null
      : null;

  const parts = allowedParts(remotePartsOf(state?.body ?? "male", state?.wish), lim);
  const maxGripIdx = lim?.gm
    ? REMOTE_CONSTANTS.GRIP5.indexOf(lim.gm)
    : REMOTE_CONSTANTS.GRIP5.length - 1;
  const gripIdx = REMOTE_CONSTANTS.GRIP5.indexOf(props.grip5);
  const levelVal = props.level ?? 0;

  const saidPrimary = quitArm
    ? { k: "end" as const, text: rm.quitAgain }
    : props.signalText
      ? { k: "sig" as const, text: props.signalText }
      : null;
  const saidLine =
    props.lineNow != null && v2.lines[props.lineNow]
      ? `「${plainLine(v2.lines[props.lineNow])}」`
      : null;

  const ruleBits =
    props.open && props.playing
      ? [
          props.idleFirst
            ? v2.idleFirst.replace("{s}", String(props.idleRuleS))
            : v2.idleRule.replace("{s}", String(props.idleRuleS)),
          props.queueLen > 0
            ? v2.queueLen.replace("{n}", String(props.queueLen))
            : "",
        ]
          .filter(Boolean)
          .join(" ・ ")
      : "";

  const footInfo =
    props.idleLeft !== null
      ? { k: "idle", text: v2.idleLeft.replace("{s}", String(props.idleLeft)) }
      : props.miss
        ? { k: "miss", text: drv.miss }
        : props.playing &&
            isAuto &&
            props.nextIn !== null &&
            props.nextIn > 0
          ? {
              k: "next",
              text: [drv.nextIn.replace("{n}", String(props.nextIn)), ruleBits]
                .filter(Boolean)
                .join(" ・ "),
            }
          : ruleBits
            ? { k: "rule", text: ruleBits }
            : null;

  const smCls = (label: string, maxLen: number) =>
    label.length > maxLen ? " rp-sm" : "";

  const toggleStop = () =>
    isStopped ? setSpeedLevel("mid") : props.onDrive("stop");

  const keyRef = useRef({
    on: false,
    up: () => {},
    down: () => {},
    gl: () => {},
    gr: () => {},
    stop: () => {},
  });
  keyRef.current = {
    on: props.playing && !settingsOpen,
    up: () => {
      if (!speedAtCeiling) stepFaster();
    },
    down: stepSlower,
    gl: () => {
      if (gripIdx > 0) props.onGrip5(REMOTE_CONSTANTS.GRIP5[gripIdx - 1]);
    },
    gr: () => {
      if (gripIdx < maxGripIdx) {
        props.onGrip5(REMOTE_CONSTANTS.GRIP5[gripIdx + 1]);
      }
    },
    stop: toggleStop,
  };

  useEffect(() => {
    const isInput = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement | null;
      if (!el?.tagName) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
      return (
        el.tagName === "INPUT" &&
        !["range", "checkbox", "radio", "button"].includes(
          (el as HTMLInputElement).type,
        )
      );
    };
    const onDown = (ev: KeyboardEvent) => {
      const map: Record<string, keyof Omit<typeof keyRef.current, "on">> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "gl",
        ArrowRight: "gr",
        " ": "stop",
      };
      const fn = map[ev.key];
      if (!fn || ev.metaKey || ev.ctrlKey || ev.altKey || ev.isComposing) return;
      if (isInput(ev) || !keyRef.current.on) return;
      ev.preventDefault();
      if (!ev.repeat) keyRef.current[fn]();
    };
    const onUp = (ev: KeyboardEvent) => {
      if (ev.key === " " && !isInput(ev) && keyRef.current.on) {
        ev.preventDefault();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const sideBtnClass = isSlider ? "rp-sb" : "rp-rb";

  const extendBtn = (
    <button
      type="button"
      disabled={!props.playing || props.extLeft === 0}
      onClick={props.onExtend}
      className={`${sideBtnClass}${props.gainMs !== null ? " on" : ""}${smCls(lang === "zh" ? "加时" : "Extend", 5)}`}
      data-remote-penalty="extend"
    >
      <Phrase text={lang === "zh" ? "加时" : "Extend"} />
      {props.extLeft !== null && props.extLeft > 0 && (
        <small>{v2.extLeft.replace("{n}", String(props.extLeft))}</small>
      )}
    </button>
  );

  const restartBtn = (
    <button
      type="button"
      disabled={!props.playing}
      onClick={props.onRestart}
      className={`${sideBtnClass}${smCls(r.restart, 5)}`}
      data-remote-penalty="restart"
    >
      <Phrase text={r.restart} />
    </button>
  );

  const nowBtn = (
    <button
      type="button"
      disabled={!props.playing || !!lim?.nn}
      onClick={() => {
        if (nowArm) {
          setNowArm(false);
          props.onNow();
        } else {
          setNowArm(true);
        }
      }}
      className={`${sideBtnClass}${nowArm ? " arm" : ""}${smCls(nowArm ? v2.nowAgain : v2.nowBtn, 5)}`}
      data-remote-now
      data-armed={nowArm ? "1" : undefined}
    >
      <Phrase text={nowArm ? v2.nowAgain : v2.nowBtn} />
    </button>
  );

  const autoBtn = (
    <button
      type="button"
      disabled={!props.playing || isAuto}
      onClick={() => props.onDrive("auto")}
      className={`${sideBtnClass}${isAuto ? " on" : ""}${smCls(lang === "zh" ? "自动" : "Auto", 5)}`}
      data-remote-drive="auto"
    >
      <Phrase text={lang === "zh" ? "自动" : "Auto"} />
    </button>
  );

  const coreLabel = isStopped ? r.btnGo : r.btnStop;
  const centerBtn = (
    <button
      type="button"
      disabled={!props.playing}
      onClick={toggleStop}
      className={`${isSlider ? "rp-sb rp-sb-core" : "rp-core"}${isStopped ? " go" : ""}${smCls(coreLabel, 5)}`}
      data-remote-drive={isStopped ? "go" : "stop"}
    >
      <Phrase text={coreLabel} />
    </button>
  );

  const handleEndClick = () => {
    if (quitArm) {
      setQuitArm(false);
      props.onEnd();
    } else {
      setQuitArm(true);
    }
  };

  return (
    <div
      className="rp-bg"
      style={
        heroSigRgb
          ? ({ ["--sig" as string]: heroSigRgb } as React.CSSProperties)
          : undefined
      }
      data-sundome-remote-controller
      data-remote-v2="1"
    >
      <div className="rp">
        <div
          className="rp-top"
          data-remote-status={
            props.ended ? "ended" : props.live ? "open" : "connecting"
          }
        >
          {props.statusText ? (
            <span className="rp-status">{props.statusText}</span>
          ) : (
            <span className="rp-who" data-remote-who>
              <i key={props.stateAt} aria-hidden="true" className="animate-fade-in" />
              {props.who}
            </span>
          )}

          {state && state.phase !== "setup" && (
            <span className="rp-nums">
              <span>
                {r.left}{" "}
                <b data-remote-left>{formatMmSs(props.left)}</b>
                {props.gainMs !== null && (
                  <b className="rp-gain animate-fade-in" data-remote-gain>
                    +{formatMmSs(props.gainMs)}
                  </b>
                )}
              </span>
              <span>
                {r.edges} <b data-remote-edges>{state.edges ?? 0}</b>
              </span>
            </span>
          )}

          {props.open && props.watchN > 0 && (
            <WatchPill n={props.watchN} lang={lang} />
          )}

          {props.open && props.queueLen > 0 && props.onNextPerson && (
            <button
              type="button"
              onClick={props.onNextPerson}
              className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-bold hover:bg-white/10"
              data-remote-next
            >
              {r.nextBtn}
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {!props.ended && (
              <button
                type="button"
                onClick={handleEndClick}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold hover:bg-white/10"
                data-remote-end
              >
                {quitArm ? rm.quitAgain : r.end}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rp-gear"
              aria-label={ctlCopy.settings}
              title={ctlCopy.settings}
              data-remote-settings-open
            >
              <GearIcon />
            </button>
          </div>
        </div>

        <div className="rp-main">
          <section
            className="rp-hero"
            aria-live="polite"
            data-remote-state={state?.phase ?? "none"}
            data-remote-mirror={
              heroSigRgb ? (state?.paused ? "paused" : state?.mode ?? "") : ""
            }
          >
            {state && state.phase !== "setup" ? (
              state.phase === "done" ? (
                <>
                  <p className="rp-w rp-w-s" data-remote-outcome={state.outcome ?? ""}>
                    {props.outcomeText}
                  </p>
                  {props.live && (
                    <span
                      className="animate-fade-in text-[12px] font-bold leading-snug opacity-80 [word-break:keep-all] [overflow-wrap:anywhere]"
                      data-remote-after-wait
                    >
                      <Phrase text={afterCopy.choosing} />
                    </span>
                  )}
                </>
              ) : state.phase === "reward" ? (
                <p className="rp-w rp-w-s" data-remote-reward>
                  {v2.rewardNow}
                </p>
              ) : (
                <p
                  className={`rp-w${props.nowText.length > 30 ? " rp-w-long" : ""}`}
                  data-remote-text
                >
                  {props.nowText}
                  {state.paused && (
                    <span className="rp-paused" data-remote-paused>
                      ({r.paused})
                    </span>
                  )}
                </p>
              )
            ) : (
              <p className="rp-w rp-w-s">
                {props.statusText || (state ? r.phaseSetup : r.waiting)}
              </p>
            )}

            {state?.phase === "play" && (
              <span className="rp-meta">
                <span>
                  {drv.title}
                  <span className="rp-seg" aria-hidden="true">
                    {REMOTE_CONSTANTS.DRIVE_LEVELS.map((lv, idx) => (
                      <i
                        key={lv}
                        className={speedIdx > 0 && idx <= speedIdx ? "on" : ""}
                      />
                    ))}
                  </span>
                  {props.ack && (
                    <b
                      className="animate-fade-in"
                      data-remote-drive-ack
                      aria-label="ok"
                    >
                      ✓
                    </b>
                  )}
                </span>
                {!state.paused && !!state.bpm && (
                  <span data-remote-bpm={state.bpm}>
                    <i
                      aria-hidden="true"
                      className="beat rp-beat"
                      style={
                        {
                          ["--beat" as string]: `${60 / state.bpm}s`,
                        } as React.CSSProperties
                      }
                    />
                    <b>{state.bpm}</b> BPM
                  </span>
                )}
                <span data-remote-grip-now={props.grip5}>
                  {rm.gripTitle}
                  <span className="rp-dot5" aria-hidden="true">
                    {REMOTE_CONSTANTS.GRIP5.map((g, idx) => (
                      <i key={g} className={idx <= gripIdx ? "on" : ""} />
                    ))}
                  </span>
                </span>
                {state.part && (
                  <span data-remote-mirror-spec>
                    {rm.part[state.part] ?? state.part}
                  </span>
                )}
              </span>
            )}

            {props.limitText.length > 0 && props.live && (
              <span className="rp-wish" data-remote-limits>
                {props.limitText.map((txt) => (
                  <span key={txt}>{txt}</span>
                ))}
              </span>
            )}

            {state?.phase === "done" && props.live && (
              <span className="rp-thx" data-remote-thx>
                {(["thanks", "fun", "again"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={!!props.thxSent}
                    onClick={() => props.onThx(k)}
                    className={props.thxSent === k ? "on" : ""}
                    data-remote-thx-send={k}
                  >
                    {v2.thx[k]}
                  </button>
                ))}
                {props.thxGot && (
                  <b
                    className="animate-fade-in"
                    data-remote-thx-got={props.thxGot}
                  >
                    {v2.thxGot.replace(
                      "{x}",
                      v2.thx[props.thxGot as keyof typeof v2.thx] ?? props.thxGot,
                    )}
                  </b>
                )}
              </span>
            )}

            {props.wish.length > 0 && props.live && (
              <span className="rp-wish" data-remote-wish-got>
                {props.wish.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </span>
            )}

            {(saidPrimary || saidLine) && (
              <span className="rp-saids">
                {saidPrimary && (
                  <span
                    key={saidPrimary.k + saidPrimary.text}
                    className={`rp-said animate-fade-in${saidPrimary.k === "sig" ? " rp-said-sig" : ""}`}
                    {...(saidPrimary.k === "sig"
                      ? { "data-remote-signal": props.signalKey ?? "" }
                      : {})}
                  >
                    {saidPrimary.text}
                  </span>
                )}
                {saidLine && (
                  <span
                    key={`line${props.lineNow}`}
                    className="rp-said rp-said-line animate-fade-in"
                    data-remote-mirror-say={String(props.lineNow)}
                  >
                    {saidLine}
                  </span>
                )}
              </span>
            )}

            {props.turnFresh && (
              <span className="rp-turn animate-fade-in" data-remote-turn>
                <b>{v2.turnTitle}</b>
                <span className="rp-turn-lead">
                  <Phrase
                    text={v2.turnLead.replace("{s}", String(props.idleRuleS))}
                  />
                </span>
              </span>
            )}

            {props.onWaitMore && props.waitMoreLabel && (
              <button
                type="button"
                onClick={props.onWaitMore}
                className="rp-other"
                data-remote-wait-more
              >
                {props.waitMoreLabel}
              </button>
            )}
            {props.onOther && props.otherLabel && (
              <button
                type="button"
                onClick={props.onOther}
                className="rp-other"
                data-remote-other
              >
                {props.otherLabel} ›
              </button>
            )}
          </section>

          {isSlider ? (
            <div
              className="rp-sl"
              data-remote-move
              data-remote-drive-now={
                props.playing ? String(props.driveNow) : undefined
              }
            >
              <RemoteRange
                id="speed"
                label={drv.title}
                names={REMOTE_CONSTANTS.DRIVE_LEVELS.slice(
                  0,
                  maxSpeedIdx + 1,
                ).map((lv) => drv.level[lv])}
                value={speedIdx}
                disabled={!props.playing}
                dim={isAuto}
                always={isAuto}
                note={
                  !props.playing || speedIdx < 0
                    ? ""
                    : isAuto
                      ? `${lang === "zh" ? "自动" : "Auto"}: ${drv.level[REMOTE_CONSTANTS.DRIVE_LEVELS[speedIdx]]}`
                      : atVfastMax && curBpm > REMOTE_CONSTANTS.DRIVE_BPM.vfast
                        ? `${curBpm} BPM`
                        : undefined
                }
                extra={
                  atVfastMax && props.playing ? (
                    <button
                      type="button"
                      disabled={speedAtCeiling}
                      onClick={stepFaster}
                      className="rb-more"
                      aria-label={ctlCopy.faster}
                      title={ctlCopy.faster}
                      data-remote-drive="up"
                      data-remote-plus20
                    >
                      +20
                    </button>
                  ) : undefined
                }
                onCommit={(idx) =>
                  setSpeedLevel(REMOTE_CONSTANTS.DRIVE_LEVELS[idx])
                }
              />
              <RemoteRange
                id="grip"
                label={rm.gripTitle}
                names={REMOTE_CONSTANTS.GRIP5.slice(0, maxGripIdx + 1).map(
                  (g) => v2.grip5[g],
                )}
                value={gripIdx}
                disabled={!props.playing}
                onCommit={(idx) =>
                  props.onGrip5(REMOTE_CONSTANTS.GRIP5[idx])
                }
              />
              <div className="rp-sl-lv">
                <span>{rm.levelLabel}</span>
                <span
                  className="rp-lv9"
                  aria-hidden="true"
                  data-remote-level-meter
                >
                  {Array.from(
                    { length: REMOTE_CONSTANTS.REMOTE_LEVELS },
                    (_, i) => (
                      <i key={i} className={i < levelVal ? "on" : ""} />
                    ),
                  )}
                </span>
              </div>
              <div className="rp-sl-btns">
                {centerBtn}
                {autoBtn}
                {extendBtn}
                {nowBtn}
                {restartBtn}
              </div>
            </div>
          ) : (
            <div
              className="rp-deck"
              data-remote-move
              data-remote-drive-now={
                props.playing ? String(props.driveNow) : undefined
              }
            >
              <div className="rp-side">
                {extendBtn}
                {autoBtn}
              </div>
              <div className="rp-disc">
                <button
                  type="button"
                  disabled={!props.playing || speedAtCeiling}
                  onClick={stepFaster}
                  className={`rp-wedge rp-u${smCls(r.btnFast, 9)}`}
                  data-remote-drive="up"
                >
                  <span>
                    <WedgeArrow deg={0} />
                    <b className="rp-fast">
                      {r.btnFast}
                      {atVfastMax && props.playing && (
                        <small className="rp-plus" data-remote-plus20>
                          +20
                        </small>
                      )}
                    </b>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!props.playing}
                  onClick={stepSlower}
                  className={`rp-wedge rp-d${smCls(r.btnSlow, 9)}`}
                  data-remote-drive="down"
                >
                  <span>
                    {r.btnSlow}
                    <WedgeArrow deg={180} />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!props.playing || gripIdx <= 0}
                  onClick={() =>
                    props.onGrip5(REMOTE_CONSTANTS.GRIP5[gripIdx - 1])
                  }
                  className={`rp-wedge rp-l${gripIdx < 2 ? " on" : ""}${smCls(v2.gripDown, 6)}`}
                  data-remote-grip="down"
                  aria-label={`${v2.gripDown} (${v2.grip5[props.grip5]})`}
                >
                  <span>
                    <WedgeArrow deg={-90} />
                    {v2.gripDown}
                    <small>{gripIdx < 2 ? v2.grip5[props.grip5] : ""}</small>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!props.playing || gripIdx >= maxGripIdx}
                  onClick={() =>
                    props.onGrip5(REMOTE_CONSTANTS.GRIP5[gripIdx + 1])
                  }
                  className={`rp-wedge rp-r${gripIdx > 2 ? " on" : ""}${smCls(v2.gripUp, 6)}`}
                  data-remote-grip="up"
                  aria-label={`${v2.gripUp} (${v2.grip5[props.grip5]})`}
                >
                  <span>
                    <WedgeArrow deg={90} />
                    {v2.gripUp}
                    <small>{gripIdx > 2 ? v2.grip5[props.grip5] : ""}</small>
                  </span>
                </button>
                <svg
                  className="rp-ring"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  data-remote-level={props.level ?? undefined}
                  data-remote-level-meter
                >
                  <defs>
                    <linearGradient id="rp-rg">
                      <stop offset="0" stopColor="rgb(var(--glass-a))" />
                      <stop offset="1" stopColor="rgb(var(--glass-b))" />
                    </linearGradient>
                  </defs>
                  <circle className="bg" cx="50" cy="50" r="46" />
                  <circle
                    className="fg"
                    cx="50"
                    cy="50"
                    r="46"
                    strokeDasharray={`${((levelVal / REMOTE_CONSTANTS.REMOTE_LEVELS) * 289).toFixed(0)} 289`}
                  />
                </svg>
                {centerBtn}
              </div>
              <div className="rp-side">
                {nowBtn}
                {restartBtn}
              </div>
            </div>
          )}

          {props.miss && <span className="sr-only" data-remote-drive-miss />}

          <div className="rp-vrow">
            <span>{rm.atEnd}</span>
            {(["allow", "deny"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={!props.live || state?.phase !== "play"}
                onClick={() => props.onVerdict(v)}
                className={props.verdict === v ? "on" : ""}
                aria-pressed={props.verdict === v}
                data-remote-verdict={v}
              >
                {v === "allow" ? r.allow : r.deny}
              </button>
            ))}
          </div>

          <div className="rp-pills" role="group" aria-label={rm.partTitle}>
            {parts.map((p) => (
              <button
                key={p}
                type="button"
                disabled={!props.playing}
                onClick={() => props.onPart(p)}
                className={state?.part === p ? "on" : ""}
                aria-pressed={state?.part === p}
                data-remote-part={p}
              >
                {rm.part[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="rp-aside">
          <div
            ref={catsRef}
            className={`rp-cat8${twoRowCats && !isDesktop ? " rp-cats2" : ""}`}
            role="tablist"
            aria-label={rm.sayTitle}
            style={
              twoRowCats && !isDesktop
                ? undefined
                : { gridTemplateColumns: `repeat(${catCols}, 1fr)` }
            }
            data-remote-line-cats={twoRowCats && !isDesktop ? "scroll" : "grid"}
          >
            {(twoRowCats && !isDesktop
              ? [groups.slice(0, catCols), groups.slice(catCols)]
              : [groups]
            ).map((row, rowIdx) => {
              const buttons = row.map(({ ci }) => (
                <button
                  key={ci}
                  type="button"
                  role="tab"
                  aria-selected={activeCi === ci}
                  aria-label={ci === -1 ? ctlCopy.fav : undefined}
                  title={ci === -1 ? ctlCopy.fav : undefined}
                  className={`${activeCi === ci ? "on" : ""}${ci === -1 ? " rp-cat-fav" : ""}`}
                  onClick={() =>
                    jumpPage(
                      pages.findIndex((p) => p.ci === ci),
                      false,
                    )
                  }
                  data-remote-line-cat={ci === -1 ? "fav" : ci}
                >
                  {ci === -1 ? <StarIcon /> : v2.lineCats[ci]}
                </button>
              ));
              return twoRowCats && !isDesktop ? (
                <div key={rowIdx}>{buttons}</div>
              ) : (
                buttons
              );
            })}
          </div>

          {isDesktop ? (
            <div className="rp-lnw" data-remote-lines aria-label={rm.sayTitle}>
              {activeCatPages
                .flatMap((p) => p.ks)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={!props.live}
                    onClick={() => props.onLine(k)}
                    className={props.lineNow === k ? "sent" : ""}
                    aria-pressed={props.lineNow === k}
                    {...(activeCi === -1
                      ? { "data-remote-line-fav": k }
                      : { "data-remote-line": k })}
                  >
                    <Phrase text={v2.lines[k] ?? ""} />
                  </button>
                ))}
            </div>
          ) : (
            <>
              <div
                ref={pagerRef}
                className="rp-pager"
                data-remote-lines
                aria-label={rm.sayTitle}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const idx = Math.round(el.scrollLeft / (el.clientWidth + 8));
                  if (idx !== pageIdx && idx < pages.length) setPageIdx(idx);
                }}
              >
                {pages.map((pg, idx) => (
                  <div
                    key={`${pg.ci}-${pg.j}`}
                    className="rp-ln"
                    data-remote-line-page={idx}
                  >
                    {pg.ks.map((k) => (
                      <button
                        key={k}
                        type="button"
                        disabled={!props.live}
                        onClick={() => props.onLine(k)}
                        className={props.lineNow === k ? "sent" : ""}
                        aria-pressed={props.lineNow === k}
                        {...(pg.ci === -1
                          ? { "data-remote-line-fav": k }
                          : { "data-remote-line": k })}
                      >
                        <Phrase text={v2.lines[k] ?? ""} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="rp-dots">
                {activeCatPages.map((pg, idx) => (
                  <button
                    key={pg.i}
                    type="button"
                    aria-label={`${idx + 1}/${activeCatPages.length}`}
                    className={
                      Math.min(pageIdx, pages.length - 1) === pg.i ? "on" : ""
                    }
                    onClick={() => jumpPage(pg.i)}
                  />
                ))}
              </div>
            </>
          )}

          {!props.open && (
            <form
              className="rp-say"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = props.say
                  .trim()
                  .slice(0, REMOTE_CONSTANTS.REMOTE_SAY_MAX);
                if (clean && props.live) props.onSay(clean);
              }}
            >
              <input
                value={props.say}
                onChange={(e) =>
                  props.setSay(
                    e.target.value.slice(0, REMOTE_CONSTANTS.REMOTE_SAY_MAX),
                  )
                }
                maxLength={REMOTE_CONSTANTS.REMOTE_SAY_MAX}
                placeholder={r.sayPlaceholder}
                data-remote-say
              />
              <button
                type="submit"
                disabled={!props.live || !props.say.trim()}
              >
                {r.sayBtn}
              </button>
            </form>
          )}

          {isDesktop && (
            <p className="rp-keys" data-remote-keys>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> {drv.title}
              </span>
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> {rm.gripTitle}
              </span>
              <span>
                <kbd>Space</kbd> {drv.level.stop} / {r.btnGo}
              </span>
            </p>
          )}
        </div>

        <p
          className={`rp-foot${footInfo?.k === "idle" ? " rp-foot-warn" : ""}`}
          {...(footInfo?.k === "idle"
            ? { "data-remote-idle": String(props.idleLeft) }
            : footInfo?.k === "next"
              ? { "data-remote-next-in": String(props.nextIn) }
              : {})}
        >
          {footInfo?.text ?? ""}
        </p>
      </div>

      <CtlSettingsModal
        lang={lang}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export function RemoteController({ lang }: { lang: Locale }) {
  const r = REMOTE_TEXT[lang];
  const rm = REMOTE_MORE[lang];
  const ready = REMOTE_READY[lang];
  const pageCopy = REMOTE_PAGE[lang];
  const v2 = REMOTE_V2[lang];
  const lobCopy = REMOTE_LOBBY[lang];
  const drv = REMOTE_DRIVE[lang];
  const wishMap = REMOTE_WISH[lang].tag as Record<string, string>;

  const { publicOrigin } = usePublicOrigin();

  const [creds, setCreds] = useState<{
    room: string;
    key: string;
    player?: string;
    open: boolean;
  } | null | undefined>(undefined);
  const [mode, setMode] = useState<"ctl" | "watch">("ctl");
  const [status, setStatus] = useState<RemoteStatus>("connecting");
  const [watchStatus, setWatchStatus] = useState<"connecting" | "open">("connecting");
  const [peer, setPeer] = useState(false);
  const [ended, setEnded] = useState(false);
  const [watchClosed, setWatchClosed] = useState<RemoteStatus | null>(null);
  const [state, setState] = useState<RemoteState | null>(null);
  const [stateAt, setStateAt] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const [signal, setSignal] = useState<{ k: string; at: number } | null>(null);
  const [lineNow, setLineNow] = useState<{ k: number; at: number } | null>(null);
  const [watchLog, setWatchLog] = useState<WatchLogItem[]>([]);
  const [watchInfo, setWatchInfo] = useState<{
    n: number;
    of: number;
    pos?: number;
    ctl?: boolean;
  } | null>(null);
  const [turnFreshAt, setTurnFreshAt] = useState(0);
  const [missedTurn, setMissedTurn] = useState(false);
  const [verdict, setVerdict] = useState<"allow" | "deny" | null>(null);
  const [driveAck, setDriveAck] = useState<{
    k: "auto" | "stop" | number;
    at: number;
    ack: boolean;
    miss: boolean;
  } | null>(null);
  const [gainToast, setGainToast] = useState<{ ms: number; at: number } | null>(
    null,
  );
  const [say, setSay] = useState("");
  const [thxSent, setThxSent] = useState<string | null>(null);
  const [thxGot, setThxGot] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [extraWaitMs, setExtraWaitMs] = useState(0);
  const [peerJoinedAt, setPeerJoinedAt] = useState<number | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const ctlLinkRef = useRef<RemoteLink | null>(null);
  const watchLinkRef = useRef<RemoteLink | null>(null);
  const gateRef = useRef({ w: false, q: -1 });
  const idleRef = useRef<{ ms: number; at: number } | null>(null);
  const hasSentCmdRef = useRef(false);
  const prevStateRef = useRef<RemoteState | null>(null);

  const appendLog = useCallback((k: "c" | "r", text: string) => {
    setWatchLog((prev) => [{ k, text, at: Date.now() }, ...prev].slice(0, 60));
  }, []);

  const startWatchLink = useCallback(
    (room: string, key: string) => {
      watchLinkRef.current?.stop();
      setMode("watch");
      setWatchStatus("connecting");
      setWatchClosed(null);
      setEnded(false);
      const link = new RemoteLink(
        room,
        "watch",
        key,
        (msg) => {
          if (msg.t === "hello") {
            setPeer(msg.peer);
            return;
          }
          if (msg.t === "peer") {
            setPeer(msg.online);
            return;
          }
          if (msg.t === "watch") {
            setWatchInfo({
              n: msg.n,
              of: msg.of,
              pos: msg.pos,
              ctl: msg.ctl,
            });
            return;
          }
          if (msg.t === "turn") {
            watchLinkRef.current?.stop();
            setTurnFreshAt(Date.now());
            setMode("ctl");
            idleRef.current = {
              ms: msg.ms || REMOTE_CONSTANTS.REMOTE_PASS_MS,
              at: Date.now(),
            };
            ctlLinkRef.current?.openNow();
            return;
          }
          if (msg.t === "missed") {
            setMissedTurn(true);
            return;
          }
          if (msg.t === "state") {
            const prev = prevStateRef.current;
            prevStateRef.current = msg;
            setState(msg);
            setStateAt(Date.now());
            if (msg.level != null) setLevel(msg.level);
            if (prev?.phase === "play" && msg.phase === "play" && msg.text && msg.text !== prev.text) {
              appendLog("c", msg.text);
            }
            if (msg.phase === "play" && idleRef.current) {
              idleRef.current = {
                ms: REMOTE_CONSTANTS.REMOTE_PASS_MS,
                at: Date.now(),
              };
            }
            return;
          }
          if (msg.t === "signal") {
            setSignal({ k: msg.k, at: Date.now() });
            appendLog("r", signalTextOf(lang, msg.k));
            return;
          }
          if (msg.t === "level") {
            setLevel(msg.k);
            appendLog("r", `${rm.levelLabel} ${msg.k}/9`);
            return;
          }
          if (msg.t === "line") {
            setLineNow({ k: msg.k, at: Date.now() });
            if (v2.lines[msg.k]) appendLog("c", plainLine(v2.lines[msg.k]));
            return;
          }
          if (msg.t === "now") {
            appendLog("c", v2.nowLog);
            return;
          }
          if (msg.t === "verdict") {
            setVerdict(msg.k);
            appendLog("c", msg.k === "allow" ? r.allow : r.deny);
            return;
          }
        },
        (st) => {
          if (st === "open") setWatchStatus("open");
          else if (st === "connecting" || st === "closed") {
            setWatchStatus("connecting");
          } else if (st === "ended") setEnded(true);
          else if (st === "forbidden" || st === "replaced") setWatchClosed(st);
        },
        remoteSeatId(),
      );
      watchLinkRef.current = link;
      link.start();
    },
    [appendLog, lang, r.allow, r.deny, rm.levelLabel, v2.lines, v2.nowLog],
  );

  useEffect(() => {
    const parsed = parseControllerHash(window.location.hash);
    if (!parsed) {
      setCreds(null);
      return;
    }
    const nextCreds = {
      room: parsed.room,
      key: parsed.key,
      open: parsed.open,
      player: parsed.player,
    };
    setCreds(nextCreds);

    const link = new RemoteLink(
      parsed.room,
      "controller",
      parsed.key,
      (msg) => {
        if (msg.t === "hello") {
          setPeer(msg.peer);
          if (msg.peer) setPeerJoinedAt((v) => v ?? Date.now());
          return;
        }
        if (msg.t === "peer") {
          setPeer(msg.online);
          if (msg.online) {
            setPeerJoinedAt((v) => v ?? Date.now());
          } else {
            idleRef.current = null;
          }
          return;
        }
        if (msg.t === "watch") {
          setWatchInfo({
            n: msg.n,
            of: msg.of,
            pos: msg.pos,
            ctl: msg.ctl,
          });
          return;
        }
        if (msg.t === "state") {
          const prev = prevStateRef.current;
          prevStateRef.current = msg;
          setState(msg);
          setStateAt(Date.now());
          if (msg.level != null) setLevel(msg.level);
          if (msg.phase === "setup") {
            setThxSent(null);
            setThxGot(null);
            setVerdict(null);
          }
          if (
            prev &&
            msg.total != null &&
            prev.total != null &&
            msg.total > prev.total
          ) {
            setGainToast({ ms: msg.total - prev.total, at: Date.now() });
          }
          if (msg.phase === "play" && parsed.open && !idleRef.current && hasSentCmdRef.current) {
            idleRef.current = {
              ms: REMOTE_CONSTANTS.REMOTE_PASS_MS,
              at: Date.now(),
            };
          }
          return;
        }
        if (msg.t === "signal") {
          setSignal({ k: msg.k, at: Date.now() });
          return;
        }
        if (msg.t === "level") {
          setLevel(msg.k);
          return;
        }
        if (msg.t === "thx") {
          setThxGot(msg.k);
          return;
        }
      },
      (st) => {
        gateRef.current = link.gateInfo;
        setStatus(st);
        if (st === "ended") setEnded(true);
      },
      remoteSeatId(),
    );
    ctlLinkRef.current = link;
    link.start();

    const tickId = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => {
      window.clearInterval(tickId);
      link.stop();
      watchLinkRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!driveAck || driveAck.ack || driveAck.miss) return;
    const expected = driveAck.k;
    const isV2 = (state?.v ?? 0) >= 2;
    const reported = state
      ? isV2
        ? state.drive ?? "auto"
        : expected === "stop"
          ? state.mode === "stop"
            ? "stop"
            : null
          : state.setBpm || "auto"
      : null;
    if (stateAt > driveAck.at && reported === expected) {
      setDriveAck({ ...driveAck, ack: true });
      return;
    }
    if (nowTick - driveAck.at > 2500) {
      setDriveAck({ ...driveAck, miss: true });
    }
  }, [driveAck, nowTick, state, stateAt]);

  useEffect(() => {
    if (
      !creds?.open ||
      gaveUp ||
      ended ||
      status !== "open" ||
      !peer ||
      !peerJoinedAt
    ) {
      return;
    }
    const isSetup = state && state.phase === "setup";
    if (!isSetup && state) return;
    const deadline =
      REMOTE_CONSTANTS.REMOTE_SETUP_WAIT_MS +
      extraWaitMs +
      REMOTE_CONSTANTS.REMOTE_SETUP_GRACE_MS;
    if (nowTick - peerJoinedAt > deadline) {
      ctlLinkRef.current?.stop();
      setGaveUp(true);
    }
  }, [creds?.open, ended, extraWaitMs, gaveUp, nowTick, peer, peerJoinedAt, state, status]);

  const sendMsg = (msg: RemoteMessage) => {
    ctlLinkRef.current?.send(msg);
    if (msg.t !== "end") {
      hasSentCmdRef.current = true;
      if (creds?.open) {
        idleRef.current = {
          ms: REMOTE_CONSTANTS.REMOTE_PASS_MS,
          at: Date.now(),
        };
      }
    }
  };

  const endSession = () => {
    ctlLinkRef.current?.end();
    setEnded(true);
  };

  if (creds === undefined) {
    return <p className="mt-6 text-sm text-muted">…</p>;
  }

  if (creds === null || status === "forbidden") {
    return (
      <>
        <div className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6 text-sm text-muted-strong">
          {r.invalid}
        </div>
        <RemoteLobby lang={lang} where="gate" skip={creds?.room} />
      </>
    );
  }

  if (creds.player && (!peer || !state) && !ended) {
    const shareUrl = inviteHref(
      publicOrigin || (typeof window !== "undefined" ? window.location.origin : ""),
      lang,
      { room: creds.room, player: creds.player },
    );
    return (
      <div
        className="mt-6 rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 [word-break:keep-all] [overflow-wrap:anywhere]"
        data-sundome-remote-controller
        data-remote-invite-wait
      >
        <h2 className="text-base font-bold text-foreground">
          {pageCopy.inviteWait}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-strong">
          <Phrase text={pageCopy.inviteSend} />
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-card-border bg-background/60 px-3 py-2.5 text-xs font-mono text-foreground"
            data-remote-invite-url
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(() => {
                setInviteCopied(true);
                window.setTimeout(() => setInviteCopied(false), 2000);
              });
            }}
            className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white"
            data-remote-invite-copy
          >
            {inviteCopied ? r.copied : r.copy}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {status === "open" ? r.waitingPeer : r.reconnecting}
        </p>
      </div>
    );
  }

  if (mode === "watch") {
    const liveWatch = watchStatus === "open";
    const playingWatch = liveWatch && peer && state?.phase === "play";
    const liveLeft =
      playingWatch && !state?.paused && state?.left != null
        ? state.left - (nowTick - stateAt)
        : state?.left;
    const recentSig =
      signal && nowTick - signal.at < 15000 ? signal : null;
    const recentLine =
      lineNow && nowTick - lineNow.at < 8000 ? lineNow : null;

    return (
      <>
        <RemoteWatch
          lang={lang}
          state={state}
          linked={liveWatch}
          peer={peer}
          ended={ended}
          closed={watchClosed}
          info={watchInfo}
          log={watchLog}
          level={state?.phase === "play" ? level : null}
          said={
            recentSig
              ? {
                  k: "sig",
                  text: v2.peerSays.replace("{x}", signalTextOf(lang, recentSig.k)),
                }
              : recentLine && v2.lines[recentLine.k]
                ? { k: "line", text: `「${plainLine(v2.lines[recentLine.k])}」` }
                : null
          }
          nowText={nowTextOf(lang, state)}
          outcomeText={outcomeTextOf(lang, state?.outcome)}
          who={
            state?.body
              ? lobCopy.body[state.body as keyof typeof lobCopy.body] ?? ""
              : ""
          }
          left={liveLeft}
          idleLeft={
            idleRef.current && playingWatch && !state?.paused
              ? Math.max(
                  0,
                  Math.ceil(
                    (idleRef.current.ms - (nowTick - idleRef.current.at)) / 1000,
                  ),
                )
              : null
          }
          missed={missedTurn}
          onQueue={(on) => watchLinkRef.current?.send({ t: "queue", on })}
          onOther={() => {
            window.location.href = lobbyPageHref(lang);
          }}
        />
        {(ended || watchClosed) && (
          <RemoteLobby lang={lang} where="after" skip={creds?.room} />
        )}
      </>
    );
  }

  if (gaveUp) {
    return (
      <>
        <div
          className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6"
          data-sundome-remote-controller
          data-remote-gate="gaveup"
        >
          <p className="text-base font-bold leading-relaxed [word-break:auto-phrase]">
            {ready.gaveUp}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={lobbyPageHref(lang)}
              className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
              data-remote-back-lobby
            >
              {ready.findOther} ›
            </Link>
            <Link
              href={localePath(lang, "/sundome")}
              className="cursor-pointer rounded-full border border-card-border px-4 py-2 text-sm font-bold"
              data-remote-play-self
            >
              {r.playSelf}
            </Link>
          </div>
        </div>
        <RemoteLobby lang={lang} where="gate" skip={creds.room} />
      </>
    );
  }

  if (status === "busy" && gateRef.current.w) {
    return (
      <RemoteFull
        lang={lang}
        q={gateRef.current.q}
        n={watchInfo?.n ?? 0}
        selfHref={localePath(lang, "/sundome")}
        onWatch={() => {
          ctlLinkRef.current?.stop();
          startWatchLink(creds.room, creds.key);
        }}
        onOther={() => {
          window.location.href = lobbyPageHref(lang);
        }}
      />
    );
  }

  if (
    status === "busy" ||
    status === "away" ||
    status === "ended" ||
    status === "next"
  ) {
    const msgMap: Record<string, string> = {
      busy: r.busy,
      away: r.away,
      ended: r.closed,
      next: r.kicked,
    };
    return (
      <>
        <div
          className="mt-6 rounded-2xl border border-card-border bg-card-bg p-6"
          data-sundome-remote-controller
          data-remote-gate={status}
        >
          <p className="text-base font-bold leading-relaxed [word-break:auto-phrase]">
            {msgMap[status]}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={lobbyPageHref(lang)}
              className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
              data-remote-back-lobby
            >
              {ready.findOther} ›
            </Link>
            <Link
              href={localePath(lang, "/sundome")}
              className="cursor-pointer rounded-full border border-card-border px-4 py-2 text-sm font-bold"
              data-remote-play-self
            >
              {r.playSelf}
            </Link>
          </div>
        </div>
        <RemoteLobby lang={lang} where="gate" skip={creds.room} />
      </>
    );
  }

  const live = status === "open" && peer && !ended;
  const playing = live && state?.phase === "play";
  const liveLeft =
    playing && !state?.paused && state?.left != null
      ? state.left - (nowTick - stateAt)
      : state?.left;
  const driveNow: "auto" | "stop" | number =
    driveAck && !driveAck.miss
      ? driveAck.k
      : state?.drive != null
        ? state.drive
        : state?.mode === "stop"
          ? "stop"
          : state?.setBpm || "auto";

  const grip5Now = grip5Of(state?.grip, state?.gx);
  const recentSignal = signal && nowTick - signal.at < 15000 ? signal : null;
  const recentLine = lineNow && nowTick - lineNow.at < 8000 ? lineNow : null;
  const recentGain =
    gainToast && nowTick - gainToast.at < 5000 ? gainToast.ms : null;

  const idleLeft =
    creds.open && playing && idleRef.current && !state?.paused
      ? Math.max(
          0,
          Math.ceil((idleRef.current.ms - (nowTick - idleRef.current.at)) / 1000),
        )
      : null;
  const idleRuleS = Math.round(REMOTE_CONSTANTS.REMOTE_PASS_MS / 1000);
  const nextIn =
    playing && state?.at
      ? Math.max(0, Math.ceil((state.at - nowTick) / 1000))
      : null;

  const statusText = ended
    ? r.ended
    : status === "replaced"
      ? r.replaced
      : status !== "open"
        ? r.reconnecting
        : !peer
          ? r.waiting
          : "";

  const extLeft =
    state?.xm != null && state.xm >= 0
      ? Math.max(0, state.xm - (state.xu ?? 0))
      : null;

  const wishList = (state?.wish ?? []).map((w) => wishMap[w] ?? w).filter(Boolean);
  const limitList = limitSummary(lang, state?.lim, state?.body ?? "male");

  const waitingSetup = live && state?.phase === "setup" && creds.open && peerJoinedAt;
  const canWaitMore =
    !!waitingSetup &&
    nowTick - peerJoinedAt > REMOTE_CONSTANTS.REMOTE_SETUP_WAIT_MS + extraWaitMs;

  return (
    <ControllerDeck
      lang={lang}
      state={state}
      stateAt={stateAt}
      who={
        state?.body
          ? lobCopy.body[state.body as keyof typeof lobCopy.body] ?? ""
          : ""
      }
      live={live}
      playing={playing}
      open={creds.open}
      left={liveLeft}
      nowText={nowTextOf(lang, state) || (playing ? drv.nowAuto.go : "")}
      outcomeText={outcomeTextOf(lang, state?.outcome)}
      statusText={statusText}
      level={state?.phase === "play" ? level : null}
      wish={wishList}
      limitText={limitList}
      signalText={
        recentSignal
          ? v2.peerSays.replace("{x}", signalTextOf(lang, recentSignal.k))
          : null
      }
      signalKey={recentSignal?.k ?? null}
      lineNow={recentLine?.k ?? null}
      grip5={grip5Now}
      verdict={verdict}
      driveNow={driveNow}
      ack={!!driveAck?.ack}
      miss={!!driveAck?.miss}
      gainMs={recentGain}
      extLeft={extLeft}
      watchN={watchInfo?.n ?? 0}
      queueLen={watchInfo?.of ?? 0}
      idleLeft={idleLeft !== null && idleLeft <= 5 ? idleLeft : null}
      idleRuleS={idleRuleS}
      idleFirst={!hasSentCmdRef.current}
      turnFresh={!!turnFreshAt && nowTick - turnFreshAt < 8000}
      nextIn={nextIn}
      say={say}
      setSay={setSay}
      thxSent={thxSent}
      thxGot={thxGot}
      ended={ended}
      waitMoreLabel={canWaitMore ? ready.waitMore : undefined}
      onWaitMore={
        canWaitMore
          ? () => setExtraWaitMs((x) => x + REMOTE_CONSTANTS.REMOTE_SETUP_MORE_MS)
          : undefined
      }
      otherLabel={creds.open && !live ? ready.findOther : undefined}
      onOther={
        creds.open && !live
          ? () => {
              window.location.href = lobbyPageHref(lang);
            }
          : undefined
      }
      onDrive={(k) => {
        setTurnFreshAt(0);
        setDriveAck({ k, at: Date.now(), ack: false, miss: false });
        sendMsg({ t: "drive", k });
      }}
      onGrip5={(g) => {
        setTurnFreshAt(0);
        const w = gripWire(g);
        sendMsg({ t: "grip", k: w.k, ...(w.x ? { x: w.x } : {}) });
      }}
      onPart={(p) => {
        setTurnFreshAt(0);
        sendMsg({ t: "part", k: state?.part === p ? "none" : p });
      }}
      onVerdict={(v) => {
        setVerdict(v);
        sendMsg({ t: "verdict", k: v });
      }}
      onExtend={() => sendMsg({ t: "penalty", k: "extend" })}
      onRestart={() => sendMsg({ t: "penalty", k: "restart" })}
      onNow={() => sendMsg({ t: "now" })}
      onLine={(k) => {
        setLineNow({ k, at: Date.now() });
        sendMsg({ t: "line", k });
      }}
      onSay={(text) => {
        sendMsg({ t: "say", text });
        setSay("");
      }}
      onThx={(k) => {
        setThxSent(k);
        sendMsg({ t: "thx", k });
      }}
      onEnd={endSession}
      onNextPerson={
        creds.open ? () => sendMsg({ t: "end" }) : undefined
      }
    />
  );
}
