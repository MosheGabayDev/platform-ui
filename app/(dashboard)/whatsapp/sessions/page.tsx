"use client";
/**
 * @module app/(dashboard)/whatsapp/sessions/page
 * Self-service WhatsApp session lifecycle page.
 *
 * Data: React Query -> /api/proxy/whatsapp/api/my/sessions -> Flask WhatsApp API.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchWhatsappSessionQr,
  fetchWhatsappSessions,
  linkWhatsappSession,
  relinkWhatsappSession,
  unlinkWhatsappSession,
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

function formatState(state: WhatsAppSessionState) {
  return state.replace("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function WhatsAppSessionsInner() {
  const queryClient = useQueryClient();
  const [qrSessionId, setQrSessionId] = useState<number | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.whatsapp.sessions(),
    queryFn: fetchWhatsappSessions,
  });

  const sessions = sessionsQuery.data?.data ?? [];
  const activeSession = useMemo(
    () => sessions.find((session) => ACTIVE_STATES.includes(session.session_state)),
    [sessions],
  );

  const qrQuery = useQuery({
    queryKey: qrSessionId ? queryKeys.whatsapp.sessionQr(qrSessionId) : ["whatsapp", "qr", "idle"],
    queryFn: () => fetchWhatsappSessionQr(qrSessionId as number),
    enabled: qrSessionId !== null,
    refetchInterval: qrSessionId !== null ? 3_000 : false,
  });

  const refreshSessions = () => queryClient.invalidateQueries({ queryKey: queryKeys.whatsapp.sessions() });

  const linkMutation = useMutation({
    mutationFn: linkWhatsappSession,
    onSuccess: (data) => {
      toast.success("WhatsApp session started");
      setQrSessionId(data.session_id);
      refreshSessions();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to start session"),
  });

  const relinkMutation = useMutation({
    mutationFn: relinkWhatsappSession,
    onSuccess: (data) => {
      toast.success("Fresh QR requested");
      setQrSessionId(data.session_id);
      refreshSessions();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to relink session"),
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkWhatsappSession,
    onSuccess: () => {
      toast.success("WhatsApp unlinked");
      setQrSessionId(null);
      refreshSessions();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to unlink session"),
  });

  useEffect(() => {
    if (qrQuery.data?.session_state === "ready") {
      toast.success(`Linked${qrQuery.data.connected_phone ? ` as ${qrQuery.data.connected_phone}` : ""}`);
      setQrSessionId(null);
      refreshSessions();
    }
  }, [qrQuery.data?.session_state, qrQuery.data?.connected_phone]);

  useRegisterPageContext({
    pageKey: "whatsapp.sessions",
    route: "/whatsapp/sessions",
    summary: activeSession
      ? `WhatsApp session ${activeSession.id} is ${activeSession.session_state}.`
      : "WhatsApp sessions page with no active linked session.",
    availableActions: ["link_whatsapp", "relink_whatsapp", "unlink_whatsapp"],
  });

  return (
    <PageShell icon={MessageCircle} title="WhatsApp Sessions" subtitle="Personal archive connection">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-border bg-card p-4">
          {sessionsQuery.isLoading && <SessionSkeleton />}
          {sessionsQuery.error && !sessionsQuery.isLoading && (
            <ErrorState error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
          )}
          {!sessionsQuery.isLoading && !sessionsQuery.error && !activeSession && (
            <EmptyState
              icon={QrCode}
              title="No linked WhatsApp session"
              description="Create a personal session to start the QR link flow."
              action={{ label: linkMutation.isPending ? "Starting..." : "Link WhatsApp", onClick: () => linkMutation.mutate() }}
            />
          )}
          {activeSession && (
            <SessionPanel
              session={activeSession}
              busy={relinkMutation.isPending || unlinkMutation.isPending}
              onRelink={() => relinkMutation.mutate(activeSession.id)}
              onUnlink={() => {
                if (window.confirm("Unlink this WhatsApp session? The archive will be retained.")) {
                  unlinkMutation.mutate(activeSession.id);
                }
              }}
              onShowQr={() => setQrSessionId(activeSession.id)}
            />
          )}
        </section>

        <aside className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="size-4 text-muted-foreground" />
            Capture Status
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label="Sessions" value={String(sessions.length)} />
            <InfoRow label="Active state" value={activeSession ? formatState(activeSession.session_state) : "None"} />
            <InfoRow label="Last heartbeat" value={formatDate(activeSession?.last_heartbeat_at ?? null)} />
          </dl>
        </aside>
      </div>

      <Dialog open={qrSessionId !== null} onOpenChange={(open) => !open && setQrSessionId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp QR</DialogTitle>
            <DialogDescription>Session state: {qrQuery.data?.session_state ?? "connecting"}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
            {qrQuery.isLoading && <Skeleton className="size-56" />}
            {qrQuery.data?.qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrQuery.data.qr} alt="WhatsApp linking QR" className="size-56 rounded-md bg-white p-2" />
            )}
            {!qrQuery.isLoading && !qrQuery.data?.qr && (
              <div className="text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 size-5 animate-spin" />
                Waiting for QR
              </div>
            )}
          </div>
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
}: {
  session: WhatsAppSession;
  busy: boolean;
  onRelink: () => void;
  onUnlink: () => void;
  onShowQr: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Personal session</h2>
            <Badge className={STATE_TONE[session.session_state]}>{formatState(session.session_state)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.connected_phone ?? "Phone not linked yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(session.session_state === "needs_qr" || session.session_state === "connecting") && (
            <Button variant="outline" onClick={onShowQr}>
              <QrCode />
              QR
            </Button>
          )}
          <Button variant="outline" onClick={onRelink} disabled={busy}>
            <RefreshCw />
            Re-link
          </Button>
          <Button variant="destructive" onClick={onUnlink} disabled={busy}>
            <Unlink />
            Unlink
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Created" value={formatDate(session.created_at)} />
        <Metric label="Updated" value={formatDate(session.session_state_updated_at)} />
        <Metric label="Heartbeat" value={formatDate(session.last_heartbeat_at)} />
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
  return (
    <FeatureGate
      flag="whatsapp.enabled"
      fallback={
        <PageShell icon={MessageCircle} title="WhatsApp Sessions" subtitle="Module disabled">
          <EmptyState
            icon={MessageCircle}
            title="WhatsApp is not enabled"
            description="The WhatsApp module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <WhatsAppSessionsInner />
    </FeatureGate>
  );
}
