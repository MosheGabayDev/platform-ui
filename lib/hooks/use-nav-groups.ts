"use client";
/**
 * @module lib/hooks/use-nav-groups
 * Returns the static `navGroups` with `label` + `title` substituted
 * with the locale-resolved string from the i18n catalog (Track E).
 *
 * Consumers (sidebar, sidebar-search, command-palette) call this hook
 * instead of importing `navGroups` directly so labels stay in sync with
 * the active locale.
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { navGroups, type NavGroup, type NavItem } from "@/components/shell/nav-items";

export function useNavGroups(): NavGroup[] {
  const t = useTranslations();
  return useMemo(() => {
    const translateItem = (item: NavItem): NavItem => ({
      ...item,
      title: t(item.titleKey),
      children: item.children?.map(translateItem),
    });
    return navGroups.map((g) => ({
      ...g,
      label: t(g.labelKey),
      items: g.items.map(translateItem),
    }));
  }, [t]);
}
