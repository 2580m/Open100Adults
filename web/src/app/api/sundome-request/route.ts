import { NextResponse, type NextRequest } from "next/server";

interface SundomeRequest {
  [key: string]: unknown;
  createdAt: string;
}

const MAX_REQUESTS = 500;

const globalRequests = globalThis as typeof globalThis & {
  __sundomeRequests?: SundomeRequest[];
};
const requests = (globalRequests.__sundomeRequests ??= []);

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    count: requests.length,
    requests,
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

  requests.push({
    ...(payload as Record<string, unknown>),
    createdAt: new Date().toISOString(),
  });
  if (requests.length > MAX_REQUESTS) {
    requests.splice(0, requests.length - MAX_REQUESTS);
  }

  return NextResponse.json({ ok: true });
}
