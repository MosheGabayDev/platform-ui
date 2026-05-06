"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, TicketIcon, BookOpen, User as UserIcon, Building2, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { searchGlobal } from "@/lib/api/search";
import { sanitizeExcerpt } from "@/lib/utils/sanitize-excerpt";
import { useNavGroups } from "@/lib/hooks/use-nav-groups";
import { useTranslations } from "next-intl";
import type {
  SearchResult,
  SearchResultType,
} from "@/lib/modules/search/types";

// Icons-only map; the heading text is resolved at render time via t().
const RESULT_TYPE_ICON: Record<string, LucideIcon> = {
  ticket: TicketIcon,
  kb: BookOpen,
  user: UserIcon,
  org: Building2,
};

const RESULT_TYPE_KEY: Record<string, string> = {
  ticket: "ticket",
  kb: "kb",
  user: "user",
  org: "org",
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
  const Icon = RESULT_TYPE_ICON[String(result.type)] ?? Search;
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
  const navGroups = useNavGroups();
  const t = useTranslations("commandPalette");

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
        placeholder={t("placeholder")}
        value={input}
        onValueChange={setInput}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <Search className="size-8 opacity-40" />
            <p className="text-sm">
              {searchLoading
                ? t("searching")
                : searchEnabled
                  ? t("noResults")
                  : t("startTyping")}
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
            {t("searching")}
          </div>
        )}

        {/* Search results — grouped by type, before nav */}
        {searchEnabled && totalResults > 0 && (
          <>
            {Array.from(resultsByType.entries()).map(([type, results]) => {
              const typeKey = RESULT_TYPE_KEY[String(type)];
              const heading = typeKey
                ? t(`groupsByType.${typeKey}`)
                : String(type);
              return (
                <CommandGroup key={`search-${type}`} heading={heading}>
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

        {/* Nav groups — sourced from useNavGroups() so the command-palette
            tracks the sidebar 1:1 (Track E follow-up). Hidden while a search
            is active to reduce noise. */}
        {showNavGroups &&
          navGroups.map((group) => (
            <CommandGroup key={group.labelKey} heading={group.label}>
              {group.items.flatMap((item) => {
                const rows = [
                  <CommandItem
                    key={item.href}
                    value={`${item.title} ${item.href}`}
                    onSelect={() => navigate(item.href)}
                    className="gap-2.5 cursor-pointer"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.title}
                  </CommandItem>,
                ];
                // Surface `children` (e.g. /settings/* sub-pages) as flat rows.
                if (item.children) {
                  for (const child of item.children) {
                    rows.push(
                      <CommandItem
                        key={child.href}
                        value={`${item.title} ${child.title} ${child.href}`}
                        onSelect={() => navigate(child.href)}
                        className="gap-2.5 cursor-pointer ps-8"
                      >
                        <child.icon className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground/80">{item.title} ›</span>
                        {child.title}
                      </CommandItem>,
                    );
                  }
                }
                return rows;
              })}
              <CommandSeparator />
            </CommandGroup>
          ))}
      </CommandList>
    </CommandDialog>
  );
}
