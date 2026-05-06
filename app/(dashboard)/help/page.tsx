"use client";
/**
 * @module app/(dashboard)/help/page
 *
 * In-app help surface (Phase 3.3).
 * - Search across all sections
 * - Per-module quick-starts
 * - AI shortcuts cheatsheet
 * - Keyboard shortcuts cheatsheet
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-help-surface-spec.md
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Sparkles, Keyboard, Layers, ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { searchCatalog } from "@/lib/docs/content";
import type {
  AICapabilityLevel,
  AIShortcut,
  DocArticle,
  KeyboardShortcut,
} from "@/lib/docs/types";

type Tab = "all" | "quick-start" | "ai-cheatsheet" | "shortcuts";

const TAB_OPTIONS: Array<{ value: Tab; label: string; icon: React.ElementType }> = [
  { value: "all", label: "All", icon: Layers },
  { value: "quick-start", label: "Quick starts", icon: BookOpen },
  { value: "ai-cheatsheet", label: "AI shortcuts", icon: Sparkles },
  { value: "shortcuts", label: "Keyboard", icon: Keyboard },
];

const CAPABILITY_TONE: Record<AICapabilityLevel, string> = {
  READ: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  WRITE_LOW: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  WRITE_HIGH: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  DESTRUCTIVE: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const CAPABILITY_ICON: Record<AICapabilityLevel, React.ElementType> = {
  READ: ShieldCheck,
  WRITE_LOW: ShieldCheck,
  WRITE_HIGH: ShieldAlert,
  DESTRUCTIVE: Skull,
};

function ArticleCard({ article }: { article: DocArticle }) {
  return (
    <div
      className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2"
      data-testid={`doc-article-${article.id}`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">{article.title}</h3>
        {article.module_key && (
          <Badge variant="outline" className="text-[10px]">
            {article.module_key}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{article.summary}</p>
      {article.body && (
        <p className="text-xs text-muted-foreground/90">{article.body}</p>
      )}
      {article.steps && article.steps.length > 0 && (
        <ol className="space-y-1 text-xs list-decimal ms-5 marker:text-muted-foreground">
          {article.steps.map((s, i) => (
            <li key={i}>{s.text}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AIShortcutRow({ shortcut }: { shortcut: AIShortcut }) {
  const Icon = CAPABILITY_ICON[shortcut.capability_level];
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-md border border-border/60 bg-card/40"
      data-testid={`ai-shortcut-${shortcut.action_id}`}
    >
      <div className={cn("size-7 rounded-md border flex items-center justify-center shrink-0", CAPABILITY_TONE[shortcut.capability_level])}>
        <Icon className="size-3.5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-mono">{shortcut.phrase}</code>
          <span className="text-[11px] text-muted-foreground">→</span>
          <code className="text-[11px] font-mono text-muted-foreground">
            {shortcut.action_id}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">{shortcut.description}</p>
        <Badge variant="outline" className={cn("text-[10px]", CAPABILITY_TONE[shortcut.capability_level])}>
          {shortcut.capability_level}
        </Badge>
      </div>
    </div>
  );
}

function KeyboardRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border/40 bg-card/30"
    >
      <span className="text-xs text-foreground">{shortcut.label}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex items-center rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[11px] font-mono"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const results = useMemo(() => searchCatalog(query), [query]);

  const showQuickStarts =
    tab === "all" || tab === "quick-start";
  const showAI = tab === "all" || tab === "ai-cheatsheet";
  const showKbd = tab === "all" || tab === "shortcuts";

  const quickStarts = results.articles.filter((a) => a.category === "quick-start");
  const platform = results.articles.filter((a) => a.category === "platform");

  // Round-2 H1: scope the empty-state count to the currently visible
  // sections so the message reflects what the user can actually see for
  // their active tab + query.
  const totalHits =
    (showQuickStarts ? quickStarts.length + (tab === "all" ? platform.length : 0) : 0) +
    (showAI ? results.aiShortcuts.length : 0) +
    (showKbd ? results.keyboardShortcuts.length : 0);

  return (
    <PageShell
      icon={BookOpen}
      title="Help & documentation"
      subtitle="Search the docs, browse module quick-starts, find AI and keyboard shortcuts."
    >
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Search + tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search docs, AI phrases, shortcuts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9"
              aria-label="Search documentation"
              data-testid="help-search-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TAB_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = tab === opt.value;
              return (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setTab(opt.value)}
                  data-testid={`help-tab-${opt.value}`}
                >
                  <Icon className="size-3.5 me-1" aria-hidden="true" />
                  {opt.label}
                </Button>
              );
            })}
          </div>
          {query && (
            <p className="text-xs text-muted-foreground">
              {totalHits} result{totalHits === 1 ? "" : "s"} for &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>

        {/* Platform overview always sits at the top in the All view */}
        {tab === "all" && platform.length > 0 && (
          <section className="space-y-3" aria-label="Platform overview">
            <h2 className="text-sm font-semibold text-muted-foreground">Platform</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {platform.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        {showQuickStarts && quickStarts.length > 0 && (
          <section className="space-y-3" aria-label="Quick starts">
            <h2 className="text-sm font-semibold text-muted-foreground">Quick starts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickStarts.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        {showAI && results.aiShortcuts.length > 0 && (
          <section className="space-y-3" aria-label="AI shortcuts">
            <h2 className="text-sm font-semibold text-muted-foreground">AI shortcuts</h2>
            <p className="text-xs text-muted-foreground">
              Type these into the floating AI assistant. Every action is proposed
              first, confirmed, then audited (
              <Link href="/audit-log" className="underline">
                audit log
              </Link>
              ).
            </p>
            <div className="space-y-2">
              {results.aiShortcuts.map((s) => (
                <AIShortcutRow key={s.action_id + s.phrase} shortcut={s} />
              ))}
            </div>
          </section>
        )}

        {showKbd && results.keyboardShortcuts.length > 0 && (
          <section className="space-y-3" aria-label="Keyboard shortcuts">
            <h2 className="text-sm font-semibold text-muted-foreground">Keyboard shortcuts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.keyboardShortcuts.map((k, i) => (
                <KeyboardRow key={i} shortcut={k} />
              ))}
            </div>
          </section>
        )}

        {totalHits === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;. Try a different keyword or
            clear the search.
          </div>
        )}
      </div>
    </PageShell>
  );
}
