"use client";
/**
 * @module app/(dashboard)/whatsapp/search/page
 * Owner-scoped WhatsApp message search.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_MODE, searchWhatsappMessages } from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

function formatDate(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SearchSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function WhatsAppSearchInner() {
  const t = useTranslations("whatsapp");
  const tSearch = useTranslations("whatsapp.search");
  const [q, setQ] = useState("");
  const params = useMemo(
    () => ({ q: q.trim(), page: 1, page_size: 50 }),
    [q],
  );
  const enabled = q.trim().length > 0;
  const searchQuery = useQuery({
    queryKey: queryKeys.whatsapp.search(params),
    queryFn: () => searchWhatsappMessages(params),
    enabled,
  });

  const results = searchQuery.data?.data ?? [];
  const total = searchQuery.data?.meta.total ?? 0;

  useRegisterPageContext({
    pageKey: "whatsapp.search",
    route: "/whatsapp/search",
    summary: `WhatsApp search page with ${total} matching owned messages.`,
    availableActions: ["search_whatsapp_messages", "open_whatsapp_chat"],
  });

  return (
    <PageShell
      icon={Search}
      title={tSearch("title")}
      subtitle={tSearch("subtitle")}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/whatsapp">
            <ArrowLeft />
            {tSearch("back")}
          </Link>
        </Button>
      }
    >
      {MOCK_MODE && (
        <div
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          {t("toasts.backendNotice")}
        </div>
      )}

      <section className="space-y-3">
        <label className="relative block rounded-lg border border-border bg-card p-3">
          <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={tSearch("placeholder")}
            className="ps-8"
            data-testid="whatsapp-message-search"
          />
        </label>

        {!enabled && (
          <EmptyState
            icon={Search}
            title={tSearch("idleTitle")}
            description={tSearch("idleDescription")}
          />
        )}
        {enabled && searchQuery.isLoading && <SearchSkeleton />}
        {enabled && searchQuery.error && !searchQuery.isLoading && (
          <ErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} />
        )}
        {enabled && !searchQuery.isLoading && !searchQuery.error && results.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title={tSearch("emptyTitle")}
            description={tSearch("emptyDescription")}
          />
        )}
        {enabled && !searchQuery.isLoading && !searchQuery.error && results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {tSearch("resultCount", { count: total })}
            </div>
            {results.map((result) => (
              <Link
                key={result.message.id}
                href={`/whatsapp/chats/${result.message.chat_id}`}
                className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {result.chat?.display_name ?? result.chat?.wa_chat_id ?? tSearch("unknownChat")}
                  </span>
                  <Badge variant="outline">{result.message.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(result.message.ts, tSearch("never"))}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {result.highlight || result.message.body || tSearch("noBody")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function WhatsAppSearchPage() {
  const t = useTranslations("whatsapp");
  return (
    <FeatureGate
      flag="whatsapp.enabled"
      fallback={
        <PageShell icon={MessageCircle} title={t("title")} subtitle={t("disabledTitle")}>
          <EmptyState
            icon={MessageCircle}
            title={t("disabledTitle")}
            description={t("disabledDescription")}
          />
        </PageShell>
      }
    >
      <WhatsAppSearchInner />
    </FeatureGate>
  );
}
