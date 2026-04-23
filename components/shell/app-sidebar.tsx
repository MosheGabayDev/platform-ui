"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown, LogOut, Moon, Sun, User, Sparkles,
  Pin, PinOff, Clock, ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubItem, SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { navGroups, type NavItem } from "./nav-items";
import { SidebarSearch } from "./sidebar-search";
import { useNavHistory, useTrackNavHistory } from "@/lib/hooks/use-nav-history";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Single nav item ──────────────────────────────────────── */
function NavMenuItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const { isPinned, togglePin } = useNavHistory();
  const [open, setOpen] = useState(() =>
    !!item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + "/"))
  );
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const pinned = isPinned(item.href);

  if (item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setOpen(o => !o)}
          isActive={isActive}
          className="justify-between group/nav"
        >
          <span className="flex items-center gap-2.5">
            <item.icon className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`} />
            <span>{item.title}</span>
          </span>
          <div className="flex items-center gap-1 ms-auto">
            {item.badge && (
              <span className="text-[9px] font-bold bg-primary/20 text-primary px-1.5 rounded-full">
                {item.badge}
              </span>
            )}
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease }}>
              <ChevronDown className="size-3 opacity-50" />
            </motion.div>
          </div>
        </SidebarMenuButton>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease }}
              style={{ overflow: "hidden" }}
            >
              <SidebarMenuSub>
                {item.children.map(child => (
                  <SidebarMenuSubItem key={child.href}>
                    <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                      <Link href={child.href} className="gap-2 group/sub">
                        <child.icon className="size-3 shrink-0" />
                        {child.title}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="group/item">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={`gap-2.5 group/nav relative ${isActive ? "shadow-[inset_-2px_0_0_0_hsl(var(--primary))]" : ""}`}
      >
        <Link href={item.href}>
          {/* Active glow */}
          {isActive && (
            <motion.div
              layoutId="nav-active-bg"
              className="absolute inset-0 rounded-md bg-primary/8 pointer-events-none"
              transition={{ duration: 0.25, ease }}
            />
          )}
          <item.icon className={`size-4 shrink-0 relative z-10 transition-colors ${isActive ? "text-primary" : ""}`} />
          <span className="relative z-10 flex-1">{item.title}</span>
          {item.badge && (
            <span className="relative z-10 text-[9px] font-bold bg-primary/20 text-primary px-1.5 rounded-full">
              {item.badge}
            </span>
          )}
          {/* Pin button — appears on hover */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); togglePin(item.href); }}
            className="relative z-10 opacity-0 group-hover/item:opacity-100 transition-opacity ms-auto"
            title={pinned ? "הסר מסומנים" : "סמן לגישה מהירה"}
          >
            {pinned
              ? <PinOff className="size-3 text-primary/60" />
              : <Pin className="size-3 text-muted-foreground/40 hover:text-primary/60" />
            }
          </button>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/* ─── Collapsible group ────────────────────────────────────── */
function NavGroup({ label, items, defaultOpen = true }: {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <SidebarGroup className="py-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 w-full px-4 mb-0.5 group/group"
      >
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest opacity-50 flex-1 text-start group-hover/group:opacity-80 transition-opacity">
          {label}
        </SidebarGroupLabel>
        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18, ease }}>
          <ChevronDown className="size-3 text-muted-foreground/30 group-hover/group:text-muted-foreground/60 transition-colors" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            style={{ overflow: "hidden" }}
          >
            <SidebarMenu className="gap-0.5 px-2">
              {items.map(item => (
                <NavMenuItem key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarGroup>
  );
}

/* ─── Recent pages strip ───────────────────────────────────── */
function RecentPages() {
  const { recent } = useNavHistory();
  const pathname = usePathname();
  if (recent.filter(h => h !== pathname).length === 0) return null;

  return (
    <SidebarGroup className="py-1 border-b border-sidebar-border/40 mb-1">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest opacity-50 px-4 flex items-center gap-1.5">
        <Clock className="size-2.5" />
        ביקרת לאחרונה
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5 px-2">
        {recent.filter(h => h !== pathname).slice(0, 3).map(href => {
          const item = navGroups.flatMap(g => [
            ...g.items,
            ...(g.items.flatMap(i => i.children ?? [])),
          ]).find(i => i.href === href);
          if (!item) return null;
          return (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild className="gap-2 text-muted-foreground/70 hover:text-foreground">
                <Link href={href}>
                  <item.icon className="size-3.5 shrink-0" />
                  <span className="text-xs">{item.title}</span>
                  <ChevronRight className="size-3 ms-auto opacity-30" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/* ─── Pinned items ─────────────────────────────────────────── */
function PinnedItems() {
  const { pinned } = useNavHistory();
  if (pinned.length === 0) return null;

  return (
    <SidebarGroup className="py-1 border-b border-sidebar-border/40 mb-1">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest opacity-50 px-4 flex items-center gap-1.5">
        <Pin className="size-2.5" />
        סומן לגישה מהירה
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5 px-2">
        {pinned.map(href => {
          const item = navGroups.flatMap(g => [
            ...g.items,
            ...(g.items.flatMap(i => i.children ?? [])),
          ]).find(i => i.href === href);
          if (!item) return null;
          return (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild className="gap-2.5">
                <Link href={href}>
                  <item.icon className="size-4 shrink-0 text-primary/70" />
                  {item.title}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/* ─── Main sidebar ─────────────────────────────────────────── */
export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useTrackNavHistory();

  return (
    <Sidebar side="right" className="border-s border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
            PE
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground tracking-tight">Platform Engineer</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="size-2.5 text-primary/80" />
              <p className="text-[10px] text-sidebar-foreground/50 leading-none">AI-Powered Platform</p>
            </div>
          </div>
        </div>
        {/* Search */}
        <SidebarSearch />
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2 overflow-y-auto">
        <PinnedItems />
        <RecentPages />
        {navGroups.map((group, i) => (
          <NavGroup
            key={group.label}
            label={group.label}
            items={group.items}
            defaultOpen={i < 2}
          />
        ))}
      </SidebarContent>

      {/* User menu */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-11 hover:bg-sidebar-accent/80 transition-colors">
                  <Avatar className="size-7 ring-2 ring-primary/20">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                      MG
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-semibold">Moshe Gabay</span>
                    <span className="text-sidebar-foreground/50 text-[10px]">מנהל מערכת</span>
                  </div>
                  <ChevronDown className="size-3 me-auto opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-52 mb-1">
                <DropdownMenuItem className="gap-2.5">
                  <User className="size-3.5" />
                  פרופיל אישי
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && (theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />)}
                  {mounted ? (theme === "dark" ? "מצב בהיר" : "מצב כהה") : "מצב תצוגה"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2.5 text-destructive focus:text-destructive">
                  <LogOut className="size-3.5" />
                  התנתקות
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
