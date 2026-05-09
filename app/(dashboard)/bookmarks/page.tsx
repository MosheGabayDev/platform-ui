"use client";
/**
 * @module app/(dashboard)/bookmarks/page
 * Bookmarks — third vertical (lite). Spec + manifest + ONE mutation
 * (add). No edit, no delete in this scope — explicitly minimal so we
 * exercise the manifest + queryKeys + PlatformForm surface end-to-end
 * without domain logic noise.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bookmark as BookmarkIcon, Plus, ExternalLink, AlertCircle } from "lucide-react";
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
import { PageShell } from "@/components/shared/page-shell";
import { PlatformForm, FormActions } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import {
  fetchBookmarks,
  addBookmark,
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

function BookmarkRow({ bookmark }: { bookmark: Bookmark }) {
  let host = bookmark.url;
  try {
    host = new URL(bookmark.url).host;
  } catch {
    /* fixture URLs are pre-validated; this is just defensive */
  }
  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-t border-border/40 px-5 py-3 hover:bg-muted/40 transition-colors"
      data-testid={`bookmark-row-${bookmark.id}`}
    >
      <div className="flex items-center gap-2">
        <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">{bookmark.title}</span>
        <span className="text-xs text-muted-foreground/70 shrink-0">
          {formatRelativeTime(bookmark.created_at)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span dir="ltr" className="truncate">
          {host}
        </span>
        <span className="ms-auto">· {bookmark.added_by_name}</span>
      </div>
    </a>
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
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bookmarks.list(),
    queryFn: fetchBookmarks,
    staleTime: 30_000,
  });

  const items = data?.data?.items ?? [];

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
          items.map((b) => <BookmarkRow key={b.id} bookmark={b} />)
        )}
      </div>

      <AddBookmarkSheet open={addOpen} onOpenChange={setAddOpen} />
    </PageShell>
  );
}
