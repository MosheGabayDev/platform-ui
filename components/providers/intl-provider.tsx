"use client";
/**
 * @module components/providers/intl-provider
 * Client-side wrapper around `next-intl` that:
 * 1. reads the active locale from `useLocaleStore` (persisted in localStorage)
 * 2. picks the matching message catalog
 * 3. updates `<html lang>` + `<html dir>` whenever the locale changes
 *
 * The provider is mounted in `app/layout.tsx` so every page below it has
 * access to `useTranslations` / `useFormatter` / etc.
 *
 * Track E (i18n foundation).
 */
import { useEffect, useMemo } from "react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE, isRtl, type Locale } from "@/i18n/config";
import { useLocaleStore } from "@/lib/i18n/locale-store";

import heMessages from "@/i18n/messages/he.json";
import enMessages from "@/i18n/messages/en.json";

const MESSAGE_CATALOGS: Record<Locale, Record<string, unknown>> = {
  he: heMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

interface IntlProviderProps {
  children: React.ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  const locale = useLocaleStore((s) => s.locale);

  // Use the persisted locale once hydrated; before that, fall back to the
  // default so the first paint matches `app/layout.tsx`'s `<html lang="he">`
  // and we don't trip a hydration mismatch.
  const messages = useMemo(
    () => MESSAGE_CATALOGS[locale] ?? MESSAGE_CATALOGS[DEFAULT_LOCALE],
    [locale],
  );

  // Imperatively keep <html lang> + <html dir> in sync. Doing this client-
  // side avoids needing a [locale] segment in the App Router.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      // Surface missing-key issues in the console rather than crashing.
      onError={(err) => {
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("[i18n]", err.message);
        }
      }}
      getMessageFallback={({ key, namespace }) =>
        namespace ? `${namespace}.${key}` : key
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
