"use client";

import { useEffect, useCallback, useRef } from "react";
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
  // gPressed + gTimer must outlive a render — `let` in the function
  // body resets on every render, so the previous handler closure
  // fights with the new render's locals (caught by react-hooks
  // immutability rule). Refs preserve state across renders.
  const gPressed = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    if (isInput) return;

    /* g + <key> navigation */
    if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
      gPressed.current = true;
      if (gTimer.current) clearTimeout(gTimer.current);
      gTimer.current = setTimeout(() => { gPressed.current = false; }, 800);
      return;
    }

    if (gPressed.current && ROUTES[e.key]) {
      e.preventDefault();
      gPressed.current = false;
      if (gTimer.current) clearTimeout(gTimer.current);
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
