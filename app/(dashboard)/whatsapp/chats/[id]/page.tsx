"use client";
/**
 * @module app/(dashboard)/whatsapp/chats/[id]/page
 * Owner/share-scoped WhatsApp chat detail view.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, Image, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchWhatsappChatMessages,
  MOCK_MODE,
  type WhatsAppMessage,
} from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

function formatDate(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mediaLabel(message: WhatsAppMessage, fallback: string): string {
  return message.media_caption || message.media_mime || fallback;
}

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const t = useTranslations("whatsapp.detail");
  return (
    <article
      className={
        message.sender_is_me
          ? "ms-auto max-w-[82%] rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3"
          : "me-auto max-w-[82%] rounded-lg border border-border bg-card p-3"
      }
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{message.sender_is_me ? t("me") : message.sender_phone ?? t("unknownSender")}</span>
        <span>{formatDate(message.ts, t("never"))}</span>
      </div>
      {message.body && <p className="whitespace-pre-wrap text-sm">{message.body}</p>}
      {message.has_media && (
        <div className="mt-3 rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {message.media_mime?.startsWith("image/") ? (
              <Image className="size-4 text-primary" />
            ) : (
              <FileText className="size-4 text-primary" />
            )}
            {mediaLabel(message, t("media"))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {message.media_size_bytes
              ? t("bytes", { bytes: message.media_size_bytes.toLocaleString() })
              : t("mediaReady")}
          </div>
          {message.media_mime?.startsWith("image/") && MOCK_MODE && (
            <div className="mt-3 aspect-video rounded-md bg-gradient-to-br from-emerald-100 via-sky-100 to-zinc-100 dark:from-emerald-950 dark:via-sky-950 dark:to-zinc-900" />
          )}
        </div>
      )}
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-2/3" />
      <Skeleton className="ms-auto h-24 w-3/5" />
      <Skeleton className="h-16 w-1/2" />
    </div>
  );
}

function ChatDetailInner({ chatId }: { chatId: number }) {
  const t = useTranslations("whatsapp");
  const tDetail = useTranslations("whatsapp.detail");
  const messagesQuery = useQuery({
    queryKey: queryKeys.whatsapp.chatMessages(chatId, { page_size: 50 }),
    queryFn: () => fetchWhatsappChatMessages(chatId, { page_size: 50 }),
  });

  const chat = messagesQuery.data?.chat;
  const messages = messagesQuery.data?.data ?? [];
  const title = chat?.display_name ?? chat?.wa_chat_id ?? tDetail("title");

  useRegisterPageContext({
    pageKey: "whatsapp.chat.detail",
    route: `/whatsapp/chats/${chatId}`,
    summary: `WhatsApp chat detail for chat ${chatId} with ${messages.length} loaded messages.`,
    availableActions: ["view_whatsapp_message_media", "load_older_whatsapp_messages"],
  });

  return (
    <PageShell
      icon={MessageCircle}
      title={title}
      subtitle={tDetail("subtitle")}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/whatsapp">
            <ArrowLeft />
            {tDetail("back")}
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

      {chat && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t(`archive.kinds.${chat.kind}` as never)}</Badge>
          {chat.participant_count !== null && (
            <Badge variant="secondary">
              {t("archive.participants", { count: chat.participant_count })}
            </Badge>
          )}
        </div>
      )}

      <section className="rounded-lg border border-border bg-muted/20 p-3">
        {messagesQuery.isLoading && <DetailSkeleton />}
        {messagesQuery.error && !messagesQuery.isLoading && (
          <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
        )}
        {!messagesQuery.isLoading && !messagesQuery.error && messages.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title={tDetail("emptyTitle")}
            description={tDetail("emptyDescription")}
          />
        )}
        {!messagesQuery.isLoading && !messagesQuery.error && messages.length > 0 && (
          <div className="flex flex-col-reverse gap-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function WhatsAppChatDetailPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const t = useTranslations("whatsapp");

  if (!Number.isInteger(chatId) || chatId <= 0) {
    return <ErrorState error={new Error("404")} />;
  }

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
      <ChatDetailInner chatId={chatId} />
    </FeatureGate>
  );
}
