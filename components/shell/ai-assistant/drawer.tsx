"use client";
/**
 * AIDrawer — slide-in panel for the AI assistant.
 *
 * Story 1.4 (AI-shell-A) — drawer shell + ContextDebugPanel.
 * Story 2.x (AI-shell-B) — chat transcript + message input wired (mock mode).
 *
 * Built on shadcn/Radix Dialog (Sheet) — focus trap, escape, backdrop click
 * provided by the primitive. Project convention: side="right" matches the
 * sidebar pattern (CLAUDE.md §Hard Rules).
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.4.md
 *       docs/system-upgrade/10-tasks/AI-shell-B-chat-llm/epic.md
 */
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { ContextDebugPanel } from "./context-debug";
import { ChatTranscript } from "./chat-transcript";
import { MessageInput } from "./message-input";
import { ActionPreviewCard } from "./action-preview-card";

export function AIDrawer() {
  const t = useTranslations("shell.aiAssistant.drawer");
  const drawerOpen = useAssistantSession((s) => s.drawerOpen);
  const closeDrawer = useAssistantSession((s) => s.closeDrawer);
  const transcriptLength = useAssistantSession((s) => s.transcript.length);
  const stateKind = useAssistantSession((s) => s.state.kind);

  const showEmptyState =
    transcriptLength === 0 && stateKind !== "chatting_sending" && stateKind !== "error";

  return (
    <Sheet
      open={drawerOpen}
      onOpenChange={(open) => {
        if (!open) closeDrawer();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] flex flex-col p-0"
        aria-labelledby="ai-drawer-title"
        aria-describedby="ai-drawer-desc"
      >
        <SheetHeader className="px-4 pt-4">
          <SheetTitle id="ai-drawer-title" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("title")}
          </SheetTitle>
          <SheetDescription id="ai-drawer-desc">
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {t("emptyState")}
              </p>
            </div>
          )}
          <ChatTranscript />
          <ActionPreviewCard />
          <ContextDebugPanel />
        </div>

        <MessageInput />
      </SheetContent>
    </Sheet>
  );
}
