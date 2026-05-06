"use client";
/**
 * OnboardingTour — first-AI-conversation guided tour (Phase 3.1).
 *
 * Triggered by `?tour=first-ai` after the onboarding wizard completes.
 * Renders a one-time dialog explaining the propose-confirm-audit chain
 * and offers to open the AI assistant. Once dismissed, the
 * `onboarding.first_ai_tour_completed` setting is flipped to true and
 * the dialog never re-shows.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-onboarding-finish-spec.md
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Sparkles, Shield, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { fetchSetting, setSetting } from "@/lib/api/settings";

const QUERY_KEY = "tour";
const QUERY_VALUE = "first-ai";
const MARKER_KEY = "onboarding.first_ai_tour_completed";

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openDrawer = useAssistantSession((s) => s.openDrawer);

  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  const tourRequested = searchParams.get(QUERY_KEY) === QUERY_VALUE;

  useEffect(() => {
    if (!tourRequested || checked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchSetting(MARKER_KEY);
        if (cancelled) return;
        const completed = res.data.type === "bool" ? res.data.value : false;
        setOpen(!completed);
      } catch {
        if (!cancelled) setOpen(true);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tourRequested, checked]);

  const stripQueryParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUERY_KEY);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const dismiss = useCallback(
    async (alsoOpenDrawer: boolean) => {
      setOpen(false);
      try {
        await setSetting({
          key: MARKER_KEY,
          scope: "org",
          scope_id: 1,
          value: true,
        });
      } catch {
        // Best-effort — if the marker write fails the user can dismiss again.
      }
      stripQueryParam();
      if (alsoOpenDrawer) openDrawer();
    },
    [openDrawer, stripQueryParam],
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && void dismiss(false)}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid="onboarding-tour-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" aria-hidden="true" />
            Try your first AI command
          </DialogTitle>
          <DialogDescription>
            Your platform is configured. Now let&apos;s see the AI assistant in action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3 items-start">
            <Sparkles className="h-4 w-4 mt-0.5 text-cyan-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              <strong>Propose</strong> — the AI never executes silently. It proposes an action with parameters.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <Shield className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              <strong>Confirm</strong> — you review the proposal and a token-bound confirm button runs it.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <ListChecks className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              <strong>Audit</strong> — every AI action lands in the audit log under <code>category=ai</code>.
            </p>
          </div>
          <div className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm">
            Try this:
            <pre className="mt-1 text-xs"><code>take ticket 1001</code></pre>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => void dismiss(false)}
            data-testid="onboarding-tour-skip"
          >
            Skip
          </Button>
          <Button
            onClick={() => void dismiss(true)}
            data-testid="onboarding-tour-open"
          >
            Open AI assistant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
