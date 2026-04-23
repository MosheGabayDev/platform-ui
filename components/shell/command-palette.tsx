"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldCheck, KeyRound, ClipboardList,
  Activity, BarChart2, Settings, CreditCard, HeadphonesIcon,
  Bot, Brain, BookOpen, Phone, HardDrive, Building2, Search,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";

const pages = [
  { title: "דשבורד", href: "/", icon: LayoutDashboard, group: "ניווט" },
  { title: "משתמשים", href: "/users", icon: Users, group: "ניווט" },
  { title: "תפקידים והרשאות", href: "/roles", icon: ShieldCheck, group: "ניווט" },
  { title: "ארגונים", href: "/orgs", icon: Building2, group: "ניווט" },
  { title: "מפתחות API", href: "/api-keys", icon: KeyRound, group: "מערכת" },
  { title: "יומן ביקורת", href: "/audit-log", icon: ClipboardList, group: "מערכת" },
  { title: "גיבויים", href: "/backups", icon: HardDrive, group: "מערכת" },
  { title: "הגדרות מערכת", href: "/settings/system", icon: Settings, group: "מערכת" },
  { title: "בריאות המערכת", href: "/health", icon: Activity, group: "ניטור" },
  { title: "לוגים", href: "/logs", icon: ClipboardList, group: "ניטור" },
  { title: "מטריקות", href: "/metrics", icon: BarChart2, group: "ניטור" },
  { title: "חיוב", href: "/billing", icon: CreditCard, group: "עסקי" },
  { title: "הלפדסק", href: "/helpdesk", icon: HeadphonesIcon, group: "עסקי" },
  { title: "סוכני AI", href: "/agents", icon: Bot, group: "עסקי" },
  { title: "ALA", href: "/ala", icon: Brain, group: "עסקי" },
  { title: "ידע ו-RAG", href: "/knowledge", icon: BookOpen, group: "עסקי" },
  { title: "שיחות קוליות", href: "/voice", icon: Phone, group: "עסקי" },
];

const groups = ["ניווט", "מערכת", "ניטור", "עסקי"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="חפש דף, פעולה, משתמש..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <Search className="size-8 opacity-40" />
            <p className="text-sm">לא נמצאו תוצאות</p>
          </div>
        </CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {pages
              .filter((p) => p.group === group)
              .map((page) => (
                <CommandItem
                  key={page.href}
                  value={page.title}
                  onSelect={() => navigate(page.href)}
                  className="gap-2.5 cursor-pointer"
                >
                  <page.icon className="size-4 text-muted-foreground" />
                  {page.title}
                </CommandItem>
              ))}
            <CommandSeparator />
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
