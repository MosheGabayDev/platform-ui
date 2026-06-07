"use client";
/**
 * @module lib/hooks/use-nav-groups
 * Returns the static `navGroups` with `label` + `title` substituted with the
 * locale-resolved string, then filtered by (1) the org's enabled modules and
 * (2) the viewer's role. A regular user never sees admin groups/items or
 * modules that aren't enabled for their organization.
 *
 * Consumers (sidebar, sidebar-search, command-palette) call this hook instead
 * of importing `navGroups` directly so labels + visibility stay consistent.
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  navGroups,
  filterNavByEnabledModules,
  filterNavByRole,
  type NavGroup,
  type NavItem,
} from "@/components/shell/nav-items";
import { useEnabledModules } from "@/lib/hooks/use-enabled-modules";

export function useNavGroups(): NavGroup[] {
  const t = useTranslations();
  const { enabled } = useEnabledModules();
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.is_admin || session?.user?.is_system_admin);
  const enabledKeysJoined = enabled.map((m) => m.key).sort().join(",");

  return useMemo(() => {
    const enabledKeys = new Set(enabledKeysJoined ? enabledKeysJoined.split(",") : []);
    const translateItem = (item: NavItem): NavItem => ({
      ...item,
      title: t(item.titleKey),
      children: item.children?.map(translateItem),
    });
    const translated = navGroups.map((g) => ({
      ...g,
      label: t(g.labelKey),
      items: g.items.map(translateItem),
    }));
    // 1) drop modules not enabled for this org, 2) drop admin-only for non-admins
    const byModule = filterNavByEnabledModules(translated, enabledKeys);
    return filterNavByRole(byModule, isAdmin);
  }, [t, enabledKeysJoined, isAdmin]);
}
