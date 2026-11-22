"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { copyTextToClipboard } from "@/components/tools/RemoteShared";
import {
  DGLAB_COPY,
  WAVE_NAMES,
  WAVE_PRESET_KEYS,
  type WavePresetKey,
} from "@/data/dglabCopy";
import { IS_STATIC_EXPORT, type Locale } from "@/data/tools";
import { buttplugManager, useButtplug } from "@/lib/buttplug";
import { dglabManager, useDglab } from "@/lib/dglab";

export function DglabPanel({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const copy = DGLAB_COPY[locale];
  const waveLabels = WAVE_NAMES[locale];
  const snap = useDglab();
  const bp = useButtplug();

  const [open, setOpen] = useState(!compact);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const connected =
    snap.status === "paired" || snap.status === "connected_ble";
  const bpConnected = bp.status === "connected";
  const anyConnected = connected || bpConnected;

  useEffect(() => {
    let active = true;
    if (!snap.qrUrl) {
      setQrSvg("");
      return;
    }
    void QRCode.toString(snap.qrUrl, {
      type: "svg",
      margin: 1,
      width: 220,
      color: { dark: "#130c16", light: "#ffffff" },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {
        if (active) setQrSvg("");
      });
    return () => {
      active = false;
    };
  }, [snap.qrUrl]);

  const statusTone = connected
    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
    : snap.status === "waiting_qr" || snap.status === "connecting_ble"
      ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
      : snap.status === "error"
        ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
        : "border-card-border bg-card-bg text-muted-strong";

  return (
    <div
      data-dglab-panel
      className="rounded-2xl border border-card-border bg-card-bg p-4 text-left"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">
              {copy.cardTitle}
            </p>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusTone}`}
              data-dglab-status={snap.status}
            >
              {connected ? "● " : ""}
              {copy.status[snap.status]}
              {connected ? ` · A:${snap.strengthA} / B:${snap.strengthB}` : ""}
            </span>
            {bpConnected && (
              <span
                className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300"
                data-buttplug-status="connected"
              >
                ● Buttplug · {bp.devices.length} · {bp.intensity}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">{copy.cardSub}</p>
        </div>

        <div className="flex items-center gap-2">
          {anyConnected && (
            <button
              type="button"
              onClick={() => dglabManager.emergencyStop()}
              className="cursor-pointer rounded-full border border-rose-500/60 bg-rose-600/25 px-3 py-1 text-xs font-extrabold text-rose-200 hover:bg-rose-600/40"
              data-dglab-estop
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
              data-dglab-toggle
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
          {/* Transport Mode Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["socket4", copy.tabSocket4],
                ["socket", copy.tabSocket3],
                ["ble3", copy.tabBle3],
                ["ble2", copy.tabBle2],
                ["buttplug", copy.tabButtplug],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => dglabManager.setMode(m)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                  snap.mode === m
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-card-border text-muted-strong hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Connection Section */}
          {snap.mode === "socket4" || snap.mode === "socket" ? (
            <div className="space-y-3 rounded-xl border border-card-border bg-background/40 p-3.5">
              <p className="text-xs leading-relaxed text-muted-strong">
                {snap.mode === "socket4" ? copy.socket4Lead : copy.socketLead}
              </p>

              {IS_STATIC_EXPORT && snap.wsEndpointMode === "lan" && (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  {copy.staticSocketWarn}
                </p>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-muted">
                  {copy.wsModeLabel}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["auto", "official", "lan", "custom"] as const).map((wm) => (
                    <button
                      key={wm}
                      type="button"
                      onClick={() => dglabManager.setWsConfig(wm)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        snap.wsEndpointMode === wm
                          ? "border-accent bg-accent text-white"
                          : "border-card-border text-muted-strong"
                      }`}
                    >
                      {copy.wsModes[wm]}
                    </button>
                  ))}
                </div>
                {snap.wsEndpointMode === "custom" && (
                  <input
                    type="text"
                    value={snap.customWsUrl}
                    onChange={(e) =>
                      dglabManager.setWsConfig("custom", e.target.value)
                    }
                    placeholder={copy.customWsPlaceholder}
                    className="w-full rounded-xl border border-card-border bg-card-bg px-3 py-2 text-xs font-mono text-foreground"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {snap.status === "waiting_qr" || snap.status === "paired" ? (
                  <button
                    type="button"
                    onClick={() => dglabManager.disconnect()}
                    className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-rose-400"
                  >
                    {copy.disconnect}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void dglabManager.connectSocket()}
                    className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold"
                    data-dglab-connect-socket
                  >
                    {copy.connectSocket}
                  </button>
                )}
              </div>

              {snap.qrUrl && (
                <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
                  {qrSvg && (
                    <div
                      className="shrink-0 overflow-hidden rounded-xl border border-card-border bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs leading-relaxed text-muted-strong">
                      {copy.qrHint}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void copyTextToClipboard(snap.qrUrl).then((ok) => {
                            if (ok) {
                              setCopiedUrl(true);
                              window.setTimeout(() => setCopiedUrl(false), 2000);
                            }
                          });
                        }}
                        className="rpri cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
                      >
                        {copiedUrl ? copy.copied : copy.copySocketUrl}
                      </button>
                      {snap.targetId && (
                        <span className="truncate text-[11px] font-mono text-emerald-300">
                          ID: {snap.targetId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {snap.mode === "socket4" && snap.status === "paired" && (
                <div
                  className="space-y-1.5 border-t border-card-border pt-2.5"
                  data-dglab-v4-devices
                >
                  <p className="text-[11px] font-bold text-muted">
                    {copy.devicesTitle}
                  </p>
                  {snap.devices.length === 0 ? (
                    <p className="text-xs text-amber-200/90">
                      {copy.noV4Devices}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {snap.devices.map((dev) => {
                        const typeLabel =
                          copy.deviceTypes[
                            dev.type as keyof typeof copy.deviceTypes
                          ] ?? dev.type;
                        return (
                          <span
                            key={dev.slotId}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              dev.hasDevice
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                : "border-card-border text-muted"
                            }`}
                          >
                            <span>{dev.name || typeLabel}</span>
                            <span className="text-muted">({typeLabel})</span>
                            {dev.power !== undefined && (
                              <span className="tabular-nums text-accent">
                                {Math.round(dev.power)}%
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : snap.mode === "buttplug" ? (
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
                {bpConnected ? (
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
                <p className="text-xs font-semibold text-rose-300">
                  {bp.errorText}
                </p>
              )}

              {bpConnected && (
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

              {/* Buttplug Safety Limit & Manual Output Intensity */}
              <div className="space-y-2 rounded-xl border border-card-border bg-background/30 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {copy.buttplugIntensity}
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-accent">
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
                      disabled={!bpConnected}
                      onClick={() =>
                        buttplugManager.setIntensity(bp.intensity + delta)
                      }
                      className="flex-1 cursor-pointer rounded-lg border border-card-border py-1 text-xs font-bold text-foreground hover:border-accent disabled:opacity-40"
                    >
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={!bpConnected}
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
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-card-border bg-background/40 p-3.5">
              <p className="text-xs leading-relaxed text-muted-strong">
                {copy.bleLead}
              </p>
              {!snap.secureContext ? (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  {copy.bleInsecureWarn}
                </p>
              ) : !snap.bleSupported ? (
                <p className="rounded-lg border border-card-border px-3 py-2 text-xs text-muted">
                  {copy.bleUnsupported}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {snap.status === "connected_ble" ? (
                  <button
                    type="button"
                    onClick={() => dglabManager.disconnect()}
                    className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-rose-400"
                  >
                    {copy.disconnect}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!snap.bleSupported || !snap.secureContext}
                    onClick={() =>
                      void dglabManager.connectBle(
                        snap.mode === "ble2" ? "ble2" : "ble3",
                      )
                    }
                    className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                    data-dglab-connect-ble
                  >
                    {snap.mode === "ble2" ? copy.connectBle2 : copy.connectBle3}
                  </button>
                )}
              </div>
            </div>
          )}

          {snap.errorText && snap.mode !== "buttplug" && (
            <p className="text-xs font-semibold text-rose-300">
              {snap.errorText}
            </p>
          )}

          {/* Dual Channel Controls + Safety Caps */}
          {snap.mode !== "buttplug" && (
          <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  ch: "A" as const,
                  label: copy.channelA,
                  val: snap.strengthA,
                  max: snap.maxA,
                  appMax: snap.appLimitA,
                },
                {
                  ch: "B" as const,
                  label: copy.channelB,
                  val: snap.strengthB,
                  max: snap.maxB,
                  appMax: snap.appLimitB,
                },
              ] as const
            ).map((item) => {
              const effectiveCap = Math.min(item.max, item.appMax);
              return (
                <div
                  key={item.ch}
                  className="space-y-2 rounded-xl border border-card-border bg-background/30 p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {item.label}
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-accent">
                      {item.val}
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        / {effectiveCap}
                      </span>
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((item.val / Math.max(1, effectiveCap)) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[-5, -1, 1, 5].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        disabled={!connected}
                        onClick={() =>
                          dglabManager.stepChannelStrength(item.ch, delta)
                        }
                        className="flex-1 cursor-pointer rounded-lg border border-card-border py-1 text-xs font-bold text-foreground hover:border-accent disabled:opacity-40"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!connected}
                      onClick={() => dglabManager.setChannelStrength(item.ch, 0)}
                      className="cursor-pointer rounded-lg border border-card-border px-2.5 py-1 text-xs font-bold text-muted-strong hover:text-foreground disabled:opacity-40"
                    >
                      0
                    </button>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>
                        {copy.localCap}: <b className="text-foreground">{item.max}</b>
                      </span>
                      {(snap.mode === "socket4" || snap.mode === "socket") && (
                        <span>
                          {copy.appMax}: {item.appMax}
                        </span>
                      )}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={item.max}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (item.ch === "A") {
                          dglabManager.setLimits(n, snap.maxB);
                        } else {
                          dglabManager.setLimits(snap.maxA, n);
                        }
                      }}
                      className="mt-1 w-full accent-[var(--accent)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">{copy.capHint}</p>
          </>
          )}

          {/* Waveform Presets & Output Controls */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">
                {copy.waveLabel}
              </span>
              {snap.lastFeedback && Date.now() - snap.lastFeedback.at < 10000 && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
                  {copy.feedbackGot.replace(
                    "{n}",
                    String(snap.lastFeedback.index + 1),
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WAVE_PRESET_KEYS.map((wk: WavePresetKey) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => dglabManager.setWavePreset(wk, "both")}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${
                    snap.waveA === wk
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
                disabled={!anyConnected}
                onClick={() =>
                  dglabManager.setOutputActive(
                    !(snap.outputActive || bp.outputActive),
                  )
                }
                className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {snap.outputActive || bp.outputActive
                  ? copy.pauseOutput
                  : copy.startOutput}
              </button>
              <button
                type="button"
                disabled={!anyConnected}
                onClick={() => dglabManager.triggerBurst(snap.waveA, 1500, 70)}
                className="cursor-pointer rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-foreground hover:border-accent disabled:opacity-40"
              >
                {copy.testPulse}
              </button>
              <button
                type="button"
                onClick={() => dglabManager.emergencyStop()}
                className="ml-auto cursor-pointer rounded-xl border border-rose-500/60 bg-rose-600/20 px-4 py-2 text-xs font-extrabold text-rose-200 hover:bg-rose-600/40"
              >
                {copy.emergencyStop}
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-1.5 rounded-xl border border-card-border bg-background/30 p-3">
            <p className="text-xs font-bold text-foreground">
              {copy.prefsTitle}
            </p>
            {(
              [
                "autoSync",
                "allowRemote",
                "zeroOnStop",
                "edgeShock",
                "channelBLink",
              ] as const
            ).map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 py-1 text-xs text-muted-strong"
              >
                <span>{copy.prefs[key]}</span>
                <input
                  type="checkbox"
                  checked={snap.prefs[key]}
                  onChange={(e) =>
                    dglabManager.setPrefs({ [key]: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            {copy.safetyNote}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
