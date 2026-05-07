"use client";
/**
 * @module app/(dashboard)/[...slug]/page
 * Catch-all placeholder for dashboard routes not yet implemented.
 * Renders within the dashboard shell (sidebar + header remain visible).
 */

import { use } from "react";
import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";

// Map a slug path to a `nav.items.*` translation key. The catch-all uses
// the same source-of-truth labels as the sidebar nav, so renaming a
// route or its label only requires updating the i18n catalog.
const ROUTE_TO_NAV_KEY: Record<string, string> = {
  helpdesk: "helpdesk",
  "helpdesk/tickets": "tickets",
  "helpdesk/technicians": "technicians",
  "helpdesk/sla": "sla",
  "helpdesk/kb": "knowledgeBase",
  ala: "ala",
  voice: "voiceCalls",
  knowledge: "knowledge",
  automation: "automation",
  integrations: "integrations",
  monitoring: "systemHealth",
  logs: "logs",
  metrics: "metrics",
  "audit-log": "auditLog",
  billing: "billing",
  backups: "backups",
  "api-keys": "apiKeys",
  settings: "settings",
  "settings/general": "general",
  "settings/email": "email",
  "settings/ai-providers": "aiProviders",
  "settings/usage-limits": "usageLimits",
  departments: "departments",
};

export default function ComingSoonPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const t = useTranslations();
  const { slug } = use(params);
  const path = slug.join("/");
  const navKey = ROUTE_TO_NAV_KEY[path];
  // When the slug doesn't map to a known nav item, surface the raw path —
  // it's a debugging crumb for the developer who reached an unknown route.
  const label = navKey ? t(`nav.items.${navKey}`) : path;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4 pb-20 md:pb-0">
      <div className="size-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">{label}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t("comingSoon.body")}
        </p>
      </div>
      <div className="text-xs text-muted-foreground/50 font-mono">
        /{path}
      </div>
    </div>
  );
}
