"use client";
/**
 * ActionPreviewCard — confirmation UI for an LLM-proposed action.
 *
 * AI-shell-C scaffold. Renders when `useAssistantSession.pendingProposal`
 * is non-null. Backend wiring (R051 AIActionRegistry) is mocked: the
 * `confirm` button calls `confirmAction` directly; in live mode it would
 * POST `/api/proxy/ai/proposals/<token>/confirm` and the backend returns
 * the result.
 *
 * Spec: docs/system-upgrade/10-tasks/AI-shell-C-actions-confirm/epic.md
 */
import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Skull } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { getSkill } from "@/lib/platform/ai-skills/registry";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAssistantSession,
  type CapabilityLevel,
  type ActionProposal,
} from "@/lib/hooks/use-assistant-session";
import {
  getActionExecutor,
  runActionExecutor,
} from "@/lib/platform/ai-actions/executors";

// Labels resolved via `shell.aiAssistant.actionPreview.capabilityLevels.<key>`
// at render — meta is pure icon+tone descriptor.
const LEVEL_META: Record<CapabilityLevel, { icon: LucideIcon; tone: string }> = {
  READ: { icon: ShieldCheck, tone: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  WRITE_LOW: { icon: ShieldCheck, tone: "text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  WRITE_HIGH: { icon: ShieldAlert, tone: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10" },
  DESTRUCTIVE: { icon: Skull, tone: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10" },
};

// Hebrew users see the skill registry's label_he prefix + the resource
// identifier already embedded in proposal.label. The mock LLM emits
// English labels like "Take ticket #1002"; for Hebrew we substitute
// the localized verb-phrase from the skill registry and re-attach any
// trailing #id (or quoted value) from the original label so the
// resource identifier stays visible. BE will localize natively in
// Phase 5A.16+.
function localizedLabel(
  proposal: { actionId: string; label: string },
  locale: string,
): string {
  if (locale !== "he") return proposal.label;
  const skill = getSkill(proposal.actionId);
  if (!skill?.label_he) return proposal.label;
  // Extract a trailing "#N" or "\"…\"" tail from the English label —
  // those are resource identifiers worth preserving in the Hebrew
  // version (a Hebrew user still wants to see #1002 / "alice").
  const tail = proposal.label.match(/(\s+#\d+|\s+"[^"]+"|:\s+.+)$/);
  return tail ? `${skill.label_he}${tail[0]}` : skill.label_he;
}

function formatRemaining(
  ms: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (ms <= 0) return t("tokenExpired");
  const s = Math.ceil(ms / 1000);
  return t("tokenSeconds", { s });
}

interface ActionPreviewCardProps {
  proposal: ActionProposal;
}

function ActionPreviewCardInner({ proposal }: ActionPreviewCardProps) {
  const t = useTranslations("shell.aiAssistant.actionPreview");
  const tLevels = useTranslations("shell.aiAssistant.actionPreview.capabilityLevels");
  const locale = useLocale();
  const confirmAction = useAssistantSession((s) => s.confirmAction);
  const rejectAction = useAssistantSession((s) => s.rejectAction);
  const expireConfirmation = useAssistantSession((s) => s.expireConfirmation);
  const receiveResponse = useAssistantSession((s) => s.receiveResponse);
  const failChat = useAssistantSession((s) => s.failChat);
  const stateKind = useAssistantSession((s) => s.state.kind);
  const queryClient = useQueryClient();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const remaining = proposal.expiresAt - now;
  useEffect(() => {
    if (remaining <= 0 && stateKind === "awaiting_action_confirmation") {
      expireConfirmation();
    }
  }, [remaining, stateKind, expireConfirmation]);

  const meta = LEVEL_META[proposal.capabilityLevel];
  const Icon = meta.icon;
  const isExecuting = stateKind === "executing_action";

  const handleConfirm = useCallback(async () => {
    // Transition to executing_action — store enforces token match
    confirmAction(proposal.tokenId);

    if (!getActionExecutor(proposal.actionId)) {
      // Unknown action — pretend the backend would reject; fail the chat.
      failChat("backend_recheck_failed");
      toast.error(`No executor registered for ${proposal.actionId}`);
      return;
    }

    try {
      // runActionExecutor (Phase 2.4) wraps the call with audit emission —
      // success + error branches both write category=ai entries.
      const result = await runActionExecutor(
        proposal.actionId,
        proposal.params,
        queryClient,
      );
      receiveResponse(`✅ ${result.message}`);
      toast.success(result.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      failChat("backend_recheck_failed");
      toast.error(msg);
    }
  }, [confirmAction, failChat, proposal, queryClient, receiveResponse]);

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      role="dialog"
      aria-labelledby={`action-${proposal.tokenId}-title`}
      data-testid="action-preview-card"
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 rounded-md border flex items-center justify-center shrink-0", meta.tone)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            id={`action-${proposal.tokenId}-title`}
            className="text-sm font-semibold text-foreground"
          >
            {localizedLabel(proposal, locale)}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {proposal.targetSummary}
          </div>
        </div>
        <div
          className={cn(
            "text-xs px-2 py-0.5 rounded border",
            remaining <= 5_000 ? "border-rose-500/40 text-rose-600 dark:text-rose-400" : "border-border text-muted-foreground",
          )}
          aria-label={t("tokenAria", { remaining: formatRemaining(remaining, t) })}
        >
          {formatRemaining(remaining, t)}
        </div>
      </div>

      <div className="text-xs">
        <span className={cn("inline-block rounded px-2 py-0.5 border", meta.tone)}>
          {tLevels(proposal.capabilityLevel)}
        </span>
      </div>

      {Object.keys(proposal.params).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{t("parameters")}</summary>
          <pre className="mt-1 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(proposal.params, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => rejectAction(proposal.tokenId)}
          disabled={isExecuting || remaining <= 0}
        >
          {t("reject")}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => void handleConfirm()}
          disabled={isExecuting || remaining <= 0}
        >
          {isExecuting ? t("executing") : t("confirm")}
        </Button>
      </div>
    </div>
  );
}

export function ActionPreviewCard() {
  const proposal = useAssistantSession((s) => s.pendingProposal);
  if (!proposal) return null;
  return <ActionPreviewCardInner proposal={proposal} />;
}
