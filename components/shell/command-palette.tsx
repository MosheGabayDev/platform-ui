"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, ShieldCheck, KeyRound, ClipboardList,
  Activity, BarChart2, Settings, CreditCard, HeadphonesIcon,
  Bot, Brain, BookOpen, Phone, HardDrive, Building2, Search,
  TicketIcon, FileText, User as UserIcon, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { searchGlobal } from "@/lib/api/search";
import { sanitizeExcerpt } from "@/lib/utils/sanitize-excerpt";
import type {
  SearchResult,
  SearchResultType,
} from "@/lib/modules/search/types";

const pages = [
  { title: "דשבורד", href: "/", icon: LayoutDashboard, group: "ניווט" },
  { title: "משתמשים", href: "/users", icon: Users, group: "ניווט" },
  { title: "תפקידים והרשאות", href: "/roles", icon: ShieldCheck, group: "ניווט" },
  { title: "ארגונים", href: "/orgs", icon: Building2, group: "ניווט" },
  { title: "מפתחות API", href: "/api-keys", icon: KeyRound, group: "מערכת" },
  { title: "יומן ביקורת", href: "/audit-log", icon: ClipboardList, group: "מערכת" },
  { title: "גיבויים", href: "/backups", icon: HardDrive, group: "מערכת" },
  { title: "הגדרות מערכת", href: "/settings/system", icon: Settings, group: "מערכת" },
  { title: "בריאות המערכת", href: "/health", icon: Activity, group: "ניטור" },
  { title: "לוגים", href: "/logs", icon: ClipboardList, group: "ניטור" },
  { title: "מטריקות", href: "/metrics", icon: BarChart2, group: "ניטור" },
  { title: "חיוב", href: "/billing", icon: CreditCard, group: "עסקי" },
  { title: "הלפדסק", href: "/helpdesk", icon: HeadphonesIcon, group: "עסקי" },
  { title: "סוכני AI", href: "/agents", icon: Bot, group: "עסקי" },
  { title: "ALA", href: "/ala", icon: Brain, group: "עסקי" },
  { title: "ידע ו-RAG", href: "/knowledge", icon: BookOpen, group: "עסקי" },
  { title: "שיחות קוליות", href: "/voice", icon: Phone, group: "עסקי" },
];

const groups = ["ניווט", "מערכת", "ניטור", "עסקי"];

const RESULT_TYPE_META: Record<string, { icon: LucideIcon; heading: string }> = {
  ticket: { icon: TicketIcon, heading: "כרטיסים" },
  kb: { icon: BookOpen, heading: "בסיס ידע" },
  user: { icon: UserIcon, heading: "משתמשים" },
  org: { icon: Building2, heading: "ארגונים" },
};

// Sanitizer extracted to lib/utils/sanitize-excerpt so the test imports the
// live function instead of a copy (Round 3 review HIGH #1).

function SearchResultRow({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: () => void;
}) {
  const meta = RESULT_TYPE_META[String(result.type)] ?? {
    icon: Search,
    heading: String(result.type),
  };
  const Icon = meta.icon;
  return (
    <CommandItem
      value={`${result.type}-${result.id}-${result.title}`}
      onSelect={onSelect}
      className="gap-2.5 cursor-pointer items-start"
    >
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium truncate">{result.title}</span>
        <span
          className="text-[11px] text-muted-foreground truncate [&_mark]:bg-amber-200 dark:[&_mark]:bg-amber-500/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{
            __html: sanitizeExcerpt(result.match_excerpt),
          }}
        />
        {result.subtitle && (
          <span className="text-[10px] text-muted-foreground/80 truncate">
            {result.subtitle}
          </span>
        )}
      </div>
    </CommandItem>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce input → debounced query (spec §4: 200ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  // Reset input when palette closes so re-opening starts clean.
  useEffect(() => {
    if (!open) {
      setInput("");
      setDebounced("");
    }
  }, [open]);

  const trimmed = debounced.trim();
  const searchEnabled = trimmed.length >= 2;
  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["search", "global", trimmed],
    queryFn: () => searchGlobal({ q: trimmed }),
    enabled: searchEnabled,
    staleTime: 30_000,
  });

  const resultsByType = useMemo(() => {
    const grouped = new Map<SearchResultType, SearchResult[]>();
    for (const r of searchData?.data?.results ?? []) {
      const arr = grouped.get(r.type) ?? [];
      arr.push(r);
      grouped.set(r.type, arr);
    }
    return grouped;
  }, [searchData]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  // When typing a search, hide nav groups to keep results scannable.
  const showNavGroups = !searchEnabled;
  const totalResults = searchData?.data?.results.length ?? 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="חפש דף, כרטיס, משתמש, מאמר…"
        value={input}
        onValueChange={setInput}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <Search className="size-8 opacity-40" />
            <p className="text-sm">
              {searchLoading
                ? "מחפש..."
                : searchEnabled
                  ? "לא נמצאו תוצאות"
                  : "התחל להקליד כדי לחפש"}
            </p>
          </div>
        </CommandEmpty>

        {/* Search loading hint while debounce/query in flight */}
        {searchEnabled && searchLoading && totalResults === 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            מחפש...
          </div>
        )}

        {/* Search results — grouped by type, before nav */}
        {searchEnabled && totalResults > 0 && (
          <>
            {Array.from(resultsByType.entries()).map(([type, results]) => {
              const meta = RESULT_TYPE_META[String(type)] ?? {
                icon: Search,
                heading: String(type),
              };
              return (
                <CommandGroup key={`search-${type}`} heading={meta.heading}>
                  {results.map((r) => (
                    <SearchResultRow
                      key={`${r.type}-${r.id}`}
                      result={r}
                      onSelect={() => navigate(r.href)}
                    />
                  ))}
                </CommandGroup>
              );
            })}
            <CommandSeparator />
          </>
        )}

        {/* Nav groups — hidden while a search is active to reduce noise */}
        {showNavGroups &&
          groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {pages
                .filter((p) => p.group === group)
                .map((page) => (
                  <CommandItem
                    key={page.href}
                    value={page.title}
                    onSelect={() => navigate(page.href)}
                    className="gap-2.5 cursor-pointer"
                  >
                    <page.icon className="size-4 text-muted-foreground" />
                    {page.title}
                  </CommandItem>
                ))}
              <CommandSeparator />
            </CommandGroup>
          ))}
      </CommandList>
    </CommandDialog>
  );
}
