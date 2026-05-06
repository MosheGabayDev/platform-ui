/**
 * @module lib/test-utils/intl
 * Helpers for vitest + @testing-library/react that wrap renders with the
 * NextIntlClientProvider so components calling `useTranslations` work
 * outside the live app.
 *
 * Usage:
 *   import { renderWithIntl } from "@/lib/test-utils/intl";
 *   renderWithIntl(<MyComponent />);
 *
 * Pass `locale: "en"` to assert translation behaviour.
 */
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/config";

import heMessages from "@/i18n/messages/he.json";
import enMessages from "@/i18n/messages/en.json";

const CATALOGS: Record<Locale, Record<string, unknown>> = {
  he: heMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

interface IntlRenderOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale;
}

export function renderWithIntl(
  ui: React.ReactElement,
  { locale = "he", ...options }: IntlRenderOptions = {},
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider
      locale={locale}
      messages={CATALOGS[locale]}
      // Tests should fail loud on missing keys.
      onError={(err) => {
        throw err;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
