"use client";
/**
 * @module app/(dashboard)/admin/policies/page
 *
 * PlatformPolicy Engine admin (cap 27, Phase 1.4).
 *
 * Lists all policies with their rules. Toggle enabled per policy.
 * Inline tester at the bottom — paste an action_id + params, see the
 * decision against the live ruleset.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-policy-engine-spec.md
 *
 * RBAC: PermissionGate role=org_admin or system_admin. Backend re-checks.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Power,
  PowerOff,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchPolicies, setPolicyEnabled, evaluatePolicy } from "@/lib/api/policies";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  Policy,
  PolicyRule,
  PolicyEffect,
  PolicyDecision,
} from "@/lib/modules/policies/types";

const EFFECT_META: Record<
  PolicyEffect,
  { tone: string; label: string }
> = {
  allow: {
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    label: "Allow",
  },
  deny: {
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    label: "Deny",
  },
  require_approval: {
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    label: "Approval",
  },
};

function RuleRow({ rule }: { rule: PolicyRule }) {
  const meta = EFFECT_META[rule.effect];
  return (
    <div className="border-t border-border/50 first:border-t-0 py-2 px-3 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={meta.tone}>
          {meta.label}
        </Badge>
        <code className="font-mono text-[10px] text-muted-foreground">
          {rule.action_pattern}
        </code>
        {rule.subject && (
          <span className="text-[10px] text-muted-foreground">
            subject: {JSON.stringify(rule.subject)}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          priority {rule.priority}
        </span>
        {!rule.enabled && (
          <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
            Disabled
          </Badge>
        )}
      </div>
      <p className="text-[11px] mt-1">{rule.description}</p>
      {rule.condition && (
        <code className="block mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
          {rule.condition}
        </code>
      )}
    </div>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  const queryClient = useQueryClient();
  const mutation = usePlatformMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setPolicyEnabled(id, enabled),
    onSuccess: () => {
      toast.success(`Policy ${policy.enabled ? "disabled" : "enabled"}.`);
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  return (
    <div className="glass border-border/50 rounded-xl">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{policy.name}</span>
              <code className="text-[10px] text-muted-foreground font-mono">
                {policy.id}
              </code>
              <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                {policy.category}
              </Badge>
              {policy.org_id === null && (
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                  System-wide
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{policy.description}</p>
          </div>
          <Button
            size="sm"
            variant={policy.enabled ? "outline" : "default"}
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ id: policy.id, enabled: !policy.enabled })
            }
          >
            {policy.enabled ? (
              <>
                <PowerOff className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                Disable
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                Enable
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="p-2">
        {policy.rules.map((r) => (
          <RuleRow key={r.id} rule={r} />
        ))}
      </div>
    </div>
  );
}

function PolicyTester() {
  const [actionId, setActionId] = useState("helpdesk.batch.bulk_status");
  const [paramsText, setParamsText] = useState('{"affected_count": 100}');
  const [resourceText, setResourceText] = useState("");
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function run() {
    setError(null);
    setDecision(null);
    setIsPending(true);
    try {
      const params = paramsText.trim() ? JSON.parse(paramsText) : {};
      const resource = resourceText.trim() ? JSON.parse(resourceText) : null;
      const res = await evaluatePolicy({ action_id: actionId, params, resource });
      setDecision(res.data.decision);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="glass border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
        <span className="font-medium text-sm">Policy tester</span>
        <span className="text-xs text-muted-foreground">
          Run an action through the live ruleset
        </span>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground" htmlFor="tester-action">
          action_id
        </label>
        <Input
          id="tester-action"
          value={actionId}
          onChange={(e) => setActionId(e.target.value)}
          placeholder="helpdesk.ticket.resolve"
          className="font-mono text-xs"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground" htmlFor="tester-params">
            params (JSON)
          </label>
          <Textarea
            id="tester-params"
            value={paramsText}
            onChange={(e) => setParamsText(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground" htmlFor="tester-resource">
            resource (JSON, optional)
          </label>
          <Textarea
            id="tester-resource"
            value={resourceText}
            onChange={(e) => setResourceText(e.target.value)}
            rows={3}
            placeholder='{"priority": "P1"}'
            className="font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={isPending} onClick={run}>
          <Play className="h-3.5 w-3.5 me-1" aria-hidden="true" />
          Evaluate
        </Button>
      </div>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      {decision && (
        <div className="border-t border-border/50 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            {decision.allowed ? (
              decision.requires_approval ? (
                <Badge variant="outline" className={EFFECT_META.require_approval.tone}>
                  <Clock className="h-3 w-3 me-1" aria-hidden="true" />
                  Allowed — requires approval
                </Badge>
              ) : (
                <Badge variant="outline" className={EFFECT_META.allow.tone}>
                  <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                  Allowed
                </Badge>
              )
            ) : (
              <Badge variant="outline" className={EFFECT_META.deny.tone}>
                <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
                Denied
              </Badge>
            )}
            <code className="text-[10px] text-muted-foreground font-mono">
              decision: {decision.decision_id}
            </code>
          </div>
          {decision.reasons.length > 0 && (
            <ul className="text-xs space-y-1">
              {decision.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {decision.matched_rules.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Matched rules ({decision.matched_rules.length})
              </summary>
              <ul className="mt-2 space-y-1 ms-4">
                {decision.matched_rules.map((r, i) => (
                  <li key={i} className="font-mono text-[10px]">
                    {r.policy_id} / {r.rule_id} → {r.effect}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function PoliciesInner() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["policies", "list"],
    queryFn: fetchPolicies,
    staleTime: 5 * 60_000,
  });
  const policies = data?.data?.policies ?? [];

  const stats = useMemo(() => {
    const enabled = policies.filter((p) => p.enabled).length;
    const totalRules = policies.reduce((sum, p) => sum + p.rules.length, 0);
    const denyRules = policies.reduce(
      (sum, p) => sum + p.rules.filter((r) => r.effect === "deny").length,
      0,
    );
    return { enabled, totalRules, denyRules };
  }, [policies]);

  useRegisterPageContext({
    pageKey: "admin.policies",
    route: "/admin/policies",
    summary: `Policy engine: ${policies.length} policies, ${stats.enabled} enabled, ${stats.totalRules} rules.`,
    availableActions: ["admin.policy.toggle"],
  });

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={Shield}
        title="Policy engine"
        subtitle="Guardrails for AI actions — allow / deny / require-approval rules"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Policies</span>
                <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{policies.length}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.enabled}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Deny rules</span>
                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
                {stats.denyRules}
              </span>
            </div>
          </div>

          <div className="glass border-border/50 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Evaluation order: </span>
            deny precedence — any matching deny rule wins regardless of allow rules.
            Default behavior when no rule matches: <strong>allow</strong>. RBAC remains the floor.
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading policies…</div>
          )}
          {error && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load policies"
              description={(error as Error).message}
            />
          )}

          <div className="space-y-2">
            {policies.map((p) => (
              <PolicyCard key={p.id} policy={p} />
            ))}
          </div>

          <PolicyTester />
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function PoliciesAdminPage() {
  return (
    <PermissionGate
      role={["org_admin", "system_admin"]}
      fallback={
        <PageShell icon={Shield} title="Policy engine" subtitle="Restricted">
          <EmptyState
            icon={AlertCircle}
            title="Permission required"
            description="You need org_admin or system_admin role to manage policies."
          />
        </PageShell>
      }
    >
      <PoliciesInner />
    </PermissionGate>
  );
}
