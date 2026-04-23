"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/40 animate-pulse",
        className
      )}
    />
  );
}

export function StatCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card
      className="relative overflow-hidden border border-border/30 bg-gradient-to-br from-muted/20 to-muted/5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="size-7 rounded-lg" />
      </CardHeader>
      <CardContent className="px-4 pb-0">
        <Shimmer className="h-9 w-20 mt-1" />
        <Shimmer className="h-3 w-32 mt-2" />
      </CardContent>
      <div className="h-12 mt-1 px-0">
        <Shimmer className="h-full w-full rounded-none" />
      </div>
    </Card>
  );
}

export function FeedItemSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <Shimmer className="size-7 rounded-full shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-3/4" />
      </div>
      <Shimmer className="h-3 w-10 shrink-0" />
    </div>
  );
}

export function ServiceRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2.5">
        <Shimmer className="size-1.5 rounded-full" />
        <Shimmer className="size-3.5 rounded" />
        <Shimmer className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-3 w-8" />
        <Shimmer className="h-4 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border/40">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-border/20">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn("rounded-md bg-muted/40 animate-pulse h-3 flex-1", c === 0 && "w-8 flex-none")}
              style={{ animationDelay: `${(r * cols + c) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
