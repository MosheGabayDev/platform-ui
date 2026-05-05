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
      { title: "הגדרות פלטפורמה", href: "/admin/settings", icon: Cog },
      { title: "Feature flags", href: "/admin/feature-flags", icon: Flag },
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
          { title: "כללי", href: "/settings/general", icon: Settings },
          { title: "אימייל", href: "/settings/email", icon: Bell },
          { title: "ספקי AI", href: "/settings/ai-providers", icon: Bot },
          { title: "מגבלות שימוש", href: "/settings/usage-limits", icon: Activity },
        ],
      },
    ],
  },
];
