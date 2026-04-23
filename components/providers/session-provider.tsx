/**
 * @module components/providers/session-provider
 * Thin client wrapper around next-auth SessionProvider.
 * Must be a Client Component because SessionProvider uses browser session storage.
 * This wrapper keeps app/layout.tsx (a Server Component) clean.
 */

"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function NextAuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
