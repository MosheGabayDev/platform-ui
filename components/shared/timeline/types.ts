import type { LucideIcon } from "lucide-react";

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  actor?: string;
  description: string;
  detail?: string;
  icon?: LucideIcon;
}
