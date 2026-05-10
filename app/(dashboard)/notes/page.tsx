"use client";
/**
 * @module app/(dashboard)/notes/page
 * Notes — second vertical module that proves the platform plumbing
 * (PageShell + PlatformForm + usePlatformMutation + DataTable +
 * PermissionGate + queryKeys) is fully decoupled from Helpdesk.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.15.
 *
 * RBAC: any authenticated user can read + write their own notes. Delete
 * is owner-only — backend enforces; UI hides the button when
 * `note.author_id !== session.user.id`.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { NotebookText, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  fetchNotes,
  addNote,
  updateNote,
  deleteNote,
  MOCK_MODE,
} from "@/lib/api/notes";
import { queryKeys } from "@/lib/api/query-keys";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Note } from "@/lib/modules/notes/types";

function MockNotice() {
  const t = useTranslations("notes");
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

function NoteRow({
  note,
  canMutate,
  onDelete,
  onEdit,
}: {
  note: Note;
  canMutate: boolean;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
}) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="border-t border-border/40 px-5 py-4 space-y-2">
      <div className="flex items-start gap-2">
        <h3 className="text-sm font-semibold flex-1">{note.title}</h3>
        <span className="text-xs text-muted-foreground/70 shrink-0">
          {formatRelativeTime(note.updated_at)}
        </span>
        {canMutate && (
          <>
            <button
              type="button"
              onClick={() => onEdit(note)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={t("edit")}
              data-testid={`notes-edit-${note.id}`}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={t("delete")}
              data-testid={`notes-delete-${note.id}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-border/50 bg-muted text-muted-foreground"
          >
            #{tag}
          </span>
        ))}
        <span className="ms-auto text-xs text-muted-foreground">
          · {note.author_name}
        </span>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm.body", { title: note.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(note.id);
                setConfirmOpen(false);
              }}
              data-testid={`notes-delete-confirm-${note.id}`}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddNoteSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("notes");
  const tFields = useTranslations("notes.form.fields");
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const { mutateAsync, isPending } = usePlatformMutation({
    mutationFn: addNote,
    onSuccess: () => {
      toast.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
      onOpenChange(false);
      setTitle("");
      setBody("");
      setTagsRaw("");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const tags = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    mutateAsync({ title: title.trim(), body: body.trim(), tags });
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
            <Label htmlFor="note-title">{tFields("title")}</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-body">{tFields("body")}</Label>
            <Textarea
              id="note-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-tags">{tFields("tags")}</Label>
            <Input
              id="note-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              disabled={isPending}
              placeholder="meeting, Q3"
            />
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

function EditNoteSheet({
  note,
  onOpenChange,
}: {
  note: Note | null;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("notes");
  const tFields = useTranslations("notes.form.fields");
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tagsRaw, setTagsRaw] = useState(note?.tags.join(", ") ?? "");

  // Reset form when target note changes (open/close cycle).
  useEffect(() => {
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
    setTagsRaw(note?.tags.join(", ") ?? "");
  }, [note]);

  const { mutateAsync, isPending } = usePlatformMutation({
    mutationFn: ({ id, input }: { id: string; input: { title: string; body: string; tags: string[] } }) =>
      updateNote(id, input),
    onSuccess: () => {
      toast.success(t("savedEdit"));
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
      onOpenChange(false);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    if (!title.trim() || !body.trim()) return;
    const tags = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    mutateAsync({ id: note.id, input: { title: title.trim(), body: body.trim(), tags } });
  };

  return (
    <Sheet open={note !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-6 pt-6 pb-6">
        <SheetHeader className="mb-4 px-0 pt-0">
          <SheetTitle>{t("editForm.title")}</SheetTitle>
          <SheetDescription>{t("editForm.subtitle")}</SheetDescription>
        </SheetHeader>
        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel={t("editForm.aria")}>
          <div className="space-y-1.5">
            <Label htmlFor="note-edit-title">{tFields("title")}</Label>
            <Input
              id="note-edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-edit-body">{tFields("body")}</Label>
            <Textarea
              id="note-edit-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-edit-tags">{tFields("tags")}</Label>
            <Input
              id="note-edit-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              disabled={isPending}
              placeholder="meeting, Q3"
            />
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

export default function NotesPage() {
  const t = useTranslations("notes");
  const { data: session } = useSession();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notes.list(),
    queryFn: fetchNotes,
    staleTime: 30_000,
  });

  const { mutateAsync: removeNote } = usePlatformMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      toast.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
    },
  });

  const items = data?.data?.items ?? [];
  const userId = session?.user?.id;

  return (
    <PageShell
      icon={NotebookText}
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <Button size="sm" onClick={() => setAddOpen(true)} data-testid="notes-add">
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
          items.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              canMutate={userId === note.author_id}
              onDelete={(id) => removeNote(id)}
              onEdit={(n) => setEditing(n)}
            />
          ))
        )}
      </div>

      <AddNoteSheet open={addOpen} onOpenChange={setAddOpen} />
      <EditNoteSheet
        note={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </PageShell>
  );
}
