"use client";
import { Bell } from "lucide-react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationDrawer } from "./notification-drawer";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

/**
 * Header bell icon with unread badge + popover trigger (cap 12).
 * Polling via useNotifications() — 30s interval.
 * Badge hidden when unreadCount === 0. RTL-safe: -end-0.5 for badge.
 */
export function NotificationBell() {
  const { notifications, unreadCount, isLoading, isError, markRead, markAllRead, isMarkingAllRead } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 relative hover:bg-accent/80"
            aria-label={`התראות${unreadCount > 0 ? ` — ${unreadCount} לא נקראו` : ""}`}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -top-0.5 -end-0.5 min-w-4 h-4 rounded-full px-0.5",
                  "bg-primary text-[10px] text-primary-foreground",
                  "flex items-center justify-center font-bold shadow-sm shadow-primary/50",
                )}
                aria-hidden
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </m.div>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="p-0 w-auto">
        <NotificationDrawer
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          isError={isError}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          isMarkingAllRead={isMarkingAllRead}
        />
      </PopoverContent>
    </Popover>
  );
}
