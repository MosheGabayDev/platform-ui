"use client";

import { m, LazyMotion, domAnimation } from "framer-motion";
import { TimelineEventItem } from "./timeline-event";
import { TimelineSkeleton } from "./timeline-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock } from "lucide-react";
import type { TimelineEvent } from "./types";

interface PlatformTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  skeletonRows?: number;
}

export function PlatformTimeline({
  events,
  isLoading = false,
  skeletonRows = 4,
}: PlatformTimelineProps) {
  if (isLoading) return <TimelineSkeleton rows={skeletonRows} />;

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="אין אירועים"
        description="לא נמצאו אירועים בציר הזמן"
      />
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div>
        {events.map((event, i) => (
          <m.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <TimelineEventItem event={event} isLast={i === events.length - 1} />
          </m.div>
        ))}
      </div>
    </LazyMotion>
  );
}
