"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  { keys: ["g", "d"], label: "דשבורד" },
  { keys: ["g", "u"], label: "משתמשים" },
  { keys: ["g", "t"], label: "פניות" },
  { keys: ["g", "a"], label: "סוכני AI" },
  { keys: ["g", "h"], label: "Helpdesk" },
  { keys: ["g", "s"], label: "הגדרות" },
  { keys: ["g", "l"], label: "לוגים" },
  { keys: ["⌘", "K"], label: "פתח Command Palette" },
  { keys: ["?"], label: "הצג קיצורי מקלדת" },
  { keys: ["Esc"], label: "סגור / בטל" },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("show-shortcuts", handler);
    return () => document.removeEventListener("show-shortcuts", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base">קיצורי מקלדת</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="inline-flex items-center rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[11px] font-medium font-mono">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-2">לחץ <kbd className="text-[10px] border border-border/60 bg-muted px-1 rounded">?</kbd> בכל עמוד לפתיחה</p>
      </DialogContent>
    </Dialog>
  );
}
