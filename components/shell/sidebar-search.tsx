"use client";

import { useState, useCallback, useRef, useEffect, useMemo, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, CornerDownLeft } from "lucide-react";
import { type NavItem } from "./nav-items";
import { useNavGroups } from "@/lib/hooks/use-nav-groups";

interface FlatItem extends NavItem {
  groupLabel: string;
}

/* Highlight matching characters */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-foreground rounded-[2px] px-0.5 not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface SidebarSearchProps {
  onNavigate?: () => void;
}

export function SidebarSearch({ onNavigate }: SidebarSearchProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const navGroups = useNavGroups();

  const allItems = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];
    for (const group of navGroups) {
      for (const item of group.items) {
        result.push({ ...item, groupLabel: group.label });
        if (item.children) {
          for (const child of item.children) {
            result.push({ ...child, groupLabel: group.label });
          }
        }
      }
    }
    return result;
  }, [navGroups]);

  const results = query.trim()
    ? allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.href.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const open = focused && query.trim().length > 0;

  const navigate = useCallback((href: string) => {
    setQuery("");
    setFocused(false);
    router.push(href);
    onNavigate?.();
  }, [router, onNavigate]);

  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx].href);
    } else if (e.key === "Escape") {
      setQuery("");
      setFocused(false);
      inputRef.current?.blur();
    }
  }, [results, activeIdx, navigate]);

  /* Reset active index when results change */
  useEffect(() => setActiveIdx(0), [query]);

  /* Global shortcut: / to focus sidebar search */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "/" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative px-2 pb-2">
      <div className={`flex items-center gap-2 h-8 px-3 rounded-lg border transition-all duration-200 ${
        focused
          ? "bg-sidebar-accent border-primary/40 shadow-[0_0_0_2px_oklch(0.6_0.22_264_/_20%)]"
          : "bg-sidebar-accent/50 border-transparent hover:bg-sidebar-accent hover:border-border/30"
      }`}>
        <Search className="size-3.5 text-muted-foreground/60 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKey}
          placeholder="חיפוש... ( / )"
          dir="rtl"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full inset-x-2 mt-1 z-50 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground/50">
                <Search className="size-5 opacity-40" />
                <p className="text-xs">אין תוצאות עבור "{query}"</p>
              </div>
            ) : (
              <div className="py-1">
                {results.map((item, i) => (
                  <button
                    key={item.href}
                    onMouseDown={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-start transition-colors ${
                      i === activeIdx ? "bg-primary/10 text-foreground" : "text-foreground/80 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`size-6 rounded-md flex items-center justify-center shrink-0 ${
                      i === activeIdx ? "bg-primary/20" : "bg-muted/50"
                    }`}>
                      <item.icon className={`size-3 ${i === activeIdx ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        <Highlight text={item.title} query={query} />
                      </p>
                      <p className="text-[10px] text-muted-foreground/50">{item.groupLabel}</p>
                    </div>
                    {i === activeIdx && (
                      <CornerDownLeft className="size-3 text-muted-foreground/50 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-border/30 px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1"><kbd className="text-[9px] border border-border/50 bg-muted px-1 rounded">↑↓</kbd> ניווט</span>
              <span className="flex items-center gap-1"><kbd className="text-[9px] border border-border/50 bg-muted px-1 rounded">↵</kbd> פתח</span>
              <span className="flex items-center gap-1"><kbd className="text-[9px] border border-border/50 bg-muted px-1 rounded">Esc</kbd> סגור</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
