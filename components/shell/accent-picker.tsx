"use client";

import { useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACCENT_COLORS, useThemeStore, type AccentColor } from "@/lib/theme-store";
import { cn } from "@/lib/utils";

export function AccentPicker() {
  const { accent, setAccent } = useThemeStore();

  /* Apply saved accent on mount */
  useEffect(() => {
    const color = ACCENT_COLORS[accent];
    document.documentElement.style.setProperty("--primary", color.oklch);
    document.documentElement.style.setProperty("--ring", color.oklch);
    document.documentElement.style.setProperty("--sidebar-primary", color.oklch);
  }, [accent]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 hover:bg-accent/80">
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">צבע הדגשה</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(
            ([key, val]) => (
              <button
                key={key}
                onClick={() => setAccent(key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-200 hover:scale-105",
                  accent === key
                    ? "border-primary bg-primary/10"
                    : "border-border/40 hover:border-border"
                )}
              >
                <div
                  className="size-5 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all"
                  style={{ background: val.hex }}
                />
                <span className="text-[10px] text-muted-foreground leading-none">{val.label}</span>
              </button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
