/**
 * @module components/shared/detail-view/detail-section
 * Glass card container with a titled section header and separator.
 * Used for grouping InfoRow items in detail pages.
 */

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DetailSectionProps } from "./types";

export function DetailSection({ title, children, className }: DetailSectionProps) {
  return (
    <div className={cn("glass border-border/50 rounded-xl px-5 py-3", className)}>
      <h2 className="text-sm font-medium mb-1 text-muted-foreground">{title}</h2>
      <Separator className="mb-2" />
      {children}
    </div>
  );
}
