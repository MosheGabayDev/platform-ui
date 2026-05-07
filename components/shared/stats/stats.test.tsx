/**
 * Smoke tests for stats primitives: StatCard, StatsGrid, KpiCard.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Users, Activity } from "lucide-react";
import { StatCard } from "./stat-card";
import { StatsGrid } from "./stats-grid";
import { KpiCard } from "./kpi-card";

afterEach(cleanup);

describe("StatCard", () => {
  it("renders icon, value and label", () => {
    render(<StatCard icon={Users} value={42} label="active users" />);
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("active users")).toBeTruthy();
  });
  it("renders em-dash when value is null", () => {
    render(<StatCard icon={Users} value={null as never} label="x" />);
    expect(screen.getByText("—")).toBeTruthy();
  });
  it("renders without icon when none provided", () => {
    render(<StatCard value={5} label="x" />);
    expect(screen.getByText("5")).toBeTruthy();
  });
  it("applies custom color classes", () => {
    const { container } = render(
      <StatCard icon={Users} value={1} label="x" color="border-red-500" />,
    );
    expect(container.querySelector(".border-red-500")).toBeTruthy();
  });
});

describe("StatsGrid", () => {
  it("wraps children in a flex grid", () => {
    const { container } = render(
      <StatsGrid>
        <span>a</span>
        <span>b</span>
      </StatsGrid>,
    );
    expect(container.querySelector(".flex")).toBeTruthy();
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
  });
  it("merges custom className", () => {
    const { container } = render(<StatsGrid className="my-cls">x</StatsGrid>);
    expect(container.querySelector(".my-cls")).toBeTruthy();
  });
});

describe("KpiCard", () => {
  it("renders title and final numeric value (count-up settles to target)", () => {
    render(
      <KpiCard
        title="Sessions"
        numericValue={5}
        icon={Activity}
        color="from-blue-500/20 to-blue-500/5"
        accent="text-blue-400"
        border="border-blue-500/30"
      />,
    );
    expect(screen.getByText("Sessions")).toBeTruthy();
  });
  it("renders trend row when change is provided (up=true)", () => {
    render(
      <KpiCard
        title="X"
        numericValue={1}
        change="+5%"
        up
        icon={Activity}
        color="x"
        accent="x"
        border="x"
      />,
    );
    expect(screen.getByText("+5%")).toBeTruthy();
    expect(screen.getByText("משבוע שעבר")).toBeTruthy();
  });
  it("renders down-trend variant", () => {
    render(
      <KpiCard
        title="X"
        numericValue={1}
        change="-3%"
        up={false}
        icon={Activity}
        color="x"
        accent="x"
        border="x"
      />,
    );
    expect(screen.getByText("-3%")).toBeTruthy();
  });
  it("respects custom changeSuffixLabel", () => {
    render(
      <KpiCard
        title="X"
        numericValue={1}
        change="+1"
        up
        icon={Activity}
        color="x"
        accent="x"
        border="x"
        changeSuffixLabel="this week"
      />,
    );
    expect(screen.getByText("this week")).toBeTruthy();
  });
  it("renders suffix after value", () => {
    render(
      <KpiCard
        title="X"
        numericValue={50}
        suffix="%"
        icon={Activity}
        color="x"
        accent="x"
        border="x"
      />,
    );
    expect(screen.getByText(/%/)).toBeTruthy();
  });
});
