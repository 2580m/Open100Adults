import { NextResponse, type NextRequest } from "next/server";

type VoteCounts = Record<string, number>;

const globalVotes = globalThis as typeof globalThis & {
  __storyVotes?: Map<string, VoteCounts>;
};
const votes = (globalVotes.__storyVotes ??= new Map<string, VoteCounts>());

const MAX_SLUGS = 500;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const dynamic = "force-dynamic";

function cleanKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120 || FORBIDDEN_KEYS.has(trimmed)) return null;
  return trimmed;
}

export function GET() {
  return NextResponse.json({
    ok: true,
    votes: Object.fromEntries(votes.entries()),
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { ok: false, error: "Body must be a JSON object" },
      { status: 400 },
    );
  }

  const body = payload as Record<string, unknown>;
  const slug = cleanKey(body.slug ?? body.id) ?? "default";
  const choice = cleanKey(body.choice ?? body.vote) ?? "like";

  if (!votes.has(slug) && votes.size >= MAX_SLUGS) {
    const oldestSlug = votes.keys().next().value;
    if (oldestSlug !== undefined) votes.delete(oldestSlug);
  }
  const counts = votes.get(slug) ?? (Object.create(null) as VoteCounts);
  counts[choice] = (counts[choice] ?? 0) + 1;
  votes.set(slug, counts);

  return NextResponse.json({ ok: true, slug, counts });
}
