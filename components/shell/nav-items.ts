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
      { title: "ארגונים", href: "/orgs", icon: Building2 },
      { title: "מחלקות", href: "/departments", icon: Building2 },
    ],
  },
  {
    label: "מערכת",
    items: [
      { title: "מפתחות API", href: "/api-keys", icon: KeyRound },
      { title: "יומן ביקורת", href: "/audit-log", icon: ClipboardList },
      { title: "גיבויים", href: "/backups", icon: HardDrive },
      {
        title: "הגדרות",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "מערכת", href: "/settings/system", icon: Settings },
          { title: "ארגון", href: "/settings/org", icon: Building2 },
          { title: "פיצ'רים", href: "/settings/features", icon: Activity },
          { title: "התראות", href: "/settings/notifications", icon: Bell },
          { title: "אינטגרציות", href: "/settings/integrations", icon: Activity },
        ],
      },
    ],
  },
  {
    label: "ניטור",
    items: [
      { title: "בריאות המערכת", href: "/health", icon: Activity },
      { title: "לוגים", href: "/logs", icon: ClipboardList },
      { title: "מטריקות", href: "/metrics", icon: BarChart2 },
    ],
  },
  {
    label: "עסקי",
    items: [
      { title: "חיוב", href: "/billing", icon: CreditCard },
      { title: "הלפדסק", href: "/helpdesk", icon: HeadphonesIcon },
      { title: "סוכני AI", href: "/agents", icon: Bot },
      { title: "ALA", href: "/ala", icon: Brain },
      { title: "ידע ו-RAG", href: "/knowledge", icon: BookOpen },
      { title: "שיחות קוליות", href: "/voice", icon: Phone },
    ],
  },
];
