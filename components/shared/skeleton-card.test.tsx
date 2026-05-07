/**
 * Skeleton card primitives — pure presentational; smoke render.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  StatCardSkeleton,
  FeedItemSkeleton,
  ServiceRowSkeleton,
  TableSkeleton,
} from "./skeleton-card";

afterEach(cleanup);

describe("skeleton-card primitives", () => {
  it("StatCardSkeleton renders with stagger delay style", () => {
    const { container } = render(<StatCardSkeleton index={2} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.animationDelay).toBe("160ms");
  });
  it("StatCardSkeleton defaults index to 0", () => {
    const { container } = render(<StatCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.animationDelay).toBe("0ms");
  });
  it("FeedItemSkeleton renders shimmer rows", () => {
    const { container } = render(<FeedItemSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
  it("ServiceRowSkeleton renders shimmer rows", () => {
    const { container } = render(<ServiceRowSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
  it("TableSkeleton respects rows + cols", () => {
    const { container } = render(<TableSkeleton rows={3} cols={5} />);
    // header row + 3 data rows
    const rows = container.querySelectorAll(".flex");
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
  it("TableSkeleton uses defaults when omitted", () => {
    const { container } = render(<TableSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
