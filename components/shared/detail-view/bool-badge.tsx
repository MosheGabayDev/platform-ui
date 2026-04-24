/**
 * @module components/shared/detail-view/bool-badge
 * Yes/No boolean indicator with checkmark/x icons.
 * Default labels are Hebrew ("כן"/"לא") — override via props for other languages.
 */

import { CheckCircle, XCircle } from "lucide-react";

interface BoolBadgeProps {
  value: boolean;
  /** Label shown when true. Defaults to "כן". */
  yesLabel?: string;
  /** Label shown when false. Defaults to "לא". */
  noLabel?: string;
}

export function BoolBadge({ value, yesLabel = "כן", noLabel = "לא" }: BoolBadgeProps) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500 text-xs">
        <CheckCircle className="size-3" />
        {yesLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <XCircle className="size-3" />
      {noLabel}
    </span>
  );
}
