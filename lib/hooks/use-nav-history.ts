"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { navGroups } from "@/components/shell/nav-items";

function findNavItem(href: string) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === href) return item;
      if (item.children) {
        const child = item.children.find(c => c.href === href);
        if (child) return child;
      }
    }
  }
  return null;
}

interface NavHistoryState {
  recent: string[];          // hrefs, max 5
  pinned: string[];          // hrefs, max 5
  addRecent: (href: string) => void;
  togglePin: (href: string) => void;
  isPinned: (href: string) => boolean;
}

export const useNavHistory = create<NavHistoryState>()(
  persist(
    (set, get) => ({
      recent: [],
      pinned: [],
      addRecent: (href) =>
        set(s => ({
          recent: [href, ...s.recent.filter(h => h !== href)].slice(0, 5),
        })),
      togglePin: (href) =>
        set(s => ({
          pinned: s.pinned.includes(href)
            ? s.pinned.filter(h => h !== href)
            : [...s.pinned, href].slice(0, 5),
        })),
      isPinned: (href) => get().pinned.includes(href),
    }),
    { name: "nav-history" }
  )
);

/* Call this in a component to auto-track page visits */
export function useTrackNavHistory() {
  const pathname = usePathname();
  const addRecent = useNavHistory(s => s.addRecent);

  useEffect(() => {
    const item = findNavItem(pathname);
    if (item) addRecent(pathname);
  }, [pathname, addRecent]);
}
