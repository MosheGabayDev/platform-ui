"use client";
/**
 * @module app/(dashboard)/whatsapp/page
 * Owner-scoped WhatsApp chat archive list.
 *
 * Data is local mock by default and switches to the platformengineer API only
 * when NEXT_PUBLIC_MOCK_API=false.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Archive,
  MessageCircle,
  MessageSquare,
  Search,
  Users,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWhatsappChats, MOCK_MODE, type WhatsAppChat } from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

type KindFilter = "all" | "private" | "group";

const KIND_FILTERS: KindFilter[] = ["all", "private", "group"];

function formatDate(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function lastPreview(chat: WhatsAppChat, fallback: string): string {
  return typeof chat.meta.last_message_preview === "string"
    ? chat.meta.last_message_preview
    : fallback;
}

function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function ChatRow({ chat }: { chat: WhatsAppChat }) {
  const t = useTranslations("whatsapp.archive");
  const name = chat.display_name ?? chat.wa_chat_id;
  const Icon = chat.kind === "group" ? Users : MessageSquare;
  return (
    <Link
      href={`/whatsapp/chats/${chat.id}`}
      className="flex min-h-24 flex-col gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{name}</h2>
            <Badge variant="outline">{t(`kinds.${chat.kind}` as never)}</Badge>
            {chat.is_muted && (
              <Badge variant="secondary" className="gap-1">
                <VolumeX className="size-3" />
                {t("muted")}
              </Badge>
            )}
            {chat.is_archived && (
              <Badge variant="secondary" className="gap-1">
                <Archive className="size-3" />
                {t("archived")}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {lastPreview(chat, t("noPreview"))}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
        <div>{formatDate(chat.last_message_at, t("never"))}</div>
        {chat.kind === "group" && chat.participant_count !== null && (
          <div className="mt-1">{t("participants", { count: chat.participant_count })}</div>
        )}
      </div>
    </Link>
  );
}

function WhatsAppArchiveInner() {
  const t = useTranslations("whatsapp");
  const tArchive = useTranslations("whatsapp.archive");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const params = useMemo(
    () => ({ q: q.trim() || undefined, kind, page: 1, page_size: 50 }),
    [q, kind],
  );

  const chatsQuery = useQuery({
    queryKey: queryKeys.whatsapp.chats(params),
    queryFn: () => fetchWhatsappChats(params),
  });

  const chats = chatsQuery.data?.data ?? [];
  const total = chatsQuery.data?.meta.total ?? 0;

  useRegisterPageContext({
    pageKey: "whatsapp.archive",
    route: "/whatsapp",
    summary: `WhatsApp archive list showing ${total} owned chats.`,
    availableActions: ["search_whatsapp_chats", "filter_whatsapp_chats"],
  });

  return (
    <PageShell
      icon={MessageCircle}
      title={tArchive("title")}
      subtitle={tArchive("subtitle")}
      stats={
        <div className="rounded-md border border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">{tArchive("total")}: </span>
          <span className="font-medium">{total}</span>
        </div>
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
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={tArchive("searchPlaceholder")}
              className="ps-8"
              data-testid="whatsapp-chat-search"
            />
          </label>
          <div className="flex shrink-0 flex-wrap gap-2">
            {KIND_FILTERS.map((value) => (
              <Button
                key={value}
                type="button"
                variant={kind === value ? "default" : "outline"}
                size="sm"
                onClick={() => setKind(value)}
                data-testid={`whatsapp-kind-${value}`}
              >
                {tArchive(`filters.${value}` as never)}
              </Button>
            ))}
          </div>
        </div>

        {chatsQuery.isLoading && <ChatListSkeleton />}
        {chatsQuery.error && !chatsQuery.isLoading && (
          <ErrorState error={chatsQuery.error} onRetry={() => chatsQuery.refetch()} />
        )}
        {!chatsQuery.isLoading && !chatsQuery.error && chats.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title={tArchive("emptyTitle")}
            description={tArchive("emptyDescription")}
          />
        )}
        {!chatsQuery.isLoading && !chatsQuery.error && chats.length > 0 && (
          <div className="space-y-2">
            {chats.map((chat) => (
              <ChatRow key={chat.id} chat={chat} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function WhatsAppArchivePage() {
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
      <WhatsAppArchiveInner />
    </FeatureGate>
  );
}
