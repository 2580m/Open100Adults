"use client";

import { useSyncExternalStore } from "react";

import { buildWaveFrames, type WavePresetKey } from "@/data/dglabCopy";

export type ButtplugStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ButtplugActuator {
  cmd: "Scalar" | "Linear" | "Rotate";
  index: number;
  actuatorType: string;
  stepCount: number;
  descriptor: string;
}

export interface ButtplugDevice {
  index: number;
  name: string;
  displayName?: string;
  actuators: ButtplugActuator[];
  enabled: boolean;
  messageGapMs?: number;
}

export interface ButtplugSnapshot {
  status: ButtplugStatus;
  serverName: string;
  wsUrl: string;
  scanning: boolean;
  devices: ButtplugDevice[];
  intensity: number;
  maxIntensity: number;
  wave: WavePresetKey;
  outputActive: boolean;
  bpm: number;
  errorText: string;
}

export interface ButtplugGameCue {
  active: boolean;
  mode: "stroke" | "slow" | "stop" | "edge" | "finale" | "denied" | "ruin";
  bpm?: number;
  intensityPct?: number;
  wave?: WavePresetKey;
}

const STORAGE_KEY = "open100:buttplug-prefs";
const DEFAULT_WS_URL = "ws://127.0.0.1:12345";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseDevice(
  raw: Record<string, unknown>,
  disabledIds: Set<number>,
): ButtplugDevice | null {
  const index = raw.DeviceIndex;
  if (typeof index !== "number" || !Number.isFinite(index)) return null;
  const name =
    typeof raw.DeviceName === "string" && raw.DeviceName
      ? raw.DeviceName
      : `Device #${index}`;
  const displayName =
    typeof raw.DeviceDisplayName === "string" && raw.DeviceDisplayName
      ? raw.DeviceDisplayName
      : undefined;
  const messageGapMs =
    typeof raw.DeviceMessageTimingGap === "number"
      ? raw.DeviceMessageTimingGap
      : undefined;

  const actuators: ButtplugActuator[] = [];
  const msgs = isRecord(raw.DeviceMessages) ? raw.DeviceMessages : {};

  if (Array.isArray(msgs.ScalarCmd)) {
    msgs.ScalarCmd.forEach((item, i) => {
      if (!isRecord(item)) return;
      actuators.push({
        cmd: "Scalar",
        index: i,
        actuatorType:
          typeof item.ActuatorType === "string" ? item.ActuatorType : "Vibrate",
        stepCount: typeof item.StepCount === "number" ? item.StepCount : 20,
        descriptor:
          typeof item.FeatureDescriptor === "string"
            ? item.FeatureDescriptor
            : "",
      });
    });
  }

  if (Array.isArray(msgs.LinearCmd)) {
    msgs.LinearCmd.forEach((item, i) => {
      if (!isRecord(item)) return;
      actuators.push({
        cmd: "Linear",
        index: i,
        actuatorType:
          typeof item.ActuatorType === "string" ? item.ActuatorType : "Position",
        stepCount: typeof item.StepCount === "number" ? item.StepCount : 100,
        descriptor:
          typeof item.FeatureDescriptor === "string"
            ? item.FeatureDescriptor
            : "",
      });
    });
  }

  if (Array.isArray(msgs.RotateCmd)) {
    msgs.RotateCmd.forEach((item, i) => {
      if (!isRecord(item)) return;
      actuators.push({
        cmd: "Rotate",
        index: i,
        actuatorType:
          typeof item.ActuatorType === "string" ? item.ActuatorType : "Rotate",
        stepCount: typeof item.StepCount === "number" ? item.StepCount : 20,
        descriptor:
          typeof item.FeatureDescriptor === "string"
            ? item.FeatureDescriptor
            : "",
      });
    });
  }

  return {
    index,
    name,
    displayName,
    actuators,
    enabled: !disabledIds.has(index),
    messageGapMs,
  };
}

class ButtplugManager {
  private snap: ButtplugSnapshot = {
    status: "disconnected",
    serverName: "",
    wsUrl: DEFAULT_WS_URL,
    scanning: false,
    devices: [],
    intensity: 0,
    maxIntensity: 60,
    wave: "breathe",
    outputActive: false,
    bpm: 90,
    errorText: "",
  };

  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private msgId = 1;
  private pingTimer: number | null = null;
  private scalarTimer: number | null = null;
  private linearTimer: number | null = null;
  private burstRestoreTimer: number | null = null;
  private waveStep = 0;
  private linearTop = false;
  private sentIdleZero = true;
  private disabledDeviceIds = new Set<number>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    let savedUrl = DEFAULT_WS_URL;
    let savedMax = 60;
    let savedWave: WavePresetKey = "breathe";

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{
          wsUrl: string;
          maxIntensity: number;
          wave: WavePresetKey;
          disabledDeviceIds: number[];
        }>;
        if (typeof p.wsUrl === "string" && p.wsUrl.trim()) {
          savedUrl = p.wsUrl.trim();
        }
        if (typeof p.maxIntensity === "number") {
          savedMax = clamp100(p.maxIntensity);
        }
        if (p.wave) savedWave = p.wave;
        if (Array.isArray(p.disabledDeviceIds)) {
          this.disabledDeviceIds = new Set(
            p.disabledDeviceIds.filter((id) => typeof id === "number"),
          );
        }
      }
    } catch {}

    this.snap = {
      ...this.snap,
      wsUrl: savedUrl,
      maxIntensity: savedMax,
      wave: savedWave,
    };
    this.emit();
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          wsUrl: this.snap.wsUrl,
          maxIntensity: this.snap.maxIntensity,
          wave: this.snap.wave,
          disabledDeviceIds: [...this.disabledDeviceIds],
        }),
      );
    } catch {}
  }

  private update(patch: Partial<ButtplugSnapshot>, save = false) {
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

  getSnapshot = (): ButtplugSnapshot => this.snap;

  isConnected(): boolean {
    return this.snap.status === "connected";
  }

  setWsUrl(wsUrl: string) {
    this.update({ wsUrl }, true);
  }

  setMaxIntensity(val: number) {
    const nextMax = clamp100(val);
    const clampedIntensity = Math.min(this.snap.intensity, nextMax);
    this.update({ maxIntensity: nextMax, intensity: clampedIntensity }, true);
  }

  toggleDeviceEnabled(deviceIndex: number) {
    const currentlyDisabled = this.disabledDeviceIds.has(deviceIndex);
    if (currentlyDisabled) {
      this.disabledDeviceIds.delete(deviceIndex);
    } else {
      this.disabledDeviceIds.add(deviceIndex);
      if (this.snap.status === "connected") {
        this.sendMsg("StopDeviceCmd", { DeviceIndex: deviceIndex });
      }
    }
    const nextDevices = this.snap.devices.map((d) =>
      d.index === deviceIndex ? { ...d, enabled: currentlyDisabled } : d,
    );
    this.update({ devices: nextDevices }, true);
  }

  private sendMsg(name: string, payload: Record<string, unknown>): number | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return null;
    const id = this.msgId++;
    this.ws.send(JSON.stringify([{ [name]: { Id: id, ...payload } }]));
    return id;
  }

  connect() {
    this.disconnect();
    const target = this.snap.wsUrl.trim() || DEFAULT_WS_URL;
    if (!/^wss?:\/\//i.test(target)) {
      this.update({
        status: "error",
        errorText: "Invalid Intiface WebSocket URL (must start with ws:// or wss://)",
      });
      return;
    }

    this.update({
      status: "connecting",
      errorText: "",
      serverName: "",
      devices: [],
      scanning: false,
    });

    try {
      const ws = new WebSocket(target);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.sendMsg("RequestServerInfo", {
          ClientName: "Open100Adults",
          MessageVersion: 3,
        });
      };

      ws.onmessage = (ev) => {
        if (this.ws !== ws) return;
        let frames: unknown;
        try {
          frames = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (!Array.isArray(frames)) return;

        for (const frame of frames) {
          if (!isRecord(frame)) continue;

          if (isRecord(frame.ServerInfo)) {
            const info = frame.ServerInfo;
            const serverName =
              typeof info.ServerName === "string"
                ? info.ServerName
                : "Intiface Central";
            const maxPing =
              typeof info.MaxPingTime === "number" ? info.MaxPingTime : 0;

            if (this.pingTimer) {
              window.clearInterval(this.pingTimer);
              this.pingTimer = null;
            }
            if (maxPing > 0) {
              const pingMs = Math.max(250, Math.floor(maxPing / 2));
              this.pingTimer = window.setInterval(() => {
                this.sendMsg("Ping", {});
              }, pingMs);
            }

            this.update({
              status: "connected",
              serverName,
              errorText: "",
              scanning: true,
            });
            this.sendMsg("RequestDeviceList", {});
            this.sendMsg("StartScanning", {});
            this.startPumps();
            continue;
          }

          if (isRecord(frame.DeviceList) && Array.isArray(frame.DeviceList.Devices)) {
            const parsed = frame.DeviceList.Devices.filter(isRecord)
              .map((d) => parseDevice(d, this.disabledDeviceIds))
              .filter((d): d is ButtplugDevice => d !== null);
            this.update({ devices: parsed });
            continue;
          }

          if (isRecord(frame.DeviceAdded)) {
            const dev = parseDevice(frame.DeviceAdded, this.disabledDeviceIds);
            if (dev) {
              const without = this.snap.devices.filter(
                (d) => d.index !== dev.index,
              );
              this.update({ devices: [...without, dev] });
            }
            continue;
          }

          if (isRecord(frame.DeviceRemoved)) {
            const idx = frame.DeviceRemoved.DeviceIndex;
            if (typeof idx === "number") {
              this.update({
                devices: this.snap.devices.filter((d) => d.index !== idx),
              });
            }
            continue;
          }

          if (frame.ScanningFinished !== undefined) {
            this.update({ scanning: false });
            continue;
          }

          if (isRecord(frame.Error)) {
            const msg =
              typeof frame.Error.ErrorMessage === "string"
                ? frame.Error.ErrorMessage
                : "Buttplug server error";
            this.update({
              errorText: msg,
              ...(this.snap.status === "connecting" ? { status: "error" } : {}),
            });
          }
        }
      };

      ws.onerror = () => {
        if (this.ws !== ws) return;
        this.stopPumps();
        this.update({
          status: "error",
          errorText: "Could not reach Intiface Central WebSocket",
          outputActive: false,
          scanning: false,
        });
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.stopPumps();
        if (this.pingTimer) {
          window.clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        if (this.snap.status !== "error") {
          this.update({
            status: "disconnected",
            serverName: "",
            devices: [],
            scanning: false,
            outputActive: false,
          });
        }
      };
    } catch (err) {
      this.update({ status: "error", errorText: String(err) });
    }
  }

  disconnect() {
    this.stopPumps();
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
      this.burstRestoreTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.sendMsg("StopAllDevices", {});
        }
        this.ws.close(1000, "disconnect");
      } catch {}
      this.ws = null;
    }
    this.update({
      status: "disconnected",
      serverName: "",
      devices: [],
      scanning: false,
      outputActive: false,
      errorText: "",
    });
  }

  startScanning() {
    if (this.snap.status !== "connected") return;
    this.update({ scanning: true });
    this.sendMsg("StartScanning", {});
  }

  stopScanning() {
    if (this.snap.status !== "connected") return;
    this.update({ scanning: false });
    this.sendMsg("StopScanning", {});
  }

  private sendScalarAndRotate(level: number) {
    const safe = Math.max(0, Math.min(1, Math.round(level * 1000) / 1000));
    for (const dev of this.snap.devices) {
      if (!dev.enabled) continue;
      const scalars = dev.actuators.filter((a) => a.cmd === "Scalar");
      if (scalars.length > 0) {
        this.sendMsg("ScalarCmd", {
          DeviceIndex: dev.index,
          Scalars: scalars.map((a) => ({
            Index: a.index,
            Scalar: safe,
            ActuatorType: a.actuatorType,
          })),
        });
      }
      const rotators = dev.actuators.filter((a) => a.cmd === "Rotate");
      if (rotators.length > 0) {
        this.sendMsg("RotateCmd", {
          DeviceIndex: dev.index,
          Rotations: rotators.map((a) => ({
            Index: a.index,
            Speed: safe,
            Clockwise: true,
          })),
        });
      }
    }
  }

  private scheduleLinearStroke() {
    if (this.linearTimer) {
      window.clearTimeout(this.linearTimer);
      this.linearTimer = null;
    }
    if (
      this.snap.status !== "connected" ||
      !this.snap.outputActive ||
      this.snap.intensity <= 0
    ) {
      return;
    }

    const linearDevices = this.snap.devices.filter(
      (d) => d.enabled && d.actuators.some((a) => a.cmd === "Linear"),
    );
    if (linearDevices.length === 0) return;

    const safeBpm = Math.max(40, Math.min(300, this.snap.bpm || 90));
    const halfBeatMs = Math.max(180, Math.min(1500, Math.round(30000 / safeBpm)));
    const effRatio =
      Math.min(this.snap.intensity, this.snap.maxIntensity) / 100;
    this.linearTop = !this.linearTop;
    const targetPos = this.linearTop
      ? Math.min(0.95, 0.05 + 0.9 * effRatio)
      : 0.05;

    for (const dev of linearDevices) {
      const linears = dev.actuators.filter((a) => a.cmd === "Linear");
      this.sendMsg("LinearCmd", {
        DeviceIndex: dev.index,
        Vectors: linears.map((a) => ({
          Index: a.index,
          Duration: halfBeatMs,
          Position: Math.round(targetPos * 1000) / 1000,
        })),
      });
    }

    this.linearTimer = window.setTimeout(() => {
      this.scheduleLinearStroke();
    }, halfBeatMs);
  }

  private startPumps() {
    this.stopPumps();
    this.sentIdleZero = false;

    this.scalarTimer = window.setInterval(() => {
      if (this.snap.status !== "connected") return;
      const eff =
        this.snap.outputActive && this.snap.intensity > 0
          ? Math.min(this.snap.intensity, this.snap.maxIntensity) / 100
          : 0;
      if (eff <= 0) {
        if (!this.sentIdleZero) {
          this.sendScalarAndRotate(0);
          this.sentIdleZero = true;
        }
        return;
      }
      this.sentIdleZero = false;
      const frame = buildWaveFrames(
        this.snap.wave,
        this.waveStep,
        1,
        this.snap.bpm,
        100,
      )[0];
      this.waveStep += 2;
      const env = (frame?.amps[0] ?? 100) / 100;
      const cap = this.snap.maxIntensity / 100;
      const level = Math.max(0.05, Math.min(cap, eff * env));
      this.sendScalarAndRotate(level);
    }, 200);

    this.scheduleLinearStroke();
  }

  private stopPumps() {
    if (this.scalarTimer) {
      window.clearInterval(this.scalarTimer);
      this.scalarTimer = null;
    }
    if (this.linearTimer) {
      window.clearTimeout(this.linearTimer);
      this.linearTimer = null;
    }
  }

  setIntensity(val: number) {
    const next = Math.max(0, Math.min(this.snap.maxIntensity, Math.round(val)));
    const prevActive = this.snap.outputActive;
    const nextActive = next > 0 ? prevActive : false;
    this.update({ intensity: next, outputActive: nextActive });
    if (next <= 0 && this.snap.status === "connected") {
      this.sendScalarAndRotate(0);
      this.sentIdleZero = true;
      if (this.linearTimer) {
        window.clearTimeout(this.linearTimer);
        this.linearTimer = null;
      }
    } else if (next > 0 && nextActive && !this.linearTimer) {
      this.scheduleLinearStroke();
    }
  }

  setWavePreset(wave: WavePresetKey) {
    this.update({ wave }, true);
  }

  setOutputActive(active: boolean) {
    this.update({ outputActive: active });
    if (this.snap.status !== "connected") return;
    if (!active) {
      this.sendScalarAndRotate(0);
      this.sentIdleZero = true;
      this.sendMsg("StopAllDevices", {});
      if (this.linearTimer) {
        window.clearTimeout(this.linearTimer);
        this.linearTimer = null;
      }
    } else if (!this.linearTimer) {
      this.scheduleLinearStroke();
    }
  }

  emergencyStop() {
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
      this.burstRestoreTimer = null;
    }
    this.update({ intensity: 0, outputActive: false });
    if (this.linearTimer) {
      window.clearTimeout(this.linearTimer);
      this.linearTimer = null;
    }
    if (this.snap.status === "connected") {
      this.sendScalarAndRotate(0);
      this.sentIdleZero = true;
      this.sendMsg("StopAllDevices", {});
    }
  }

  triggerBurst(wave: WavePresetKey, durationMs = 1500, boostPct = 70) {
    if (!this.isConnected()) return;
    if (this.burstRestoreTimer) {
      window.clearTimeout(this.burstRestoreTimer);
    }
    const prevWave = this.snap.wave;
    const prevIntensity = this.snap.intensity;
    const prevActive = this.snap.outputActive;
    const target = Math.round((this.snap.maxIntensity * boostPct) / 100);

    this.update({
      wave,
      intensity: target,
      outputActive: target > 0,
    });
    if (target > 0) {
      this.sendScalarAndRotate(target / 100);
      this.scheduleLinearStroke();
    }

    this.burstRestoreTimer = window.setTimeout(() => {
      this.burstRestoreTimer = null;
      this.update({
        wave: prevWave,
        intensity: prevIntensity,
        outputActive: prevActive,
      });
      if (!prevActive || prevIntensity <= 0) {
        this.sendScalarAndRotate(0);
        this.sendMsg("StopAllDevices", {});
      }
    }, durationMs);
  }

  applyGameCue(cue: ButtplugGameCue, zeroOnStop = true) {
    if (!this.isConnected()) return;

    if (!cue.active || (cue.mode === "stop" && zeroOnStop)) {
      this.update({
        outputActive: false,
        intensity: 0,
        bpm: cue.bpm ?? this.snap.bpm,
      });
      if (this.linearTimer) {
        window.clearTimeout(this.linearTimer);
        this.linearTimer = null;
      }
      this.sendScalarAndRotate(0);
      this.sentIdleZero = true;
      this.sendMsg("StopAllDevices", {});
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

    const target = Math.round((this.snap.maxIntensity * pct) / 100);
    const wasActive = this.snap.outputActive;
    this.update({
      wave,
      bpm: cue.bpm ?? 90,
      intensity: target,
      outputActive: target > 0,
    });
    if (target > 0 && !wasActive) {
      this.scheduleLinearStroke();
    }
  }
}

export const buttplugManager = new ButtplugManager();

export function useButtplug(): ButtplugSnapshot {
  return useSyncExternalStore(
    buttplugManager.subscribe,
    buttplugManager.getSnapshot,
    buttplugManager.getSnapshot,
  );
}
