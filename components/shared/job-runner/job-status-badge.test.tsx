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
});
