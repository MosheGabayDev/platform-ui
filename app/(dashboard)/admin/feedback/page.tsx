"use client";
/**
 * @module app/(dashboard)/admin/feedback/page
 * Customer-feedback aggregator — pilot programme support surface.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §7 task 10.05.
 *
 * Mock-mode:
 *   - Reads/writes the feedback list via `lib/api/feedback.ts` which
 *     persists to localStorage. 3 fixture items show what real intake
 *     looks like (pilot-call / email / in-app) so triage flow is
 *     demoable end-to-end.
 *   - When Linear/GitHub integration ships, the mock client gets
 *     swapped per the standard MOCK_MODE flip pattern; this page
 *     does not change.
 *
 * RBAC: read = any admin (is_admin). Write (manual add) = system_admin
 * only — feedback gets wired to backlog tooling that touches another
 * system, so we keep that gate tight.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MessageSquare, Plus, ExternalLink, AlertCircle } from "lucide-react";
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
import { PageShell } from "@/components/shared/page-shell";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PlatformForm, FormActions } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { fetchFeedback, addFeedback, MOCK_MODE } from "@/lib/api/feedback";
import { queryKeys } from "@/lib/api/query-keys";
import { formatRelativeTime } from "@/lib/utils/format";
import type {
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
} from "@/lib/modules/feedback/types";

const TYPE_BADGE: Record<FeedbackType, string> = {
  bug: "bg-destructive/10 text-destructive border-destructive/30",
  feature: "bg-primary/10 text-primary border-primary/30",
  insight: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  triaged: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  converted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  duplicate: "bg-muted text-muted-foreground border-border",
  wontFix: "bg-muted text-muted-foreground border-border",
};

function MockNotice() {
  const t = useTranslations("admin.feedback");
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

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const tType = useTranslations("admin.feedback.filters");
  const tStatus = useTranslations("admin.feedback.status");
  return (
    <div className="border-t border-border/40 px-5 py-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${TYPE_BADGE[item.type]}`}>
          {tType(item.type)}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${STATUS_BADGE[item.status]}`}>
          {tStatus(item.status)}
        </span>
        <span className="text-xs text-muted-foreground">{item.source}</span>
        <span className="text-xs text-muted-foreground/70 ms-auto">{formatRelativeTime(item.received_at)}</span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {item.reporter && <span>· {item.reporter}</span>}
        {item.backlog_link && (
          <a href={item.backlog_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="size-3" />
            backlog
          </a>
        )}
      </div>
    </div>
  );
}

function AddFeedbackSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("admin.feedback");
  const tFields = useTranslations("admin.feedback.form.fields");
  const tType = useTranslations("admin.feedback.filters");
  const queryClient = useQueryClient();

  const [source, setSource] = useState("manual");
  const [type, setType] = useState<FeedbackType>("feature");
  const [content, setContent] = useState("");
  const [reporter, setReporter] = useState("");

  const { mutateAsync, isPending } = usePlatformMutation({
    mutationFn: addFeedback,
    onSuccess: () => {
      toast.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all() });
      onOpenChange(false);
      setContent("");
      setReporter("");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutateAsync({ source, type, content: content.trim(), reporter: reporter.trim() || null });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-6 pt-6 pb-6">
        <SheetHeader className="mb-4 px-0 pt-0">
          <SheetTitle>{t("form.title")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>
        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel={t("form.aria")}>
          <div className="space-y-1.5">
            <Label htmlFor="fb-source">{tFields("source")}</Label>
            <Input
              id="fb-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-type">{tFields("type")}</Label>
            <select
              id="fb-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bug">{tType("bug")}</option>
              <option value="feature">{tType("feature")}</option>
              <option value="insight">{tType("insight")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-content">{tFields("content")}</Label>
            <Textarea
              id="fb-content"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-reporter">{tFields("reporter")}</Label>
            <Input
              id="fb-reporter"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              disabled={isPending}
              dir="ltr"
              placeholder="alice@customer.com"
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

export default function FeedbackPage() {
  const t = useTranslations("admin.feedback");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.feedback.list(),
    queryFn: fetchFeedback,
    staleTime: 30_000,
  });

  const items = data?.data?.items ?? [];

  return (
    <PageShell
      icon={MessageSquare}
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <PermissionGate role="system_admin">
          <Button size="sm" onClick={() => setAddOpen(true)} data-testid="feedback-add">
            <Plus className="size-3.5 me-1.5" />
            {t("add")}
          </Button>
        </PermissionGate>
      }
    >
      <MockNotice />
      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{t("intro")}</p>

      <div className="glass border-border/50 rounded-xl overflow-hidden">
        {isLoading ? null : items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          items.map((item) => <FeedbackRow key={item.id} item={item} />)
        )}
      </div>

      <PermissionGate role="system_admin">
        <AddFeedbackSheet open={addOpen} onOpenChange={setAddOpen} />
      </PermissionGate>
    </PageShell>
  );
}
