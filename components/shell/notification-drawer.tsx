"use client";
/**
 * NotificationDrawer — popover body for cap 12.
 * ≤120 lines. Type discrimination via NOTIFICATION_META map (no per-type JSX conditionals).
 * RTL-safe: logical properties only.
 */
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, AlertTriangle, Bot, CreditCard, Wifi, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/modules/notifications/types";

// Type → icon + colour — no conditional rendering in JSX
const META: Record<NotificationType, { Icon: React.ElementType; colour: string }> = {
  approval_request:   { Icon: AlertTriangle, colour: "text-amber-500"       },
  investigation_done: { Icon: Bot,           colour: "text-primary"         },
  billing_alert:      { Icon: CreditCard,    colour: "text-destructive"     },
  service_down:       { Icon: Wifi,          colour: "text-destructive"     },
  info:               { Icon: Info,          colour: "text-muted-foreground" },
};

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1)   return "עכשיו";
  if (m < 60)  return `לפני ${m} דק'`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const router = useRouter();
  const { Icon, colour } = META[n.type];
  return (
    <button
      onClick={() => { if (!n.is_read) onRead(n.id); if (n.action_url) router.push(n.action_url); }}
      className={cn("w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50", !n.is_read && "bg-primary/5")}
    >
      <span className={cn("mt-0.5 shrink-0", colour)}><Icon className="size-4" aria-hidden /></span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm leading-snug truncate", !n.is_read && "font-semibold")}>{n.title}</p>
        {n.description && <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>}
        <p className="text-[10px] text-muted-foreground/60">{relTime(n.created_at)}</p>
      </div>
      {!n.is_read && <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" aria-label="לא נקרא" />}
    </button>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="size-4 rounded-full mt-0.5 shrink-0" />
      <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
    </div>
  );
}

interface Props {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  isMarkingAllRead: boolean;
}

export function NotificationDrawer({ notifications, unreadCount, isLoading, isError, onMarkRead, onMarkAllRead, isMarkingAllRead }: Props) {
  return (
    <div className="flex flex-col w-80">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">התראות</span>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={onMarkAllRead} disabled={isMarkingAllRead}>
            <CheckCheck className="size-3.5" />סמן הכל כנקרא
          </Button>
        )}
      </div>
      <Separator />
      <ScrollArea className="max-h-80">
        {isLoading && <><RowSkeleton /><RowSkeleton /><RowSkeleton /></>}
        {isError && (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <BellOff className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">לא ניתן לטעון התראות</p>
          </div>
        )}
        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <Bell className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/70">אין התראות חדשות</p>
          </div>
        )}
        {!isLoading && !isError && notifications.map((n) => (
          <NotificationRow key={n.id} n={n} onRead={onMarkRead} />
        ))}
      </ScrollArea>
    </div>
  );
}
