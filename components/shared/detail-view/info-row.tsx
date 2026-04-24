/**
 * @module components/shared/detail-view/info-row
 * Icon + label + value row used in detail page section cards.
 * Pure presentational — no data fetching, no auth logic.
 */

import type { InfoRowProps } from "./types";

export function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground min-w-[100px] shrink-0">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}
