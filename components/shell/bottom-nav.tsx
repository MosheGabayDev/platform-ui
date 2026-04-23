"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HeadphonesIcon, Bot, Activity, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { title: "דשבורד", href: "/", icon: LayoutDashboard },
  { title: "הלפדסק", href: "/helpdesk", icon: HeadphonesIcon },
  { title: "סוכנים", href: "/agents", icon: Bot },
  { title: "ניטור", href: "/health", icon: Activity },
  { title: "הגדרות", href: "/settings/system", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn("size-5 transition-transform duration-200", isActive && "scale-110")} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
