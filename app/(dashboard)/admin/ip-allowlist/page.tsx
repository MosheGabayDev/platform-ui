"use client";
/**
 * @module app/(dashboard)/admin/ip-allowlist/page
 * IP Allowlist admin shell — Enterprise-only feature.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §6 task 9.06.
 *
 * Mock-mode list editor:
 *   - Reads + writes the allowlist to localStorage via the cap-A shim
 *     pattern (see lib/api/_mock-storage.ts) so the page demos
 *     end-to-end pre-backend.
 *   - Wraps the entire surface in <FeatureGate flag="ip_allowlist.enabled">
 *     so Free / Pro orgs see an upgrade nudge instead of the editor.
 *   - CIDR validation is FE-only (UX); backend MUST re-validate.
 *
 * Backend wiring deferred — when 9.06-BE lands, replace the
 * localStorage shim with a real client following the standard mock-flip
 * pattern.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Network, Plus, Trash2, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/shared/page-shell";
import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";
import { isValidIpv4Cidr } from "@/lib/platform/security/cidr";
import {
  loadMockState,
  saveMockState,
} from "@/lib/api/_mock-storage";

const STORAGE_KEY = "ip-allowlist:v1";
const STORAGE_VERSION = 1;

interface AllowlistEntry {
  cidr: string;
  label: string;
  added_at: string;
}

function loadEntries(): AllowlistEntry[] {
  return loadMockState<AllowlistEntry[]>(STORAGE_KEY, STORAGE_VERSION, []);
}

function UpgradeNudge() {
  const t = useTranslations("admin.ipAllowlist");
  return (
    <PageShell icon={Network} title={t("title")} subtitle={t("subtitle")}>
      <div className="rounded-xl border border-border/60 px-6 py-8 text-center space-y-4">
        <Lock className="size-10 text-muted-foreground/60 mx-auto" aria-hidden />
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {t("enterpriseOnly")}
        </p>
        <Button asChild size="sm" className="mx-auto">
          <Link href="/billing">
            <ExternalLink className="size-3.5 me-1.5" />
            {t("upgradeCta")}
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}

function Editor() {
  const t = useTranslations("admin.ipAllowlist");
  const tCols = useTranslations("admin.ipAllowlist.columns");
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [draftCidr, setDraftCidr] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const handleAdd = () => {
    if (!isValidIpv4Cidr(draftCidr)) {
      setError(t("invalidCidr"));
      return;
    }
    setError(null);
    const next: AllowlistEntry[] = [
      ...entries,
      { cidr: draftCidr.trim(), label: draftLabel.trim(), added_at: new Date().toISOString() },
    ];
    setEntries(next);
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    setDraftCidr("");
    setDraftLabel("");
    toast.success(t("saved"));
  };

  const handleRemove = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    saveMockState(STORAGE_KEY, STORAGE_VERSION, next);
    toast.success(t("saved"));
  };

  return (
    <PageShell icon={Network} title={t("title")} subtitle={t("subtitle")}>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{t("intro")}</p>

      <div className="glass border-border/50 rounded-xl px-5 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t("placeholder")}
            value={draftCidr}
            onChange={(e) => setDraftCidr(e.target.value)}
            dir="ltr"
            className="font-mono text-sm flex-1"
            data-testid="cidr-input"
            aria-label={tCols("cidr")}
          />
          <Input
            placeholder={tCols("label")}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            className="text-sm flex-1"
            aria-label={tCols("label")}
          />
          <Button onClick={handleAdd} size="sm" className="shrink-0" data-testid="cidr-add">
            <Plus className="size-3.5 me-1.5" />
            {t("add")}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="glass border-border/50 rounded-xl overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-2 font-semibold">{tCols("cidr")}</th>
                <th className="text-start px-4 py-2 font-semibold">{tCols("label")}</th>
                <th className="text-start px-4 py-2 font-semibold">{tCols("addedAt")}</th>
                <th className="text-end px-4 py-2 font-semibold">{t("remove")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.cidr}-${i}`} className="border-t border-border/40">
                  <td className="px-4 py-3 text-sm font-mono">{e.cidr}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.label || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(e.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(i)}
                      aria-label={`${t("remove")} ${e.cidr}`}
                      data-testid={`cidr-remove-${i}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

export default function IpAllowlistPage() {
  const { enabled, isLoading } = useFeatureFlag("ip_allowlist.enabled");
  if (isLoading) return null;
  return enabled ? <Editor /> : <UpgradeNudge />;
}
