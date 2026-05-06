import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  KeyRound,
  ClipboardList,
  Activity,
  BarChart2,
  Settings,
  CreditCard,
  HeadphonesIcon,
  Bot,
  Phone,
  Brain,
  BookOpen,
  HardDrive,
  Bell,
  Zap,
  Puzzle,
  Network,
  FileText,
  Mic,
  UserCog,
  Wrench,
  Layers,
  Flag,
  Cog,
  Boxes,
  Shield,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  /** Resolved title — use `useNavGroups()` hook to get the localized version. */
  title: string;
  /** Translation key under `nav.items.*`. Source of truth post-Track E. */
  titleKey: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
};

export type NavGroup = {
  /** Resolved label — use `useNavGroups()` hook to get the localized version. */
  label: string;
  /** Translation key under `nav.groups.*`. */
  labelKey: string;
  items: NavItem[];
};

/**
 * Static nav definition. The `title` / `label` fields contain the
 * Hebrew default copy as a fallback when the i18n provider is absent
 * (e.g. SSR before hydration). Live UI should call `useNavGroups()`
 * which substitutes the locale-resolved string.
 */
export const navGroups: NavGroup[] = [
  {
    label: "ראשי",
    labelKey: "nav.groups.main",
    items: [
      { title: "דשבורד", titleKey: "nav.items.dashboard", href: "/", icon: LayoutDashboard },
      { title: "הקמה ראשונית", titleKey: "nav.items.onboarding", href: "/onboarding", icon: Sparkles },
    ],
  },
  {
    label: "ניהול משתמשים",
    labelKey: "nav.groups.userManagement",
    items: [
      { title: "משתמשים", titleKey: "nav.items.users", href: "/users", icon: Users },
      { title: "תפקידים והרשאות", titleKey: "nav.items.roles", href: "/roles", icon: ShieldCheck },
      { title: "ארגונים", titleKey: "nav.items.organizations", href: "/organizations", icon: Building2 },
      { title: "מחלקות", titleKey: "nav.items.departments", href: "/departments", icon: UserCog },
    ],
  },
  {
    label: "הלפדסק",
    labelKey: "nav.groups.helpdesk",
    items: [
      { title: "דשבורד הלפדסק", titleKey: "nav.items.helpdeskDashboard", href: "/helpdesk", icon: HeadphonesIcon },
      {
        title: "כרטיסים",
        titleKey: "nav.items.tickets",
        href: "/helpdesk/tickets",
        icon: ClipboardList,
        badge: undefined, // populated at runtime from API
      },
      { title: "טכנאים", titleKey: "nav.items.technicians", href: "/helpdesk/technicians", icon: Users },
      { title: "SLA", titleKey: "nav.items.sla", href: "/helpdesk/sla", icon: Activity },
      { title: "תחזוקה", titleKey: "nav.items.maintenance", href: "/helpdesk/maintenance", icon: Wrench },
      { title: "משימות אצווה", titleKey: "nav.items.batchTasks", href: "/helpdesk/batch", icon: Layers },
      { title: "אישורים", titleKey: "nav.items.approvals", href: "/helpdesk/approvals", icon: ShieldCheck },
      { title: "בסיס ידע", titleKey: "nav.items.knowledgeBase", href: "/helpdesk/kb", icon: BookOpen },
    ],
  },
  {
    label: "AI & קול",
    labelKey: "nav.groups.aiVoice",
    items: [
      { title: "סוכני AI", titleKey: "nav.items.aiAgents", href: "/ai-agents", icon: Bot },
      { title: "ALA — Voice AI", titleKey: "nav.items.ala", href: "/ala", icon: Mic },
      { title: "שיחות קוליות", titleKey: "nav.items.voiceCalls", href: "/voice", icon: Phone },
      { title: "ידע ו-RAG", titleKey: "nav.items.knowledge", href: "/knowledge", icon: Brain },
    ],
  },
  {
    label: "פעולות",
    labelKey: "nav.groups.operations",
    items: [
      { title: "אוטומציה", titleKey: "nav.items.automation", href: "/automation", icon: Zap },
      { title: "אינטגרציות", titleKey: "nav.items.integrations", href: "/integrations", icon: Puzzle },
    ],
  },
  {
    label: "ניטור",
    labelKey: "nav.groups.monitoring",
    items: [
      { title: "בריאות המערכת", titleKey: "nav.items.systemHealth", href: "/monitoring", icon: Network },
      { title: "לוגים", titleKey: "nav.items.logs", href: "/logs", icon: FileText },
      { title: "מטריקות", titleKey: "nav.items.metrics", href: "/metrics", icon: BarChart2 },
      { title: "יומן ביקורת", titleKey: "nav.items.auditLog", href: "/audit-log", icon: ClipboardList },
    ],
  },
  {
    label: "ניהול פלטפורמה",
    labelKey: "nav.groups.platformAdmin",
    items: [
      { title: "מודולים", titleKey: "nav.items.modules", href: "/admin/modules", icon: Boxes },
      { title: "הגדרות פלטפורמה", titleKey: "nav.items.platformSettings", href: "/admin/settings", icon: Cog },
      { title: "Feature flags", titleKey: "nav.items.featureFlags", href: "/admin/feature-flags", icon: Flag },
      { title: "Policy engine", titleKey: "nav.items.policyEngine", href: "/admin/policies", icon: Shield },
      { title: "ספקי AI", titleKey: "nav.items.aiProviders", href: "/admin/ai-providers", icon: Bot },
      { title: "כישורי AI", titleKey: "nav.items.aiSkills", href: "/admin/ai-skills", icon: Sparkles },
      { title: "צריכת AI", titleKey: "nav.items.aiUsage", href: "/admin/ai-usage", icon: BarChart2 },
    ],
  },
  {
    label: "עסקי",
    labelKey: "nav.groups.business",
    items: [
      { title: "חיוב", titleKey: "nav.items.billing", href: "/billing", icon: CreditCard },
      { title: "גיבויים", titleKey: "nav.items.backups", href: "/backups", icon: HardDrive },
      { title: "מפתחות API", titleKey: "nav.items.apiKeys", href: "/api-keys", icon: KeyRound },
    ],
  },
  {
    label: "הגדרות",
    labelKey: "nav.groups.settings",
    items: [
      {
        title: "הגדרות",
        titleKey: "nav.items.settings",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "AI", titleKey: "nav.items.aiSettings", href: "/settings/ai", icon: Bot },
          { title: "כללי", titleKey: "nav.items.general", href: "/settings/general", icon: Settings },
          { title: "אימייל", titleKey: "nav.items.email", href: "/settings/email", icon: Bell },
          { title: "מגבלות שימוש", titleKey: "nav.items.usageLimits", href: "/settings/usage-limits", icon: Activity },
        ],
      },
      { title: "עזרה", titleKey: "nav.items.help", href: "/help", icon: BookOpen },
    ],
  },
];

/**
 * Mapping of nav routes → module key from PlatformModuleRegistry (cap 18).
 * Used by `filterNavByEnabledModules()` so disabled modules' groups don't
 * render in the sidebar. Routes not in this map always render (admin chrome,
 * dashboard root, settings).
 */
const ROUTE_TO_MODULE: Record<string, string> = {
  "/helpdesk": "helpdesk",
  "/users": "users",
  "/roles": "users",
  "/organizations": "users",
  "/departments": "users",
  "/audit-log": "audit-log",
  "/ai-agents": "ai-agents",
  "/ai-providers": "ai-providers",
  "/knowledge": "knowledge",
  "/ala": "voice",
  "/voice": "voice",
  "/automation": "automation",
  "/integrations": "integrations",
  "/monitoring": "monitoring",
  "/logs": "monitoring",
  "/metrics": "monitoring",
  "/billing": "billing",
  "/api-keys": "billing",
  "/data-sources": "data-sources",
};

function moduleKeyForHref(href: string): string | null {
  // Match by longest prefix so /helpdesk/tickets resolves to "helpdesk".
  const candidates = Object.keys(ROUTE_TO_MODULE).filter((r) => href.startsWith(r));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length);
  return ROUTE_TO_MODULE[candidates[0]] ?? null;
}

/**
 * Filter sidebar nav by the set of currently-enabled module keys.
 * Items belonging to a known-but-disabled module are dropped. Items with no
 * registry mapping (e.g. admin pages, /settings, root /) always render.
 *
 * Pass `enabledKeys` from `useEnabledModules().enabledKeys` (cap 18).
 */
export function filterNavByEnabledModules(
  groups: NavGroup[],
  enabledKeys: ReadonlySet<string>,
): NavGroup[] {
  const result: NavGroup[] = [];
  for (const group of groups) {
    const filteredItems = group.items.filter((item) => {
      const key = moduleKeyForHref(item.href);
      if (key === null) return true;
      return enabledKeys.has(key);
    });
    if (filteredItems.length > 0) {
      result.push({ ...group, items: filteredItems });
    }
  }
  return result;
}
