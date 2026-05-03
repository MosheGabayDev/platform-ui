/**
 * PlatformSearch client (cap 11) — cross-module global search.
 *
 * Spec: `docs/system-upgrade/04-capabilities/platform-search-spec.md`. Backend
 * port pending; this client is MOCK MODE until the Flask `/api/search/`
 * blueprint ships per the spec's MOCK_MODE flip checklist (§7).
 *
 * Mock corpus is small but realistic: ticket subjects/numbers, KB articles,
 * user names, orgs. Substring (case-insensitive) matching with a naive score.
 * The shape MUST match the spec exactly so flipping the flag is one-line.
 */
import type {
  SearchParams,
  SearchResponse,
  SearchResult,
  SearchResultType,
} from "@/lib/modules/search/types";

export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Mock corpus
// ---------------------------------------------------------------------------

interface CorpusEntry {
  type: SearchResultType;
  id: number | string;
  title: string;
  body: string;
  subtitle: string;
  href: string;
}

const MOCK_CORPUS: CorpusEntry[] = [
  // Tickets — match the helpdesk fixture set
  {
    type: "ticket",
    id: 1001,
    title: "Outlook unable to send mail",
    body: "User reports SMTP authentication failure after recent password rotation.",
    subtitle: "TKT-2026-01001 · medium · in_progress",
    href: "/helpdesk/tickets/1001",
  },
  {
    type: "ticket",
    id: 1002,
    title: "Printer offline in marketing wing",
    body: "HP LaserJet on floor 3 keeps dropping from the print server.",
    subtitle: "TKT-2026-01002 · low · new",
    href: "/helpdesk/tickets/1002",
  },
  {
    type: "ticket",
    id: 1003,
    title: "Slack notifications missing on mobile",
    body: "Push notifications stopped arriving on iOS after the office network change.",
    subtitle: "TKT-2026-01003 · medium · in_progress",
    href: "/helpdesk/tickets/1003",
  },
  {
    type: "ticket",
    id: 1004,
    title: "VPN clients failing handshake",
    body: "Multiple users report VPN connection drops with handshake error during peak hours.",
    subtitle: "TKT-2026-01004 · critical · in_progress",
    href: "/helpdesk/tickets/1004",
  },
  {
    type: "ticket",
    id: 1005,
    title: "Onboarding new hire — laptop provisioning",
    body: "Need standard dev image installed and accounts provisioned by Friday.",
    subtitle: "TKT-2026-01005 · low · new",
    href: "/helpdesk/tickets/1005",
  },
  // KB articles
  {
    type: "kb",
    id: "kb-vpn-troubleshooting",
    title: "Troubleshooting VPN handshake failures",
    body: "Common VPN handshake failure modes and resolution steps. Covers MTU, certs, and clock skew.",
    subtitle: "Knowledge base · 4 min read",
    href: "/helpdesk/kb/kb-vpn-troubleshooting",
  },
  {
    type: "kb",
    id: "kb-onboarding-checklist",
    title: "New hire onboarding checklist",
    body: "Account creation, device enrollment, first-day app access, and security training.",
    subtitle: "Knowledge base · 6 min read",
    href: "/helpdesk/kb/kb-onboarding-checklist",
  },
  // Users
  {
    type: "user",
    id: 7,
    title: "Tech Tim",
    body: "tim@acme.example.com · system_admin",
    subtitle: "User · system admin",
    href: "/users/7",
  },
  {
    type: "user",
    id: 9,
    title: "OnCall Olivia",
    body: "olivia@acme.example.com · technician",
    subtitle: "User · technician",
    href: "/users/9",
  },
  // Org
  {
    type: "org",
    id: 1,
    title: "Acme Corporation",
    body: "Primary tenant. 412 users. 17 active integrations.",
    subtitle: "Organization · primary tenant",
    href: "/orgs/1",
  },
];

const DEFAULT_TYPES: SearchResultType[] = ["ticket", "user", "kb", "org"];

// ---------------------------------------------------------------------------
// Mock scoring
// ---------------------------------------------------------------------------

/**
 * Wrap matches of `q` in `<mark>` over the raw `text`. Round 2 review MED #5:
 * we run the regex against RAW text, then escape match + non-match segments
 * separately. Escaping first would produce mismatches when `q` contains
 * `&`, `<`, or `>` (would search for `&` against `&amp;`).
 */
function highlight(text: string, q: string): string {
  if (!q) return escapeHtml(text);
  const re = new RegExp(escapeRegex(q), "ig");
  let result = "";
  let lastIndex = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, start));
    result += `<mark>${escapeHtml(match[0])}</mark>`;
    lastIndex = start + match[0].length;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ScoredEntry {
  entry: CorpusEntry;
  score: number;
  match_field: "title" | "body" | "subtitle";
}

function scoreEntry(entry: CorpusEntry, q: string): ScoredEntry | null {
  const ql = q.toLowerCase();
  const titleHit = entry.title.toLowerCase().includes(ql);
  const bodyHit = entry.body.toLowerCase().includes(ql);
  const subtitleHit = entry.subtitle.toLowerCase().includes(ql);
  if (!titleHit && !bodyHit && !subtitleHit) return null;
  // Crude weight — title hits beat body hits beat subtitle hits.
  let score = 0;
  let match_field: "title" | "body" | "subtitle" = "subtitle";
  if (titleHit) {
    score = 0.7 + 0.3 * (q.length / Math.max(entry.title.length, 1));
    match_field = "title";
  } else if (bodyHit) {
    score = 0.3 + 0.2 * (q.length / Math.max(entry.body.length, 1));
    match_field = "body";
  } else {
    score = 0.2;
  }
  return { entry, score, match_field };
}

function buildResult(scored: ScoredEntry, q: string): SearchResult {
  const { entry, score, match_field } = scored;
  const sourceText =
    match_field === "title"
      ? entry.title
      : match_field === "body"
        ? entry.body
        : entry.subtitle;
  return {
    type: entry.type,
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle,
    href: entry.href,
    score: Math.min(1, score),
    match_field,
    match_excerpt: highlight(sourceText, q),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchGlobal(params: SearchParams): Promise<SearchResponse> {
  const types = params.types ?? DEFAULT_TYPES;
  const limit = Math.min(25, Math.max(1, params.limit ?? 8));

  // Spec §6: empty/short queries return immediately with no results.
  if (!params.q || params.q.length < 1) {
    return {
      success: true,
      data: { query: params.q ?? "", took_ms: 0, results: [], totals_by_type: {} },
    };
  }
  if (params.q.length > 256) {
    throw new Error("400: query too long (max 256 chars)");
  }

  if (MOCK_MODE) {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 60));

    const typeSet = new Set(types);
    const allowed = MOCK_CORPUS.filter((e) => typeSet.has(e.type));
    const scored = allowed
      .map((e) => scoreEntry(e, params.q))
      .filter((s): s is ScoredEntry => s !== null);

    // Per-type cap (spec §1: limit applies per type)
    const byType = new Map<SearchResultType, ScoredEntry[]>();
    for (const s of scored) {
      const arr = byType.get(s.entry.type) ?? [];
      arr.push(s);
      byType.set(s.entry.type, arr);
    }
    const capped: ScoredEntry[] = [];
    const totals_by_type: Record<string, number> = {};
    for (const [type, arr] of byType.entries()) {
      arr.sort((a, b) => b.score - a.score);
      totals_by_type[String(type)] = arr.length;
      capped.push(...arr.slice(0, limit));
    }
    capped.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        query: params.q,
        took_ms: Date.now() - start,
        results: capped.map((s) => buildResult(s, params.q)),
        totals_by_type,
      },
    };
  }

  const qs = new URLSearchParams();
  qs.set("q", params.q);
  if (params.types) qs.set("types", params.types.join(","));
  qs.set("limit", String(limit));
  const res = await fetch(`/api/proxy/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`searchGlobal failed: ${res.status}`);
  return res.json();
}
