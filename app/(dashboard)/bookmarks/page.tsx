"use client";
/**
 * @module app/(dashboard)/bookmarks/page
 * Bookmarks — third vertical. Started as the "lite" contract
 * (manifest + one mutation, batch 19); promoted to add owner-only
 * delete in batch 36. The platform contract is now exercised across:
 * fetch + add (POST) + delete (DELETE) + audit emit + RBAC permission.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Bookmark as BookmarkIcon,
  Plus,
  ExternalLink,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageShell } from "@/components/shared/page-shell";
import { PlatformForm, FormActions } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import {
  fetchBookmarks,
  addBookmark,
  deleteBookmark,
  InvalidUrlError,
  MOCK_MODE,
} from "@/lib/api/bookmarks";
import { queryKeys } from "@/lib/api/query-keys";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Bookmark } from "@/lib/modules/bookmarks/types";

function MockNotice() {
  const t = useTranslations("bookmarks");
  if (!MOCK_MODE) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <AlertCircle className="size-3.5 shrink-0" />
      {t("backendNotice")}
    </div>
  );
}

function BookmarkRow({
  bookmark,
  canDelete,
  onDelete,
}: {
  bookmark: Bookmark;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("bookmarks");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  let host = bookmark.url;
  try {
    host = new URL(bookmark.url).host;
  } catch {
    /* fixture URLs are pre-validated; this is just defensive */
  }
  return (
    <div
      className="border-t border-border/40 px-5 py-3 hover:bg-muted/40 transition-colors"
      data-testid={`bookmark-row-${bookmark.id}`}
    >
      <div className="flex items-center gap-2">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 min-w-0 group"
        >
          <ExternalLink className="size-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium truncate group-hover:underline">
            {bookmark.title}
          </span>
        </a>
        <span className="text-xs text-muted-foreground/70 shrink-0">
          {formatRelativeTime(bookmark.created_at)}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label={tCommon("delete")}
            data-testid={`bookmarks-delete-${bookmark.id}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span dir="ltr" className="truncate">
          {host}
        </span>
        <span className="ms-auto">· {bookmark.added_by_name}</span>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm.body", { title: bookmark.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(bookmark.id);
                setConfirmOpen(false);
              }}
              data-testid={`bookmarks-delete-confirm-${bookmark.id}`}
            >
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddBookmarkSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("bookmarks");
  const tFields = useTranslations("bookmarks.form.fields");
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = usePlatformMutation({
    mutationFn: addBookmark,
    onSuccess: () => {
      toast.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.all() });
      onOpenChange(false);
      setTitle("");
      setUrl("");
      setError(null);
    },
    onError: (err) => {
      if (err instanceof InvalidUrlError) {
        setError(t("errors.invalidUrl"));
        return;
      }
      throw err;
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !url.trim()) return;
    mutateAsync({ title, url }).catch(() => {
      /* InvalidUrlError handled in onError */
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-6 pt-6 pb-6">
        <SheetHeader className="mb-4 px-0 pt-0">
          <SheetTitle>{t("form.title")}</SheetTitle>
          <SheetDescription>{t("form.subtitle")}</SheetDescription>
        </SheetHeader>
        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel={t("form.aria")}>
          <div className="space-y-1.5">
            <Label htmlFor="bm-title">{tFields("title")}</Label>
            <Input
              id="bm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bm-url">{tFields("url")}</Label>
            <Input
              id="bm-url"
              dir="ltr"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isPending}
              placeholder="https://example.com"
              aria-invalid={error ? true : undefined}
              required
            />
            {error && (
              <p className="text-xs text-destructive" data-testid="bookmark-url-error">
                {error}
              </p>
            )}
          </div>
          <FormActions
            submitLabel={t("form.cta")}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

export default function BookmarksPage() {
  const t = useTranslations("bookmarks");
  const { data: session } = useSession();
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bookmarks.list(),
    queryFn: fetchBookmarks,
    staleTime: 30_000,
  });

  const { mutateAsync: removeBookmark } = usePlatformMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      toast.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.all() });
    },
  });

  const items = data?.data?.items ?? [];
  const userId = session?.user?.id;

  return (
    <PageShell
      icon={BookmarkIcon}
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <Button size="sm" onClick={() => setAddOpen(true)} data-testid="bookmarks-add">
          <Plus className="size-3.5 me-1.5" />
          {t("add")}
        </Button>
      }
    >
      <MockNotice />
      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
        {t("intro")}
      </p>

      <div className="glass border-border/50 rounded-xl overflow-hidden">
        {isLoading ? null : items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          items.map((b) => (
            <BookmarkRow
              key={b.id}
              bookmark={b}
              canDelete={userId === b.added_by_id}
              onDelete={(id) => removeBookmark(id)}
            />
          ))
        )}
      </div>

      <AddBookmarkSheet open={addOpen} onOpenChange={setAddOpen} />
    </PageShell>
  );
}
