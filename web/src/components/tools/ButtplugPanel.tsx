"use client";

import { useState } from "react";

import {
  DGLAB_COPY,
  WAVE_NAMES,
  WAVE_PRESET_KEYS,
  type WavePresetKey,
} from "@/data/dglabCopy";
import type { Locale } from "@/data/tools";
import { buttplugManager, useButtplug } from "@/lib/buttplug";
import { dglabManager, useDglab } from "@/lib/dglab";

export function ButtplugPanel({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const copy = DGLAB_COPY[locale];
  const waveLabels = WAVE_NAMES[locale];
  const bp = useButtplug();
  const dglab = useDglab();
  const [open, setOpen] = useState(!compact);
  const connected = bp.status === "connected";

  const statusText =
    bp.status === "connected"
      ? locale === "zh"
        ? "Intiface 已连接"
        : "Intiface connected"
      : bp.status === "connecting"
        ? copy.buttplugConnecting
        : bp.status === "error"
          ? copy.status.error
          : copy.status.disconnected;

  const statusTone = connected
    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
    : bp.status === "connecting"
      ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
      : bp.status === "error"
        ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
        : "border-card-border bg-card-bg text-muted-strong";

  return (
    <div
      data-buttplug-panel
      className="rounded-2xl border border-card-border bg-card-bg p-4 text-left"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">
              {compact ? "Buttplug.io" : "Buttplug.io / Intiface Central"}
            </p>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusTone}`}
              data-buttplug-status={bp.status}
            >
              {connected ? "● " : ""}
              {statusText}
              {connected ? ` · ${bp.devices.length} · ${bp.intensity}%` : ""}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {locale === "zh"
              ? "Intiface Central · 750+ 通用玩具"
              : "Intiface Central · 750+ Toys"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {connected && (
            <button
              type="button"
              onClick={() => buttplugManager.emergencyStop()}
              className="cursor-pointer rounded-full border border-rose-500/60 bg-rose-600/25 px-3 py-1 text-xs font-extrabold text-rose-200 hover:bg-rose-600/40"
              data-buttplug-estop
            >
              {locale === "zh" ? "急停" : "E-Stop"}
            </button>
          )}
          {compact && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-card-border px-3 py-1 text-xs font-bold text-foreground transition-all duration-200 hover:border-accent active:scale-95"
              data-buttplug-toggle
            >
              <span>{open ? copy.collapse : copy.expand}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          open
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`space-y-5 border-t border-card-border pt-4 transition-transform duration-300 ease-out ${
              open ? "translate-y-0" : "-translate-y-1.5"
            }`}
          >

      {/* Connection Box */}
      <div className="space-y-3 rounded-xl border border-card-border bg-background/40 p-3.5">
        <p className="text-xs leading-relaxed text-muted-strong">
          {copy.buttplugLead}
        </p>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted">
            {copy.buttplugWsLabel}
          </label>
          <input
            type="text"
            value={bp.wsUrl}
            onChange={(e) => buttplugManager.setWsUrl(e.target.value)}
            placeholder="ws://127.0.0.1:12345"
            data-buttplug-ws
            className="w-full rounded-xl border border-card-border bg-card-bg px-3 py-2 text-xs font-mono text-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <button
                type="button"
                onClick={() => buttplugManager.disconnect()}
                className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-rose-400"
              >
                {copy.disconnect}
              </button>
              <button
                type="button"
                onClick={() =>
                  bp.scanning
                    ? buttplugManager.stopScanning()
                    : buttplugManager.startScanning()
                }
                data-buttplug-scan
                className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold"
              >
                {bp.scanning ? copy.buttplugScanning : copy.buttplugScan}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={bp.status === "connecting"}
              onClick={() => buttplugManager.connect()}
              data-buttplug-connect
              className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              {bp.status === "connecting"
                ? copy.buttplugConnecting
                : copy.buttplugConnect}
            </button>
          )}
        </div>

        {bp.errorText && (
          <p className="text-xs font-semibold text-rose-300">{bp.errorText}</p>
        )}

        {connected && (
          <div
            className="space-y-2 border-t border-card-border pt-2.5"
            data-buttplug-devices
          >
            {bp.devices.length === 0 ? (
              <p className="text-xs text-amber-200/90">
                {copy.buttplugNoDevices}
              </p>
            ) : (
              <div className="space-y-2">
                {bp.devices.map((dev) => {
                  const cmdKinds = Array.from(
                    new Set(dev.actuators.map((a) => a.cmd)),
                  );
                  return (
                    <div
                      key={dev.index}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card-bg/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {dev.displayName || dev.name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cmdKinds.map((cmd) => (
                            <span
                              key={cmd}
                              className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent"
                            >
                              {copy.buttplugCmds[cmd]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          buttplugManager.toggleDeviceEnabled(dev.index)
                        }
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          dev.enabled
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-card-border text-muted"
                        }`}
                      >
                        {dev.enabled
                          ? copy.buttplugEnabled
                          : copy.buttplugPaused}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output Intensity & Safety Cap */}
      <div className="space-y-2 rounded-xl border border-card-border bg-background/30 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold text-foreground">
            {copy.buttplugIntensity}
          </span>
          <span className="text-lg font-extrabold tabular-nums text-accent">
            {bp.intensity}%
            <span className="ml-1 text-[11px] font-normal text-muted">
              / {bp.maxIntensity}%
            </span>
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${Math.min(100, Math.round((bp.intensity / Math.max(1, bp.maxIntensity)) * 100))}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[-10, -5, 5, 10].map((delta) => (
            <button
              key={delta}
              type="button"
              disabled={!connected}
              onClick={() => buttplugManager.setIntensity(bp.intensity + delta)}
              className="flex-1 cursor-pointer rounded-lg border border-card-border py-1 text-xs font-bold text-foreground hover:border-accent disabled:opacity-40"
            >
              {delta > 0 ? `+${delta}%` : `${delta}%`}
            </button>
          ))}
          <button
            type="button"
            disabled={!connected}
            onClick={() => buttplugManager.setIntensity(0)}
            className="cursor-pointer rounded-lg border border-card-border px-2.5 py-1 text-xs font-bold text-muted-strong hover:text-foreground disabled:opacity-40"
          >
            0
          </button>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>
              {copy.buttplugMaxCap}:{" "}
              <b className="text-foreground">{bp.maxIntensity}%</b>
            </span>
            {bp.serverName && (
              <span className="truncate text-emerald-300">
                {bp.serverName}
              </span>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={bp.maxIntensity}
            onChange={(e) =>
              buttplugManager.setMaxIntensity(Number(e.target.value))
            }
            className="mt-1 w-full accent-[var(--accent)]"
          />
        </div>
      </div>

      {/* Waveform Presets & Output Controls */}
      <div className="space-y-2.5">
        <span className="block text-xs font-bold text-foreground">
          {copy.waveLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WAVE_PRESET_KEYS.map((wk: WavePresetKey) => (
            <button
              key={wk}
              type="button"
              onClick={() => buttplugManager.setWavePreset(wk)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                bp.wave === wk
                  ? "border-accent bg-accent text-white"
                  : "border-card-border text-muted-strong hover:text-foreground"
              }`}
            >
              {waveLabels[wk]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={!connected}
            onClick={() => buttplugManager.setOutputActive(!bp.outputActive)}
            className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bp.outputActive ? copy.pauseOutput : copy.startOutput}
          </button>
          <button
            type="button"
            disabled={!connected}
            onClick={() => buttplugManager.triggerBurst(bp.wave, 1500, 70)}
            className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent disabled:opacity-40"
          >
            {copy.testPulse}
          </button>
          <button
            type="button"
            onClick={() => buttplugManager.emergencyStop()}
            className="ml-auto cursor-pointer rounded-xl border border-rose-500/60 bg-rose-600/20 px-4 py-2 text-xs font-extrabold text-rose-200 hover:bg-rose-600/40"
          >
            {locale === "zh" ? "紧急停止 (Stop All)" : "Stop All Devices"}
          </button>
        </div>
      </div>

      {/* Shared Gameplay Sync Preferences */}
      <div className="space-y-1.5 rounded-xl border border-card-border bg-background/30 p-3">
        <p className="text-xs font-bold text-foreground">{copy.prefsTitle}</p>
        {(
          ["autoSync", "allowRemote", "zeroOnStop", "edgeShock"] as const
        ).map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between gap-3 py-1 text-xs text-muted-strong"
          >
            <span>{copy.prefs[key]}</span>
            <input
              type="checkbox"
              checked={dglab.prefs[key]}
              onChange={(e) =>
                dglabManager.setPrefs({ [key]: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
        ))}
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
