"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DglabPanel } from "@/components/tools/DglabPanel";
import { ReactSettingsModal, GearIcon } from "@/components/tools/RemoteCtlSettingsModal";
import {
  Phrase,
  RemoteElapsed,
  StarIcon,
  WatchPill,
  copyTextToClipboard,
} from "@/components/tools/RemoteShared";
import { SundomeArc, type SundomeArcMode, type SundomeTrace } from "@/components/tools/SundomeArc";
import { PARTNER_LEAD_MS, PARTNER_TEXT, PARTNER_VERSION } from "@/data/partnerCopy";
import {
  LIMITS_TEXT,
  REMOTE_AFTER,
  REMOTE_CONSTANTS,
  REMOTE_CTL,
  REMOTE_DRIVE,
  REMOTE_MORE,
  REMOTE_PAGE,
  REMOTE_READY,
  REMOTE_TEXT,
  REMOTE_V2,
  REMOTE_WISH,
} from "@/data/remoteFullCopy";
import {
  sundomeCopy,
  type CommandType,
  type CustomCommand,
  type SundomeCommand,
  type SundomeDifficulty,
  type SundomeEnding,
} from "@/data/sundomeCopy";
import { IS_STATIC_EXPORT, type Locale, type VariantKey } from "@/data/tools";
import {
  PARTNER_APP,
  encodePartner,
  formatStartAt,
  mulberry32,
  newSeed,
  partnerPhase,
  partnerShareUrl,
  type PartnerPayload,
} from "@/lib/partnerSync";
import {
  RemoteLink,
  allowedParts,
  capBpm,
  cleanWishes,
  controllerHref,
  createRemoteRoom,
  grip5Of,
  gripAllowed,
  gripWire,
  loadExtMax,
  loadLimits,
  plainLine,
  reactCatsOf,
  reactFavsOf,
  remotePartsOf,
  saveExtMax,
  saveLimits,
  usePublicOrigin,
  useReactPrefs,
  variantToBody,
  type BodyKind,
  type BodyPart,
  type Grip5,
  type RemoteLimits,
  type RemoteMessage,
  type RemoteStatus,
  type RemoteWishKey,
  type RoomCredentials,
} from "@/lib/remoteProtocol";
import { dglabManager, useDglab } from "@/lib/dglab";
import {
  ZH_ACTORS,
  defaultVoiceActor,
  playVoiceOrSpeech,
  stopVoiceFiles,
  voiceActorLabels,
  type VoiceActorId,
} from "@/lib/voicePlayer";

type Phase =
  | "idle"
  | "playing"
  | "paused"
  | "permission"
  | "denied"
  | "ruined"
  | "overtime"
  | "finished";

type SampleSource = "samples" | "alt-samples" | "browse";

interface SampleItem {
  id: string;
  title: string;
  previewUrl: string;
  posterUrl?: string;
  durationSec?: number;
}

const STAGE_BG: Record<string, string> = {
  stroke: "#0c3f2c",
  slow: "#4d3400",
  stop: "#5c0d16",
  paused: "#141014",
};

const AGE_KEY = "open100adults:age18";
const CUSTOM_KEY = "sundome:custom";
const SETTINGS_KEY = "sundome:settings";

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function randomOf<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

function adaptVariantText(
  text: string,
  locale: Locale,
  body: BodyKind,
): string {
  if (body !== "female" && body !== "lesbian") return text;
  if (locale === "zh") {
    return text
      .replace(/龟头/g, "阴蒂")
      .replace(/棒身|阴茎/g, "花瓣")
      .replace(/射精/g, "高潮")
      .replace(/射出来/g, "泄出来");
  }
  return text
    .replace(/\bshaft\b/gi, "sensitive area")
    .replace(/\btip\b/gi, "clit")
    .replace(/\bhead\b/gi, "clit")
    .replace(/\bgrip\b/gi, "pressure")
    .replace(/\bcome\b/gi, "finish");
}

function toArcMode(t: CommandType): SundomeArcMode {
  return t === "stroke" ? "go" : t;
}

function mapDifficultyForWire(d: SundomeDifficulty): number {
  return d === "easy" ? 0 : d === "normal" ? 1 : d === "hard" ? 2 : 3;
}

export function SundomeGame({
  locale,
  variant,
  remoteOnly,
  remoteInvite,
  onRemoteBack,
  partner,
}: {
  locale: Locale;
  variant?: VariantKey;
  remoteOnly?: "open" | "link";
  remoteInvite?: { room: string; key: string };
  onRemoteBack?: () => void;
  partner?: PartnerPayload;
}) {
  const copy = sundomeCopy[locale];
  const rText = REMOTE_TEXT[locale];
  const rMore = REMOTE_MORE[locale];
  const rPage = REMOTE_PAGE[locale];
  const rReady = REMOTE_READY[locale];
  const rAfter = REMOTE_AFTER[locale];
  const rDrive = REMOTE_DRIVE[locale];
  const rWish = REMOTE_WISH[locale];
  const rV2 = REMOTE_V2[locale];
  const rCtl = REMOTE_CTL[locale];
  const limText = LIMITS_TEXT[locale];
  const pText = PARTNER_TEXT[locale];

  const { publicOrigin } = usePublicOrigin();
  const reactPrefs = useReactPrefs();
  const dglabSnap = useDglab();
  const dglabRef = useRef(dglabSnap);
  dglabRef.current = dglabSnap;
  const actorLabels = useMemo(() => voiceActorLabels(), []);

  // Core setup state
  const [hydrated, setHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [body, setBody] = useState<BodyKind>(() => variantToBody(variant));
  const [durationMode, setDurationMode] = useState<number | "custom">(
    partner?.s.duration ?? 5,
  );
  const [customMinutes, setCustomMinutes] = useState("10");
  const [difficulty, setDifficulty] = useState<SundomeDifficulty>(
    partner?.s.difficulty ?? "normal",
  );
  const [ending, setEnding] = useState<SundomeEnding>(
    partner?.s.ending ?? "lottery",
  );
  const [metronome, setMetronome] = useState(true);
  const [voice, setVoice] = useState(true);
  const [voiceActor, setVoiceActor] = useState<VoiceActorId>(() =>
    defaultVoiceActor("female"),
  );
  const [volume, setVolume] = useState(0.6);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(
    partner?.s.custom ?? [],
  );
  const [customText, setCustomText] = useState("");
  const [customType, setCustomType] = useState<CommandType>("stroke");
  const [customBpm, setCustomBpm] = useState("80");

  // Video & stage presentation settings
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoVolume, setVideoVolume] = useState(0.6);
  const [videoDim, setVideoDim] = useState(70);
  const [videoFit, setVideoFit] = useState<"contain" | "cover">("contain");
  const [pauseVideoOnStop, setPauseVideoOnStop] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [sampleSource, setSampleSource] = useState<SampleSource>("samples");
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseGenre, setBrowseGenre] = useState("");
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesError, setSamplesError] = useState(false);
  const [sampleSearch, setSampleSearch] = useState("");
  const [samplePage, setSamplePage] = useState(0);
  const [videoPlayError, setVideoPlayError] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"-10s" | "+10s" | null>(null);

  // Active play state
  const [timeLeft, setTimeLeft] = useState(300);
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [edges, setEdges] = useState(0);
  const [cmdCount, setCmdCount] = useState(0);
  const [command, setCommand] = useState<SundomeCommand>(copy.commands.stroke[0]);
  const [edgeCooldown, setEdgeCooldown] = useState(0);
  const [activeRoll, setActiveRoll] = useState<number | null>(null);
  const [extendRound, setExtendRound] = useState(0);

  // Trace for SundomeArc
  const [doneTrace, setDoneTrace] = useState<SundomeTrace | null>(null);
  const traceRef = useRef<SundomeTrace>({ edges: [], segs: [] });
  const playStartedAtRef = useRef<number>(0);

  // Remote setup / connection state
  const [wishes, setWishes] = useState<RemoteWishKey[]>([]);
  const [limits, setLimits] = useState<RemoteLimits>({});
  const [extMax, setExtMax] = useState<number>(3);
  const [extUsed, setExtUsed] = useState<number>(0);
  const [reactSettingsOpen, setReactSettingsOpen] = useState(false);
  const [roomCreds, setRoomCreds] = useState<RoomCredentials | null>(null);
  const [makingRoom, setMakingRoom] = useState(false);
  const [makeRoomError, setMakeRoomError] = useState(false);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>("closed");
  const [peerOnline, setPeerOnline] = useState(false);
  const [remoteCopied, setRemoteCopied] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);

  // Remote live overrides during session
  const [remoteDrive, setRemoteDrive] = useState<"auto" | "stop" | number>("auto");
  const [remotePart, setRemotePart] = useState<BodyPart | undefined>(undefined);
  const [remoteGrip, setRemoteGrip] = useState<Grip5>("normal");
  const [remoteVerdict, setRemoteVerdict] = useState<"allow" | "deny" | null>(null);
  const [remoteOverlay, setRemoteOverlay] = useState<{ text: string; until: number } | null>(null);
  const [watchCount, setWatchCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [thxSent, setThxSent] = useState<string | null>(null);
  const [thxGot, setThxGot] = useState<string | null>(null);

  // Player reaction drawer (.rr) state
  const [reactCollapsed, setReactCollapsed] = useState(false);
  const [reactCatIdx, setReactCatIdx] = useState(0);
  const [reactSentKey, setReactSentKey] = useState<string | null>(null);
  const [arousalLevel, setArousalLevel] = useState<number>(0);
  const [quitArmed, setQuitArmed] = useState(false);

  // Partner 2P link sharing & sync state
  const [partnerUrl, setPartnerUrl] = useState<string | null>(null);
  const [partnerStartAt, setPartnerStartAt] = useState<number | null>(null);
  const [partnerCopied, setPartnerCopied] = useState(false);
  const [partnerClock, setPartnerClock] = useState(() => Date.now());

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reactPagerRef = useRef<HTMLDivElement | null>(null);
  const remoteLinkRef = useRef<RemoteLink | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const difficultyRef = useRef(difficulty);
  const endingRef = useRef(ending);
  const commandRef = useRef(command);
  const timeLeftRef = useRef(timeLeft);
  const totalSecondsRef = useRef(totalSeconds);
  const edgesRef = useRef(edges);
  const cmdCountRef = useRef(cmdCount);
  const metronomeRef = useRef(metronome);
  const voiceRef = useRef(voice);
  const voiceActorRef = useRef(voiceActor);
  const volumeRef = useRef(volume);
  const customRef = useRef(customCommands);
  const lastTapLeftRef = useRef(0);
  const lastTapRightRef = useRef(0);
  const partnerStepIdxRef = useRef(-1);
  const remoteVerdictRef = useRef(remoteVerdict);
  const limitsRef = useRef(limits);
  const bodyRef = useRef(body);
  const remoteDriveRef = useRef(remoteDrive);
  const remotePartRef = useRef(remotePart);
  const remoteGripRef = useRef(remoteGrip);
  const extMaxRef = useRef(extMax);
  const extUsedRef = useRef(extUsed);
  const arousalRef = useRef(arousalLevel);
  const nextCmdAtRef = useRef<number>(0);

  phaseRef.current = phase;
  difficultyRef.current = difficulty;
  endingRef.current = ending;
  commandRef.current = command;
  timeLeftRef.current = timeLeft;
  totalSecondsRef.current = totalSeconds;
  edgesRef.current = edges;
  cmdCountRef.current = cmdCount;
  metronomeRef.current = metronome;
  voiceRef.current = voice;
  voiceActorRef.current = voiceActor;
  volumeRef.current = volume;
  customRef.current = customCommands;
  remoteVerdictRef.current = remoteVerdict;
  limitsRef.current = limits;
  bodyRef.current = body;
  remoteDriveRef.current = remoteDrive;
  remotePartRef.current = remotePart;
  remoteGripRef.current = remoteGrip;
  extMaxRef.current = extMax;
  extUsedRef.current = extUsed;
  arousalRef.current = arousalLevel;

  const isRemote = !!roomCreds || !!remoteInvite;
  const effectiveMinutes = useMemo(() => {
    if (durationMode === "custom") {
      const parsed = Number.parseInt(customMinutes, 10);
      return Number.isFinite(parsed) && parsed >= 1 && parsed <= 90 ? parsed : 10;
    }
    return durationMode;
  }, [durationMode, customMinutes]);

  const diffInfo = copy.difficulties[difficulty];

  // Hydrate stored prefs
  useEffect(() => {
    try {
      const storedAge = window.localStorage.getItem(AGE_KEY);
      if (storedAge === "1") setAccepted(true);

      const rawCustom = window.localStorage.getItem(CUSTOM_KEY);
      if (rawCustom && !partner) {
        const parsed = JSON.parse(rawCustom) as CustomCommand[];
        if (Array.isArray(parsed)) setCustomCommands(parsed);
      }

      const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (savedSettings && !partner) {
        const parsed = JSON.parse(savedSettings) as Partial<{
          durationMode: number | "custom";
          customMinutes: string;
          difficulty: SundomeDifficulty;
          ending: SundomeEnding;
          metronome: boolean;
          voice: boolean;
          voiceActor: VoiceActorId;
          volume: number;
          body: BodyKind;
          dim: number;
          fit: "contain" | "cover";
          pauseVideoOnStop: boolean;
        }>;
        if (parsed.durationMode !== undefined) setDurationMode(parsed.durationMode);
        if (parsed.customMinutes) setCustomMinutes(parsed.customMinutes);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.ending) setEnding(parsed.ending);
        if (typeof parsed.metronome === "boolean") setMetronome(parsed.metronome);
        if (typeof parsed.voice === "boolean") setVoice(parsed.voice);
        if (parsed.voiceActor && ZH_ACTORS.includes(parsed.voiceActor)) {
          setVoiceActor(parsed.voiceActor);
        }
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
        if (parsed.body && !variant) setBody(parsed.body);
        if (typeof parsed.dim === "number") setVideoDim(parsed.dim);
        if (parsed.fit === "contain" || parsed.fit === "cover") {
          setVideoFit(parsed.fit);
        }
        if (typeof parsed.pauseVideoOnStop === "boolean") {
          setPauseVideoOnStop(parsed.pauseVideoOnStop);
        }
      }

      const savedLim = loadLimits();
      if (savedLim) setLimits(savedLim);
      setExtMax(loadExtMax());
    } catch {
      // Ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, [partner, variant]);

  useEffect(() => {
    if (!hydrated || partner) return;
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customCommands));
    } catch {}
  }, [customCommands, hydrated, partner]);

  useEffect(() => {
    if (!hydrated || partner) return;
    try {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          durationMode,
          customMinutes,
          difficulty,
          ending,
          metronome,
          voice,
          voiceActor,
          volume,
          body,
          dim: videoDim,
          fit: videoFit,
          pauseVideoOnStop,
        }),
      );
    } catch {}
  }, [
    body,
    customMinutes,
    difficulty,
    durationMode,
    ending,
    hydrated,
    metronome,
    partner,
    pauseVideoOnStop,
    videoDim,
    videoFit,
    voice,
    voiceActor,
    volume,
  ]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume;
  }, [videoVolume, videoUrl]);

  useEffect(() => {
    if (!videoUrl) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const isPlayingStage = phase === "playing";
    if (
      isPlayingStage &&
      (pauseVideoOnStop && command.type === "stop")
    ) {
      vid.pause();
    } else if (phase === "paused") {
      vid.pause();
    } else if (isPlayingStage) {
      void vid.play().catch(() => undefined);
    }
  }, [command.type, pauseVideoOnStop, phase, videoUrl]);

  useEffect(() => {
    return () => {
      if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!seekFlash) return;
    const id = window.setTimeout(() => setSeekFlash(null), 650);
    return () => window.clearTimeout(id);
  }, [seekFlash]);

  useEffect(() => {
    if (!quitArmed) return;
    const id = window.setTimeout(() => setQuitArmed(false), 2500);
    return () => window.clearTimeout(id);
  }, [quitArmed]);

  useEffect(() => {
    if (!remoteOverlay) return;
    const id = window.setTimeout(() => {
      if (Date.now() >= remoteOverlay.until) setRemoteOverlay(null);
    }, Math.max(50, remoteOverlay.until - Date.now()));
    return () => window.clearTimeout(id);
  }, [remoteOverlay]);

  // Audio helpers
  function ensureAudio() {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function clickTone() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(commandRef.current.type === "slow" ? 420 : 660, ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.02, volumeRef.current * 0.22), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  function speakText(text: string) {
    if (!voiceRef.current || typeof window === "undefined") return;
    void playVoiceOrSpeech(text, {
      lang: locale,
      actor: voiceActorRef.current,
      volume: volumeRef.current,
    });
  }

  const recordTraceSeg = useCallback((mode: SundomeArcMode) => {
    if (!playStartedAtRef.current) return;
    const elapsed = Math.max(0, Date.now() - playStartedAtRef.current);
    const prev = traceRef.current.segs[traceRef.current.segs.length - 1];
    if (!prev || prev[1] !== mode) {
      traceRef.current.segs.push([elapsed, mode]);
    }
  }, []);

  const finalizeTrace = useCallback(() => {
    if (playStartedAtRef.current) {
      traceRef.current.end = Math.max(
        1000,
        Date.now() - playStartedAtRef.current,
      );
    }
    setDoneTrace({
      end: traceRef.current.end,
      edges: [...traceRef.current.edges],
      segs: [...traceRef.current.segs],
    });
  }, []);

  // Build wire state packet & broadcast helper
  const buildStatePacket = useCallback(
    (overridePhase?: "setup" | "play" | "reward" | "done", outcome?: string): RemoteMessage => {
      const p = phaseRef.current;
      const wirePhase: "setup" | "play" | "reward" | "done" =
        overridePhase ??
        (p === "idle"
          ? "setup"
          : p === "playing" || p === "paused"
            ? "play"
            : p === "permission"
              ? "reward"
              : "done");
      const curCmd = commandRef.current;
      const wireOutcome =
        outcome ??
        (p === "permission" || p === "finished"
          ? "success"
          : p === "denied"
            ? "fail"
            : p === "ruined"
              ? "ruin"
              : undefined);
      const wireMode =
        curCmd.type === "stroke"
          ? "go"
          : curCmd.type === "slow"
            ? "slow"
            : "stop";
      const gWire = gripWire(remoteGripRef.current);

      return {
        t: "state",
        v: 2,
        phase: wirePhase,
        body: bodyRef.current,
        lang: locale,
        text: adaptVariantText(curCmd.text, locale, bodyRef.current),
        mode: wireMode,
        left: timeLeftRef.current * 1000,
        total: totalSecondsRef.current * 1000,
        edges: edgesRef.current,
        count: cmdCountRef.current,
        paused: p === "paused",
        bpm: wireMode === "stop" ? 0 : curCmd.bpm,
        setBpm:
          typeof remoteDriveRef.current === "number"
            ? remoteDriveRef.current
            : undefined,
        drive:
          remoteDriveRef.current === "auto"
            ? undefined
            : remoteDriveRef.current,
        part: remotePartRef.current,
        grip: gWire.k,
        ...(gWire.x ? { gx: gWire.x } : {}),
        lim: limitsRef.current,
        wish: wishes,
        xm: extMaxRef.current,
        xu: extUsedRef.current,
        level: arousalRef.current || undefined,
        at: nextCmdAtRef.current || undefined,
        ...(wireOutcome ? { outcome: wireOutcome } : {}),
        ...(dglabManager.isConnected()
          ? {
              dglab: {
                on: true,
                allowRemote: dglabRef.current.prefs.allowRemote,
                a: dglabRef.current.strengthA,
                b: dglabRef.current.strengthB,
                maxA: Math.min(dglabRef.current.maxA, dglabRef.current.appLimitA),
                maxB: Math.min(dglabRef.current.maxB, dglabRef.current.appLimitB),
                wave: dglabRef.current.waveA,
              },
            }
          : {}),
      };
    },
    [locale, wishes],
  );

  const sendStateNow = useCallback(
    (overridePhase?: "setup" | "play" | "reward" | "done", outcome?: string) => {
      const link = remoteLinkRef.current;
      if (!link) return;
      link.send(buildStatePacket(overridePhase, outcome));
    },
    [buildStatePacket],
  );

  // Connect WebSocket RemoteLink helper
  const connectRemoteLink = useCallback(
    (creds: { room: string; key: string; open: boolean }) => {
      remoteLinkRef.current?.stop();
      setRemoteStatus("connecting");
      setPeerOnline(false);

      const limEncoded = encodeURIComponent(JSON.stringify(limitsRef.current));
      const wishEncoded = encodeURIComponent(wishes.join(","));
      const extra =
        (creds.open
          ? `&list=1&lang=${encodeURIComponent(locale)}&body=${encodeURIComponent(bodyRef.current)}&hb=1`
          : "&list=0") +
        `&mins=${effectiveMinutes}&diff=${mapDifficultyForWire(difficultyRef.current)}&xm=${extMaxRef.current}&lim=${limEncoded}&wish=${wishEncoded}`;

      const link = new RemoteLink(
        creds.room,
        "player",
        creds.key,
        (msg) => {
          if (msg.t === "hello") {
            setPeerOnline(msg.peer);
            sendStateNow();
            return;
          }
          if (msg.t === "peer") {
            setPeerOnline(msg.online);
            if (msg.online) {
              sendStateNow();
            } else {
              setAutoCountdown(null);
            }
            return;
          }
          if (msg.t === "watch") {
            setWatchCount(msg.n);
            setQueueCount(msg.of);
            return;
          }
          if (msg.t === "thx") {
            setThxGot(msg.k);
            return;
          }
          if (msg.t === "drive") {
            if (phaseRef.current !== "playing" && phaseRef.current !== "paused") return;
            if (msg.k === "auto") {
              setRemoteDrive("auto");
              remoteDriveRef.current = "auto";
              sendStateNow();
              return;
            }
            if (msg.k === "stop") {
              setRemoteDrive("stop");
              remoteDriveRef.current = "stop";
              const stopPool = copy.commands.stop;
              const next = randomOf(stopPool);
              setCommand(next);
              setCmdCount((c) => c + 1);
              recordTraceSeg("stop");
              speakText(adaptVariantText(next.text, locale, bodyRef.current));
              sendStateNow();
              return;
            }
            const bpm = capBpm(Number(msg.k), limitsRef.current);
            setRemoteDrive(bpm);
            remoteDriveRef.current = bpm;
            const t: CommandType = bpm <= 70 ? "slow" : "stroke";
            const pool = copy.commands[t];
            const picked = randomOf(pool);
            const nextCmd: SundomeCommand = { ...picked, type: t, bpm };
            setCommand(nextCmd);
            setCmdCount((c) => c + 1);
            recordTraceSeg(toArcMode(t));
            speakText(adaptVariantText(nextCmd.text, locale, bodyRef.current));
            sendStateNow();
            return;
          }
          if (msg.t === "cmd") {
            if (phaseRef.current !== "playing" && phaseRef.current !== "paused") return;
            const t: CommandType =
              msg.k === "stop" ? "stop" : msg.k === "slow" ? "slow" : "stroke";
            const pool = copy.commands[t];
            const base = randomOf(pool);
            const bpm =
              msg.k === "fast"
                ? capBpm(140, limitsRef.current)
                : msg.k === "slow"
                  ? capBpm(60, limitsRef.current)
                  : msg.k === "stop"
                    ? 0
                    : capBpm(100, limitsRef.current);
            const nextCmd: SundomeCommand = { ...base, type: t, bpm };
            setCommand(nextCmd);
            setCmdCount((c) => c + 1);
            recordTraceSeg(toArcMode(t));
            speakText(adaptVariantText(nextCmd.text, locale, bodyRef.current));
            sendStateNow();
            return;
          }
          if (msg.t === "part") {
            const p = msg.k === "none" ? undefined : msg.k;
            setRemotePart(p);
            remotePartRef.current = p;
            sendStateNow();
            return;
          }
          if (msg.t === "grip") {
            const g5 = msg.k === "none" ? "normal" : grip5Of(msg.k, msg.x);
            if (gripAllowed(g5, limitsRef.current)) {
              setRemoteGrip(g5);
              remoteGripRef.current = g5;
              sendStateNow();
            }
            return;
          }
          if (msg.t === "verdict") {
            setRemoteVerdict(msg.k);
            remoteVerdictRef.current = msg.k;
            return;
          }
          if (msg.t === "now") {
            if (limitsRef.current.nn) return;
            if (phaseRef.current === "playing" || phaseRef.current === "paused") {
              finalizeTrace();
              setPhase("permission");
              phaseRef.current = "permission";
              speakText(copy.status.permission);
              sendStateNow("reward", "success");
            }
            return;
          }
          if (msg.t === "line") {
            const lineRaw = rV2.lines[msg.k];
            if (lineRaw) {
              const txt = plainLine(lineRaw);
              setRemoteOverlay({ text: txt, until: Date.now() + 8000 });
              speakText(txt);
            }
            return;
          }
          if (msg.t === "say") {
            const txt = msg.text.slice(0, REMOTE_CONSTANTS.REMOTE_SAY_MAX);
            if (txt) {
              setRemoteOverlay({ text: txt, until: Date.now() + 8000 });
              speakText(txt);
            }
            return;
          }
          if (msg.t === "penalty") {
            if (msg.k === "extend") {
              const max = extMaxRef.current;
              const used = extUsedRef.current;
              if (max >= 0 && used >= max) return;
              setExtUsed((u) => u + 1);
              extUsedRef.current += 1;
              setExtendRound((r) => r + 1);
              setTimeLeft((t) => t + 120);
              setTotalSeconds((t) => t + 120);
              timeLeftRef.current += 120;
              totalSecondsRef.current += 120;
              setRemoteOverlay({ text: rText.extended, until: Date.now() + 5000 });
              speakText(rText.extended);
              sendStateNow();
            } else if (msg.k === "restart") {
              const sec = effectiveMinutes * 60;
              setTimeLeft(sec);
              setTotalSeconds(sec);
              timeLeftRef.current = sec;
              totalSecondsRef.current = sec;
              setEdges(0);
              setRemoteOverlay({ text: rText.restarted, until: Date.now() + 5000 });
              speakText(rText.restarted);
              sendStateNow();
            }
            return;
          }
          if (msg.t === "dglab") {
            if (!dglabManager.isConnected() || !dglabRef.current.prefs.allowRemote) {
              return;
            }
            if (msg.k === "zero") {
              dglabManager.emergencyStop();
            } else if (msg.k === "wave" && msg.wave) {
              dglabManager.setWavePreset(msg.wave, "both");
            } else if (msg.k === "pct" && typeof msg.pct === "number") {
              const snapNow = dglabRef.current;
              const capA = Math.min(snapNow.maxA, snapNow.appLimitA);
              const capB = Math.min(snapNow.maxB, snapNow.appLimitB);
              dglabManager.setOutputActive(msg.pct > 0);
              dglabManager.setChannelStrength("A", Math.round((capA * msg.pct) / 100));
              if (!snapNow.prefs.channelBLink) {
                dglabManager.setChannelStrength(
                  "B",
                  Math.round((capB * (msg.bPct ?? msg.pct)) / 100),
                );
              }
            } else if (msg.k === "burst") {
              dglabManager.triggerBurst(msg.wave ?? "punish", 1500, msg.pct ?? 85);
            }
            sendStateNow();
            return;
          }
        },
        (st) => {
          setRemoteStatus(st);
          if (st === "ended") {
            setPeerOnline(false);
          }
        },
      );

      link.hereInfo = () => ({
        ph:
          phaseRef.current === "playing" || phaseRef.current === "paused"
            ? "play"
            : "setup",
        left:
          phaseRef.current === "playing" || phaseRef.current === "paused"
            ? timeLeftRef.current
            : undefined,
      });

      remoteLinkRef.current = link;
      link.start();
    },
    [
      copy.commands,
      copy.status.permission,
      effectiveMinutes,
      finalizeTrace,
      locale,
      rText.extended,
      rText.restarted,
      rV2.lines,
      recordTraceSeg,
      sendStateNow,
      wishes,
    ],
  );

  // Connect immediately if remoteInvite prop is passed
  useEffect(() => {
    if (!remoteInvite) return;
    connectRemoteLink({
      room: remoteInvite.room,
      key: remoteInvite.key,
      open: false,
    });
    return () => {
      remoteLinkRef.current?.stop();
    };
  }, [connectRemoteLink, remoteInvite]);

  // Auto-sync DG-LAB output with Sundome play phase & current command
  useEffect(() => {
    if (!dglabManager.isConnected() || !dglabSnap.prefs.autoSync) return;
    if (phase === "playing" || phase === "overtime") {
      dglabManager.applyGameCue({
        active: true,
        mode: command.type === "stroke" ? "stroke" : command.type,
        bpm: command.bpm || 90,
      });
    } else {
      dglabManager.applyGameCue({
        active: false,
        mode:
          phase === "denied"
            ? "denied"
            : phase === "ruined"
              ? "ruin"
              : "stop",
      });
    }
  }, [
    command.bpm,
    command.type,
    dglabSnap.prefs.autoSync,
    dglabSnap.prefs.zeroOnStop,
    dglabSnap.status,
    phase,
  ]);

  // Clean up WS on unmount
  useEffect(() => {
    return () => {
      remoteLinkRef.current?.stop();
    };
  }, []);

  // Re-notify server if open-room config changes while in setup
  useEffect(() => {
    if (!roomCreds?.open || phase !== "idle") return;
    const limEncoded = encodeURIComponent(JSON.stringify(limits));
    const wishEncoded = encodeURIComponent(wishes.join(","));
    const nextExtra = `&list=1&lang=${encodeURIComponent(locale)}&body=${encodeURIComponent(body)}&hb=1&mins=${effectiveMinutes}&diff=${mapDifficultyForWire(difficulty)}&xm=${extMax}&lim=${limEncoded}&wish=${wishEncoded}`;
    remoteLinkRef.current?.relist(nextExtra);
  }, [body, difficulty, effectiveMinutes, extMax, limits, locale, phase, roomCreds?.open, wishes]);

  // 5-second auto-start countdown when peer connects to waiting screen
  useEffect(() => {
    if (!peerOnline || phase !== "idle" || (!roomCreds && !remoteInvite)) {
      setAutoCountdown(null);
      return;
    }
    setAutoCountdown(5);
    const id = window.setInterval(() => {
      setAutoCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [peerOnline, phase, remoteInvite, roomCreds]);

  // Trigger auto-start when autoCountdown reaches 0
  useEffect(() => {
    if (autoCountdown === 0 && phase === "idle") {
      beginGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCountdown]);

  // Command selection helpers
  function poolForType(type: CommandType): SundomeCommand[] {
    const customMatching = customRef.current.filter((c) => c.type === type);
    return customMatching.length ? [...copy.commands[type], ...customMatching] : copy.commands[type];
  }

  function pickCommand(forceRest: boolean, rng: () => number = Math.random): SundomeCommand {
    const current = commandRef.current;
    let targetType: CommandType;
    if (forceRest || current.type === "stop") {
      targetType = rng() < 0.72 ? "stroke" : "slow";
    } else if (rng() < diffInfo.restEvery * 0.14) {
      targetType = "stop";
    } else if (rng() < 0.34) {
      targetType = "slow";
    } else {
      targetType = "stroke";
    }
    const pool = poolForType(targetType);
    const picked = randomOf(pool, rng);
    return {
      ...picked,
      bpm: targetType === "stop" ? 0 : capBpm(picked.bpm, limitsRef.current),
    };
  }

  function nextCommand(forceRest = false) {
    if (remoteDriveRef.current !== "auto") {
      return;
    }
    const next = pickCommand(forceRest);
    setCommand(next);
    commandRef.current = next;
    setCmdCount((c) => c + 1);
    cmdCountRef.current += 1;
    recordTraceSeg(toArcMode(next.type));
    speakText(adaptVariantText(next.text, locale, bodyRef.current));
    sendStateNow();
  }

  function resolveEnd() {
    const end = endingRef.current;
    const d = difficultyRef.current;
    const verdict = remoteVerdictRef.current;

    if (verdict === "allow") {
      finalizeTrace();
      setPhase("permission");
      speakText(copy.status.permission);
      sendStateNow("done", "success");
      return;
    }
    if (verdict === "deny") {
      finalizeTrace();
      setPhase("denied");
      speakText(copy.status.denied);
      sendStateNow("done", "fail");
      return;
    }

    if (end === "allowed") {
      finalizeTrace();
      setPhase("permission");
      speakText(copy.status.permission);
      sendStateNow("done", "success");
      return;
    }
    if (end === "denied") {
      finalizeTrace();
      setPhase("denied");
      speakText(copy.status.denied);
      sendStateNow("done", "fail");
      return;
    }
    if (end === "ruined") {
      finalizeTrace();
      setPhase("ruined");
      speakText(copy.status.ruined);
      sendStateNow("done", "ruin");
      return;
    }
    if (end === "overtime") {
      const extraSec = 60 + Math.floor(Math.random() * 61);
      setTimeLeft(extraSec);
      setPhase("overtime");
      const goCmd = randomOf(poolForType("stroke"));
      setCommand(goCmd);
      speakText(`${copy.status.overtime}. ${adaptVariantText(goCmd.text, locale, bodyRef.current)}`);
      return;
    }

    // Lottery roll
    const roll = Math.floor(Math.random() * 100);
    setActiveRoll(roll);
    const baseChance = copy.difficulties[d].chance;
    if (roll < baseChance) {
      finalizeTrace();
      setPhase("permission");
      speakText(copy.status.permission);
      sendStateNow("done", "success");
    } else {
      finalizeTrace();
      setPhase("denied");
      speakText(copy.status.denied);
      sendStateNow("done", "fail");
    }
  }

  // Metronome scheduler while playing
  useEffect(() => {
    if (phase !== "playing" && phase !== "overtime") return;
    if (!metronome || command.type === "stop" || command.bpm <= 0) return;
    const intervalMs = Math.max(160, Math.round(60000 / command.bpm));
    clickTone();
    const id = window.setInterval(() => clickTone(), intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, command, metronome]);

  // Partner deterministic sync timer
  useEffect(() => {
    if (!partner) return;
    const id = window.setInterval(() => {
      setPartnerClock(Date.now());
      const ph = partnerPhase(partner.startAt, partner.s.duration);
      if (ph.phase === "during" && phaseRef.current === "idle") {
        // Auto-start partner play at exact sync time
        const sec = Math.max(1, Math.round((partner.s.duration * 60000 - ph.elapsedMs) / 1000));
        beginGame(sec);
      }
      if (ph.phase === "during" && phaseRef.current === "playing") {
        const stepMs = 15000;
        const stepIdx = Math.floor(ph.elapsedMs / stepMs);
        if (stepIdx !== partnerStepIdxRef.current) {
          partnerStepIdxRef.current = stepIdx;
          const rng = mulberry32((partner.seed ^ Math.imul(stepIdx + 1, 0x9e3779b1)) >>> 0);
          const cmd = pickCommand(false, rng);
          setCommand(cmd);
          commandRef.current = cmd;
          setCmdCount(stepIdx + 1);
          recordTraceSeg(toArcMode(cmd.type));
          speakText(adaptVariantText(cmd.text, locale, bodyRef.current));
        }
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  // Main countdown + remote state heartbeat
  useEffect(() => {
    if (phase !== "playing" && phase !== "overtime") return;

    let cmdSwitchCountdown = partner ? 9999 : 8 + Math.floor(Math.random() * 8);
    nextCmdAtRef.current = partner ? 0 : Date.now() + cmdSwitchCountdown * 1000;

    const timer = window.setInterval(() => {
      if (edgeCooldown > 0) setEdgeCooldown((v) => Math.max(0, v - 1));

      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (phaseRef.current === "overtime") {
            finalizeTrace();
            setPhase("finished");
            speakText(copy.status.finished);
            sendStateNow("done", "success");
          } else {
            resolveEnd();
          }
          return 0;
        }
        return prev - 1;
      });

      if (!partner && remoteDriveRef.current === "auto") {
        cmdSwitchCountdown -= 1;
        if (cmdSwitchCountdown <= 0) {
          cmdSwitchCountdown = 7 + Math.floor(Math.random() * 9);
          nextCmdAtRef.current = Date.now() + cmdSwitchCountdown * 1000;
          nextCommand();
        }
      }

      sendStateNow();
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, partner]);

  // Idle setup/paused remote state heartbeat
  useEffect(() => {
    if (!isRemote) return;
    if (phase === "playing" || phase === "overtime") return;
    const id = window.setInterval(() => {
      sendStateNow();
    }, 2000);
    return () => window.clearInterval(id);
  }, [isRemote, phase, sendStateNow]);

  function beginGame(overrideSeconds?: number) {
    ensureAudio();
    const total = overrideSeconds ?? effectiveMinutes * 60;
    const first = partner
      ? pickCommand(false, mulberry32(partner.seed))
      : randomOf(poolForType("stroke"));

    setTotalSeconds(total);
    totalSecondsRef.current = total;
    setTimeLeft(total);
    timeLeftRef.current = total;
    setEdges(0);
    edgesRef.current = 0;
    setCmdCount(1);
    cmdCountRef.current = 1;
    setEdgeCooldown(0);
    setActiveRoll(null);
    setExtendRound(0);
    setExtUsed(0);
    setRemoteVerdict(null);
    setThxSent(null);
    setThxGot(null);
    setRemoteDrive("auto");
    setCommand(first);
    commandRef.current = first;

    playStartedAtRef.current = Date.now();
    traceRef.current = {
      edges: [],
      segs: [[0, toArcMode(first.type)]],
    };
    setDoneTrace(null);

    setPhase("playing");
    phaseRef.current = "playing";
    speakText(adaptVariantText(first.text, locale, body));
    sendStateNow("play");
  }

  function startGame() {
    if (!accepted) {
      setGateOpen(true);
      return;
    }
    beginGame();
  }

  function quitGame() {
    stopVoiceFiles();
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (
      phaseRef.current === "playing" ||
      phaseRef.current === "overtime" ||
      phaseRef.current === "paused"
    ) {
      finalizeTrace();
    }
    setPhase("idle");
    phaseRef.current = "idle";
    sendStateNow("setup");
  }

  function togglePause() {
    setPhase((prev) => {
      const next = prev === "paused" ? "playing" : "paused";
      phaseRef.current = next;
      sendStateNow("play");
      return next;
    });
  }

  function handleEdge() {
    if (edgeCooldown > 0) return;
    setEdges((v) => v + 1);
    edgesRef.current += 1;
    setEdgeCooldown(5);
    if (playStartedAtRef.current) {
      traceRef.current.edges.push(Date.now() - playStartedAtRef.current);
    }
    const stopCmd = randomOf(poolForType("stop"));
    setCommand(stopCmd);
    commandRef.current = stopCmd;
    setCmdCount((c) => c + 1);
    recordTraceSeg("stop");
    remoteLinkRef.current?.send({ t: "signal", k: "limit" });
    if (dglabManager.isConnected() && dglabRef.current.prefs.edgeShock) {
      dglabManager.triggerBurst("punish", 1500, 80);
    }
    speakText(adaptVariantText(stopCmd.text, locale, body));
    sendStateNow();
  }

  function handleLostOrCame() {
    finalizeTrace();
    remoteLinkRef.current?.send({ t: "signal", k: "came" });
    setPhase("denied");
    phaseRef.current = "denied";
    sendStateNow("done", "lost");
  }

  // Create remote room (`3/4` -> `4/4`)
  async function handleCreateRemoteRoom() {
    if (makingRoom) return;
    setMakingRoom(true);
    setMakeRoomError(false);
    try {
      const open = remoteOnly === "open";
      const creds = await createRemoteRoom(open);
      setRoomCreds(creds);
      setWaitingSince(Date.now());
      connectRemoteLink({
        room: creds.room,
        key: creds.player,
        open: creds.open,
      });
    } catch {
      setMakeRoomError(true);
    } finally {
      setMakingRoom(false);
    }
  }

  function handleCancelRemoteRoom() {
    remoteLinkRef.current?.end();
    remoteLinkRef.current = null;
    setRoomCreds(null);
    setPeerOnline(false);
    setWaitingSince(null);
    setAutoCountdown(null);
  }

  // Video samples & browse loader
  async function fetchSampleSource(
    src: SampleSource,
    opts?: { q?: string; g?: string; p?: number },
  ): Promise<{ items: SampleItem[]; totalPages?: number }> {
    const endpoint =
      src === "browse"
        ? `/api/sundome-lab/browse?g=${encodeURIComponent(opts?.g ?? "")}&sort=popular&q=${encodeURIComponent(opts?.q ?? "")}&p=${opts?.p ?? 1}`
        : `/api/sundome-lab/${src}`;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      items?: SampleItem[];
      totalPages?: number;
    };
    return {
      items: Array.isArray(data.items) ? data.items : [],
      totalPages: data.totalPages,
    };
  }

  async function loadSamples(
    src: SampleSource,
    allowFallback = false,
    opts?: { q?: string; g?: string; p?: number },
  ) {
    setSamplesLoading(true);
    setSamplesError(false);
    try {
      const res = await fetchSampleSource(src, opts);
      if (!res.items.length && allowFallback && src === "samples") {
        setSampleSource("alt-samples");
        const fb = await fetchSampleSource("alt-samples");
        setSamples(fb.items);
        setSamplePage(0);
      } else {
        setSamples(res.items);
        if (typeof res.totalPages === "number") setBrowseTotalPages(res.totalPages);
        setSamplePage(0);
      }
    } catch {
      if (allowFallback && src === "samples") {
        try {
          setSampleSource("alt-samples");
          const fb = await fetchSampleSource("alt-samples");
          setSamples(fb.items);
          setSamplePage(0);
          return;
        } catch {}
      }
      setSamplesError(true);
    } finally {
      setSamplesLoading(false);
    }
  }

  async function openSamples() {
    setSamplesOpen((prev) => !prev);
    if (!samplesOpen && !samples.length && !samplesLoading) {
      await loadSamples(sampleSource, true);
    }
  }

  const filteredSamples = useMemo(() => {
    if (sampleSource === "browse") return samples;
    const q = sampleSearch.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter((item) => item.title.toLowerCase().includes(q));
  }, [sampleSearch, sampleSource, samples]);

  const samplePageCount = Math.max(1, Math.ceil(filteredSamples.length / 8));
  const safeSamplePage = Math.min(samplePage, samplePageCount - 1);
  const pageSamples = filteredSamples.slice(
    safeSamplePage * 8,
    safeSamplePage * 8 + 8,
  );

  // Double-tap seek on play stage
  const handleStageTap = (side: "left" | "right") => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const now = Date.now();
    const ref = side === "left" ? lastTapLeftRef : lastTapRightRef;
    if (now - ref.current < 320) {
      const delta = side === "left" ? -10 : 10;
      vid.currentTime = Math.max(0, vid.currentTime + delta);
      setSeekFlash(side === "left" ? "-10s" : "+10s");
      ref.current = 0;
    } else {
      ref.current = now;
    }
  };

  // Reaction bar helpers (.rr)
  const favReacts = reactFavsOf(reactPrefs, body);
  const baseCats = reactCatsOf(body).map((keys, idx) => ({
    k: String(idx),
    label: rV2.reactCats[idx] ?? String(idx),
    keys,
  }));
  const reactTabs = [
    ...(favReacts.length
      ? [{ k: "fav", label: rCtl.fav, keys: favReacts }]
      : []),
    ...baseCats,
  ];
  const safeReactCat = Math.min(reactCatIdx, reactTabs.length - 1);
  const isFemaleBody = body === "female" || body === "lesbian";
  const allBodySpots: BodyPart[] = isFemaleBody
    ? ["clit", "inside", "nipple"]
    : ["shaft", "glans", "balls", "nipple"];
  const activeParts = allowedParts(allBodySpots, limits);

  // Controller share URL using publicOrigin
  const shareOrigin =
    publicOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  const remoteControlLink = roomCreds
    ? controllerHref(shareOrigin, locale, roomCreds)
    : "";

  // Partner link builder
  const handleCreatePartnerLink = () => {
    const startAt = Date.now() + PARTNER_LEAD_MS;
    const seed = newSeed();
    const encoded = encodePartner({
      app: PARTNER_APP,
      v: PARTNER_VERSION,
      seed,
      startAt,
      s: {
        duration: effectiveMinutes,
        difficulty,
        ending,
        ...(customCommands.length ? { custom: customCommands.slice(0, 8) } : {}),
      },
    });
    const url = partnerShareUrl(shareOrigin, locale, variant, startAt, encoded);
    setPartnerStartAt(startAt);
    setPartnerUrl(url);
  };

  // Extra settings drawer shared between Solo setup & Remote `<details data-remote-page-more>`
  const renderExtraSettings = () => (
    <div className="space-y-5 pt-3">
      {/* Voice & Metronome */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-card-border px-3.5 py-2.5 text-sm">
          <span>{copy.settings.metronome}</span>
          <input
            type="checkbox"
            checked={metronome}
            onChange={(e) => setMetronome(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-card-border px-3.5 py-2.5 text-sm">
          <span>{copy.settings.voice}</span>
          <input
            type="checkbox"
            checked={voice}
            onChange={(e) => setVoice(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
      </div>

      {locale === "zh" && voice && (
        <div>
          <p className="text-xs font-semibold text-muted-strong">
            播报语音（真人感合成）
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ZH_ACTORS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setVoiceActor(id)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                  voiceActor === id
                    ? "border-accent bg-accent-soft text-foreground font-bold"
                    : "border-card-border text-muted-strong hover:text-foreground"
                }`}
              >
                {actorLabels[id]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="flex items-center justify-between text-xs font-semibold text-muted-strong">
          <span>{copy.settings.volume}</span>
          <span className="tabular-nums">{Math.round(volume * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="mt-1.5 w-full accent-[var(--accent)]"
        />
      </div>

      {/* Background Video controls */}
      <div className="rounded-xl border border-card-border p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{copy.video.title}</p>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-semibold hover:border-accent/60">
              {copy.video.local}
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
                  setVideoUrl(URL.createObjectURL(file));
                  setVideoName(file.name);
                  setVideoPlayError(false);
                }}
              />
            </label>
            {!IS_STATIC_EXPORT && (
              <button
                type="button"
                onClick={() => void openSamples()}
                className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-semibold hover:border-accent/60"
              >
                {copy.video.samples}
              </button>
            )}
            {videoUrl && (
              <button
                type="button"
                onClick={() => {
                  if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
                  setVideoUrl(null);
                  setVideoName(null);
                }}
                className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground"
              >
                {copy.video.clear}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-3 text-xs">
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-strong">
              {locale === "zh" ? "背景暗度" : "Dim"} ({videoDim}%)
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={videoDim}
              onChange={(e) => setVideoDim(Number(e.target.value))}
              className="w-20 accent-[var(--accent)]"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="text-muted-strong">
              {locale === "zh" ? "停止时暂停视频" : "Pause on Stop"}
            </span>
            <input
              type="checkbox"
              checked={pauseVideoOnStop}
              onChange={(e) => setPauseVideoOnStop(e.target.checked)}
              className="accent-[var(--accent)]"
            />
          </label>
          <div className="flex items-center justify-end gap-1.5">
            {(["contain", "cover"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setVideoFit(m)}
                className={`cursor-pointer rounded-full border px-2.5 py-0.5 ${
                  videoFit === m
                    ? "border-accent bg-accent-soft text-foreground font-bold"
                    : "border-card-border text-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {videoUrl && (
          <div className="mt-3 overflow-hidden rounded-lg border border-card-border bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              muted={videoMuted}
              loop
              playsInline
              autoPlay
              onError={() => setVideoPlayError(true)}
              className="max-h-40 w-full object-contain"
            />
            {videoPlayError && (
              <p className="p-2 text-xs text-[#ff8399]">
                {locale === "zh"
                  ? "该视频暂时无法播放，可尝试切换备用源或本地视频。"
                  : "This video could not be played. Try alt-samples or a local file."}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 bg-black/70 px-3 py-1.5 text-xs text-white/80">
              <span className="truncate">{videoName ?? ""}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVideoMuted((m) => !m)}
                  className="cursor-pointer underline"
                >
                  {videoMuted ? copy.video.unmute : copy.video.mute}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(Number(e.target.value))}
                  className="w-16"
                />
              </div>
            </div>
          </div>
        )}

        {!IS_STATIC_EXPORT && samplesOpen && (
          <div className="mt-3 border-t border-card-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["samples", locale === "zh" ? "精选 (FANZA)" : "Samples"],
                  ["alt-samples", locale === "zh" ? "备用 (DUGA)" : "Alt Samples"],
                  ["browse", locale === "zh" ? "浏览目录" : "Browse"],
                ] as const
              ).map(([src, label]) => (
                <button
                  key={src}
                  type="button"
                  disabled={samplesLoading}
                  onClick={() => {
                    setSampleSource(src);
                    void loadSamples(src, false, {
                      q: browseQuery,
                      g: browseGenre,
                      p: 1,
                    });
                  }}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
                    sampleSource === src
                      ? "border-accent bg-accent text-white"
                      : "border-card-border text-muted-strong"
                  }`}
                >
                  {label}
                </button>
              ))}
              <input
                type="text"
                value={sampleSource === "browse" ? browseQuery : sampleSearch}
                onChange={(e) => {
                  if (sampleSource === "browse") setBrowseQuery(e.target.value);
                  else {
                    setSampleSearch(e.target.value);
                    setSamplePage(0);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sampleSource === "browse") {
                    setBrowsePage(1);
                    void loadSamples("browse", false, {
                      q: browseQuery,
                      g: browseGenre,
                      p: 1,
                    });
                  }
                }}
                placeholder={copy.video.search}
                className="min-w-0 flex-1 rounded-full border border-card-border bg-card-bg px-3 py-1 text-xs"
              />
              {sampleSource === "browse" && (
                <button
                  type="button"
                  onClick={() => {
                    setBrowsePage(1);
                    void loadSamples("browse", false, {
                      q: browseQuery,
                      g: browseGenre,
                      p: 1,
                    });
                  }}
                  className="cursor-pointer rounded-full bg-accent px-3 py-1 text-xs font-bold text-white"
                >
                  {locale === "zh" ? "搜索" : "Go"}
                </button>
              )}
            </div>

            {samplesLoading ? (
              <p className="mt-3 text-xs text-muted">{copy.video.loading}</p>
            ) : samplesError ? (
              <p className="mt-3 text-xs text-[#ff8399]">{copy.video.error}</p>
            ) : pageSamples.length === 0 ? (
              <p className="mt-3 text-xs text-muted">{copy.video.noResults}</p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {pageSamples.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setVideoUrl(item.previewUrl);
                        setVideoName(item.title);
                        setVideoPlayError(false);
                      }}
                      className="cursor-pointer overflow-hidden rounded-lg border border-card-border bg-card-bg text-left hover:border-accent"
                    >
                      {item.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.posterUrl}
                          alt=""
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-video w-full bg-black" />
                      )}
                      <span className="block truncate p-1.5 text-[11px] font-medium text-foreground">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                  <button
                    type="button"
                    disabled={
                      sampleSource === "browse"
                        ? browsePage <= 1
                        : safeSamplePage <= 0
                    }
                    onClick={() => {
                      if (sampleSource === "browse") {
                        const np = Math.max(1, browsePage - 1);
                        setBrowsePage(np);
                        void loadSamples("browse", false, {
                          q: browseQuery,
                          g: browseGenre,
                          p: np,
                        });
                      } else {
                        setSamplePage((p) => Math.max(0, p - 1));
                      }
                    }}
                    className="cursor-pointer rounded-full border border-card-border px-3 py-1 disabled:opacity-40"
                  >
                    {copy.video.prev}
                  </button>
                  <span>
                    {copy.video.page}{" "}
                    {sampleSource === "browse" ? browsePage : safeSamplePage + 1}{" "}
                    /{" "}
                    {sampleSource === "browse"
                      ? browseTotalPages
                      : samplePageCount}
                  </span>
                  <button
                    type="button"
                    disabled={
                      sampleSource === "browse"
                        ? browsePage >= browseTotalPages
                        : safeSamplePage + 1 >= samplePageCount
                    }
                    onClick={() => {
                      if (sampleSource === "browse") {
                        const np = browsePage + 1;
                        setBrowsePage(np);
                        void loadSamples("browse", false, {
                          q: browseQuery,
                          g: browseGenre,
                          p: np,
                        });
                      } else {
                        setSamplePage((p) =>
                          Math.min(samplePageCount - 1, p + 1),
                        );
                      }
                    }}
                    className="cursor-pointer rounded-full border border-card-border px-3 py-1 disabled:opacity-40"
                  >
                    {copy.video.next}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Custom commands editor */}
      <div className="rounded-xl border border-card-border p-3.5">
        <p className="text-sm font-bold text-foreground">
          {copy.settings.custom}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={copy.settings.customText}
            className="min-w-0 flex-1 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-xs"
          />
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value as CommandType)}
            className="rounded-xl border border-card-border bg-card-bg px-2.5 py-2 text-xs"
          >
            {(["stroke", "slow", "stop"] as const).map((t) => (
              <option key={t} value={t}>
                {copy.types[t]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={30}
            max={240}
            value={customBpm}
            onChange={(e) => setCustomBpm(e.target.value)}
            className="w-20 rounded-xl border border-card-border bg-card-bg px-2.5 py-2 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              const clean = customText.trim();
              if (!clean) return;
              const bpmNum = Number.parseInt(customBpm, 10) || 80;
              setCustomCommands((prev) => [
                ...prev,
                { text: clean, type: customType, bpm: bpmNum },
              ]);
              setCustomText("");
            }}
            className="cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white"
          >
            {copy.settings.add}
          </button>
        </div>
        {customCommands.length > 0 ? (
          <ul className="mt-2.5 space-y-1.5 text-xs">
            {customCommands.map((c, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg border border-card-border px-2.5 py-1.5"
              >
                <span className="truncate">
                  [{copy.types[c.type]}] {c.text} ({c.bpm} BPM)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomCommands((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="text-muted hover:text-foreground cursor-pointer"
                >
                  {copy.settings.remove}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">{copy.settings.noCustom}</p>
        )}
      </div>
    </div>
  );

  // Determine full-screen play stage visibility
  const inPlayStage =
    phase === "playing" || phase === "paused" || phase === "overtime";
  const inDonePhase =
    phase === "permission" ||
    phase === "denied" ||
    phase === "ruined" ||
    phase === "finished";

  const stageBg =
    phase === "paused"
      ? STAGE_BG.paused
      : STAGE_BG[command.type] ?? STAGE_BG.stroke;
  const stageRgba =
    phase === "paused"
      ? "20, 16, 20"
      : command.type === "stop"
        ? "92, 13, 22"
        : command.type === "slow"
          ? "77, 52, 0"
          : "12, 63, 44";

  const cameOutcome = phase === "permission" || phase === "finished";
  const waitingRoom = !!roomCreds;
  const remoteStepNo = remoteInvite
    ? "1 / 2"
    : waitingRoom
      ? "4 / 4"
      : "3 / 4";

  return (
    <div>
      {/* 18+ Age Gate */}
      {gateOpen && (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-6">
            <h3 className="text-lg font-bold text-foreground">
              {copy.gate.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-strong">
              {copy.gate.body}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.setItem(AGE_KEY, "1");
                  } catch {}
                  setAccepted(true);
                  setGateOpen(false);
                  beginGame();
                }}
                className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
              >
                {copy.gate.confirm}
              </button>
              <button
                type="button"
                onClick={() => setGateOpen(false)}
                className="cursor-pointer rounded-full border border-card-border px-4 py-2.5 text-sm text-muted-strong"
              >
                {copy.gate.under18}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Play Stage */}
      {inPlayStage && (
        <div
          data-sundome="play"
          data-body={body}
          data-mode={command.type === "stroke" ? "go" : command.type}
          data-paused={phase === "paused" ? "true" : "false"}
          data-edges={edges}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-100 flex flex-col text-white transition-colors duration-500"
          style={{ background: stageBg, touchAction: "manipulation" }}
        >
          <div className="absolute inset-0 -z-10 bg-[#0a0708]" aria-hidden="true" />
          <div
            aria-hidden="true"
            data-sundome-bg
            className="absolute inset-0 -z-10 transition-colors duration-500"
            style={{ background: stageBg }}
          />

          {videoUrl && (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                muted={videoMuted}
                loop
                playsInline
                autoPlay
                className={`pointer-events-none fixed inset-0 -z-10 h-full w-full ${
                  videoFit === "cover" ? "object-cover" : "object-contain"
                }`}
              />
              <div
                aria-hidden="true"
                data-sundome-mirror-dim
                className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-500"
                style={{
                  background: `rgba(${stageRgba}, ${(0.45 * videoDim) / 100})`,
                }}
              />
              {/* Double-tap seek zones */}
              <div
                aria-hidden="true"
                onClick={() => handleStageTap("left")}
                className="fixed inset-y-16 left-0 z-0 w-1/3"
              />
              <div
                aria-hidden="true"
                onClick={() => handleStageTap("right")}
                className="fixed inset-y-16 right-0 z-0 w-1/3"
              />
              {seekFlash && (
                <div className="sundome-seek-flash" key={seekFlash}>
                  <span>{seekFlash}</span>
                </div>
              )}
            </>
          )}

          {/* Top Bar */}
          <div
            className="relative z-20 flex items-center justify-between gap-2 px-3 pt-3 text-sm sm:gap-3 sm:px-4"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <span className="min-w-0 flex-1 truncate text-base italic text-white/75">
              {partner ? (
                <span data-sundome-count={cmdCount} data-sundome-partner-no={cmdCount}>
                  {pText.badge} · #{cmdCount}
                </span>
              ) : extendRound > 0 ? (
                <span data-sundome-count={cmdCount} className="font-bold not-italic text-white">
                  +{extendRound}
                </span>
              ) : (
                <span data-sundome-count={cmdCount}>#{cmdCount}</span>
              )}
              <span className="ml-2 not-italic text-white/55">
                {copy.status.edges}: {edges}
              </span>
            </span>

            <span
              className="shrink-0 tabular-nums text-lg font-bold"
              data-sundome-clock
            >
              {formatTime(timeLeft)}
            </span>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {(dglabSnap.status === "paired" ||
                dglabSnap.status === "connected_ble") && (
                <button
                  type="button"
                  onClick={() => dglabManager.emergencyStop()}
                  data-sundome-dglab-estop
                  className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-rose-400/60 bg-rose-600/35 px-2.5 text-xs font-bold text-rose-100 hover:bg-rose-600/55"
                >
                  A:{dglabSnap.strengthA} · {locale === "zh" ? "急停" : "Stop"}
                </button>
              )}
              {videoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setVideoFit((f) => (f === "contain" ? "cover" : "contain"))
                  }
                  className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-white/25 px-2.5 text-xs text-white/80 hover:bg-white/10"
                >
                  {videoFit === "contain" ? "Cover" : "Contain"}
                </button>
              )}
              <button
                type="button"
                onClick={() => nextCommand(false)}
                className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-white/25 px-2.5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "下一条" : "Skip"}
              </button>
              <button
                type="button"
                onClick={togglePause}
                className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-white/25 px-2.5 text-xs text-white/80 hover:bg-white/10"
              >
                {phase === "paused" ? copy.actions.resume : copy.actions.pause}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isRemote) {
                    if (quitArmed) quitGame();
                    else setQuitArmed(true);
                  } else {
                    quitGame();
                  }
                }}
                className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-white/25 px-2.5 text-xs text-white/80 hover:bg-white/10"
              >
                {quitArmed ? rMore.quitAgain : copy.actions.quit}
              </button>
            </div>
          </div>

          {/* Center Play Content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-4 text-center">
            {/* Remote status pills (part / grip / speed) */}
            {(isRemote || peerOnline) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2 text-xs">
                <span className="rounded-full border border-white/25 bg-black/40 px-2.5 py-0.5 font-bold">
                  {rText.badge} · {peerOnline ? rText.peerOn : rText.waitingPeer}
                </span>
                {remotePart && (
                  <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 font-bold">
                    {rMore.part[remotePart]}
                  </span>
                )}
                {remoteGrip !== "normal" && (
                  <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 font-bold">
                    {rV2.grip5[remoteGrip]}
                  </span>
                )}
              </div>
            )}

            {/* Incoming Say / Line Banner (8s) */}
            {remoteOverlay && (
              <div
                className="mb-4 max-w-lg animate-fade-in rounded-2xl border border-white/40 bg-black/65 px-5 py-3 text-base font-bold text-white shadow-lg"
                data-remote-player-overlay
              >
                {remoteOverlay.text}
              </div>
            )}

            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">
                {phase === "paused"
                  ? copy.status.paused
                  : phase === "overtime"
                    ? copy.status.overtime
                    : copy.types[command.type]}
                {command.type !== "stop" && command.bpm > 0
                  ? ` · ${command.bpm} BPM`
                  : ""}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                {adaptVariantText(command.text, locale, body)}
              </h2>
            </div>

            <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div
                key={cmdCount}
                className="h-full w-full origin-left rounded-full bg-white/80"
              />
            </div>

            <button
              type="button"
              onClick={handleEdge}
              disabled={edgeCooldown > 0}
              data-sundome-edge
              className="mt-6 cursor-pointer rounded-full border-2 border-white/60 px-6 py-3 text-base font-bold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/30"
            >
              {edgeCooldown > 0
                ? `${copy.status.edgeCooldown} (${edgeCooldown}s)`
                : copy.actions.edged}
            </button>

            {/* Remote Player Reaction Drawer (.rr) */}
            {(peerOnline || isRemote) && (
              <div
                className="rr mt-4 [@media(max-height:700px)]:mt-2"
                data-sundome-remote-react
                data-remote-react-v2="1"
                data-hidden={reactCollapsed ? "1" : undefined}
              >
                <div className="rr-headrow">
                  <button
                    type="button"
                    onClick={() => setReactCollapsed((v) => !v)}
                    aria-expanded={!reactCollapsed}
                    data-sundome-remote-react-toggle
                    className="rr-head"
                  >
                    <span>{rMore.reactTitle}</span>
                    {roomCreds?.open && watchCount > 0 && (
                      <WatchPill n={watchCount} lang={locale} />
                    )}
                    <span aria-hidden="true" className="rr-caret">
                      {reactCollapsed ? "▸" : "▾"}
                    </span>
                  </button>
                  {!reactCollapsed && (
                    <button
                      type="button"
                      onClick={() => setReactSettingsOpen(true)}
                      className="rr-gear"
                      aria-label={rCtl.reactSettings}
                      title={rCtl.reactSettings}
                      data-remote-react-settings-open
                    >
                      <GearIcon />
                    </button>
                  )}
                </div>

                {!reactCollapsed && (
                  <>
                    <div
                      className={`rr-cats${favReacts.length ? " rr-cats-fav" : ""}`}
                      role="tablist"
                    >
                      {reactTabs.map((tab, idx) => (
                        <button
                          key={tab.k}
                          type="button"
                          role="tab"
                          aria-selected={safeReactCat === idx}
                          aria-label={tab.k === "fav" ? rCtl.fav : undefined}
                          className={safeReactCat === idx ? "on" : ""}
                          onClick={() => {
                            setReactCatIdx(idx);
                            const el = reactPagerRef.current;
                            if (el) {
                              el.scrollTo({
                                left: idx * (el.clientWidth + 8),
                                behavior: "smooth",
                              });
                            }
                          }}
                          data-remote-react-cat={tab.k}
                        >
                          {tab.k === "fav" ? <StarIcon /> : tab.label}
                        </button>
                      ))}
                    </div>

                    <div
                      ref={reactPagerRef}
                      className="rr-pager"
                      data-remote-react-grid
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const idx = Math.round(el.scrollLeft / (el.clientWidth + 8));
                        if (idx !== reactCatIdx && idx < reactTabs.length) {
                          setReactCatIdx(idx);
                        }
                      }}
                    >
                      {reactTabs.map((tab) => (
                        <div key={tab.k} className="rr-grid">
                          {tab.keys.map((rk) => (
                            <button
                              key={rk}
                              type="button"
                              disabled={!peerOnline}
                              onClick={() => {
                                setReactSentKey(rk);
                                remoteLinkRef.current?.send({ t: "signal", k: rk });
                                window.setTimeout(() => setReactSentKey(null), 1500);
                              }}
                              {...(tab.k === "fav"
                                ? { "data-remote-react-fav": rk }
                                : { "data-remote-react": rk })}
                              data-sent={reactSentKey === rk ? "1" : undefined}
                              className={reactSentKey === rk ? "sent" : ""}
                            >
                              <Phrase
                                text={
                                  rV2.react[rk as keyof typeof rV2.react] ?? rk
                                }
                              />
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>

                    <p className="rr-lab">
                      <span>{rV2.levelAsk}</span>
                      <span>{rV2.levelHint}</span>
                    </p>
                    <div className="rr-lv9">
                      {Array.from(
                        { length: REMOTE_CONSTANTS.REMOTE_LEVELS },
                        (_, i) => i + 1,
                      ).map((lv) => (
                        <button
                          key={lv}
                          type="button"
                          onClick={() => {
                            setArousalLevel(lv);
                            arousalRef.current = lv;
                            remoteLinkRef.current?.send({ t: "level", k: lv });
                          }}
                          aria-pressed={arousalLevel === lv}
                          data-remote-level-btn={lv}
                          className={
                            arousalLevel === lv
                              ? "on"
                              : lv <= arousalLevel
                                ? "half"
                                : ""
                          }
                        >
                          {lv}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="rr-row">
                  <button
                    type="button"
                    onClick={handleLostOrCame}
                    data-sundome-lost
                    className="rr-came"
                  >
                    {locale === "zh" ? "没忍住（结束了）" : "Came / Lost control"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (quitArmed) quitGame();
                      else setQuitArmed(true);
                    }}
                    data-remote-self-quit
                    data-armed={quitArmed ? "1" : undefined}
                    className={`rr-quit${quitArmed ? " arm" : ""}`}
                  >
                    {quitArmed ? rMore.quitAgain : copy.actions.quit}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Done Screen */}
      {inDonePhase && (
        <section
          data-sundome="done"
          className={`mb-6 rounded-3xl border p-6 sm:p-8 ${
            cameOutcome
              ? "border-accent/50 bg-accent-soft"
              : "border-card-border bg-card-bg"
          }`}
        >
          <h2 className="text-2xl font-extrabold text-foreground">
            {phase === "permission"
              ? copy.status.permission
              : phase === "denied"
                ? copy.status.denied
                : phase === "ruined"
                  ? copy.status.ruined
                  : copy.status.finished}
          </h2>
          <p className="mt-2 text-sm text-muted-strong">
            {phase === "permission"
              ? copy.status.permissionHint
              : phase === "denied"
                ? copy.status.deniedHint
                : phase === "ruined"
                  ? copy.status.ruinedHint
                  : copy.status.command}
          </p>
          {activeRoll !== null && (
            <p className="mt-1 text-xs tabular-nums text-muted">
              {copy.status.chance}: {diffInfo.chance}% · Roll {activeRoll}
            </p>
          )}

          {doneTrace && (
            <div className="mt-5 rounded-2xl border border-card-border bg-black/25 p-4">
              <SundomeArc trace={doneTrace} came={cameOutcome} />
            </div>
          )}

          {/* Post-session Remote After & Thanks */}
          {isRemote && (
            <div className="mt-5 space-y-3">
              {peerOnline && (
                <div
                  className="rounded-2xl border border-card-border px-4 py-3 text-left"
                  data-remote-thx
                >
                  <p className="text-xs font-bold text-muted-strong">
                    {rV2.thxTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["thanks", "fun", "again"] as const).map((tk) => (
                      <button
                        key={tk}
                        type="button"
                        disabled={!!thxSent}
                        onClick={() => {
                          setThxSent(tk);
                          remoteLinkRef.current?.send({ t: "thx", k: tk });
                        }}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                          thxSent === tk
                            ? "border-accent bg-accent text-white"
                            : "border-card-border text-foreground"
                        }`}
                      >
                        {rV2.thx[tk]}
                      </button>
                    ))}
                    {thxGot && (
                      <b className="self-center text-xs text-accent">
                        {rV2.thxGot.replace(
                          "{x}",
                          rV2.thx[thxGot as keyof typeof rV2.thx] ?? thxGot,
                        )}
                      </b>
                    )}
                  </div>
                </div>
              )}

              <div
                className="rounded-2xl border border-card-border px-4 py-3 text-left"
                data-remote-after
              >
                <p
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    peerOnline ? "text-emerald-400" : "text-muted-strong"
                  }`}
                >
                  <span>●</span>
                  {peerOnline ? rAfter.peerHere : rAfter.peerGone}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {peerOnline ? (
                    <button
                      type="button"
                      onClick={() => beginGame()}
                      className="w-full cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white"
                    >
                      {rAfter.againSame}
                    </button>
                  ) : (
                    roomCreds?.open && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhase("idle");
                          void handleCreateRemoteRoom();
                        }}
                        className="w-full cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white"
                      >
                        {rAfter.recruitAgain}
                      </button>
                    )
                  )}
                  {peerOnline && roomCreds?.open && (
                    <button
                      type="button"
                      onClick={() => {
                        remoteLinkRef.current?.end();
                        setPhase("idle");
                        void handleCreateRemoteRoom();
                      }}
                      className="w-full cursor-pointer rounded-xl border border-card-border px-4 py-2.5 text-sm font-bold text-foreground"
                    >
                      {queueCount > 0
                        ? rAfter.nextQueue.replace("{n}", String(queueCount))
                        : rAfter.recruitOther}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => beginGame()}
              className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
            >
              {copy.status.playAgain}
            </button>
            <button
              type="button"
              onClick={quitGame}
              className="cursor-pointer rounded-full border border-card-border px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              {copy.actions.close}
            </button>
          </div>
        </section>
      )}

      {/* Setup Card (Step 3/4 or 4/4 in Remote Mode, or Standard Solo Setup) */}
      {phase === "idle" && (
        <section
          data-sundome="setup"
          data-sundome-remote-only={remoteOnly ?? undefined}
          data-remote-page-phase={
            waitingRoom ? (peerOnline ? "came" : "wait") : "setup"
          }
          className="card scroll-mt-20 rounded-2xl p-5 sm:p-8"
        >
          {(remoteOnly || remoteInvite) && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-bold tabular-nums tracking-[0.15em] text-accent"
                    data-remote-step-no={remoteStepNo}
                  >
                    {rPage.step
                      .replace("{n}", remoteStepNo.split(" / ")[0])
                      .replace("{m}", remoteStepNo.split(" / ")[1])}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
                    {remoteInvite
                      ? rPage.joinTitle
                      : waitingRoom
                        ? peerOnline
                          ? rPage.cameHead
                          : rPage.waitHead
                        : remoteOnly === "open"
                          ? rPage.setupOpen
                          : rPage.setupLink}
                  </h2>
                </div>
                {onRemoteBack && !waitingRoom && !remoteInvite && (
                  <button
                    type="button"
                    onClick={onRemoteBack}
                    className="shrink-0 cursor-pointer rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted-strong hover:text-foreground"
                    data-remote-page-back
                  >
                    ‹ {rPage.back}
                  </button>
                )}
              </div>

              <p
                className="mt-1 text-xs leading-relaxed text-muted-strong [word-break:keep-all] [overflow-wrap:anywhere]"
                data-sundome-summary
              >
                {waitingRoom ? (
                  peerOnline ? null : (
                    <>
                      <Phrase
                        text={
                          roomCreds?.open ? rPage.waitOpen : rPage.waitLink
                        }
                      />
                      <RemoteElapsed since={waitingSince} fmt={rPage.waitFor} />
                    </>
                  )
                ) : (
                  <Phrase
                    text={remoteInvite ? rPage.joinNote : rPage.setupNote}
                  />
                )}
              </p>
            </>
          )}

          {/* Setup controls (hidden during 4/4 waiting room unless peer not yet waiting) */}
          {!waitingRoom && (
            <div className="mt-5 space-y-5">
              {/* Body Q (in remote setup) */}
              {(remoteOnly || remoteInvite) && (
                <div data-remote-body-q>
                  <p
                    className="text-sm font-bold text-foreground"
                    id="remote-body-q"
                  >
                    {rPage.bodyQ}
                  </p>
                  <div
                    className="mt-2 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-labelledby="remote-body-q"
                  >
                    {(["male", "female", "gay", "lesbian"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBody(b)}
                        data-testid={`body-${b}`}
                        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                          body === b
                            ? "border-accent bg-accent text-white"
                            : "border-card-border text-muted-strong hover:text-foreground"
                        }`}
                      >
                        {rPage.bodyName[b]}
                      </button>
                    ))}
                  </div>
                  <p
                    className="mt-2 text-xs font-bold leading-relaxed text-foreground"
                    data-remote-body-out={body}
                  >
                    <Phrase text={rPage.bodyOut[body]} />
                  </p>
                </div>
              )}

              {/* Duration */}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {copy.settings.duration}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[3, 5, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMode(m)}
                      className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold ${
                        durationMode === m
                          ? "border-accent bg-accent text-white"
                          : "border-card-border text-muted-strong hover:text-foreground"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDurationMode("custom")}
                    className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold ${
                      durationMode === "custom"
                        ? "border-accent bg-accent text-white"
                        : "border-card-border text-muted-strong hover:text-foreground"
                    }`}
                  >
                    {copy.settings.customMinutes}
                  </button>
                </div>
                {durationMode === "custom" && (
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="mt-2 w-28 rounded-xl border border-card-border bg-card-bg px-3 py-1.5 text-sm"
                  />
                )}
              </div>

              {/* Difficulty */}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {copy.settings.difficulty}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["easy", "normal", "hard", "brutal"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs ${
                        difficulty === d
                          ? "border-accent bg-accent-soft text-foreground font-bold"
                          : "border-card-border text-muted-strong"
                      }`}
                    >
                      <span className="block text-sm font-bold">
                        {copy.difficulties[d].label}
                      </span>
                      <span className="mt-0.5 block text-[11px] opacity-75">
                        {copy.difficulties[d].description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ending */}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {copy.settings.ending}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    ["lottery", "allowed", "denied", "ruined", "overtime"] as const
                  ).map((endKey) => (
                    <button
                      key={endKey}
                      type="button"
                      onClick={() => setEnding(endKey)}
                      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                        ending === endKey
                          ? "border-accent bg-accent text-white"
                          : "border-card-border text-muted-strong hover:text-foreground"
                      }`}
                    >
                      {copy.endings[endKey].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote Wishes, Limits, Extensions, Reply Settings */}
              {(remoteOnly || remoteInvite) && (
                <>
                  {/* Wishes */}
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {rWish.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {REMOTE_CONSTANTS.REMOTE_WISHES.map((wk) => {
                        const on = wishes.includes(wk);
                        return (
                          <button
                            key={wk}
                            type="button"
                            onClick={() => {
                              setWishes((prev) =>
                                prev.includes(wk)
                                  ? prev.filter((x) => x !== wk)
                                  : cleanWishes([...prev, wk]),
                              );
                            }}
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${
                              on
                                ? "border-accent bg-accent-soft text-foreground"
                                : "border-card-border text-muted-strong"
                            }`}
                          >
                            {rWish.tag[wk]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Allowed body spots */}
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {limText.partsQ}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allBodySpots.map((spot) => {
                        const on = activeParts.includes(spot);
                        return (
                          <button
                            key={spot}
                            type="button"
                            data-testid={`part-${spot}`}
                            onClick={() => {
                              const nextSpots = on
                                ? activeParts.filter((x) => x !== spot)
                                : [...activeParts, spot];
                              if (!nextSpots.length) return;
                              const nextLim: RemoteLimits = {
                                ...limits,
                                ap:
                                  nextSpots.length === allBodySpots.length
                                    ? undefined
                                    : nextSpots,
                              };
                              setLimits(nextLim);
                              saveLimits(nextLim);
                            }}
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${
                              on
                                ? "border-accent bg-accent-soft text-foreground"
                                : "border-card-border text-muted"
                            }`}
                          >
                            {rMore.part[spot]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-strong">
                      {limText.partsNote}
                    </p>
                  </div>

                  {/* NG & Caps accordion */}
                  <details
                    className="rounded-xl border border-card-border px-3 py-2"
                    data-remote-ng
                    open={!!(limits.nh || limits.gm || limits.sm || limits.nn) || undefined}
                  >
                    <summary className="cursor-pointer py-1 text-sm font-bold text-foreground">
                      {limText.ngTitle}
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid="ng-harsh"
                        onClick={() => {
                          const next = { ...limits, nh: !limits.nh };
                          setLimits(next);
                          saveLimits(next);
                        }}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                          limits.nh
                            ? "border-accent bg-accent text-white"
                            : "border-card-border text-muted-strong"
                        }`}
                      >
                        {limText.harsh}
                      </button>
                      <button
                        type="button"
                        data-testid="ng-now"
                        onClick={() => {
                          const next = { ...limits, nn: !limits.nn };
                          setLimits(next);
                          saveLimits(next);
                        }}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                          limits.nn
                            ? "border-accent bg-accent text-white"
                            : "border-card-border text-muted-strong"
                        }`}
                      >
                        {limText.nowNg}
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-bold text-muted-strong">
                      {limText.gripCap}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {REMOTE_CONSTANTS.GRIP_CAPS.map((gc) => {
                        const on = (limits.gm ?? "harder") === gc;
                        return (
                          <button
                            key={gc}
                            type="button"
                            data-testid={`ng-grip-${gc}`}
                            onClick={() => {
                              const next = {
                                ...limits,
                                gm: gc === "harder" ? undefined : gc,
                              };
                              setLimits(next);
                              saveLimits(next);
                            }}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                              on
                                ? "border-accent bg-accent-soft text-foreground"
                                : "border-card-border text-muted-strong"
                            }`}
                          >
                            {gc === "harder"
                              ? limText.capNone
                              : limText.capUpTo.replace("{x}", rV2.grip5[gc])}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs font-bold text-muted-strong">
                      {limText.speedCap}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(["mid", "fast", "vfast", "vmax"] as const).map((sc) => {
                        const on = (limits.sm ?? "vmax") === sc;
                        return (
                          <button
                            key={sc}
                            type="button"
                            data-testid={`ng-speed-${sc}`}
                            onClick={() => {
                              const next = {
                                ...limits,
                                sm: sc === "vmax" ? undefined : sc,
                              };
                              setLimits(next);
                              saveLimits(next);
                            }}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                              on
                                ? "border-accent bg-accent-soft text-foreground"
                                : "border-card-border text-muted-strong"
                            }`}
                          >
                            {sc === "vmax"
                              ? limText.capNone
                              : limText.capUpTo.replace("{x}", rDrive.level[sc])}
                          </button>
                        );
                      })}
                    </div>
                  </details>

                  {/* Max Extensions */}
                  <div data-remote-ext-q>
                    <p className="text-sm font-bold text-foreground">
                      {rV2.extQ}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {REMOTE_CONSTANTS.EXT_CHOICES.map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          data-testid={`ext-${cnt}`}
                          onClick={() => {
                            setExtMax(cnt);
                            saveExtMax(cnt);
                          }}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${
                            extMax === cnt
                              ? "border-accent bg-accent text-white"
                              : "border-card-border text-muted-strong"
                          }`}
                        >
                          {cnt < 0
                            ? rV2.extFree
                            : rV2.extTimes.replace("{n}", String(cnt))}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply button settings modal trigger */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setReactSettingsOpen(true)}
                      className="cursor-pointer rounded-full border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent"
                      data-remote-react-settings-open
                    >
                      {rCtl.reactSettings}
                    </button>
                  </div>

                  <details
                    className="rounded-xl border border-card-border px-3 py-2"
                    data-remote-page-more
                  >
                    <summary className="cursor-pointer py-1 text-sm font-medium text-muted-strong">
                      {rPage.more}
                    </summary>
                    {renderExtraSettings()}
                  </details>

                  <DglabPanel locale={locale} compact />
                </>
              )}

              {/* Extra Settings directly open in solo setup */}
              {!remoteOnly && !remoteInvite && renderExtraSettings()}
              {!remoteOnly && !remoteInvite && (
                <DglabPanel locale={locale} compact />
              )}
            </div>
          )}

          {/* Action CTA in Setup / Waiting */}
          {remoteOnly ? (
            !waitingRoom ? (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold text-foreground">
                  <Phrase text={rPage.setupNext} />
                </p>
                <button
                  type="button"
                  disabled={makingRoom}
                  onClick={() => void handleCreateRemoteRoom()}
                  data-remote-make-room
                  className="rpri w-full cursor-pointer rounded-xl px-6 py-4 text-base font-bold disabled:opacity-60"
                >
                  {makingRoom
                    ? rText.making
                    : remoteOnly === "open"
                      ? rText.recruitBtn
                      : rText.makeBtn}
                </button>
                {makeRoomError && (
                  <p className="text-xs text-[#ff8399]">{rText.makeFailed}</p>
                )}
              </div>
            ) : (
              /* 4 / 4 Waiting Card */
              <div className="mt-5 space-y-4">
                {peerOnline ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <p className="text-base font-bold text-emerald-300">
                      ● {rReady.joinTitle}
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      {autoCountdown !== null && autoCountdown > 0
                        ? rReady.autoLead.replace("{n}", String(autoCountdown))
                        : rReady.autoNow}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startGame}
                        className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
                      >
                        {rReady.joinStart}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRemoteRoom}
                        className="cursor-pointer rounded-full border border-card-border px-4 py-2.5 text-xs font-semibold text-muted-strong"
                      >
                        {rReady.autoCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-card-border bg-card-bg p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-strong">
                      {roomCreds.open ? rText.recruitReady : rText.linkReady}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={remoteControlLink}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 rounded-xl border border-card-border bg-background/60 px-3 py-2 text-xs font-mono text-foreground"
                        data-remote-share-url
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void copyTextToClipboard(remoteControlLink).then((ok) => {
                            if (ok) {
                              setRemoteCopied(true);
                              window.setTimeout(() => setRemoteCopied(false), 2000);
                            }
                          });
                        }}
                        className="rpri shrink-0 cursor-pointer rounded-xl px-4 py-2 text-xs font-bold"
                      >
                        {remoteCopied ? rText.copied : rText.copy}
                      </button>
                    </div>
                    <p className="text-xs text-muted">
                      {remoteStatus === "open"
                        ? roomCreds.open
                          ? rText.recruitWaiting
                          : rText.waitingPeer
                        : rText.reconnecting}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startGame}
                        className="cursor-pointer rounded-full border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent"
                      >
                        {rPage.soloStart}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRemoteRoom}
                        className="cursor-pointer rounded-full border border-card-border px-4 py-2 text-xs text-muted hover:text-foreground"
                      >
                        {roomCreds.open ? rText.recruitCancel : rText.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : remoteInvite ? (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted">
                {remoteStatus === "forbidden"
                  ? rPage.joinBad
                  : peerOnline
                    ? rText.peerOn
                    : rPage.joinWait}
              </p>
              <button
                type="button"
                disabled={remoteStatus === "forbidden"}
                onClick={startGame}
                className="rpri w-full cursor-pointer rounded-xl px-6 py-4 text-base font-bold disabled:opacity-40"
              >
                {copy.actions.start}
              </button>
            </div>
          ) : partner ? (
            <div className="mt-6">
              {(() => {
                const ph = partnerPhase(
                  partner.startAt,
                  partner.s.duration,
                  partnerClock,
                );
                if (ph.phase === "after") {
                  return (
                    <p className="text-sm font-bold text-muted-strong">
                      {pText.ended}
                    </p>
                  );
                }
                return (
                  <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4">
                    <p className="text-sm font-bold text-foreground">
                      {pText.guestTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-strong">
                      {ph.phase === "before"
                        ? pText.countdown.replace(
                            "{t}",
                            formatTime(Math.ceil(ph.untilStartMs / 1000)),
                          )
                        : pText.startingNow}
                    </p>
                    <button
                      type="button"
                      onClick={startGame}
                      className="mt-3 cursor-pointer rounded-full bg-accent px-5 py-2 text-xs font-bold text-white"
                    >
                      {copy.actions.start}
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={startGame}
                className="rpri w-full cursor-pointer rounded-xl px-6 py-4 text-base font-bold"
              >
                {copy.actions.start}
              </button>

              {/* 2-Player Synchronized Mode (Partner link card) */}
              <div className="rounded-2xl border border-card-border p-4">
                <p className="text-sm font-bold text-foreground">
                  {pText.sectionTitle}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {pText.sectionLead}
                </p>
                {!partnerUrl ? (
                  <button
                    type="button"
                    onClick={handleCreatePartnerLink}
                    className="mt-3 cursor-pointer rounded-full border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent"
                  >
                    {pText.makeBtn}
                  </button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-accent">
                      {pText.hostTitle} ·{" "}
                      {partnerStartAt
                        ? formatStartAt(partnerStartAt, locale)
                        : ""}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={partnerUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void copyTextToClipboard(partnerUrl).then((ok) => {
                            if (ok) {
                              setPartnerCopied(true);
                              window.setTimeout(() => setPartnerCopied(false), 2000);
                            }
                          });
                        }}
                        className="rpri shrink-0 cursor-pointer rounded-xl px-4 py-2 text-xs font-bold"
                      >
                        {partnerCopied ? rText.copied : rText.copy}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <ReactSettingsModal
        lang={locale}
        body={body}
        open={reactSettingsOpen}
        onClose={() => setReactSettingsOpen(false)}
      />
    </div>
  );
}
