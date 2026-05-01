"use client";
/**
 * AIDrawer — slide-in panel for the AI assistant.
 *
 * Story 1.4 (AI-shell-A) — empty drawer with a placeholder body. Story 1.6
 * adds the dev-mode ContextDebugPanel; Story 1.7 + AI-shell-B add chat UI.
 *
 * Built on shadcn/Radix Dialog (Sheet) — focus trap, escape, backdrop click
 * provided by the primitive. Project convention: side="right" matches the
 * sidebar pattern (CLAUDE.md §Hard Rules).
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.4.md
 */
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { ContextDebugPanel } from "./context-debug";

export function AIDrawer() {
  const drawerOpen = useAssistantSession((s) => s.drawerOpen);
  const closeDrawer = useAssistantSession((s) => s.closeDrawer);

  return (
    <Sheet
      open={drawerOpen}
      onOpenChange={(open) => {
        if (!open) closeDrawer();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] flex flex-col"
        aria-labelledby="ai-drawer-title"
        aria-describedby="ai-drawer-desc"
      >
        <SheetHeader>
          <SheetTitle id="ai-drawer-title" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            AI Assistant
          </SheetTitle>
          <SheetDescription id="ai-drawer-desc">
            Your AI workspace. Coming soon.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              AI assistant coming soon
            </p>
          </div>

          <ContextDebugPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
