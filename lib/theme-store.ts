import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentColor = "indigo" | "violet" | "emerald" | "rose" | "amber" | "cyan";

interface ThemeStore {
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
}

export const ACCENT_COLORS: Record<AccentColor, { label: string; oklch: string; hex: string }> = {
  indigo:  { label: "Indigo",  oklch: "oklch(0.6 0.22 264)",  hex: "#6366f1" },
  violet:  { label: "Violet",  oklch: "oklch(0.6 0.22 290)",  hex: "#8b5cf6" },
  emerald: { label: "Emerald", oklch: "oklch(0.65 0.2 160)",  hex: "#10b981" },
  rose:    { label: "Rose",    oklch: "oklch(0.65 0.22 10)",   hex: "#f43f5e" },
  amber:   { label: "Amber",   oklch: "oklch(0.75 0.18 75)",   hex: "#f59e0b" },
  cyan:    { label: "Cyan",    oklch: "oklch(0.7 0.18 210)",   hex: "#06b6d4" },
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      accent: "indigo",
      setAccent: (accent) => {
        const color = ACCENT_COLORS[accent];
        document.documentElement.style.setProperty("--primary", color.oklch);
        document.documentElement.style.setProperty("--ring", color.oklch);
        document.documentElement.style.setProperty("--sidebar-primary", color.oklch);
        set({ accent });
      },
    }),
    { name: "platform-ui-accent" }
  )
);
