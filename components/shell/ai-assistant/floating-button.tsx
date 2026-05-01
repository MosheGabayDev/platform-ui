"use client";
/**
 * FloatingAIButton — persistent FAB on every authenticated page.
 *
 * Story 1.3 (AI-shell-A) — clicking opens the assistant drawer (Story 1.4).
 * RTL-safe via logical positioning. Mobile-aware: positions above BottomNav.
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.3.md
 */
import { Sparkles } from "lucide-react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";

export function FloatingAIButton() {
  const drawerOpen = useAssistantSession((s) => s.drawerOpen);
  const openDrawer = useAssistantSession((s) => s.openDrawer);

  // Hide while drawer is open (the drawer has its own close affordance).
  if (drawerOpen) return null;

  return (
    <m.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-inline-end-4 bottom-24 md:bottom-4 z-50"
    >
      <Button
        type="button"
        size="icon"
        onClick={openDrawer}
        aria-label="Open AI assistant"
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </Button>
    </m.div>
  );
}
