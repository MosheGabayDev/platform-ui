export function TimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="relative flex gap-3">
          {i < rows - 1 && (
            <div className="absolute start-[15px] top-8 bottom-0 w-px bg-border" />
          )}
          <div className="relative z-10 h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 pb-6 pt-1 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
