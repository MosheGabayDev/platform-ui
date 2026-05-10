"use client";
/**
 * @module app/(dashboard)/whatsapp/sessions/page
 * Self-service WhatsApp session lifecycle.
 *
 * Platform contract (batch 38 refactor):
 *   - PageShell + EmptyState + ErrorState (shared primitives)
 *   - usePlatformMutation (no raw useMutation)
 *   - PermissionGate around mutation buttons (whatsapp.session.manage)
 *   - shadcn Dialog for unlink confirmation (no window.confirm — ADR-028 #6)
 *   - All UI strings via next-intl
 *   - MOCK_MODE shim with audit emit on every mutation
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md (whatsapp parity).
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircle,
  MessageCircle,
  QrCode,
  RefreshCw,
  Smartphone,
  Unlink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { PermissionGate } from "@/components/shared/permission-gate";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import {
  fetchWhatsappSessionQr,
  fetchWhatsappSessions,
  linkWhatsappSession,
  relinkWhatsappSession,
  unlinkWhatsappSession,
  MOCK_MODE,
  type WhatsAppSession,
  type WhatsAppSessionState,
} from "@/lib/api/whatsapp";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

const ACTIVE_STATES: WhatsAppSessionState[] = [
  "needs_qr",
  "connecting",
  "ready",
  "disconnected",
  "failed",
];

const STATE_TONE: Record<WhatsAppSessionState, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  connecting: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  needs_qr: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  disconnected: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  unlinked: "border-border bg-muted text-muted-foreground",
};

function formatDate(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function MockNotice() {
  const t = useTranslations("whatsapp.toasts");
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

function WhatsAppSessionsInner() {
  const t = useTranslations("whatsapp");
  const tToasts = useTranslations("whatsapp.toasts");
  const tErrors = useTranslations("whatsapp.errors");
  const queryClient = useQueryClient();
  const [qrSessionId, setQrSessionId] = useState<number | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<number | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.whatsapp.sessions(),
    queryFn: fetchWhatsappSessions,
  });

  const sessions = sessionsQuery.data?.data ?? [];
  const activeSession = useMemo(
    () => sessions.find((s) => ACTIVE_STATES.includes(s.session_state)),
    [sessions],
  );

  const qrQuery = useQuery({
    queryKey: qrSessionId
      ? queryKeys.whatsapp.sessionQr(qrSessionId)
      : ["whatsapp", "qr", "idle"],
    queryFn: () => fetchWhatsappSessionQr(qrSessionId as number),
    enabled: qrSessionId !== null,
    refetchInterval: qrSessionId !== null ? 3_000 : false,
  });

  const linkMutation = usePlatformMutation({
    mutationFn: linkWhatsappSession,
    invalidateKeys: [queryKeys.whatsapp.all()],
    onSuccess: (data) => {
      toast.success(tToasts("started"));
      setQrSessionId(data.session_id);
    },
    onError: (err) => toast.error(err.message ?? tErrors("startFailed")),
  });

  const relinkMutation = usePlatformMutation({
    mutationFn: relinkWhatsappSession,
    invalidateKeys: [queryKeys.whatsapp.all()],
    onSuccess: (data) => {
      toast.success(tToasts("relinkRequested"));
      setQrSessionId(data.session_id);
    },
    onError: (err) => toast.error(err.message ?? tErrors("relinkFailed")),
  });

  const unlinkMutation = usePlatformMutation({
    mutationFn: unlinkWhatsappSession,
    invalidateKeys: [queryKeys.whatsapp.all()],
    onSuccess: () => {
      toast.success(tToasts("unlinked"));
      setQrSessionId(null);
      setUnlinkTarget(null);
    },
    onError: (err) => toast.error(err.message ?? tErrors("unlinkFailed")),
  });

  useEffect(() => {
    if (qrQuery.data?.session_state === "ready") {
      const phone = qrQuery.data.connected_phone;
      toast.success(phone ? tToasts("linkedAs", { phone }) : tToasts("linked"));
      setQrSessionId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp.all() });
    }
  }, [qrQuery.data?.session_state, qrQuery.data?.connected_phone, queryClient, tToasts]);

  useRegisterPageContext({
    pageKey: "whatsapp.sessions",
    route: "/whatsapp/sessions",
    summary: activeSession
      ? `WhatsApp session ${activeSession.id} is ${activeSession.session_state}.`
      : "WhatsApp sessions page with no active linked session.",
    availableActions: ["link_whatsapp", "relink_whatsapp", "unlink_whatsapp"],
  });

  const stateLabel = (state: WhatsAppSessionState): string =>
    t(`states.${state}` as never);

  return (
    <PageShell icon={MessageCircle} title={t("title")} subtitle={t("subtitle")}>
      <MockNotice />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-border bg-card p-4">
          {sessionsQuery.isLoading && <SessionSkeleton />}
          {sessionsQuery.error && !sessionsQuery.isLoading && (
            <ErrorState
              error={sessionsQuery.error}
              onRetry={() => sessionsQuery.refetch()}
            />
          )}
          {!sessionsQuery.isLoading && !sessionsQuery.error && !activeSession && (
            <PermissionGate
              permission="whatsapp.session.manage"
              fallback={
                <EmptyState
                  icon={QrCode}
                  title={t("empty.title")}
                  description={t("empty.description")}
                />
              }
            >
              <EmptyState
                icon={QrCode}
                title={t("empty.title")}
                description={t("empty.description")}
                action={{
                  label: linkMutation.isPending ? t("empty.linking") : t("empty.cta"),
                  onClick: () => linkMutation.mutate(undefined as never),
                }}
              />
            </PermissionGate>
          )}
          {activeSession && (
            <SessionPanel
              session={activeSession}
              busy={relinkMutation.isPending || unlinkMutation.isPending}
              onRelink={() => relinkMutation.mutate(activeSession.id)}
              onUnlink={() => setUnlinkTarget(activeSession.id)}
              onShowQr={() => setQrSessionId(activeSession.id)}
              stateLabel={stateLabel}
            />
          )}
        </section>

        <aside className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="size-4 text-muted-foreground" />
            {t("metrics.captureStatus")}
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label={t("metrics.sessions")} value={String(sessions.length)} />
            <InfoRow
              label={t("metrics.activeState")}
              value={
                activeSession ? stateLabel(activeSession.session_state) : t("metrics.none")
              }
            />
            <InfoRow
              label={t("metrics.heartbeat")}
              value={formatDate(activeSession?.last_heartbeat_at ?? null, t("metrics.never"))}
            />
          </dl>
        </aside>
      </div>

      <Dialog
        open={qrSessionId !== null}
        onOpenChange={(open) => !open && setQrSessionId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("qrDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("qrDialog.descriptionPrefix")}
              {qrQuery.data?.session_state
                ? stateLabel(qrQuery.data.session_state)
                : stateLabel("connecting")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
            {qrQuery.isLoading && <Skeleton className="size-56" />}
            {qrQuery.data?.qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrQuery.data.qr}
                alt={t("qrDialog.alt")}
                className="size-56 rounded-md bg-white p-2"
              />
            )}
            {!qrQuery.isLoading && !qrQuery.data?.qr && (
              <div className="text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 size-5 animate-spin" />
                {t("qrDialog.waiting")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => !open && setUnlinkTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unlinkConfirm.title")}</DialogTitle>
            <DialogDescription>{t("unlinkConfirm.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)}>
              {t("panel.unlink")}
            </Button>
            <Button
              variant="destructive"
              disabled={unlinkMutation.isPending}
              onClick={() => {
                if (unlinkTarget !== null) unlinkMutation.mutate(unlinkTarget);
              }}
              data-testid="whatsapp-unlink-confirm"
            >
              {t("unlinkConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function SessionPanel({
  session,
  busy,
  onRelink,
  onUnlink,
  onShowQr,
  stateLabel,
}: {
  session: WhatsAppSession;
  busy: boolean;
  onRelink: () => void;
  onUnlink: () => void;
  onShowQr: () => void;
  stateLabel: (s: WhatsAppSessionState) => string;
}) {
  const t = useTranslations("whatsapp");
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t("panel.heading")}</h2>
            <Badge className={STATE_TONE[session.session_state]}>
              {stateLabel(session.session_state)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.connected_phone ?? t("panel.phonePlaceholder")}
          </p>
        </div>
        <PermissionGate permission="whatsapp.session.manage">
          <div className="flex flex-wrap gap-2">
            {(session.session_state === "needs_qr" ||
              session.session_state === "connecting") && (
              <Button variant="outline" onClick={onShowQr} data-testid="whatsapp-show-qr">
                <QrCode />
                {t("panel.showQr")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onRelink}
              disabled={busy}
              data-testid="whatsapp-relink"
            >
              <RefreshCw />
              {t("panel.relink")}
            </Button>
            <Button
              variant="destructive"
              onClick={onUnlink}
              disabled={busy}
              data-testid="whatsapp-unlink"
            >
              <Unlink />
              {t("panel.unlink")}
            </Button>
          </div>
        </PermissionGate>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={t("metrics.created")} value={formatDate(session.created_at, t("metrics.never"))} />
        <Metric
          label={t("metrics.updated")}
          value={formatDate(session.session_state_updated_at, t("metrics.never"))}
        />
        <Metric
          label={t("metrics.heartbeat")}
          value={formatDate(session.last_heartbeat_at, t("metrics.never"))}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export default function WhatsAppSessionsPage() {
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
      <WhatsAppSessionsInner />
    </FeatureGate>
  );
}
