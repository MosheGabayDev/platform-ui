"use client";

import { useEffect, useState } from "react";
import { Bell, Search, SidebarIcon, Command, Moon, Sun } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { AccentPicker } from "./accent-picker";
import { ConnectionIndicator } from "./connection-indicator";
import { toast } from "sonner";

export function Topbar() {
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function openCommandPalette() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="h-14 border-b border-border/60 bg-background/70 backdrop-blur-xl flex items-center px-4 gap-3 sticky top-0 z-40"
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-8 hidden md:flex hover:bg-accent/80 transition-all hover:scale-105"
        onClick={toggleSidebar}
      >
        <SidebarIcon className="size-4" />
      </Button>

      {/* Global search */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2.5 h-8 px-3 text-sm text-muted-foreground bg-muted/40 rounded-lg border border-border/40 hover:bg-muted/70 hover:border-border/80 transition-all duration-200 flex-1 max-w-xs group"
      >
        <Search className="size-3.5 shrink-0 group-hover:text-foreground/70 transition-colors" />
        <span className="flex-1 text-start text-xs">חיפוש...</span>
        <div className="hidden sm:flex items-center gap-0.5">
          <kbd className="inline-flex items-center rounded border border-border/60 bg-muted px-1 text-[10px] font-medium text-muted-foreground/70">
            <Command className="size-2.5" />
          </kbd>
          <kbd className="inline-flex items-center rounded border border-border/60 bg-muted px-1 text-[10px] font-medium text-muted-foreground/70">K</kbd>
        </div>
      </button>

      <div className="flex items-center gap-1 ms-auto">
        <ConnectionIndicator />
        {/* Theme toggle */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-accent/80"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />)}
          </Button>
        </motion.div>

        {/* Accent color picker */}
        <AccentPicker />

        {/* Notifications */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 relative hover:bg-accent/80"
            onClick={() => toast.info("3 התראות חדשות", { description: "לחץ לצפייה בכולן" })}
          >
            <Bell className="size-4" />
            <span className="absolute -top-0.5 -end-0.5 size-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold shadow-sm shadow-primary/50">
              3
            </span>
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}
