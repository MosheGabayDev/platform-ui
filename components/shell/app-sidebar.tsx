"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Moon, Sun, User, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { navGroups, type NavItem } from "./nav-items";

function NavMenuItem({ item, index }: { item: NavItem; index: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  if (item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setOpen(!open)}
          isActive={isActive}
          className="justify-between group"
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="size-4 shrink-0" />
            {item.title}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="size-3 opacity-60" />
          </motion.div>
        </SidebarMenuButton>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
              <SidebarMenuSub>
                {item.children.map((child) => (
                  <SidebarMenuSubItem key={child.href}>
                    <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                      <Link href={child.href} className="gap-2">
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
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} className="gap-2.5">
        <Link href={item.href}>
          <item.icon className="size-4 shrink-0" />
          {item.title}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Sidebar side="right" className="border-s border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
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
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest opacity-50 px-4">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5 px-2">
              {group.items.map((item, i) => (
                <NavMenuItem key={item.href} item={item} index={i} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
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
