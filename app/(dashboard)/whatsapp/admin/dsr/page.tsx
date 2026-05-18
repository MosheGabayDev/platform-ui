"use client";
/**
 * @module app/(dashboard)/whatsapp/admin/dsr/page
 * Admin console for WhatsApp delete-by-subject DSR jobs.
 */

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eraser, History, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { PermissionGate } from "@/components/shared/permission-gate";
import {
  approveWhatsappDsr,
  deleteWhatsappDsr,
  fetchWhatsappDsrHistory,
  fetchWhatsappDsrStatus,
  MOCK_MODE,
  previewWhatsappDsr,
  type WhatsAppDsrJob,
  type WhatsAppDsrPreview,
} from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

const PERMISSION = "whatsapp.delete_by_subject";

function formatDate(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StateBadge({ state }: { state: WhatsAppDsrJob["state"] }) {
  const t = useTranslations("whatsapp.dsr.states");
  const variant =
    state === "failed" ? "destructive" : state === "soft_deleted" ? "default" : "secondary";
  return <Badge variant={variant}>{t(state as never)}</Badge>;
}

function PreviewPanel({ preview }: { preview: WhatsAppDsrPreview }) {
  const t = useTranslations("whatsapp.dsr");
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("preview.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.phone_masked} · {preview.phone_hash}
          </p>
        </div>
        {preview.requires_second_approval && (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="size-3" />
            {t("preview.secondApproval")}
          </Badge>
        )}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("metrics.messages")} value={preview.message_count} />
        <Metric label={t("metrics.senderMatches")} value={preview.match_count_as_sender} />
        <Metric label={t("metrics.chats")} value={preview.chats_involved} />
        <Metric label={t("metrics.media")} value={preview.media_count} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
          <dt className="text-muted-foreground">{t("metrics.oldest")}</dt>
          <dd>{formatDate(preview.oldest_ts, t("never"))}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
          <dt className="text-muted-foreground">{t("metrics.newest")}</dt>
          <dd>{formatDate(preview.newest_ts, t("never"))}</dd>
        </div>
      </dl>
    </section>
  );
}

function JobRow({ job, onSelect }: { job: WhatsAppDsrJob; onSelect: (id: string) => void }) {
  const t = useTranslations("whatsapp.dsr");
  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{job.id}</span>
        <StateBadge state={job.state} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>{job.phone_masked}</span>
        <span className="text-muted-foreground">{formatDate(job.created_at, t("never"))}</span>
      </div>
    </button>
  );
}

function WhatsAppDsrInner() {
  const t = useTranslations("whatsapp.dsr");
  const tRoot = useTranslations("whatsapp");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WhatsAppDsrPreview | null>(null);

  const historyParams = useMemo(() => ({ page: 1, page_size: 20 }), []);
  const historyQuery = useQuery({
    queryKey: queryKeys.whatsapp.dsrHistory(historyParams),
    queryFn: () => fetchWhatsappDsrHistory(historyParams),
  });

  const statusQuery = useQuery({
    queryKey: selectedJobId
      ? queryKeys.whatsapp.dsrStatus(selectedJobId)
      : ["whatsapp", "dsr", "status", "idle"],
    queryFn: () => fetchWhatsappDsrStatus(selectedJobId as string),
    enabled: selectedJobId !== null,
  });

  const previewMutation = usePlatformMutation({
    mutationFn: previewWhatsappDsr,
    onSuccess: (data) => setPreview(data.preview),
    onError: (err) => toast.error(err.message ?? t("errors.preview")),
  });

  const deleteMutation = usePlatformMutation({
    mutationFn: deleteWhatsappDsr,
    invalidateKeys: [queryKeys.whatsapp.all()],
    onSuccess: (data) => {
      toast.success(t("toasts.queued"));
      setSelectedJobId(data.job_id);
      setAcknowledged(false);
      void historyQuery.refetch();
    },
    onError: (err) => toast.error(err.message ?? t("errors.delete")),
  });

  const approveMutation = usePlatformMutation({
    mutationFn: approveWhatsappDsr,
    invalidateKeys: [queryKeys.whatsapp.all()],
    onSuccess: (data) => {
      toast.success(t("toasts.approved"));
      setSelectedJobId(data.job_id);
      void historyQuery.refetch();
      void statusQuery.refetch();
    },
    onError: (err) => toast.error(err.message ?? t("errors.approve")),
  });

  useRegisterPageContext({
    pageKey: "whatsapp.dsr",
    route: "/whatsapp/admin/dsr",
    summary: "WhatsApp DSR console for previewing and requesting subject erasure jobs.",
    availableActions: ["preview_whatsapp_subject_erasure", "delete_whatsapp_subject"],
  });

  function onPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    previewMutation.mutate({ phone: phone.trim() });
  }

  function onDelete() {
    deleteMutation.mutate({
      phone: phone.trim(),
      reason: reason.trim(),
      acknowledge_irreversible: acknowledged,
    });
  }

  function onApprove() {
    if (!selectedJobId) return;
    approveMutation.mutate({ job_id: selectedJobId, phone: phone.trim() });
  }

  const canDelete =
    Boolean(preview) && phone.trim().length > 0 && reason.trim().length > 0 && acknowledged;

  return (
    <PageShell icon={Eraser} title={t("title")} subtitle={t("subtitle")}>
      {MOCK_MODE && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          {tRoot("toasts.backendNotice")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <form onSubmit={onPreview} className="rounded-lg border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("fields.phone")}</span>
                <Input
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setPreview(null);
                  }}
                  placeholder={t("fields.phonePlaceholder")}
                  autoComplete="tel"
                />
              </label>
              <Button type="submit" disabled={previewMutation.isPending || !phone.trim()}>
                {previewMutation.isPending && <Loader2 className="animate-spin" />}
                {t("actions.preview")}
              </Button>
            </div>
          </form>

          {preview && <PreviewPanel preview={preview} />}

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">{t("fields.reason")}</span>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-border"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>{t("fields.acknowledge")}</span>
              </label>
              <PermissionGate permission={PERMISSION}>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canDelete || deleteMutation.isPending}
                  onClick={onDelete}
                >
                  {deleteMutation.isPending && <Loader2 className="animate-spin" />}
                  {t("actions.delete")}
                </Button>
              </PermissionGate>
            </div>
          </section>

          {selectedJobId && (
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{t("status.title")}</h2>
                {statusQuery.data && <StateBadge state={statusQuery.data.state} />}
              </div>
              {statusQuery.isLoading && <Skeleton className="h-24 w-full" />}
              {statusQuery.error && !statusQuery.isLoading && (
                <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
              )}
              {statusQuery.data && (
                <div className="space-y-3">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <dt className="text-muted-foreground">{t("status.phone")}</dt>
                      <dd>{statusQuery.data.phone_masked}</dd>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <dt className="text-muted-foreground">{t("status.recoveryUntil")}</dt>
                      <dd>{formatDate(statusQuery.data.recovery_until, t("never"))}</dd>
                    </div>
                  </dl>
                  {statusQuery.data.state === "awaiting_second_approval" && (
                    <PermissionGate permission={PERMISSION}>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={!phone.trim() || approveMutation.isPending}
                        onClick={onApprove}
                      >
                        {approveMutation.isPending && <Loader2 className="animate-spin" />}
                        {t("actions.approve")}
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-muted-foreground" />
            {t("history.title")}
          </div>
          {historyQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {historyQuery.error && !historyQuery.isLoading && (
            <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
          )}
          {!historyQuery.isLoading &&
            !historyQuery.error &&
            (historyQuery.data?.data.length ?? 0) === 0 && (
              <EmptyState
                icon={History}
                title={t("history.emptyTitle")}
                description={t("history.emptyDescription")}
              />
            )}
          <div className="space-y-2">
            {historyQuery.data?.data.map((job) => (
              <JobRow key={job.id} job={job} onSelect={setSelectedJobId} />
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export default function WhatsAppDsrPage() {
  const t = useTranslations("whatsapp");
  return (
    <FeatureGate
      flag="whatsapp.enabled"
      fallback={
        <PageShell icon={Eraser} title={t("title")} subtitle={t("disabledTitle")}>
          <EmptyState
            icon={Eraser}
            title={t("disabledTitle")}
            description={t("disabledDescription")}
          />
        </PageShell>
      }
    >
      <PermissionGate permission={PERMISSION} fallback={<RestrictedFallback />}>
        <WhatsAppDsrInner />
      </PermissionGate>
    </FeatureGate>
  );
}

function RestrictedFallback() {
  const t = useTranslations("whatsapp.dsr");
  return (
    <PageShell icon={Eraser} title={t("title")} subtitle={t("restricted.subtitle")}>
      <EmptyState
        icon={ShieldAlert}
        title={t("restricted.title")}
        description={t("restricted.description")}
      />
    </PageShell>
  );
}
