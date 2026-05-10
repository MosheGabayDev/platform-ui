/**
 * @module hooks/use-mobile
 * Reactive media-query hook for the mobile breakpoint.
 *
 * Uses `useSyncExternalStore` so the value is read during render
 * rather than synced via useEffect/setState — avoids the cascading-
 * render anti-pattern flagged by react-hooks/set-state-in-effect and
 * matches the pattern recommended by react.dev/learn/you-might-not-
 * need-an-effect.
 */
import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  // Desktop-first default — matches the pre-refactor behavior where
  // `!!undefined === false` was returned during SSR. Switching this
  // would shift initial paint on small screens; opt-in only.
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
