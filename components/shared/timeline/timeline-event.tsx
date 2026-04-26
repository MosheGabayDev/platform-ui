"use client";

import { useState } from "react";
import { ChevronDown, Activity } from "lucide-react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format";
import type { TimelineEvent } from "./types";

interface TimelineEventProps {
  event: TimelineEvent;
  isLast: boolean;
}

export function TimelineEventItem({ event, isLast }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = event.icon ?? Activity;

  return (
    <div className="relative flex gap-3">
      {/* connector line */}
      {!isLast && (
        <div className="absolute start-[15px] top-8 bottom-0 w-px bg-border" />
      )}

      {/* icon dot */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {event.actor && (
            <span className="text-sm font-medium text-foreground">
              {event.actor}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {event.description}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>

        {event.detail && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  expanded && "rotate-180"
                )}
              />
              {expanded ? "הסתר פרטים" : "הצג פרטים"}
            </button>

            <m.div
              animate={{
                maxHeight: expanded ? "200px" : "0px",
                opacity: expanded ? 1 : 0,
              }}
              initial={{ maxHeight: "0px", opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                {event.detail}
              </p>
            </m.div>
          </div>
        )}
      </div>
    </div>
  );
}
