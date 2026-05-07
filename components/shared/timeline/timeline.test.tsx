/**
 * Timeline primitives — list rendering, loading + empty states, expand-detail.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Activity } from "lucide-react";
import { PlatformTimeline } from "./timeline";
import { TimelineEventItem } from "./timeline-event";
import { TimelineSkeleton } from "./timeline-skeleton";
import type { TimelineEvent } from "./types";

afterEach(cleanup);

const mkEvent = (over: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: "e1",
  type: "test",
  description: "did something",
  timestamp: new Date().toISOString(),
  ...over,
});

describe("PlatformTimeline", () => {
  it("renders TimelineSkeleton when isLoading", () => {
    const { container } = render(
      <PlatformTimeline events={[]} isLoading skeletonRows={3} />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty state when no events", () => {
    render(<PlatformTimeline events={[]} />);
    expect(screen.getByText("אין אירועים")).toBeTruthy();
  });

  it("renders one item per event", () => {
    render(
      <PlatformTimeline
        events={[
          mkEvent({ id: "1", description: "first" }),
          mkEvent({ id: "2", description: "second" }),
        ]}
      />,
    );
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText("second")).toBeTruthy();
  });
});

describe("TimelineEventItem", () => {
  it("renders actor + description + relative time", () => {
    render(
      <TimelineEventItem
        event={mkEvent({ actor: "alice", description: "logged in" })}
        isLast
      />,
    );
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("logged in")).toBeTruthy();
  });

  it("renders connector line when not last", () => {
    const { container } = render(
      <TimelineEventItem event={mkEvent()} isLast={false} />,
    );
    expect(container.querySelector(".bg-border")).toBeTruthy();
  });

  it("expand-detail toggles button label", () => {
    render(
      <TimelineEventItem
        event={mkEvent({ detail: "extra info" })}
        isLast
      />,
    );
    expect(screen.getByText("הצג פרטים")).toBeTruthy();
    fireEvent.click(screen.getByText("הצג פרטים"));
    expect(screen.getByText("הסתר פרטים")).toBeTruthy();
  });

  it("renders custom event icon", () => {
    const { container } = render(
      <TimelineEventItem event={mkEvent({ icon: Activity })} isLast />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("TimelineSkeleton", () => {
  it("renders specified number of skeleton rows", () => {
    const { container } = render(<TimelineSkeleton rows={3} />);
    expect(container.querySelectorAll(".rounded-full").length).toBe(3);
  });
  it("defaults to 4 rows", () => {
    const { container } = render(<TimelineSkeleton />);
    expect(container.querySelectorAll(".rounded-full").length).toBe(4);
  });
});
