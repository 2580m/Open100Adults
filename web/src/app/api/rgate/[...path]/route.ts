import { NextResponse, type NextRequest } from "next/server";

interface RoomCommand {
  seq: number;
  action: string;
  speed?: number;
  at: string;
}

interface Room {
  code: string;
  createdAt: string;
  commands: RoomCommand[];
}

const globalRooms = globalThis as typeof globalThis & {
  __rgateRooms?: Map<string, Room>;
};
const rooms: Map<string, Room> = (globalRooms.__rgateRooms ??= new Map<
  string,
  Room
>());
const MAX_COMMANDS = 200;
const MAX_ROOMS = 200;

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const DISABLED_FLAGS = new Set(["false", "0", "no", "off"]);
const ENABLED_FLAGS = new Set(["true", "1", "yes", "on"]);

function isTunnelEnabled(): boolean {
  const raw = (process.env.ENABLE_TUNNEL ?? "").trim().toLowerCase();
  if (DISABLED_FLAGS.has(raw)) return false;
  if (ENABLED_FLAGS.has(raw)) return true;
  return Boolean(
    process.env.CLOUDFLARED_METRICS_URL || process.env.CLOUDFLARED_METRICS_PORT,
  );
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function resolvePublicOrigin(): Promise<{
  origin: string | null;
  source: "env" | "tunnel" | "none";
  tunnelEnabled: boolean;
}> {
  const tunnelEnabled = isTunnelEnabled();
  const envOrigin = process.env.PUBLIC_SHARE_URL
    ? normalizeOrigin(process.env.PUBLIC_SHARE_URL)
    : null;
  if (envOrigin) {
    return { origin: envOrigin, source: "env", tunnelEnabled };
  }
  if (!tunnelEnabled) {
    return { origin: null, source: "none", tunnelEnabled: false };
  }

  const metricsUrl =
    process.env.CLOUDFLARED_METRICS_URL ||
    `http://127.0.0.1:${process.env.CLOUDFLARED_METRICS_PORT || "20241"}/quicktunnel`;
  try {
    const response = await fetch(metricsUrl, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!response.ok) {
      return { origin: null, source: "none", tunnelEnabled: true };
    }
    const data = (await response.json()) as { hostname?: unknown };
    const origin =
      typeof data.hostname === "string" ? normalizeOrigin(data.hostname) : null;
    if (origin) {
      return { origin, source: "tunnel", tunnelEnabled: true };
    }
  } catch {
    // Tunnel metrics endpoint not ready or unreachable.
  }
  return { origin: null, source: "none", tunnelEnabled: true };
}

function makeCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function roomSummary(room: Room) {
  return {
    code: room.code,
    createdAt: room.createdAt,
    commands: room.commands.length,
    lastAction: room.commands.at(-1)?.action ?? null,
  };
}

async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Fall through to an empty body.
  }
  return {};
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const [root, code, leaf] = path;

  if (root === "public-url") {
    return NextResponse.json({ ok: true, ...(await resolvePublicOrigin()) });
  }

  if (root !== "rooms") {
    return NextResponse.json({ ok: true, rooms: [], localMock: true });
  }

  if (!code) {
    return NextResponse.json({
      ok: true,
      rooms: [...rooms.values()].map(roomSummary),
      localMock: true,
    });
  }

  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return NextResponse.json(
      { ok: false, error: "Room not found" },
      { status: 404 },
    );
  }

  if (leaf === "commands") {
    const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
    const commands = room.commands.filter(
      (command) => command.seq > (Number.isFinite(after) ? after : 0),
    );
    return NextResponse.json({ ok: true, room: roomSummary(room), commands });
  }

  return NextResponse.json({ ok: true, room: roomSummary(room) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const [root, code, leaf] = path;

  if (root !== "rooms") {
    return NextResponse.json({ ok: true, rooms: [], localMock: true });
  }

  if (!code) {
    const body = await readJson(request);
    let nextCode =
      typeof body.code === "string" && /^[A-Z0-9]{4,10}$/i.test(body.code)
        ? body.code.toUpperCase()
        : makeCode();
    while (rooms.has(nextCode)) nextCode = makeCode();
    const room: Room = {
      code: nextCode,
      createdAt: new Date().toISOString(),
      commands: [],
    };
    if (rooms.size >= MAX_ROOMS) {
      const oldestCode = rooms.keys().next().value;
      if (oldestCode !== undefined) rooms.delete(oldestCode);
    }
    rooms.set(nextCode, room);
    const { origin } = await resolvePublicOrigin();
    return NextResponse.json({
      ok: true,
      room: roomSummary(room),
      publicOrigin: origin,
    });
  }

  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return NextResponse.json(
      { ok: false, error: "Room not found" },
      { status: 404 },
    );
  }

  if (leaf === "commands") {
    const body = await readJson(request);
    const action =
      typeof body.action === "string" ? body.action.slice(0, 40) : "command";
    const speed =
      typeof body.speed === "number" && Number.isFinite(body.speed)
        ? Math.min(6, Math.max(1, Math.round(body.speed)))
        : undefined;
    const seq = (room.commands.at(-1)?.seq ?? 0) + 1;
    room.commands.push({
      seq,
      action,
      speed,
      at: new Date().toISOString(),
    });
    if (room.commands.length > MAX_COMMANDS) {
      room.commands.splice(0, room.commands.length - MAX_COMMANDS);
    }
    return NextResponse.json({ ok: true, seq });
  }

  return NextResponse.json({ ok: true, room: roomSummary(room) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const [root, code] = path;
  if (root === "rooms" && code) rooms.delete(code.toUpperCase());
  return NextResponse.json({ ok: true });
}
