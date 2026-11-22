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

  const [open, setOpen] = useState(!compact);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const connected =
    snap.status === "paired" || snap.status === "connected_ble";

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
          </div>
          <p className="mt-0.5 text-xs text-muted">{copy.cardSub}</p>
        </div>

        <div className="flex items-center gap-2">
          {connected && (
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
              onClick={() => setOpen((v) => !v)}
              className="cursor-pointer rounded-full border border-card-border px-3 py-1 text-xs font-bold text-foreground hover:border-accent"
              data-dglab-toggle
            >
              {open ? copy.collapse : copy.expand}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-5 border-t border-card-border pt-4">
          {/* Transport Mode Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["socket", copy.tabSocket],
                ["ble3", copy.tabBle3],
                ["ble2", copy.tabBle2],
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
          {snap.mode === "socket" ? (
            <div className="space-y-3 rounded-xl border border-card-border bg-background/40 p-3.5">
              <p className="text-xs leading-relaxed text-muted-strong">
                {copy.socketLead}
              </p>

              {IS_STATIC_EXPORT && snap.wsEndpointMode !== "custom" && (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  {copy.staticSocketWarn}
                </p>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-muted">
                  {copy.wsModeLabel}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["auto", "lan", "custom"] as const).map((wm) => (
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

          {snap.errorText && (
            <p className="text-xs font-semibold text-rose-300">
              {snap.errorText}
            </p>
          )}

          {/* Dual Channel Controls + Safety Caps */}
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
                      {snap.mode === "socket" && (
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
                disabled={!connected}
                onClick={() => dglabManager.setOutputActive(!snap.outputActive)}
                className="rpri cursor-pointer rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {snap.outputActive ? copy.pauseOutput : copy.startOutput}
              </button>
              <button
                type="button"
                disabled={!connected}
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
      )}
    </div>
  );
}
