"use client";
/**
 * @module components/shared/detail-view/detail-back-button
 * "Back to list" navigation button used at the top of detail pages.
 * RTL: uses ArrowRight (visually points right = "back" in Hebrew layout).
 */

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DetailBackButtonProps {
  /** Target route to navigate back to. */
  href: string;
  /** Button label. Defaults to "חזרה לרשימה". */
  label?: string;
}

export function DetailBackButton({ href, label = "חזרה לרשימה" }: DetailBackButtonProps) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 -ms-2 h-8 text-muted-foreground hover:text-foreground"
      onClick={() => router.push(href)}
    >
      <ArrowRight className="size-3.5" />
      {label}
    </Button>
  );
}
