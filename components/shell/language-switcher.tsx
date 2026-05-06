"use client";
/**
 * @module components/shell/language-switcher
 * Compact dropdown that swaps the active locale (Track E).
 *
 * Reads + writes the persisted preference via `useLocaleStore`, which
 * the `IntlProvider` listens to. Switching the locale triggers a
 * re-render of every `useTranslations` consumer in the tree without a
 * page reload, plus updates `<html lang>` / `<html dir>`.
 */
import { useEffect, useState } from "react";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LOCALES, LOCALE_LABELS, LOCALE_TAGS } from "@/i18n/config";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:bg-accent/80 relative"
          aria-label={t("switcher")}
          title={mounted ? t("current", { locale: LOCALE_LABELS[locale] }) : t("switcher")}
        >
          <Languages className="size-4" />
          <span className="absolute -bottom-0.5 -end-0.5 text-[8px] font-mono font-semibold text-muted-foreground/80 leading-none">
            {mounted ? LOCALE_TAGS[locale] : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            data-testid={`locale-option-${loc}`}
            className="flex items-center justify-between gap-2"
          >
            <span>{LOCALE_LABELS[loc]}</span>
            {mounted && locale === loc && (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
