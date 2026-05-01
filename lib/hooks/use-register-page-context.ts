"use client";
/**
 * useRegisterPageContext — register the current page's AI context.
 *
 * Call from any authenticated page that should be visible to the AI assistant.
 * The hook stores the context in `useAssistantSession.currentPageContext`
 * after a 300ms debounce (to avoid thrashing on fast filter changes), and
 * clears the context on unmount.
 *
 * **PII responsibility:** `dataSamples` is passed through unchanged.
 * Callers MUST redact PII (emails, phones, addresses, secrets) before
 * including it in `dataSamples`.
 *
 * @example
 *   useRegisterPageContext({
 *     pageKey: "users.list",
 *     route: "/users",
 *     entityType: "user",
 *     summary: "Users list, 47 users, filtered by role=admin",
 *     availableActions: ["users.create", "users.export"],
 *   });
 *
 * Spec: implementation-artifacts/stories/AI-shell-A-1.2.md
 */
import { useEffect, useRef } from "react";
import { useAssistantSession, type PageContext } from "./use-assistant-session";

const DEBOUNCE_MS = 300;

export function useRegisterPageContext(context: PageContext): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serialize context for the effect dependency — safer than relying on
  // referential equality of the object passed by callers (who often build
  // a new object every render).
  const contextKey = JSON.stringify(context);

  useEffect(() => {
    // Cancel any pending registration from a previous render.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      useAssistantSession.getState().setPageContext(context);
      timerRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextKey covers context content
  }, [contextKey]);

  // Cleanup on unmount: clear the registered context.
  useEffect(() => {
    return () => {
      useAssistantSession.getState().clearPageContext();
    };
  }, []);
}
