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

  it("pending_approval renders 'Pending' and amber tone (Track D)", () => {
    const { container } = render(<JobStatusBadge status="pending_approval" />);
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(container.querySelector("[class*='border-amber']")).toBeTruthy();
  });

  it("approved renders 'Approved' and emerald tone (Track D)", () => {
    const { container } = render(<JobStatusBadge status="approved" />);
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(container.querySelector("[class*='border-emerald']")).toBeTruthy();
  });

  it("rejected renders 'Rejected' and rose tone (Track D)", () => {
    const { container } = render(<JobStatusBadge status="rejected" />);
    expect(screen.getByText("Rejected")).toBeTruthy();
    expect(container.querySelector("[class*='border-rose']")).toBeTruthy();
  });

  it("healthy renders 'Healthy' and emerald tone (Track D)", () => {
    const { container } = render(<JobStatusBadge status="healthy" />);
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(container.querySelector("[class*='border-emerald']")).toBeTruthy();
  });

  it("disabled_by_flag renders 'Flag-disabled' (Track D)", () => {
    render(<JobStatusBadge status="disabled_by_flag" />);
    expect(screen.getByText("Flag-disabled")).toBeTruthy();
  });

  it("unavailable renders 'Plan-locked' and rose tone (Track D)", () => {
    const { container } = render(<JobStatusBadge status="unavailable" />);
    expect(screen.getByText("Plan-locked")).toBeTruthy();
    expect(container.querySelector("[class*='border-rose']")).toBeTruthy();
  });
});
