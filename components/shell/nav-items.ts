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
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "ראשי",
    items: [
      { title: "דשבורד", href: "/", icon: LayoutDashboard },
      { title: "הקמה ראשונית", href: "/onboarding", icon: Sparkles },
    ],
  },
  {
    label: "ניהול משתמשים",
    items: [
      { title: "משתמשים", href: "/users", icon: Users },
      { title: "תפקידים והרשאות", href: "/roles", icon: ShieldCheck },
      { title: "ארגונים", href: "/organizations", icon: Building2 },
      { title: "מחלקות", href: "/departments", icon: UserCog },
    ],
  },
  {
    label: "הלפדסק",
    items: [
      { title: "דשבורד הלפדסק", href: "/helpdesk", icon: HeadphonesIcon },
      {
        title: "כרטיסים",
        href: "/helpdesk/tickets",
        icon: ClipboardList,
        badge: undefined, // populated at runtime from API
      },
      { title: "טכנאים", href: "/helpdesk/technicians", icon: Users },
      { title: "SLA", href: "/helpdesk/sla", icon: Activity },
      { title: "תחזוקה", href: "/helpdesk/maintenance", icon: Wrench },
      { title: "משימות אצווה", href: "/helpdesk/batch", icon: Layers },
      { title: "בסיס ידע", href: "/helpdesk/kb", icon: BookOpen },
    ],
  },
  {
    label: "AI & קול",
    items: [
      { title: "סוכני AI", href: "/ai-agents", icon: Bot },
      { title: "ALA — Voice AI", href: "/ala", icon: Mic },
      { title: "שיחות קוליות", href: "/voice", icon: Phone },
      { title: "ידע ו-RAG", href: "/knowledge", icon: Brain },
    ],
  },
  {
    label: "פעולות",
    items: [
      { title: "אוטומציה", href: "/automation", icon: Zap },
      { title: "אינטגרציות", href: "/integrations", icon: Puzzle },
    ],
  },
  {
    label: "ניטור",
    items: [
      { title: "בריאות המערכת", href: "/monitoring", icon: Network },
      { title: "לוגים", href: "/logs", icon: FileText },
      { title: "מטריקות", href: "/metrics", icon: BarChart2 },
      { title: "יומן ביקורת", href: "/audit-log", icon: ClipboardList },
    ],
  },
  {
    label: "ניהול פלטפורמה",
    items: [
      { title: "מודולים", href: "/admin/modules", icon: Boxes },
      { title: "הגדרות פלטפורמה", href: "/admin/settings", icon: Cog },
      { title: "Feature flags", href: "/admin/feature-flags", icon: Flag },
      { title: "Policy engine", href: "/admin/policies", icon: Shield },
      { title: "ספקי AI", href: "/admin/ai-providers", icon: Bot },
      { title: "כישורי AI", href: "/admin/ai-skills", icon: Sparkles },
      { title: "צריכת AI", href: "/admin/ai-usage", icon: BarChart2 },
    ],
  },
  {
    label: "עסקי",
    items: [
      { title: "חיוב", href: "/billing", icon: CreditCard },
      { title: "גיבויים", href: "/backups", icon: HardDrive },
      { title: "מפתחות API", href: "/api-keys", icon: KeyRound },
    ],
  },
  {
    label: "הגדרות",
    items: [
      {
        title: "הגדרות",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "AI", href: "/settings/ai", icon: Bot },
          { title: "כללי", href: "/settings/general", icon: Settings },
          { title: "אימייל", href: "/settings/email", icon: Bell },
          { title: "מגבלות שימוש", href: "/settings/usage-limits", icon: Activity },
        ],
      },
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
