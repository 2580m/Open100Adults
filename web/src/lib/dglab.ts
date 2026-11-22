"use client";

import { useSyncExternalStore } from "react";

import {
  buildWaveFrames,
  frameToV3Hex,
  type WavePresetKey,
} from "@/data/dglabCopy";
import { IS_STATIC_EXPORT } from "@/data/tools";

export type DglabTransportMode = "socket" | "ble3" | "ble2";
export type DglabWsEndpointMode = "auto" | "lan" | "custom";
export type DglabConnectionStatus =
  | "disconnected"
  | "waiting_qr"
  | "paired"
  | "connecting_ble"
  | "connected_ble"
  | "error";

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

class DglabManager {
  private snap: DglabSnapshot;
  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
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
      mode: IS_STATIC_EXPORT ? "ble3" : "socket",
      status: "disconnected",
      errorText: "",
      clientId: "",
      targetId: "",
      qrUrl: "",
      wsEndpointMode: "auto",
      customWsUrl: "",
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
        if (p.wsEndpointMode) savedEndpointMode = p.wsEndpointMode;
        if (typeof p.customWsUrl === "string") savedCustomWs = p.customWsUrl;
        if (p.mode && (!IS_STATIC_EXPORT || p.mode !== "socket")) {
          savedMode = p.mode;
        }
        if (p.prefs && typeof p.prefs === "object") {
          savedPrefs = { ...DEFAULT_PREFS, ...p.prefs };
        }
      }
    } catch {}

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

  isConnected(): boolean {
    return (
      this.snap.status === "paired" || this.snap.status === "connected_ble"
    );
  }

  setMode(mode: DglabTransportMode) {
    this.disconnect();
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

  private resolveSocketUrl(): string | null {
    if (this.snap.wsEndpointMode === "custom") {
      const clean = this.snap.customWsUrl.trim().replace(/\/+$/, "");
      if (!/^wss?:\/\//i.test(clean)) return null;
      return clean;
    }
    if (typeof window === "undefined") return null;
    if (IS_STATIC_EXPORT && this.snap.wsEndpointMode !== "lan") return null;

    const w = window as unknown as { __OPEN100_PUBLIC_ORIGIN__?: string };
    const httpOrigin =
      this.snap.wsEndpointMode === "auto" && w.__OPEN100_PUBLIC_ORIGIN__
        ? w.__OPEN100_PUBLIC_ORIGIN__
        : window.location.origin;
    const wsOrigin = httpOrigin
      .replace(/^https:/i, "wss:")
      .replace(/^http:/i, "ws:")
      .replace(/\/+$/, "");
    return `${wsOrigin}/dglab-ws`;
  }

  async connectSocket() {
    this.disconnect();
    const baseWs = this.resolveSocketUrl();
    if (!baseWs) {
      this.update({
        status: "error",
        errorText: "Missing valid WebSocket relay URL",
      });
      return;
    }

    // Refresh public origin first in auto mode so Cloudflare Tunnel URL is up to date
    if (this.snap.wsEndpointMode === "auto" && !IS_STATIC_EXPORT) {
      try {
        const res = await fetch("/api/rgate/public-url", { cache: "no-store" });
        const j = (await res.json()) as { publicOrigin?: string };
        if (j?.publicOrigin) {
          (
            window as unknown as { __OPEN100_PUBLIC_ORIGIN__?: string }
          ).__OPEN100_PUBLIC_ORIGIN__ = j.publicOrigin;
        }
      } catch {}
    }

    const finalWsBase = this.resolveSocketUrl() || baseWs;
    this.update({ status: "waiting_qr", errorText: "", clientId: "", targetId: "", qrUrl: "" });

    try {
      const ws = new WebSocket(finalWsBase);
      this.ws = ws;

      ws.onmessage = (ev) => {
        if (this.ws !== ws) return;
        let msg: {
          type?: string;
          clientId?: string;
          targetId?: string;
          message?: string;
        };
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }

        if (msg.type === "bind") {
          if (msg.message === "targetId" && msg.clientId) {
            const cId = msg.clientId;
            const qrTarget = `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${finalWsBase}/${cId}`;
            this.update({
              clientId: cId,
              qrUrl: qrTarget,
              status: "waiting_qr",
            });
            return;
          }
          if (msg.message === "200" && msg.clientId && msg.targetId) {
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
        if (this.ws !== ws) return;
        this.stopPumps();
        this.update({
          status: "error",
          errorText: "WebSocket connection failed",
          outputActive: false,
        });
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.stopPumps();
        if (this.snap.status !== "error") {
          this.update({
            status: "disconnected",
            targetId: "",
            qrUrl: "",
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

  disconnect() {
    this.stopPumps();
    if (this.ws) {
      try {
        this.ws.close(1000, "disconnect");
      } catch {}
      this.ws = null;
    }
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
        this.sendSocketMsg(`strength-1+2+${next}`);
      }
      if (this.snap.prefs.channelBLink) {
        const linkedB = Math.max(
          0,
          Math.min(this.snap.maxB, this.snap.appLimitB, next),
        );
        this.update({ strengthB: linkedB });
        if (this.snap.status === "paired") {
          this.sendSocketMsg(`strength-2+2+${linkedB}`);
        }
      }
    } else {
      this.update({ strengthB: next });
      if (this.snap.status === "paired") {
        this.sendSocketMsg(`strength-2+2+${next}`);
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
    if (this.snap.status === "paired") {
      this.sendSocketMsg("clear-1");
      this.sendSocketMsg("clear-2");
    }
  }

  setOutputActive(active: boolean) {
    this.update({ outputActive: active });
    if (!active && this.snap.status === "paired") {
      this.sendSocketMsg("clear-1");
      this.sendSocketMsg("clear-2");
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
      this.sendSocketMsg("strength-1+2+0");
      this.sendSocketMsg("strength-2+2+0");
      this.sendSocketMsg("clear-1");
      this.sendSocketMsg("clear-2");
    }
  }

  triggerBurst(wave: WavePresetKey, durationMs = 1500, boostPct = 70) {
    if (!this.isConnected()) return;
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
      this.sendSocketMsg("clear-1");
      this.sendSocketMsg("clear-2");
      const burstFrames = buildWaveFrames(wave, 0, 12, 160, 100).map(frameToV3Hex);
      this.sendSocketMsg(`pulse-A:${JSON.stringify(burstFrames)}`);
      this.sendSocketMsg(`pulse-B:${JSON.stringify(burstFrames)}`);
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
      if (this.snap.status === "paired") {
        this.sendSocketMsg("clear-1");
        this.sendSocketMsg("clear-2");
      }
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
