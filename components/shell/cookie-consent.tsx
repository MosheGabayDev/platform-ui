"use client";
/**
 * @module components/shell/cookie-consent
 * EU GDPR-compliant cookie consent banner. Essential-cookies-only stance:
 * we do not run marketing/tracking cookies, so a single "Got it" dismiss
 * is sufficient. Choice persists in localStorage.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 task 7.04.
 *
 * Hides until mounted (hydration safety) and after acceptance.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent:v1";

export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(true); // optimistic-hide until we know

  useEffect(() => {
    setMounted(true);
    setAccepted(localStorage.getItem(STORAGE_KEY) === "accepted");
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // SSR / disabled storage — banner just disappears for this session.
    }
    setAccepted(true);
  };

  if (!mounted || accepted) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-4 inset-x-4 md:inset-x-auto md:end-4 md:start-auto md:max-w-md z-[60] rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl px-4 py-3 space-y-2"
    >
      <div className="flex items-start gap-2.5">
        <Cookie className="size-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 space-y-1.5 min-w-0">
          <h2 id="cookie-consent-title" className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p id="cookie-consent-desc" className="text-xs text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              href="/legal/privacy"
              className="text-xs text-primary hover:underline"
            >
              {t("learnMore")}
            </Link>
            <Button size="sm" onClick={handleAccept} className="h-7 text-xs">
              {t("accept")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
