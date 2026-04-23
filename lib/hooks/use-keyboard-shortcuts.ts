"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  d: "/",
  u: "/users",
  t: "/tickets",
  a: "/agents",
  s: "/settings",
  h: "/helpdesk",
  l: "/logs",
  m: "/monitoring",
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  let gPressed = false;
  let gTimer: ReturnType<typeof setTimeout>;

  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    if (isInput) return;

    /* g + <key> navigation */
    if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
      gPressed = true;
      clearTimeout(gTimer);
      gTimer = setTimeout(() => { gPressed = false; }, 800);
      return;
    }

    if (gPressed && ROUTES[e.key]) {
      e.preventDefault();
      gPressed = false;
      clearTimeout(gTimer);
      router.push(ROUTES[e.key]);
      return;
    }

    /* ? — show shortcut help via custom event */
    if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("show-shortcuts"));
      return;
    }
  }, [router]);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}
