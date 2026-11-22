"use client";

import { useSyncExternalStore } from "react";

import {
  buildWaveFrames,
  frameToV3Hex,
  type WavePresetKey,
} from "@/data/dglabCopy";
import { IS_STATIC_EXPORT } from "@/data/tools";
import { buttplugManager } from "@/lib/buttplug";

export type DglabTransportMode =
  | "socket4"
  | "socket"
  | "ble3"
  | "ble2"
  | "buttplug";
export type DglabWsEndpointMode = "auto" | "official" | "lan" | "custom";
export type DglabConnectionStatus =
  | "disconnected"
  | "waiting_qr"
  | "paired"
  | "connecting_ble"
  | "connected_ble"
  | "error";

export interface DglabV4Device {
  slotId: string;
  name: string;
  type: string;
  hasDevice: boolean;
  power?: number;
  intensityA?: number;
  intensityB?: number;
  maxA?: number;
  maxB?: number;
  pressure?: number;
  edgeState?: number;
  rawProps?: Record<string, unknown>;
  rawSlotState?: Record<string, unknown>;
}

export interface DglabPrefs {
  autoSync: boolean;
  allowRemote: boolean;
  zeroOnStop: boolean;
  edgeShock: boolean;
  channelBLink: boolean;
}

export interface DglabSnapshot {
  mode: DglabTransportMode;
  status: DglabConnectionStatus;
  errorText: string;
  clientId: string;
  targetId: string;
  qrUrl: string;
  wsEndpointMode: DglabWsEndpointMode;
  customWsUrl: string;
  devices: DglabV4Device[];
  activeSlotId: string;
  strengthA: number;
  strengthB: number;
  appLimitA: number;
  appLimitB: number;
  maxA: number;
  maxB: number;
  waveA: WavePresetKey;
  waveB: WavePresetKey;
  outputActive: boolean;
  bpm: number;
  lastFeedback: { index: number; at: number } | null;
  prefs: DglabPrefs;
  buttplugConnected: boolean;
  buttplugDeviceCount: number;
  bleSupported: boolean;
  secureContext: boolean;
}

export interface DglabGameCue {
  active: boolean;
  mode: "stroke" | "slow" | "stop" | "edge" | "finale" | "denied" | "ruin";
  bpm?: number;
  intensityPct?: number;
  wave?: WavePresetKey;
}

// Web Bluetooth minimal runtime declarations so strict TypeScript compiles cleanly
interface BleCharacteristicLike {
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BleCharacteristicLike>;
  addEventListener(type: string, listener: (ev: Event) => void): void;
  value?: DataView;
}
interface BleServiceLike {
  getCharacteristic(uuid: string | number): Promise<BleCharacteristicLike>;
}
interface BleServerLike {
  connected: boolean;
  connect(): Promise<BleServerLike>;
  getPrimaryService(uuid: string | number): Promise<BleServiceLike>;
}
interface BleDeviceLike {
  name?: string;
  gatt?: BleServerLike;
  addEventListener(type: string, listener: () => void): void;
}
interface NavigatorWithBluetooth {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ namePrefix?: string }>;
      optionalServices?: Array<string | number>;
      acceptAllDevices?: boolean;
    }): Promise<BleDeviceLike>;
  };
}

const PREFS_STORAGE_KEY = "open100:dglab-prefs";

const DEFAULT_PREFS: DglabPrefs = {
  autoSync: true,
  allowRemote: true,
  zeroOnStop: true,
  edgeShock: true,
  channelBLink: true,
};

// BLE UUIDs
const COYOTE3_SERVICE = "0000180c-0000-1000-8000-00805f9b34fb";
const COYOTE3_WRITE_CHAR = "0000150a-0000-1000-8000-00805f9b34fb";
const COYOTE3_NOTIFY_CHAR = "0000150b-0000-1000-8000-00805f9b34fb";

const COYOTE2_SERVICE = "955a180b-0fe2-f5aa-a094-84b8d4f3e8ad";
const COYOTE2_AB2_CHAR = "955a1504-0fe2-f5aa-a094-84b8d4f3e8ad";
const COYOTE2_A34_CHAR = "955a1506-0fe2-f5aa-a094-84b8d4f3e8ad";
const COYOTE2_B34_CHAR = "955a1505-0fe2-f5aa-a094-84b8d4f3e8ad";

function clamp200(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(200, Math.round(n)));
}

async function writeBle(
  ch: BleCharacteristicLike | null,
  bytes: Uint8Array,
): Promise<void> {
  if (!ch) return;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  if (ch.writeValueWithoutResponse) {
    await ch.writeValueWithoutResponse(copy);
  } else if (ch.writeValue) {
    await ch.writeValue(copy);
  }
}

const OFFICIAL_V4_WS_URL = "wss://trex.dungeon-lab.cn/v4";
const OFFICIAL_V3_WS_URL = "wss://ws.dungeon-lab.cn";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function buildV4QrUrl(baseWsUrl: string, targetId: string): string {
  const clean = baseWsUrl.trim();
  const sep = clean.includes("?") ? "&" : clean.endsWith("/") ? "?" : "/?";
  const appSocketUrl = `${clean}${sep}tid=${encodeURIComponent(targetId)}`;
  return `https://dungeon-lab.cn/s/?v=1&action=socket&url=${encodeURIComponent(appSocketUrl)}`;
}

function readNum(obj: Record<string, unknown> | undefined, key: string): number | undefined {
  const v = obj?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function readMaxFromChannelState(chState: unknown): number | undefined {
  if (!isRecord(chState)) return undefined;
  const direct = readNum(chState, "intensityMax");
  if (direct !== undefined) return Math.max(1, clamp200(direct));
  if (isRecord(chState.comfortLimit)) {
    const cMax = readNum(chState.comfortLimit, "comfortMax");
    if (cMax !== undefined) return Math.max(1, clamp200(cMax));
    const aMax = readNum(chState.comfortLimit, "absoluteMax");
    if (aMax !== undefined) return Math.max(1, clamp200(aMax));
  }
  return undefined;
}

function parseV4Device(raw: unknown): DglabV4Device | null {
  if (!isRecord(raw) || typeof raw.slotId !== "string" || !raw.slotId) return null;
  const props = isRecord(raw.props) ? raw.props : undefined;
  const slotState = isRecord(raw.slotState) ? raw.slotState : undefined;
  const edge = slotState && isRecord(slotState.edge) ? slotState.edge : undefined;
  return {
    slotId: raw.slotId,
    name: typeof raw.name === "string" && raw.name ? raw.name : raw.slotId,
    type: typeof raw.type === "string" ? raw.type : "UNKNOWN",
    hasDevice:
      slotState && typeof slotState.hasDevice === "boolean"
        ? slotState.hasDevice
        : true,
    power: readNum(props, "power"),
    intensityA: readNum(props, "intensityA"),
    intensityB: readNum(props, "intensityB"),
    maxA: readMaxFromChannelState(slotState?.channelA),
    maxB: readMaxFromChannelState(slotState?.channelB),
    pressure: readNum(props, "pressure"),
    edgeState: readNum(edge, "edgeState"),
    rawProps: props,
    rawSlotState: slotState,
  };
}

function isStimV4Device(dev: DglabV4Device): boolean {
  return dev.type !== "BMTR_1";
}

class DglabManager {
  private snap: DglabSnapshot;
  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private activeSocketVersion: "v3" | "v4" = "v4";
  private v4Clients = new Map<string, DglabV4Device[]>();
  private v4PendingDevices = new Map<string, string>();
  private v4KnownStrength = new Map<string, { a: number; b: number }>();
  private v4ReqSeq = 1;
  private socketPumpTimer: number | null = null;
  private bleTimer: number | null = null;
  private burstRestoreTimer: number | null = null;
  private stepOffset = 0;
  private bleSeq = 1;
  private bleDevice: BleDeviceLike | null = null;
  private c3Write: BleCharacteristicLike | null = null;
  private c2Ab2: BleCharacteristicLike | null = null;
  private c2A34: BleCharacteristicLike | null = null;
  private c2B34: BleCharacteristicLike | null = null;
  private hydrated = false;

  constructor() {
    this.snap = {
      mode: IS_STATIC_EXPORT ? "ble3" : "socket4",
      status: "disconnected",
      errorText: "",
      clientId: "",
      targetId: "",
      qrUrl: "",
      wsEndpointMode: "auto",
      customWsUrl: "",
      devices: [],
      activeSlotId: "",
      strengthA: 0,
      strengthB: 0,
      appLimitA: 200,
      appLimitB: 200,
      maxA: 40,
      maxB: 40,
      waveA: "breathe",
      waveB: "breathe",
      outputActive: false,
      bpm: 90,
      lastFeedback: null,
      prefs: { ...DEFAULT_PREFS },
      buttplugConnected: false,
      buttplugDeviceCount: 0,
      bleSupported: false,
      secureContext: false,
    };
  }

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    const nav = navigator as unknown as NavigatorWithBluetooth;
    let savedMaxA = 40;
    let savedMaxB = 40;
    let savedWaveA: WavePresetKey = "breathe";
    let savedWaveB: WavePresetKey = "breathe";
    let savedEndpointMode: DglabWsEndpointMode = "auto";
    let savedCustomWs = "";
    let savedPrefs = { ...DEFAULT_PREFS };
    let savedMode = this.snap.mode;

    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{
          maxA: number;
          maxB: number;
          waveA: WavePresetKey;
          waveB: WavePresetKey;
          wsEndpointMode: DglabWsEndpointMode;
          customWsUrl: string;
          prefs: Partial<DglabPrefs>;
          mode: DglabTransportMode;
        }>;
        if (typeof p.maxA === "number") savedMaxA = clamp200(p.maxA);
        if (typeof p.maxB === "number") savedMaxB = clamp200(p.maxB);
        if (p.waveA) savedWaveA = p.waveA;
        if (p.waveB) savedWaveB = p.waveB;
        if (
          p.wsEndpointMode === "auto" ||
          p.wsEndpointMode === "official" ||
          p.wsEndpointMode === "lan" ||
          p.wsEndpointMode === "custom"
        ) {
          savedEndpointMode = p.wsEndpointMode;
        }
        if (typeof p.customWsUrl === "string") savedCustomWs = p.customWsUrl;
        if (
          p.mode === "socket4" ||
          p.mode === "socket" ||
          p.mode === "ble3" ||
          p.mode === "ble2" ||
          p.mode === "buttplug"
        ) {
          savedMode = p.mode;
        }
        if (p.prefs && typeof p.prefs === "object") {
          savedPrefs = { ...DEFAULT_PREFS, ...p.prefs };
        }
      }
    } catch {}

    buttplugManager.hydrate();
    const bpInit = buttplugManager.getSnapshot();
    buttplugManager.subscribe(() => {
      const bp = buttplugManager.getSnapshot();
      const bpConn = bp.status === "connected";
      const bpCount = bp.devices.length;
      if (
        bpConn !== this.snap.buttplugConnected ||
        bpCount !== this.snap.buttplugDeviceCount
      ) {
        this.update({
          buttplugConnected: bpConn,
          buttplugDeviceCount: bpCount,
        });
      }
    });

    this.snap = {
      ...this.snap,
      mode: savedMode,
      maxA: savedMaxA,
      maxB: savedMaxB,
      waveA: savedWaveA,
      waveB: savedWaveB,
      wsEndpointMode: savedEndpointMode,
      customWsUrl: savedCustomWs,
      prefs: savedPrefs,
      buttplugConnected: bpInit.status === "connected",
      buttplugDeviceCount: bpInit.devices.length,
      bleSupported: Boolean(nav.bluetooth),
      secureContext: Boolean(window.isSecureContext),
    };
    this.emit();
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          mode: this.snap.mode,
          maxA: this.snap.maxA,
          maxB: this.snap.maxB,
          waveA: this.snap.waveA,
          waveB: this.snap.waveB,
          wsEndpointMode: this.snap.wsEndpointMode,
          customWsUrl: this.snap.customWsUrl,
          prefs: this.snap.prefs,
        }),
      );
    } catch {}
  }

  private update(patch: Partial<DglabSnapshot>, save = false) {
    this.snap = { ...this.snap, ...patch };
    if (save) this.persist();
    this.emit();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    if (!this.hydrated && typeof window !== "undefined") {
      queueMicrotask(() => this.hydrate());
    }
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): DglabSnapshot => this.snap;

  isDglabConnected(): boolean {
    return (
      this.snap.status === "paired" || this.snap.status === "connected_ble"
    );
  }

  isConnected(): boolean {
    return this.isDglabConnected() || buttplugManager.isConnected();
  }

  setMode(mode: DglabTransportMode) {
    if (mode !== "buttplug" && this.snap.mode !== "buttplug") {
      this.disconnect();
    }
    this.update({ mode, errorText: "" }, true);
  }

  setWsConfig(wsEndpointMode: DglabWsEndpointMode, customWsUrl?: string) {
    this.update(
      {
        wsEndpointMode,
        ...(customWsUrl !== undefined ? { customWsUrl } : {}),
      },
      true,
    );
  }

  setPrefs(patch: Partial<DglabPrefs>) {
    this.update({ prefs: { ...this.snap.prefs, ...patch } }, true);
  }

  setLimits(maxA: number, maxB: number) {
    const cA = clamp200(maxA);
    const cB = clamp200(maxB);
    this.update({ maxA: cA, maxB: cB }, true);
    if (this.snap.strengthA > cA) this.setChannelStrength("A", cA);
    if (this.snap.strengthB > cB) this.setChannelStrength("B", cB);
  }

  private resolveSocketEndpoints(): { connectUrl: string; qrWsBase: string } | null {
    const isV4 = this.snap.mode === "socket4";
    const path = isV4 ? "/dglab-ws/v4" : "/dglab-ws";
    const toWs = (httpUrl: string) =>
      httpUrl
        .replace(/^https:/i, "wss:")
        .replace(/^http:/i, "ws:")
        .replace(/\/+$/, "");

    if (this.snap.wsEndpointMode === "custom") {
      const clean = this.snap.customWsUrl.trim().replace(/\/+$/, "");
      if (!/^wss?:\/\//i.test(clean)) return null;
      return { connectUrl: clean, qrWsBase: clean };
    }
    if (this.snap.wsEndpointMode === "official") {
      const url = isV4 ? OFFICIAL_V4_WS_URL : OFFICIAL_V3_WS_URL;
      return { connectUrl: url, qrWsBase: url };
    }
    if (typeof window === "undefined") return null;
    if (IS_STATIC_EXPORT) {
      if (this.snap.wsEndpointMode === "auto") {
        const url = isV4 ? OFFICIAL_V4_WS_URL : OFFICIAL_V3_WS_URL;
        return { connectUrl: url, qrWsBase: url };
      }
      return null;
    }

    const localUrl = `${toWs(window.location.origin)}${path}`;
    if (this.snap.wsEndpointMode === "lan") {
      return { connectUrl: localUrl, qrWsBase: localUrl };
    }

    const w = window as unknown as { __OPEN100_PUBLIC_ORIGIN__?: string };
    const qrOrigin = w.__OPEN100_PUBLIC_ORIGIN__ || window.location.origin;
    const qrWsBase = `${toWs(qrOrigin)}${path}`;
    // Connect the browser directly to the same-origin server WS (fast LAN/HTTP) while
    // putting the public Tunnel WSS in the App QR code so the phone can join externally.
    return { connectUrl: localUrl, qrWsBase };
  }

  private syncV4DevicesSnapshot() {
    const allDevices: DglabV4Device[] = [];
    for (const list of this.v4Clients.values()) {
      for (const dev of list) {
        allDevices.push(dev);
      }
    }
    const stimList = allDevices.filter(isStimV4Device);
    const primary =
      stimList.find((d) => d.type === "COYOTE_030") ??
      stimList.find((d) => d.type === "COYOTE_020") ??
      stimList[0] ??
      allDevices[0];

    for (const dev of stimList) {
      const prev = this.v4KnownStrength.get(dev.slotId) ?? { a: 0, b: 0 };
      this.v4KnownStrength.set(dev.slotId, {
        a: dev.intensityA !== undefined ? clamp200(dev.intensityA) : prev.a,
        b: dev.intensityB !== undefined ? clamp200(dev.intensityB) : prev.b,
      });
    }

    const patch: Partial<DglabSnapshot> = {
      devices: allDevices,
      activeSlotId: primary?.slotId ?? "",
    };
    if (primary && isStimV4Device(primary)) {
      if (primary.maxA !== undefined) patch.appLimitA = primary.maxA;
      if (primary.maxB !== undefined) patch.appLimitB = primary.maxB;
      if (primary.intensityA !== undefined) {
        patch.strengthA = clamp200(primary.intensityA);
      }
      if (primary.intensityB !== undefined) {
        patch.strengthB = clamp200(primary.intensityB);
      }
    }
    this.update(patch);
  }

  private sendV4Rpc(appClientId: string, m: string, data?: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const reqId = `r-${this.v4ReqSeq++}`;
    if (m === "devices.get") {
      this.v4PendingDevices.set(reqId, appClientId);
    }
    this.ws.send(
      JSON.stringify({
        type: "message",
        clientId: appClientId,
        data: {
          t: "req",
          reqId,
          m,
          ...(data !== undefined ? { data } : {}),
        },
      }),
    );
  }

  private forEachV4StimTarget(fn: (appClientId: string, dev: DglabV4Device) => void) {
    for (const [appClientId, list] of this.v4Clients.entries()) {
      for (const dev of list) {
        if (isStimV4Device(dev)) {
          fn(appClientId, dev);
        }
      }
    }
  }

  private handleV4EventOrResp(appClientId: string, payload: Record<string, unknown>) {
    if (payload.t === "resp" && typeof payload.reqId === "string") {
      const pendingClient = this.v4PendingDevices.get(payload.reqId);
      if (pendingClient) {
        this.v4PendingDevices.delete(payload.reqId);
        if (isRecord(payload.result) && Array.isArray(payload.result.devices)) {
          const parsed = payload.result.devices
            .map(parseV4Device)
            .filter((d): d is DglabV4Device => d !== null);
          this.v4Clients.set(pendingClient, parsed);
          this.syncV4DevicesSnapshot();
        }
      }
      return;
    }

    if (payload.t !== "ev" || typeof payload.ev !== "string") return;

    if (payload.ev === "devices.snapshot" && Array.isArray(payload.devices)) {
      const parsed = payload.devices
        .map(parseV4Device)
        .filter((d): d is DglabV4Device => d !== null);
      this.v4Clients.set(appClientId, parsed);
      this.syncV4DevicesSnapshot();
      return;
    }

    if (payload.ev === "devices.patch") {
      const cur = [...(this.v4Clients.get(appClientId) ?? [])];
      const removed = new Set(
        Array.isArray(payload.removed)
          ? payload.removed.filter((id): id is string => typeof id === "string")
          : [],
      );
      const nextList = cur.filter((d) => !removed.has(d.slotId));
      if (Array.isArray(payload.added)) {
        for (const raw of payload.added) {
          const dev = parseV4Device(raw);
          if (dev && !nextList.some((d) => d.slotId === dev.slotId)) {
            nextList.push(dev);
          }
        }
      }
      this.v4Clients.set(appClientId, nextList);
      this.syncV4DevicesSnapshot();
      return;
    }

    if (payload.ev === "slots.patch" && Array.isArray(payload.slots)) {
      const cur = [...(this.v4Clients.get(appClientId) ?? [])];
      let changed = false;
      for (const patchRaw of payload.slots) {
        if (!isRecord(patchRaw) || typeof patchRaw.slotId !== "string") continue;
        const idx = cur.findIndex((d) => d.slotId === patchRaw.slotId);
        if (idx === -1) continue;
        const prev = cur[idx];
        const nextProps = isRecord(patchRaw.props)
          ? { ...(prev.rawProps ?? {}), ...patchRaw.props }
          : prev.rawProps;
        const prevState = prev.rawSlotState ?? {};
        const patchState = isRecord(patchRaw.slotState) ? patchRaw.slotState : {};
        const mergedState: Record<string, unknown> = { ...prevState, ...patchState };
        if (isRecord(prevState.channelA) || isRecord(patchState.channelA)) {
          mergedState.channelA = {
            ...(isRecord(prevState.channelA) ? prevState.channelA : {}),
            ...(isRecord(patchState.channelA) ? patchState.channelA : {}),
          };
        }
        if (isRecord(prevState.channelB) || isRecord(patchState.channelB)) {
          mergedState.channelB = {
            ...(isRecord(prevState.channelB) ? prevState.channelB : {}),
            ...(isRecord(patchState.channelB) ? patchState.channelB : {}),
          };
        }
        if (isRecord(prevState.edge) || isRecord(patchState.edge)) {
          mergedState.edge = {
            ...(isRecord(prevState.edge) ? prevState.edge : {}),
            ...(isRecord(patchState.edge) ? patchState.edge : {}),
          };
        }
        const edgeObj = isRecord(mergedState.edge) ? mergedState.edge : undefined;
        cur[idx] = {
          ...prev,
          hasDevice:
            typeof mergedState.hasDevice === "boolean"
              ? mergedState.hasDevice
              : prev.hasDevice,
          power: readNum(nextProps, "power") ?? prev.power,
          intensityA: readNum(nextProps, "intensityA") ?? prev.intensityA,
          intensityB: readNum(nextProps, "intensityB") ?? prev.intensityB,
          maxA: readMaxFromChannelState(mergedState.channelA) ?? prev.maxA,
          maxB: readMaxFromChannelState(mergedState.channelB) ?? prev.maxB,
          pressure: readNum(nextProps, "pressure") ?? prev.pressure,
          edgeState: readNum(edgeObj, "edgeState") ?? prev.edgeState,
          rawProps: nextProps,
          rawSlotState: mergedState,
        };
        changed = true;
      }
      if (changed) {
        this.v4Clients.set(appClientId, cur);
        this.syncV4DevicesSnapshot();
      }
      return;
    }

    if (payload.ev === "custom.action" && typeof payload.action === "number") {
      this.update({ lastFeedback: { index: payload.action, at: Date.now() } });
    }
  }

  async connectSocket() {
    const requestedMode = this.snap.mode === "socket" ? "socket" : "socket4";
    this.disconnect();
    this.activeSocketVersion = requestedMode === "socket4" ? "v4" : "v3";
    if (this.snap.mode !== requestedMode) {
      this.update({ mode: requestedMode });
    }

    const initialEndpoints = this.resolveSocketEndpoints();
    if (!initialEndpoints) {
      this.update({
        status: "error",
        errorText: "Missing valid WebSocket relay URL",
      });
      return;
    }

    // Refresh public origin first in auto mode so Cloudflare Tunnel URL is up to date
    if (this.snap.wsEndpointMode === "auto" && !IS_STATIC_EXPORT) {
      try {
        const ac = new AbortController();
        const t = window.setTimeout(() => ac.abort(), 1500);
        const res = await fetch("/api/rgate/public-url", {
          cache: "no-store",
          signal: ac.signal,
        });
        window.clearTimeout(t);
        const j = (await res.json()) as { publicOrigin?: string };
        if (j?.publicOrigin) {
          (
            window as unknown as { __OPEN100_PUBLIC_ORIGIN__?: string }
          ).__OPEN100_PUBLIC_ORIGIN__ = j.publicOrigin;
        }
      } catch {}
    }

    const endpoints = this.resolveSocketEndpoints() || initialEndpoints;
    this.update({
      status: "waiting_qr",
      errorText: "",
      clientId: "",
      targetId: "",
      qrUrl: "",
      devices: [],
      activeSlotId: "",
    });

    try {
      const ws = new WebSocket(endpoints.connectUrl);
      this.ws = ws;
      const connectTimeout = window.setTimeout(() => {
        if (this.ws === ws && ws.readyState === WebSocket.CONNECTING) {
          try {
            ws.close();
          } catch {}
          this.stopPumps();
          this.update({
            status: "error",
            errorText: `WebSocket connection timed out (${endpoints.connectUrl})`,
            outputActive: false,
          });
        }
      }, 8000);

      ws.onopen = () => {
        window.clearTimeout(connectTimeout);
      };

      ws.onmessage = (ev) => {
        if (this.ws !== ws) return;
        let msg: Record<string, unknown>;
        try {
          const parsed = JSON.parse(String(ev.data)) as unknown;
          if (!isRecord(parsed)) return;
          msg = parsed;
        } catch {
          return;
        }

        if (this.activeSocketVersion === "v4") {
          const type = msg.type;
          if (type === "hello" && typeof msg.clientId === "string") {
            const cId = msg.clientId;
            this.v4Clients.clear();
            this.v4PendingDevices.clear();
            this.v4KnownStrength.clear();
            this.update({
              clientId: cId,
              qrUrl: buildV4QrUrl(endpoints.qrWsBase, cId),
              status: "waiting_qr",
            });
            return;
          }
          if (type === "client_attached" && typeof msg.clientId === "string") {
            const appClientId = msg.clientId;
            if (!this.v4Clients.has(appClientId)) {
              this.v4Clients.set(appClientId, []);
            }
            this.update({
              targetId: this.snap.targetId || appClientId,
              status: "paired",
              errorText: "",
            });
            this.sendV4Rpc(appClientId, "devices.get");
            this.startSocketPump();
            return;
          }
          if (type === "client_disconnected" && typeof msg.clientId === "string") {
            this.v4Clients.delete(msg.clientId);
            const nextClientId = this.v4Clients.keys().next().value as
              | string
              | undefined;
            if (!nextClientId) {
              this.stopPumps();
              this.update({
                status: "waiting_qr",
                targetId: "",
                activeSlotId: "",
                devices: [],
                outputActive: false,
              });
            } else {
              this.update({ targetId: nextClientId });
              this.syncV4DevicesSnapshot();
            }
            return;
          }
          if (
            type === "message" &&
            typeof msg.clientId === "string" &&
            isRecord(msg.data)
          ) {
            this.handleV4EventOrResp(msg.clientId, msg.data);
            return;
          }
          if (type === "idle_timeout") {
            this.stopPumps();
            this.update({
              status: "error",
              errorText: "Pairing idle timeout (5 min)",
              outputActive: false,
            });
            return;
          }
          return;
        }

        // Legacy Socket V3 message handling
        if (msg.type === "bind") {
          if (msg.message === "targetId" && typeof msg.clientId === "string") {
            const cId = msg.clientId;
            const qrTarget = `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${endpoints.qrWsBase.replace(/\/+$/, "")}/${cId}`;
            this.update({
              clientId: cId,
              qrUrl: qrTarget,
              status: "waiting_qr",
            });
            return;
          }
          if (
            msg.message === "200" &&
            typeof msg.clientId === "string" &&
            typeof msg.targetId === "string"
          ) {
            this.update({
              clientId: msg.clientId,
              targetId: msg.targetId,
              status: "paired",
              errorText: "",
            });
            this.startSocketPump();
            return;
          }
        }

        if (msg.type === "break") {
          this.stopPumps();
          this.update({
            status: "waiting_qr",
            targetId: "",
            outputActive: false,
          });
          return;
        }

        if (msg.type === "msg" && typeof msg.message === "string") {
          if (msg.message.startsWith("strength-")) {
            const parts = msg.message
              .slice("strength-".length)
              .split("+")
              .map((n) => Number(n));
            if (parts.length >= 4 && parts.every(Number.isFinite)) {
              this.update({
                strengthA: clamp200(parts[0]),
                strengthB: clamp200(parts[1]),
                appLimitA: Math.max(1, clamp200(parts[2])),
                appLimitB: Math.max(1, clamp200(parts[3])),
              });
            }
          } else if (msg.message.startsWith("feedback-")) {
            const idx = Number(msg.message.slice("feedback-".length));
            if (Number.isFinite(idx)) {
              this.update({ lastFeedback: { index: idx, at: Date.now() } });
            }
          }
        }
      };

      ws.onerror = () => {
        window.clearTimeout(connectTimeout);
        if (this.ws !== ws) return;
        this.stopPumps();
        this.update({
          status: "error",
          errorText: "WebSocket connection failed",
          outputActive: false,
        });
      };

      ws.onclose = () => {
        window.clearTimeout(connectTimeout);
        if (this.ws !== ws) return;
        this.ws = null;
        this.stopPumps();
        if (this.snap.status !== "error") {
          this.update({
            status: "disconnected",
            targetId: "",
            qrUrl: "",
            devices: [],
            activeSlotId: "",
            outputActive: false,
          });
        }
      };
    } catch (err) {
      this.update({ status: "error", errorText: String(err) });
    }
  }

  private sendSocketMsg(message: string) {
    if (
      this.activeSocketVersion !== "v3" ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      this.snap.status !== "paired" ||
      !this.snap.clientId ||
      !this.snap.targetId
    ) {
      return;
    }
    this.ws.send(
      JSON.stringify({
        type: "msg",
        clientId: this.snap.clientId,
        targetId: this.snap.targetId,
        message,
      }),
    );
  }

  private startSocketPump() {
    this.stopPumps();
    this.socketPumpTimer = window.setInterval(() => {
      if (this.snap.status !== "paired" || !this.snap.outputActive) return;
      const framesA = buildWaveFrames(
        this.snap.waveA,
        this.stepOffset,
        5,
        this.snap.bpm,
      ).map(frameToV3Hex);
      const framesB = buildWaveFrames(
        this.snap.waveB,
        this.stepOffset,
        5,
        this.snap.bpm,
      ).map(frameToV3Hex);
      this.stepOffset += 5;

      if (this.activeSocketVersion === "v4") {
        this.forEachV4StimTarget((appClientId, dev) => {
          if (this.snap.strengthA > 0) {
            this.sendV4Rpc(appClientId, "device.op", {
              s: dev.slotId,
              t: 0,
              c: 0,
              p: 1,
              d: 600,
              im: true,
              v: framesA,
            });
          }
          if (this.snap.strengthB > 0) {
            this.sendV4Rpc(appClientId, "device.op", {
              s: dev.slotId,
              t: 0,
              c: 1,
              p: 1,
              d: 600,
              im: true,
              v: framesB,
            });
          }
        });
        return;
      }

      if (this.snap.strengthA > 0) {
        this.sendSocketMsg(`pulse-A:${JSON.stringify(framesA)}`);
      }
      if (this.snap.strengthB > 0) {
        this.sendSocketMsg(`pulse-B:${JSON.stringify(framesB)}`);
      }
    }, 500);
  }

  async connectBle(version: "ble3" | "ble2") {
    this.disconnect();
    const nav = navigator as unknown as NavigatorWithBluetooth;
    if (!nav.bluetooth || !window.isSecureContext) {
      this.update({
        mode: version,
        status: "error",
        errorText: !window.isSecureContext
          ? "HTTPS or localhost required for Web Bluetooth"
          : "Web Bluetooth not supported",
      });
      return;
    }

    this.update({ mode: version, status: "connecting_ble", errorText: "" });

    try {
      const device = await nav.bluetooth.requestDevice(
        version === "ble3"
          ? {
              filters: [{ namePrefix: "47L121000" }, { namePrefix: "DG" }],
              optionalServices: [COYOTE3_SERVICE],
            }
          : {
              filters: [{ namePrefix: "D-LAB" }, { namePrefix: "DG" }],
              optionalServices: [COYOTE2_SERVICE],
            },
      );
      this.bleDevice = device;
      device.addEventListener("gattserverdisconnected", () => {
        if (this.bleDevice !== device) return;
        this.stopPumps();
        this.c3Write = null;
        this.c2Ab2 = null;
        this.c2A34 = null;
        this.c2B34 = null;
        this.update({ status: "disconnected", outputActive: false });
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("No GATT server");

      if (version === "ble3") {
        const svc = await server.getPrimaryService(COYOTE3_SERVICE);
        this.c3Write = await svc.getCharacteristic(COYOTE3_WRITE_CHAR);
        try {
          const notify = await svc.getCharacteristic(COYOTE3_NOTIFY_CHAR);
          await notify.startNotifications();
          notify.addEventListener("characteristicvaluechanged", (ev) => {
            const target = ev.target as unknown as BleCharacteristicLike;
            const dv = target?.value;
            if (!dv || dv.byteLength < 4) return;
            if (dv.getUint8(0) === 0xb1) {
              this.update({
                strengthA: clamp200(dv.getUint8(2)),
                strengthB: clamp200(dv.getUint8(3)),
              });
            }
          });
        } catch {}
      } else {
        const svc = await server.getPrimaryService(COYOTE2_SERVICE);
        this.c2Ab2 = await svc.getCharacteristic(COYOTE2_AB2_CHAR);
        this.c2A34 = await svc.getCharacteristic(COYOTE2_A34_CHAR);
        this.c2B34 = await svc.getCharacteristic(COYOTE2_B34_CHAR);
      }

      this.update({ status: "connected_ble", errorText: "" });
      this.startBlePump(version);
    } catch (err) {
      this.update({ status: "error", errorText: String(err) });
    }
  }

  private startBlePump(version: "ble3" | "ble2") {
    this.stopPumps();
    this.bleTimer = window.setInterval(() => {
      if (this.snap.status !== "connected_ble") return;
      const effA = this.snap.outputActive ? this.snap.strengthA : 0;
      const effB = this.snap.outputActive ? this.snap.strengthB : 0;
      const fA = buildWaveFrames(
        this.snap.waveA,
        this.stepOffset,
        1,
        this.snap.bpm,
      )[0];
      const fB = buildWaveFrames(
        this.snap.waveB,
        this.stepOffset,
        1,
        this.snap.bpm,
      )[0];
      this.stepOffset += 1;

      if (version === "ble3") {
        const pkt = new Uint8Array(20);
        pkt[0] = 0xb0;
        const seq = this.bleSeq & 0x0f;
        this.bleSeq = (this.bleSeq % 15) + 1;
        pkt[1] = (seq << 4) | 0x0f; // Set A & B absolute strength
        pkt[2] = clamp200(effA);
        pkt[3] = clamp200(effB);
        for (let i = 0; i < 4; i++) {
          pkt[4 + i] = effA > 0 ? fA.freqs[i] : 10;
          pkt[8 + i] = effA > 0 ? fA.amps[i] : 0;
          pkt[12 + i] = effB > 0 ? fB.freqs[i] : 10;
          pkt[16 + i] = effB > 0 ? fB.amps[i] : 0;
        }
        void writeBle(this.c3Write, pkt);
      } else {
        // Coyote 2.0: scale 0..200 -> 0..2047 (x7 capped at 2047)
        const rawA = Math.min(2047, effA * 7);
        const rawB = Math.min(2047, effB * 7);
        const abPacked = (rawA << 11) | rawB;
        const abBytes = new Uint8Array([
          abPacked & 0xff,
          (abPacked >> 8) & 0xff,
          (abPacked >> 16) & 0xff,
        ]);
        void writeBle(this.c2Ab2, abBytes);

        const to2Pack = (amp: number, freq: number) => {
          const z = Math.min(31, Math.max(0, Math.round((amp / 100) * 20)));
          const y = Math.min(1023, Math.max(10, Math.round(1000 / Math.max(10, freq))));
          const x = effA > 0 || effB > 0 ? 5 : 0;
          const v = (z << 15) | (y << 5) | x;
          return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]);
        };
        if (effA > 0) void writeBle(this.c2A34, to2Pack(fA.amps[0], fA.freqs[0]));
        if (effB > 0) void writeBle(this.c2B34, to2Pack(fB.amps[0], fB.freqs[0]));
      }
    }, 100);
  }

  private stopPumps() {
    if (this.socketPumpTimer) {
      window.clearInterval(this.socketPumpTimer);
      this.socketPumpTimer = null;
    }
    if (this.bleTimer) {
      window.clearInterval(this.bleTimer);
      this.bleTimer = null;
    }
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
      this.burstRestoreTimer = null;
    }
  }

  private sendV4ChannelTarget(ch: "A" | "B", next: number) {
    if (this.activeSocketVersion !== "v4" || this.snap.status !== "paired") {
      return;
    }
    const c = ch === "A" ? 0 : 1;
    this.forEachV4StimTarget((appClientId, dev) => {
      const known = this.v4KnownStrength.get(dev.slotId) ?? { a: 0, b: 0 };
      const prev = ch === "A" ? known.a : known.b;
      const updated = { ...known, ...(ch === "A" ? { a: next } : { b: next }) };
      this.v4KnownStrength.set(dev.slotId, updated);
      if (next <= 0) {
        this.sendV4Rpc(appClientId, "device.op", {
          s: dev.slotId,
          t: 7,
          c,
          p: 1,
          v: 0,
        });
      } else {
        const delta = next - prev;
        if (delta !== 0) {
          this.sendV4Rpc(appClientId, "device.op", {
            s: dev.slotId,
            t: 3,
            c,
            p: 1,
            v: delta,
          });
        }
      }
    });
  }

  private clearPairedPulseQueue() {
    if (this.snap.status !== "paired") return;
    if (this.activeSocketVersion === "v4") {
      for (const appClientId of this.v4Clients.keys()) {
        this.sendV4Rpc(appClientId, "device.op.clear");
      }
      return;
    }
    this.sendSocketMsg("clear-1");
    this.sendSocketMsg("clear-2");
  }

  disconnect() {
    this.stopPumps();
    if (this.ws) {
      try {
        this.ws.close(1000, "disconnect");
      } catch {}
      this.ws = null;
    }
    this.v4Clients.clear();
    this.v4PendingDevices.clear();
    this.v4KnownStrength.clear();
    this.bleDevice = null;
    this.c3Write = null;
    this.c2Ab2 = null;
    this.c2A34 = null;
    this.c2B34 = null;
    this.update({
      status: "disconnected",
      clientId: "",
      targetId: "",
      qrUrl: "",
      devices: [],
      activeSlotId: "",
      outputActive: false,
      errorText: "",
    });
  }

  setChannelStrength(ch: "A" | "B", val: number) {
    const cap =
      ch === "A"
        ? Math.min(this.snap.maxA, this.snap.appLimitA)
        : Math.min(this.snap.maxB, this.snap.appLimitB);
    const next = Math.max(0, Math.min(cap, Math.round(val)));

    if (ch === "A") {
      this.update({ strengthA: next });
      if (this.snap.status === "paired") {
        if (this.activeSocketVersion === "v4") {
          this.sendV4ChannelTarget("A", next);
        } else {
          this.sendSocketMsg(`strength-1+2+${next}`);
        }
      }
      if (this.snap.prefs.channelBLink) {
        const linkedB = Math.max(
          0,
          Math.min(this.snap.maxB, this.snap.appLimitB, next),
        );
        this.update({ strengthB: linkedB });
        if (this.snap.status === "paired") {
          if (this.activeSocketVersion === "v4") {
            this.sendV4ChannelTarget("B", linkedB);
          } else {
            this.sendSocketMsg(`strength-2+2+${linkedB}`);
          }
        }
      }
    } else {
      this.update({ strengthB: next });
      if (this.snap.status === "paired") {
        if (this.activeSocketVersion === "v4") {
          this.sendV4ChannelTarget("B", next);
        } else {
          this.sendSocketMsg(`strength-2+2+${next}`);
        }
      }
    }
  }

  stepChannelStrength(ch: "A" | "B", delta: number) {
    const cur = ch === "A" ? this.snap.strengthA : this.snap.strengthB;
    this.setChannelStrength(ch, cur + delta);
  }

  setWavePreset(wave: WavePresetKey, ch: "A" | "B" | "both" = "both") {
    this.update({
      ...(ch === "A" || ch === "both" ? { waveA: wave } : {}),
      ...(ch === "B" || ch === "both" ? { waveB: wave } : {}),
    }, true);
    this.clearPairedPulseQueue();
    if (buttplugManager.isConnected()) {
      buttplugManager.setWavePreset(wave);
    }
  }

  setOutputActive(active: boolean) {
    this.update({ outputActive: active });
    if (!active) {
      this.clearPairedPulseQueue();
    }
    if (buttplugManager.isConnected()) {
      buttplugManager.setOutputActive(active);
    }
  }

  emergencyStop() {
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
      this.burstRestoreTimer = null;
    }
    this.update({
      strengthA: 0,
      strengthB: 0,
      outputActive: false,
    });
    if (this.snap.status === "paired") {
      if (this.activeSocketVersion === "v4") {
        this.forEachV4StimTarget((appClientId, dev) => {
          this.v4KnownStrength.set(dev.slotId, { a: 0, b: 0 });
          this.sendV4Rpc(appClientId, "device.op", {
            s: dev.slotId,
            t: 7,
            c: 0,
            p: 2,
            v: 0,
          });
          this.sendV4Rpc(appClientId, "device.op", {
            s: dev.slotId,
            t: 7,
            c: 1,
            p: 2,
            v: 0,
          });
        });
        this.clearPairedPulseQueue();
      } else {
        this.sendSocketMsg("strength-1+2+0");
        this.sendSocketMsg("strength-2+2+0");
        this.sendSocketMsg("clear-1");
        this.sendSocketMsg("clear-2");
      }
    }
    buttplugManager.emergencyStop();
  }

  setRemotePercent(pct: number, bPct?: number) {
    const safePct = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.isDglabConnected()) {
      const capA = Math.min(this.snap.maxA, this.snap.appLimitA);
      const capB = Math.min(this.snap.maxB, this.snap.appLimitB);
      this.setOutputActive(safePct > 0);
      this.setChannelStrength("A", Math.round((capA * safePct) / 100));
      if (!this.snap.prefs.channelBLink) {
        const safeB = Math.max(0, Math.min(100, Math.round(bPct ?? safePct)));
        this.setChannelStrength("B", Math.round((capB * safeB) / 100));
      }
    }
    if (buttplugManager.isConnected()) {
      const bp = buttplugManager.getSnapshot();
      buttplugManager.setOutputActive(safePct > 0);
      buttplugManager.setIntensity(Math.round((bp.maxIntensity * safePct) / 100));
    }
  }

  getRemoteTelemetry(): {
    on: true;
    allowRemote: boolean;
    a: number;
    b: number;
    maxA: number;
    maxB: number;
    wave: WavePresetKey;
  } | null {
    if (this.isDglabConnected()) {
      return {
        on: true,
        allowRemote: this.snap.prefs.allowRemote,
        a: this.snap.strengthA,
        b: this.snap.strengthB,
        maxA: Math.min(this.snap.maxA, this.snap.appLimitA),
        maxB: Math.min(this.snap.maxB, this.snap.appLimitB),
        wave: this.snap.waveA,
      };
    }
    if (buttplugManager.isConnected()) {
      const bp = buttplugManager.getSnapshot();
      return {
        on: true,
        allowRemote: this.snap.prefs.allowRemote,
        a: bp.intensity,
        b: bp.intensity,
        maxA: bp.maxIntensity,
        maxB: bp.maxIntensity,
        wave: bp.wave,
      };
    }
    return null;
  }

  triggerBurst(wave: WavePresetKey, durationMs = 1500, boostPct = 70) {
    if (!this.isConnected()) return;
    buttplugManager.triggerBurst(wave, durationMs, boostPct);
    if (!this.isDglabConnected()) return;
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
    }
    const prevWaveA = this.snap.waveA;
    const prevWaveB = this.snap.waveB;
    const prevA = this.snap.strengthA;
    const prevB = this.snap.strengthB;
    const prevActive = this.snap.outputActive;

    const targetA = Math.round(
      (Math.min(this.snap.maxA, this.snap.appLimitA) * boostPct) / 100,
    );
    const targetB = Math.round(
      (Math.min(this.snap.maxB, this.snap.appLimitB) * boostPct) / 100,
    );

    this.update({
      waveA: wave,
      waveB: wave,
      outputActive: true,
    });
    this.setChannelStrength("A", targetA);
    if (!this.snap.prefs.channelBLink) {
      this.setChannelStrength("B", targetB);
    }

    if (this.snap.status === "paired") {
      const burstFrames = buildWaveFrames(wave, 0, 12, 160, 100).map(frameToV3Hex);
      if (this.activeSocketVersion === "v4") {
        this.clearPairedPulseQueue();
        this.forEachV4StimTarget((appClientId, dev) => {
          this.sendV4Rpc(appClientId, "device.op", {
            s: dev.slotId,
            t: 0,
            c: 0,
            p: 2,
            d: durationMs,
            im: true,
            v: burstFrames,
          });
          this.sendV4Rpc(appClientId, "device.op", {
            s: dev.slotId,
            t: 0,
            c: 1,
            p: 2,
            d: durationMs,
            im: true,
            v: burstFrames,
          });
        });
      } else {
        this.sendSocketMsg("clear-1");
        this.sendSocketMsg("clear-2");
        this.sendSocketMsg(`pulse-A:${JSON.stringify(burstFrames)}`);
        this.sendSocketMsg(`pulse-B:${JSON.stringify(burstFrames)}`);
      }
    }

    this.burstRestoreTimer = window.setTimeout(() => {
      this.burstRestoreTimer = null;
      this.update({
        waveA: prevWaveA,
        waveB: prevWaveB,
        outputActive: prevActive,
      });
      this.setChannelStrength("A", prevA);
      if (!this.snap.prefs.channelBLink) {
        this.setChannelStrength("B", prevB);
      }
    }, durationMs);
  }

  applyGameCue(cue: DglabGameCue) {
    if (!this.isConnected() || !this.snap.prefs.autoSync) return;

    buttplugManager.applyGameCue(cue, this.snap.prefs.zeroOnStop);
    if (!this.isDglabConnected()) return;

    if (!cue.active) {
      this.setOutputActive(false);
      this.setChannelStrength("A", 0);
      this.setChannelStrength("B", 0);
      return;
    }

    if (cue.mode === "stop" && this.snap.prefs.zeroOnStop) {
      this.update({ outputActive: false, bpm: cue.bpm ?? 60 });
      this.setChannelStrength("A", 0);
      this.setChannelStrength("B", 0);
      this.clearPairedPulseQueue();
      return;
    }

    const wave: WavePresetKey =
      cue.wave ??
      (cue.mode === "stroke"
        ? (cue.bpm ?? 90) >= 130
          ? "surge"
          : "metronome"
        : cue.mode === "slow"
          ? "tease"
          : cue.mode === "edge"
            ? "punish"
            : cue.mode === "ruin" || cue.mode === "denied"
              ? "ruin"
              : "finale");

    const pct =
      cue.intensityPct ??
      (cue.mode === "stroke"
        ? Math.min(90, 45 + Math.round(((cue.bpm ?? 90) - 60) / 4))
        : cue.mode === "slow"
          ? 35
          : cue.mode === "finale"
            ? 85
            : cue.mode === "edge"
              ? 75
              : 15);

    const effCapA = Math.min(this.snap.maxA, this.snap.appLimitA);
    const effCapB = Math.min(this.snap.maxB, this.snap.appLimitB);

    this.update({
      waveA: wave,
      waveB: wave,
      bpm: cue.bpm ?? 90,
      outputActive: true,
    });
    this.setChannelStrength("A", Math.round((effCapA * pct) / 100));
    if (!this.snap.prefs.channelBLink) {
      this.setChannelStrength("B", Math.round((effCapB * pct) / 100));
    }
  }
}

export const dglabManager = new DglabManager();

export function useDglab(): DglabSnapshot {
  return useSyncExternalStore(
    dglabManager.subscribe,
    dglabManager.getSnapshot,
    dglabManager.getSnapshot,
  );
}
