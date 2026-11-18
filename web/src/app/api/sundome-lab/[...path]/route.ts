import { NextResponse, type NextRequest } from "next/server";

const UPSTREAM_ORIGIN = "https://100adults.com";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const ALLOWED_ENDPOINTS = new Set([
  "samples",
  "alt-samples",
  "more-samples",
  "browse",
]);

interface CacheEntry {
  body: Uint8Array;
  contentType: string;
  storedAt: number;
}

// Keep the cache across hot reloads in dev and across module re-evaluation.
const globalCache = globalThis as typeof globalThis & {
  __sundomeLabCache?: Map<string, CacheEntry>;
};
const cache = (globalCache.__sundomeLabCache ??= new Map());

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * The upstream sample feed includes an affiliate field pointing at a partner
 * site. This rebuild is ad-free, so strip it before it reaches the browser.
 */
function sanitize(
  body: Uint8Array<ArrayBuffer>,
  contentType: string,
): Uint8Array<ArrayBuffer> {
  if (!contentType.includes("json")) return body;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body)) as {
      items?: Record<string, unknown>[];
    };
    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item) => {
        const nextItem: Record<string, unknown> = { ...item };
        if ("chiramin" in nextItem) nextItem.chiramin = "";
        if ("url" in nextItem) nextItem.url = "";
        return nextItem;
      });
      return new TextEncoder().encode(JSON.stringify(parsed));
    }
  } catch {
    // Leave non-JSON payloads untouched.
  }
  return body;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (path.length !== 1 || !ALLOWED_ENDPOINTS.has(path[0])) {
    return jsonError("Unsupported sundome-lab endpoint", 404);
  }

  const search = new URL(request.url).search;
  const target = `${UPSTREAM_ORIGIN}/api/sundome-lab/${path
    .map((segment) => encodeURIComponent(segment))
    .join("/")}${search}`;

  const now = Date.now();
  const cached = cache.get(target);
  if (cached && now - cached.storedAt < CACHE_TTL_MS) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "no-store",
        "X-Cache": "HIT",
      },
    });
  }
  if (cached) cache.delete(target);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
      },
      cache: "no-store",
    });
  } catch (error) {
    return jsonError(`Upstream request failed: ${String(error)}`, 502);
  }

  const rawBody = new Uint8Array(await upstream.arrayBuffer());
  const contentType =
    upstream.headers.get("content-type") ?? "application/json; charset=utf-8";
  const body = sanitize(rawBody, contentType);

  if (upstream.ok) {
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(target, { body, contentType, storedAt: now });
  }

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Cache": upstream.ok ? "MISS" : "BYPASS",
    },
  });
}
