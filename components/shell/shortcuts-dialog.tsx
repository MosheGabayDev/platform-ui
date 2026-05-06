"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string[]; key: string }> = [
  { keys: ["g", "d"], key: "dashboard" },
  { keys: ["g", "u"], key: "users" },
  { keys: ["g", "t"], key: "tickets" },
  { keys: ["g", "a"], key: "aiAgents" },
  { keys: ["g", "h"], key: "helpdesk" },
  { keys: ["g", "s"], key: "settings" },
  { keys: ["g", "l"], key: "logs" },
  { keys: ["⌘", "K"], key: "openCommandPalette" },
  { keys: ["?"], key: "showShortcuts" },
  { keys: ["Esc"], key: "closeOrCancel" },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("shortcuts");

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener("show-shortcuts", handler);
    return () => document.removeEventListener("show-shortcuts", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{t(`items.${s.key}`)}</span>
              <div className="flex items-center gap-1" dir="ltr">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="inline-flex items-center rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[11px] font-medium font-mono">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-2">
          {t.rich("footer", {
            key: () => (
              <kbd className="text-[10px] border border-border/60 bg-muted px-1 rounded">?</kbd>
            ),
          })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
