"use client";
/**
 * ContextDebugPanel — dev-mode JSON dump of the current page context.
 *
 * Story 1.6 (AI-shell-A) — visible only when NODE_ENV === 'development'.
 * Helps developers verify that pages register the correct context payload
 * before the LLM is wired up.
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.6.md (inline in epic)
 */
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";

export function ContextDebugPanel() {
  if (process.env.NODE_ENV !== "development") return null;

  const ctx = useAssistantSession((s) => s.currentPageContext);

  return (
    <details className="rounded-md border border-dashed border-border bg-muted/30 text-xs">
      <summary className="cursor-pointer select-none px-3 py-2 font-mono text-muted-foreground">
        🛠 Page context (dev only)
      </summary>
      <pre className="overflow-auto px-3 py-2 text-foreground" data-testid="context-debug-json">
        {ctx ? JSON.stringify(ctx, null, 2) : "(no page context registered)"}
      </pre>
    </details>
  );
}
