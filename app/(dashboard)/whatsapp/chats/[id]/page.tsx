"use client";
/**
 * @module app/(dashboard)/whatsapp/chats/[id]/page
 * Owner/share-scoped WhatsApp chat detail view.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, FileText, Image, MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppShareDialog } from "@/components/modules/whatsapp/share-dialog";
import {
  fetchWhatsappChatMessages,
  fetchWhatsappMediaUrl,
  MOCK_MODE,
  sendWhatsappTextMessage,
  type WhatsAppMessage,
} from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";

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

function MediaAttachment({ message }: { message: WhatsAppMessage }) {
  const t = useTranslations("whatsapp.detail");
  const [media, setMedia] = useState<{ url: string; mime: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mime = media?.mime || message.media_mime || "";

  async function openMedia() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchWhatsappMediaUrl(message.id);
      setMedia({ url: result.url, mime: result.mime });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mediaUnavailable"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
      {media?.url && mime.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt={mediaLabel(message, t("media"))} className="mt-3 max-h-96 rounded-md object-contain" />
      )}
      {media?.url && mime.startsWith("video/") && (
        <video src={media.url} controls className="mt-3 max-h-96 w-full rounded-md" />
      )}
      {media?.url && mime.startsWith("audio/") && (
        <audio src={media.url} controls className="mt-3 w-full" />
      )}
      {media?.url && !mime.startsWith("image/") && !mime.startsWith("video/") && !mime.startsWith("audio/") && (
        <Button variant="outline" size="sm" asChild className="mt-3">
          <a href={media.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            {t("openMedia")}
          </a>
        </Button>
      )}
      {!media?.url && message.media_mime?.startsWith("image/") && MOCK_MODE && (
        <div className="mt-3 aspect-video rounded-md bg-gradient-to-br from-emerald-100 via-sky-100 to-zinc-100 dark:from-emerald-950 dark:via-sky-950 dark:to-zinc-900" />
      )}
      {!media?.url && (
        <Button variant="outline" size="sm" className="mt-3" onClick={openMedia} disabled={isLoading}>
          <ExternalLink />
          {isLoading ? t("loadingMedia") : t("openMedia")}
        </Button>
      )}
      {error && <div className="mt-2 text-xs text-destructive">{t("mediaUnavailable")}</div>}
    </div>
  );
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
      {message.has_media && <MediaAttachment message={message} />}
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
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const messagesQuery = useQuery({
    queryKey: queryKeys.whatsapp.chatMessages(chatId, { page_size: 50 }),
    queryFn: () => fetchWhatsappChatMessages(chatId, { page_size: 50 }),
  });

  const chat = messagesQuery.data?.chat;
  const messages = messagesQuery.data?.data ?? [];
  const sendMutation = usePlatformMutation({
    mutationFn: async () => {
      const body = draft.trim();
      if (!body) throw new Error(tDetail("emptyBody"));
      if (!chat?.wa_chat_id) throw new Error(tDetail("sendUnavailable"));
      return sendWhatsappTextMessage({ to: chat.wa_chat_id, body });
    },
    invalidateKeys: [queryKeys.whatsapp.chatMessages(chatId, { page_size: 50 })],
    onSuccess: () => {
      setDraft("");
      toast.success(tDetail("sent"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp.all() });
    },
    onError: (err) => toast.error(err.message ?? tDetail("sendFailed")),
  });
  // Batch 161 review RV-159-13 — never expose raw `wa_chat_id` as the
  // page title. The wa_chat_id format is `<E164-digits>@c.us` for
  // private chats — leaking it as a page heading is a PII regression
  // (search history, browser tab title, screenshare). Fall back to
  // the generic "WhatsApp chat" label when no human display_name is
  // available. wa_chat_id stays visible in the metadata badges below
  // for the chat owner, where it has debugging value.
  const title = chat?.display_name ?? tDetail("title");

  useRegisterPageContext({
    pageKey: "whatsapp.chat.detail",
    route: `/whatsapp/chats/${chatId}`,
    summary: `WhatsApp chat detail for chat ${chatId} with ${messages.length} loaded messages.`,
    availableActions: ["view_whatsapp_message_media", "load_older_whatsapp_messages", "share_whatsapp_chat"],
  });

  return (
    <PageShell
      icon={MessageCircle}
      title={title}
      subtitle={tDetail("subtitle")}
      actions={
        <div className="flex flex-wrap gap-2">
          {chat && chat.access_kind !== "shared" && <WhatsAppShareDialog chat={chat} />}
          <Button variant="outline" size="sm" asChild>
            <Link href="/whatsapp">
              <ArrowLeft />
              {tDetail("back")}
            </Link>
          </Button>
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

      {chat && (
        <>
          {chat.access_kind === "shared" && <WhatsAppShareDialog chat={chat} />}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t(`archive.kinds.${chat.kind}` as never)}</Badge>
            {chat.access_kind === "owner" && <Badge variant="secondary">{t("share.ownerBadge")}</Badge>}
            {chat.participant_count !== null && (
              <Badge variant="secondary">
                {t("archive.participants", { count: chat.participant_count })}
              </Badge>
            )}
          </div>
        </>
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
      {chat?.access_kind !== "shared" && (
        <form
          className="rounded-lg border border-border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            sendMutation.mutate(undefined as never);
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tDetail("composerPlaceholder")}
            className="min-h-24 resize-y"
            maxLength={4096}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{draft.trim().length}/4096</span>
            <Button type="submit" disabled={!draft.trim() || sendMutation.isPending}>
              <Send />
              {sendMutation.isPending ? tDetail("sending") : tDetail("send")}
            </Button>
          </div>
        </form>
      )}
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
