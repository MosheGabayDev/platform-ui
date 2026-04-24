/**
 * @module components/shared/detail-view/detail-loading-skeleton
 * Animated pulse skeleton shown while a detail page is loading.
 */

export function DetailLoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
    </div>
  );
}
