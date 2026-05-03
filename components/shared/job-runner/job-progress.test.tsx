import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { JobProgress } from "./job-progress";

afterEach(cleanup);

describe("JobProgress", () => {
  it("renders count-only when total is null (planning phase)", () => {
    render(
      <JobProgress
        progress={{ processed: 0, total: null, succeeded: 0, failed: 0 }}
        status="queued"
      />,
    );
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders the progress bar at correct percentage when running", () => {
    const { container } = render(
      <JobProgress
        progress={{ processed: 8, total: 14, succeeded: 8, failed: 0 }}
        status="running"
      />,
    );
    const bar = container.querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuenow")).toBe("57"); // 8/14 ≈ 57
    expect(screen.getByText("8/14")).toBeTruthy();
  });

  it("shows failed count when there are failures", () => {
    render(
      <JobProgress
        progress={{ processed: 18, total: 18, succeeded: 15, failed: 3 }}
        status="partial"
      />,
    );
    expect(screen.getByText(/18\/18.*3 failed/)).toBeTruthy();
  });

  it("caps percentage at 100 even if processed > total", () => {
    const { container } = render(
      <JobProgress
        progress={{ processed: 200, total: 100, succeeded: 200, failed: 0 }}
        status="succeeded"
      />,
    );
    const bar = container.querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuenow")).toBe("100");
  });
});
