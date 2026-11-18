"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { remoteCopy } from "@/data/remoteCopy";
import { localePath, type Locale } from "@/data/tools";

interface RoomSummary {
  code: string;
  createdAt: string;
  commands: number;
  lastAction: string | null;
}

export function RemoteRoomList({ locale }: { locale: Locale }) {
  const copy = remoteCopy[locale];
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/rgate/rooms");
        if (!response.ok) return;
        const data = (await response.json()) as { rooms?: RoomSummary[] };
        if (!cancelled) setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      } catch {
        // Keep the previous list.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {rooms.length} {copy.list.rooms}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetch("/api/rgate/rooms")
              .then((response) => response.json())
              .then((data: { rooms?: RoomSummary[] }) => {
                setRooms(Array.isArray(data.rooms) ? data.rooms : []);
              })
              .catch(() => undefined)
              .finally(() => setLoading(false));
          }}
          className="cursor-pointer rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-muted-strong"
        >
          {copy.list.refresh}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">{copy.list.loading}</p>
      ) : rooms.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-card-border bg-card-bg p-6 text-center">
          <p className="text-sm text-muted-strong">{copy.list.empty}</p>
          <Link
            href={localePath(locale, "/sundome/remote")}
            className="mt-3 inline-block cursor-pointer rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white"
          >
            {copy.list.makeLink}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {rooms.map((room) => (
            <li
              key={room.code}
              className="card rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-foreground">
                  {room.code}
                </span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                  {room.commands} {copy.list.commands}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {copy.list.created}{" "}
                {new Date(room.createdAt).toLocaleTimeString(
                  locale === "zh" ? "zh-CN" : "en-US",
                  { hour: "2-digit", minute: "2-digit" },
                )}
              </p>
              <Link
                href={`${localePath(locale, "/sundome/remote")}?room=${room.code}&role=controller`}
                className="mt-2 inline-block cursor-pointer text-xs font-bold text-accent hover:underline"
              >
                {copy.list.control} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
