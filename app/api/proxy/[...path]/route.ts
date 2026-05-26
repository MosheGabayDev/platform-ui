/**
 * @module app/api/proxy/[...path]/route
 * Next.js → Flask reverse proxy for platform-ui.
 * Attaches Authorization: Bearer <accessToken> from next-auth JWT on every request.
 * Middleware guards this route, but we add an explicit 401 as defense-in-depth.
 *
 * Path mapping: /api/proxy/<prefix>/... → FLASK_API_URL/<flask-prefix>/...
 * Add new Flask blueprint prefixes to PATH_MAP below.
 */

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { buildAuditHeaders } from "@/lib/api/request-context";

const FLASK = process.env.FLASK_API_URL ?? "http://localhost:5000";
const WHATSAPP_API = process.env.WHATSAPP_API_URL ?? "http://localhost:3320";
// Meteorit billing-automation standalone Flask service (separate container).
// In-cluster default: http://billing-automation.platform.svc.cluster.local:5001
// Local dev override: BILLING_AUTOMATION_API_URL=http://localhost:5001
const BILLING_AUTOMATION_API =
  process.env.BILLING_AUTOMATION_API_URL ?? "http://billing-automation.platform.svc.cluster.local:5001";

/** Maps proxy path prefix → Flask URL prefix */
const PATH_MAP: Record<string, string> = {
  "ai-settings": "/api/ai-settings",
  "monitoring": "/admin/api/monitoring",
  "admin": "/admin/api",
  "helpdesk": "/helpdesk",
  "ai-agents": "/ai-agents",
  "ala": "/api/ala/v1",
  "rag": "/api/rag",
  "billing": "/api/billing",
  "automation": "/automation",
  "integrations": "/integrations",
  "users": "/api/users",
  "organizations": "/api/organizations",
  "roles": "/api/roles",
  "notifications": "/api/notifications",
  "whatsapp": "",
  "billing-automation": "/api/billing-automation",
};

const UPSTREAM_BASE: Record<string, string> = {
  whatsapp: WHATSAPP_API,
  "billing-automation": BILLING_AUTOMATION_API,
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  // Get token from next-auth JWT cookie (server-side, never exposed to browser)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Defense-in-depth: middleware should have blocked this, but return 401 if not
  if (!token?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = params.path ?? [];
  const [prefix, ...rest] = segments;

  // Strict allowlist — never fall back to arbitrary Flask paths.
  // Unknown prefix → 404, not proxy-forward. Prevents path traversal to unlisted endpoints.
  if (!Object.prototype.hasOwnProperty.call(PATH_MAP, prefix)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const downstreamPrefix = PATH_MAP[prefix];
  const upstreamBase = UPSTREAM_BASE[prefix] ?? FLASK;
  const downstream = `${upstreamBase}${downstreamPrefix}${rest.length ? `/${rest.join("/")}` : ""}${req.nextUrl.search}`;

  try {
    const auditHeaders = buildAuditHeaders({
      userId: token.user?.id ?? null,
      orgId: token.user?.org_id ?? null,
      route: req.headers.get("referer"),
    });

    const upstream = await fetch(downstream, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.accessToken}`,
        "x-wa-owner-user-id": String(token.user?.id ?? ""),
        "x-wa-org-id": String(token.user?.org_id ?? ""),
        ...auditHeaders,
      },
      body: req.method !== "GET" && req.method !== "HEAD"
        ? await req.text()
        : undefined,
      signal: AbortSignal.timeout(8_000),
    });

    // Attempt JSON parse; return empty object on non-JSON responses (e.g. 204 No Content)
    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    // Never expose upstream URLs, hostnames, or error details — they leak cluster topology.
    return NextResponse.json({ error: "Gateway error" }, { status: 502 });
  }
}
