"use client";
/**
 * @module components/shell/support-widget
 * Mount point for a third-party customer-support widget (Intercom / Crisp /
 * Plain / built-in chat). Provider is env-driven so swapping vendors is a
 * config change, not a code change.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §7 task 10.06.
 *
 * Currently a no-op when no provider is configured. When the launch
 * decision picks a vendor:
 *   1. Set NEXT_PUBLIC_SUPPORT_PROVIDER (e.g. "intercom" / "crisp").
 *   2. Set the matching app id (e.g. NEXT_PUBLIC_INTERCOM_APP_ID).
 *   3. Update the dispatcher in `mountWidget()` below.
 *
 * The widget is mounted in the dashboard layout, so it appears only for
 * authenticated users. Public pages (login / signup / legal) intentionally
 * do not load it — keeps the public bundle small and avoids tracking on
 * pre-signup visitors.
 */

import { useEffect } from "react";

type Provider = "intercom" | "crisp" | "plain" | "none";

function getProvider(): Provider {
  const raw = (process.env.NEXT_PUBLIC_SUPPORT_PROVIDER ?? "none").toLowerCase();
  if (raw === "intercom" || raw === "crisp" || raw === "plain") return raw;
  return "none";
}

function mountIntercom(appId: string) {
  if (!appId) return;
  // Standard Intercom snippet — wrapped in a function so we don't run on SSR.
  // Reference: https://developers.intercom.com/installing-intercom/web/installation
  if (typeof window === "undefined") return;
  const w = window as unknown as { Intercom?: (...args: unknown[]) => void };
  if (typeof w.Intercom === "function") {
    w.Intercom("boot", { app_id: appId });
    return;
  }
  // Lazy-inject the loader script so it runs only when actually configured.
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://widget.intercom.io/widget/${appId}`;
  document.body.appendChild(script);
}

function mountCrisp(websiteId: string) {
  if (!websiteId || typeof window === "undefined") return;
  const w = window as unknown as { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string };
  if (Array.isArray(w.$crisp) && w.$crisp.length > 0) return; // already mounted
  w.$crisp = [];
  w.CRISP_WEBSITE_ID = websiteId;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://client.crisp.chat/l.js";
  document.body.appendChild(script);
}

export function SupportWidget() {
  useEffect(() => {
    const provider = getProvider();
    if (provider === "intercom") {
      mountIntercom(process.env.NEXT_PUBLIC_INTERCOM_APP_ID ?? "");
    } else if (provider === "crisp") {
      mountCrisp(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? "");
    }
    // "plain" + "none" are no-ops until vendor decision is made.
  }, []);

  return null;
}
