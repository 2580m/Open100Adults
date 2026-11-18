"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { remoteCopy, type RemoteAction } from "@/data/remoteCopy";
import { localePath, type Locale } from "@/data/tools";

interface RoomCommand {
  seq: number;
  action: string;
  speed?: number;
  at: string;
}

const ACTIONS: RemoteAction[] = [
  "stop",
  "slow",
  "fast",
  "edge",
  "allow",
  "deny",
  "extend",
];

export function RemotePlay({ locale }: { locale: Locale }) {
  const copy = remoteCopy[locale];
  const [ready, setReady] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [role, setRole] = useState<"controller" | "receiver">("controller");
  const [link, setLink] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [sent, setSent] = useState<RemoteAction | null>(null);
  const [lastCommand, setLastCommand] = useState<RoomCommand | null>(null);
  const [history, setHistory] = useState<RoomCommand[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastSeqRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    const nextRole = params.get("role") === "controller" ? "controller" : "receiver";
    setRoomCode(room ? room.toUpperCase() : null);
    setRole(room ? nextRole : "controller");
    setReady(true);
  }, []);

  useEffect(() => {
    if (roomCode && typeof window !== "undefined") {
      setLink(
        `${window.location.origin}${localePath(locale, "/sundome/remote")}?room=${roomCode}`,
      );
    }
  }, [roomCode, locale]);

  useEffect(() => {
    if (!ready || !roomCode || role !== "receiver") return;
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(
          `/api/rgate/rooms/${roomCode}/commands?after=${lastSeqRef.current}`,
        );
        if (response.status === 404) {
          if (!cancelled) setError(copy.receiver.notFound);
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as {
          commands?: RoomCommand[];
        };
        if (cancelled) return;
        if (data.commands?.length) {
          const fresh = data.commands;
          lastSeqRef.current = fresh[fresh.length - 1].seq;
          setLastCommand(fresh[fresh.length - 1]);
          setHistory((items) => [...[...fresh].reverse(), ...items].slice(0, 6));
        }
      } catch {
        // The next poll retries.
      }
    }

    void poll();
    const timer = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, roomCode, role, copy.receiver.notFound]);

  async function createRoom() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/rgate/rooms", { method: "POST" });
      const data = (await response.json()) as {
        ok?: boolean;
        room?: { code: string };
      };
      if (data.ok && data.room) {
        setRoomCode(data.room.code);
        setRole("controller");
      }
    } catch {
      setError(copy.receiver.notFound);
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable; the link stays visible for manual copy.
    }
  }

  async function send(action: RemoteAction) {
    if (!roomCode) return;
    setSent(action);
    try {
      await fetch(`/api/rgate/rooms/${roomCode}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, speed }),
      });
    } catch {
      // Keep the UI responsive; polling/retry is not needed for the controller.
    }
    window.setTimeout(() => setSent(null), 1200);
  }

  if (!ready) {
    return (
      <div className="card rounded-2xl p-8 text-center text-sm text-muted">
        {copy.list.loading}
      </div>
    );
  }

  if (!roomCode) {
    return (
      <div className="card rounded-2xl p-6 text-center sm:p-8">
        <p className="font-display text-2xl text-foreground">{copy.title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-strong">
          {copy.lead}
        </p>
        <button
          type="button"
          onClick={createRoom}
          disabled={creating}
          className="mt-5 cursor-pointer rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-white disabled:cursor-default disabled:opacity-60"
        >
          {creating ? copy.controller.creating : copy.controller.create}
        </button>
        {error ? <p className="mt-3 text-xs text-[#ff8399]">{error}</p> : null}
        <p className="mt-4 text-xs text-muted">
          {copy.howTo.steps[0].body}
        </p>
      </div>
    );
  }

  if (role === "receiver") {
    return (
      <div className="card rounded-2xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {copy.receiver.room}:{" "}
            <span className="font-mono font-bold text-foreground">{roomCode}</span>
          </p>
          <span className="flex items-center gap-1.5 text-[11px] text-[#6ee7a8]">
            <span className="h-2 w-2 rounded-full bg-[#6ee7a8]" />
            {copy.receiver.connected}
          </span>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-[#ff4d6d]/10 px-3 py-2 text-sm text-[#ff8399]">
            {error}
          </p>
        ) : (
          <>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.receiver.lastCommand}
            </p>
            <p className="mt-1 font-display text-4xl text-accent">
              {lastCommand
                ? `${copy.actions[lastCommand.action as RemoteAction] ?? lastCommand.action}${
                    lastCommand.speed ? ` · ${lastCommand.speed}` : ""
                  }`
                : copy.receiver.waiting}
            </p>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {copy.receiver.history}
            </p>
            {history.length === 0 ? (
              <p className="mt-1 text-xs text-muted">{copy.receiver.noCommand}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {history.map((command) => (
                  <li
                    key={command.seq}
                    className="flex items-center justify-between rounded-lg bg-search-bg px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold text-foreground">
                      {copy.actions[command.action as RemoteAction] ?? command.action}
                      {command.speed ? ` · ${command.speed}` : ""}
                    </span>
                    <span className="text-muted">
                      {new Date(command.at).toLocaleTimeString(
                        locale === "zh" ? "zh-CN" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          {copy.safety.items[3]}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card rounded-2xl p-5 sm:p-7">
        <p className="text-xs text-muted">
          {copy.controller.room}:{" "}
          <span className="font-mono font-bold text-foreground">{roomCode}</span>
        </p>
        <p className="mt-3 text-xs text-muted-strong">{copy.controller.linkReady}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            readOnly
            value={link ?? ""}
            onFocus={(event) => event.target.select()}
            className="min-w-[220px] flex-1 rounded-lg border border-card-border bg-search-bg px-2 py-1.5 text-xs text-foreground outline-none"
          />
          <button
            type="button"
            onClick={copyLink}
            className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"
          >
            {copied ? copy.controller.copied : copy.controller.copy}
          </button>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-muted-strong"
            >
              {copy.controller.open}
            </a>
          ) : null}
        </div>
      </div>

      <div className="card rounded-2xl p-5 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          {copy.controller.speed}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              aria-pressed={speed === value}
              className={`h-9 w-9 cursor-pointer rounded-lg text-xs font-bold ${
                speed === value
                  ? "bg-accent text-white"
                  : "border border-card-border text-muted-strong"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          {copy.controller.commands}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => send(action)}
              className={`cursor-pointer rounded-xl px-3 py-3 text-sm font-bold transition-colors ${
                action === "deny" || action === "stop"
                  ? "border border-[#ff4d6d]/40 text-[#ff8399]"
                  : action === "allow"
                    ? "bg-accent text-white"
                    : "border border-card-border text-foreground"
              }`}
            >
              {copy.actions[action]}
            </button>
          ))}
        </div>

        <p className="mt-3 h-4 text-xs text-muted">
          {sent ? `${copy.controller.sent}: ${copy.actions[sent]}` : ""}
        </p>
      </div>

      <p className="text-center text-[11px] text-muted">
        <Link
          href={localePath(locale, "/sundome/remote/list")}
          className="font-bold text-accent hover:underline"
        >
          {copy.list.title} →
        </Link>
      </p>
    </div>
  );
}
