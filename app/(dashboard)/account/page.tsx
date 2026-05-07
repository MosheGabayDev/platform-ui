"use client";
/**
 * @module app/(dashboard)/account/page
 * Self-service account page — GDPR data export + account deletion.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 tasks 7.05 + 7.06.
 *
 * Auth: protected by middleware. Read: any authenticated user.
 * Write (export / delete): only against the user's own account; the
 * backend identifies the actor from the JWT, never from form state.
 *
 * Mock-mode shell — the actual ZIP delivery + 7-day grace deletion are
 * BE work. Both buttons today return success envelopes from
 * lib/api/account.ts, mock-mode banner shows so testers know.
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/shared/page-shell";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import {
  requestDataExport,
  requestAccountDelete,
  MOCK_MODE,
} from "@/lib/api/account";

function MockNotice({ text }: { text: string }) {
  if (!MOCK_MODE) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <AlertCircle className="size-3.5 shrink-0" />
      {text}
    </div>
  );
}

function DataExportCard() {
  const t = useTranslations("account.dataExport");
  const { mutateAsync, isPending } = usePlatformMutation({
    mutationFn: requestDataExport,
    onSuccess: () => toast.success(t("success")),
  });

  return (
    <section className="glass border-border/50 rounded-xl px-5 py-4 space-y-3">
      <header className="flex items-start gap-3">
        <Download className="size-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
        </div>
      </header>
      <MockNotice text={t("backendNotice")} />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => mutateAsync(undefined as never)}
          disabled={isPending}
          data-testid="account-export-cta"
        >
          {isPending && <Loader2 className="size-3.5 animate-spin me-1.5" />}
          {isPending ? t("requesting") : t("cta")}
        </Button>
      </div>
    </section>
  );
}

function AccountDeleteCard() {
  const t = useTranslations("account.accountDelete");
  const { data: session } = useSession();
  const myEmail = session?.user?.email ?? "";

  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === myEmail.toLowerCase() && myEmail.length > 0;

  const { mutateAsync, isPending, reset } = usePlatformMutation({
    mutationFn: requestAccountDelete,
    onSuccess: () => {
      toast.success(t("success"));
      setTyped("");
    },
  });

  const handleDelete = () => {
    if (!matches) {
      toast.error(t("mismatchError"));
      return;
    }
    reset();
    mutateAsync({ email_confirmation: typed.trim() });
  };

  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 space-y-3">
      <header className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-destructive">{t("title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
        </div>
      </header>
      <MockNotice text={t("backendNotice")} />
      <div className="space-y-2">
        <Label htmlFor="delete-confirm" className="text-xs">{t("typedConfirmLabel")}</Label>
        <Input
          id="delete-confirm"
          type="email"
          dir="ltr"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={myEmail || "you@example.com"}
          className="font-mono text-sm"
          disabled={isPending}
          data-testid="account-delete-typed-confirm"
        />
      </div>
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={!matches || isPending}
          data-testid="account-delete-cta"
        >
          {isPending && <Loader2 className="size-3.5 animate-spin me-1.5" />}
          {isPending ? t("deleting") : t("cta")}
        </Button>
      </div>
    </section>
  );
}

export default function AccountPage() {
  const t = useTranslations("account");
  return (
    <PageShell icon={Download} title={t("title")} subtitle={t("subtitle")}>
      <DataExportCard />
      <AccountDeleteCard />
    </PageShell>
  );
}
