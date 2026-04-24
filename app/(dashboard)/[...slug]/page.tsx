"use client";
/**
 * @module app/(dashboard)/[...slug]/page
 * Catch-all placeholder for dashboard routes not yet implemented.
 * Renders within the dashboard shell (sidebar + header remain visible).
 */

import { use } from "react";
import { Construction } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  helpdesk: "הלפדסק",
  "helpdesk/tickets": "כרטיסים",
  "helpdesk/technicians": "טכנאים",
  "helpdesk/sla": "SLA",
  "helpdesk/kb": "בסיס ידע",
  ala: "ALA — Voice AI",
  voice: "שיחות קוליות",
  knowledge: "ידע ו-RAG",
  automation: "אוטומציה",
  integrations: "אינטגרציות",
  monitoring: "בריאות המערכת",
  logs: "לוגים",
  metrics: "מטריקות",
  "audit-log": "יומן ביקורת",
  billing: "חיוב",
  backups: "גיבויים",
  "api-keys": "מפתחות API",
  settings: "הגדרות",
  "settings/general": "הגדרות כלליות",
  "settings/email": "הגדרות אימייל",
  "settings/ai-providers": "ספקי AI",
  "settings/usage-limits": "מגבלות שימוש",
  departments: "מחלקות",
};

export default function ComingSoonPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const path = slug.join("/");
  const label = ROUTE_LABELS[path] ?? path;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="size-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">{label}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          דף זה עדיין בפיתוח ויהיה זמין בקרוב
        </p>
      </div>
      <div className="text-xs text-muted-foreground/50 font-mono">
        /{path}
      </div>
    </div>
  );
}
