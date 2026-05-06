import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { JobStatusBadge } from "./job-status-badge";

afterEach(cleanup);

describe("JobStatusBadge", () => {
  it("renders the canonical label for known statuses", () => {
    render(<JobStatusBadge status="running" />);
    expect(screen.getByText("Running")).toBeTruthy();
  });

  it("supports a label override", () => {
    render(<JobStatusBadge status="running" label="בעבודה" />);
    expect(screen.getByText("בעבודה")).toBeTruthy();
  });

  it("falls back to the raw status string for unknown values (open enum)", () => {
    render(<JobStatusBadge status="degraded" />);
    expect(screen.getByText("degraded")).toBeTruthy();
  });

  it("running status icon spins (has animate-spin class)", () => {
    const { container } = render(<JobStatusBadge status="running" />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toMatch(/animate-spin/);
  });

  it("non-running statuses do not spin", () => {
    const { container } = render(<JobStatusBadge status="succeeded" />);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).not.toMatch(/animate-spin/);
  });

  it("partial status uses amber tone (regression: no-failed pass-through)", () => {
    const { container } = render(<JobStatusBadge status="partial" />);
    const badge = container.querySelector("[class*='border-amber']");
    expect(badge).toBeTruthy();
  });

  it("scheduled status renders 'Scheduled' label and cyan tone (Phase 4)", () => {
    const { container } = render(<JobStatusBadge status="scheduled" />);
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(container.querySelector("[class*='border-cyan']")).toBeTruthy();
  });

  it("in_progress status renders 'In progress' and animates", () => {
    const { container } = render(<JobStatusBadge status="in_progress" />);
    expect(screen.getByText("In progress")).toBeTruthy();
    // in_progress is not 'running', so the icon does NOT spin — that's a
    // deliberate distinction (running = job-runner; in_progress = lifecycle).
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).not.toMatch(/animate-spin/);
  });

  it("completed status renders 'Completed' and emerald tone", () => {
    const { container } = render(<JobStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(container.querySelector("[class*='border-emerald']")).toBeTruthy();
  });
});
