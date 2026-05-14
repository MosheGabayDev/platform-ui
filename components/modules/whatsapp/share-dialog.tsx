"use client";
/**
 * @module components/modules/whatsapp/share-dialog
 * Chat-detail sharing controls for owned WhatsApp archive chats.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LogOut, Share2, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/shared/permission-gate";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import {
  fetchWhatsappChatShares,
  revokeWhatsappShare,
  searchWhatsappShareRecipients,
  shareWhatsappChat,
  type WhatsAppChat,
  type WhatsAppChatShare,
  type WhatsAppShareUserOption,
} from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";

function displayUser(user: WhatsAppShareUserOption | WhatsAppChatShare): string {
  if ("display_name" in user) return user.display_name ?? user.email ?? `#${user.id}`;
  return user.shared_with_user_name ?? user.shared_with_user_email ?? `#${user.shared_with_user_id}`;
}

function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WhatsAppShareDialog({ chat }: { chat: WhatsAppChat }) {
  const t = useTranslations("whatsapp.share");
  const tErrors = useTranslations("whatsapp.errors");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<WhatsAppShareUserOption | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  const isSharedChat = chat.access_kind === "shared";

  const sharesQuery = useQuery({
    queryKey: queryKeys.whatsapp.chatShares(chat.id),
    queryFn: () => fetchWhatsappChatShares(chat.id),
    enabled: !isSharedChat,
    retry: false,
  });

  const recipientsQuery = useQuery({
    queryKey: queryKeys.whatsapp.shareRecipients(query.trim()),
    queryFn: () => searchWhatsappShareRecipients(query.trim()),
    enabled: open && query.trim().length >= 2,
  });

  const shares = sharesQuery.data?.data ?? [];
  const activeRecipientIds = useMemo(
    () => new Set(shares.map((share) => share.shared_with_user_id)),
    [shares],
  );

  const shareMutation = usePlatformMutation({
    mutationFn: () =>
      shareWhatsappChat(chat.id, {
        shared_with_user_id: selected?.id ?? 0,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        note: note.trim() || null,
      }),
    invalidateKeys: [queryKeys.whatsapp.chatShares(chat.id), queryKeys.whatsapp.all()],
    onSuccess: () => {
      toast.success(t("created"));
      setSelected(null);
      setQuery("");
      setExpiresAt("");
      setNote("");
    },
    onError: (err) => toast.error(err.message || tErrors("shareFailed")),
  });

  const revokeMutation = usePlatformMutation({
    mutationFn: revokeWhatsappShare,
    invalidateKeys: [queryKeys.whatsapp.chatShares(chat.id), queryKeys.whatsapp.all()],
    onSuccess: () => toast.success(t("revoked")),
    onError: (err) => toast.error(err.message || tErrors("revokeShareFailed")),
  });

  if (isSharedChat) {
    const shareId = chat.share?.id;

    return (
      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="size-3" />
              {t("sharedBadge")}
            </Badge>
            <span className="text-muted-foreground">
              {t("sharedBy", {
                user: chat.share?.shared_by_user_name ?? chat.share?.shared_by_user_email ?? t("unknownUser"),
                date: formatDate(chat.share?.created_at ?? null, t("unknownDate")),
              })}
            </span>
            <span className="text-muted-foreground">
              {t("expires", { date: formatDate(chat.share?.expires_at ?? null, t("never")) })}
            </span>
          </div>
          {shareId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate(shareId)}
            >
              <LogOut />
              {t("revokeMyAccess")}
            </Button>
          )}
        </div>
        {chat.share?.note && <p className="mt-2 text-muted-foreground">{chat.share.note}</p>}
      </div>
    );
  }

  if (sharesQuery.error) return null;

  // Batch 160 — gate the Share trigger behind whatsapp.share (review HIGH #2).
  // Previously the button rendered for anyone with whatsapp.access, which is
  // overly permissive: a viewer-tier user could leak chat content cross-team
  // without an admin restriction lever. PermissionGate renders nothing when
  // denied — owners without the permission simply don't see the button, and
  // the chat detail page continues to work for them as read-only.
  return (
    <PermissionGate permission="whatsapp.share">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={sharesQuery.isLoading}>
            <Share2 />
            {t("button")}
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">{t("activeTitle")}</div>
            {sharesQuery.isLoading && <Skeleton className="h-12 w-full" />}
            {!sharesQuery.isLoading && shares.length === 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {t("empty")}
              </div>
            )}
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{displayUser(share)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("expires", { date: formatDate(share.expires_at, t("never")) })}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(share.id)}
                  aria-label={t("revoke")}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">{t("newTitle")}</div>
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              placeholder={t("recipientPlaceholder")}
            />
            {query.trim().length >= 2 && (
              <div className="max-h-40 overflow-auto rounded-md border border-border">
                {recipientsQuery.isLoading && <div className="p-3 text-sm">{t("searching")}</div>}
                {!recipientsQuery.isLoading &&
                  (recipientsQuery.data?.data ?? []).map((user) => {
                    const disabled = activeRecipientIds.has(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelected(user)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="min-w-0 truncate">{displayUser(user)}</span>
                        {selected?.id === user.id && <Badge variant="secondary">{t("selected")}</Badge>}
                        {disabled && <Badge variant="outline">{t("alreadyShared")}</Badge>}
                      </button>
                    );
                  })}
                {!recipientsQuery.isLoading && (recipientsQuery.data?.data ?? []).length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">{t("noRecipients")}</div>
                )}
              </div>
            )}
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              aria-label={t("expiresAt")}
            />
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={500}
            />
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => shareMutation.mutate(undefined as never)}
            disabled={!selected || shareMutation.isPending}
          >
            <Share2 />
            {shareMutation.isPending ? t("sharing") : t("share")}
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}
