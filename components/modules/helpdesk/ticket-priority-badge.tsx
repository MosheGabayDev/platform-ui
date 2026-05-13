"use client";
/**
 * TicketPriorityBadge — colored chip for ticket priority.
 *
 * Labels resolve through `helpdesk.tickets.priority.<priority>` so the
 * badge reads in both locales. The category-union ↔ i18n parity
 * invariant in `lib/i18n-catalog.test.ts` guarantees every
 * TicketPriority value has matching he/en leaves once added.
 */
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "@/lib/modules/helpdesk/types";

const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
  medium: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const t = useTranslations("helpdesk.tickets.priority");
  return (
    <Badge variant="outline" className={PRIORITY_CLASSES[priority]}>
      {t(priority)}
    </Badge>
  );
}
