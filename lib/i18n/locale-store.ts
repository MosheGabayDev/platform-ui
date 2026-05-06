"use client";
/**
 * @module lib/i18n/locale-store
 * Zustand-persisted locale preference. Default: `he`. Hydration-safe via
 * the `persist` middleware. Other clients listen to changes through the
 * normal store-subscribe API.
 *
 * Track E (i18n foundation).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

interface LocaleState {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (next) => {
        if (!isLocale(next)) return;
        set({ locale: next });
      },
    }),
    {
      name: "platform-ui:locale",
      // Drop bad shapes silently so a stale localStorage payload never
      // crashes the app on first paint.
      onRehydrateStorage: () => (state) => {
        if (state && !isLocale(state.locale)) {
          state.locale = DEFAULT_LOCALE;
        }
      },
    },
  ),
);
