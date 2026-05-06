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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("onboarding.tour");
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
      let markerSaved = false;
      try {
        await setSetting({
          key: MARKER_KEY,
          scope: "org",
          scope_id: 1,
          value: true,
        });
        markerSaved = true;
      } catch {
        // Marker write failed — leave the query param in place so the user
        // can re-dismiss; otherwise they would lose the tour permanently
        // without the setting being persisted (Round-2 H3).
      }
      // Always run the side-effect the user asked for (opening the drawer)
      // so the visible behavior of the button is preserved.
      if (alsoOpenDrawer) openDrawer();
      // Only strip the query param when the marker is durable. A future
      // visit will then re-trigger the tour if the user comes back via the
      // same URL.
      if (markerSaved) stripQueryParam();
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
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3 items-start">
            <Sparkles className="h-4 w-4 mt-0.5 text-cyan-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              {t.rich("propose", { b: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <Shield className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              {t.rich("confirm", { b: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <ListChecks className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              {t.rich("audit", {
                b: (chunks) => <strong>{chunks}</strong>,
                code: (chunks) => <code>{chunks}</code>,
              })}
            </p>
          </div>
          <div className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm">
            {t("tryThis")}
            <pre className="mt-1 text-xs" dir="ltr"><code>take ticket 1001</code></pre>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => void dismiss(false)}
            data-testid="onboarding-tour-skip"
          >
            {t("skip")}
          </Button>
          <Button
            onClick={() => void dismiss(true)}
            data-testid="onboarding-tour-open"
          >
            {t("openAssistant")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
