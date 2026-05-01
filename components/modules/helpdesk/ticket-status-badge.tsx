"use client";
/**
 * TicketStatusBadge — colored chip for ticket status.
 */
import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/lib/modules/helpdesk/types";

const STATUS_CLASSES: Record<TicketStatus, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
