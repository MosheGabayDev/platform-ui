import { NextRequest, NextResponse } from "next/server";

const FLASK = process.env.FLASK_API_URL ?? "http://localhost:5000";

/* Map proxy path → Flask URL prefix */
const PATH_MAP: Record<string, string> = {
  "ai-settings":  "/api/ai-settings",
  "monitoring":   "/admin/api/monitoring",
  "admin":        "/admin/api",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

async function proxy(
  req: NextRequest,
  params: { path: string[] }
) {
  const segments = params.path ?? [];
  const [prefix, ...rest] = segments;
  const flaskPrefix = PATH_MAP[prefix] ?? `/api/${prefix}`;
  const downstream = `${FLASK}${flaskPrefix}/${rest.join("/")}${req.nextUrl.search}`;

  /* Forward session cookie so Flask sees the logged-in user */
  const cookie = req.headers.get("cookie") ?? "";

  try {
    const upstream = await fetch(downstream, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: req.method !== "GET" ? await req.text() : undefined,
      signal: AbortSignal.timeout(8000),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
