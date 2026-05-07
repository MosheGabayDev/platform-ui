/**
 * FeatureGate — fail-closed flag gating.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const flagState = vi.hoisted(() => ({
  enabled: false,
  isLoading: false,
  isError: false,
  source: "default" as "default" | "api",
}));

vi.mock("@/lib/hooks/use-feature-flag", () => ({
  useFeatureFlag: () => flagState,
}));

import { FeatureGate } from "./feature-gate";

beforeEach(() => {
  flagState.enabled = false;
  flagState.isLoading = false;
});
afterEach(cleanup);

describe("FeatureGate", () => {
  it("renders fallback while loading (fail-closed)", () => {
    flagState.isLoading = true;
    render(
      <FeatureGate flag={"helpdesk.enabled" as never} fallback={<span>FB</span>}>
        <span>HIT</span>
      </FeatureGate>,
    );
    expect(screen.getByText("FB")).toBeTruthy();
    expect(screen.queryByText("HIT")).toBeNull();
  });

  it("renders fallback when disabled", () => {
    render(
      <FeatureGate flag={"helpdesk.enabled" as never} fallback={<span>FB</span>}>
        <span>HIT</span>
      </FeatureGate>,
    );
    expect(screen.getByText("FB")).toBeTruthy();
  });

  it("renders nothing when disabled and no fallback (default null)", () => {
    const { container } = render(
      <FeatureGate flag={"helpdesk.enabled" as never}>
        <span>HIT</span>
      </FeatureGate>,
    );
    expect(container.textContent).toBe("");
  });

  it("renders children when enabled", () => {
    flagState.enabled = true;
    render(
      <FeatureGate flag={"helpdesk.enabled" as never}>
        <span>HIT</span>
      </FeatureGate>,
    );
    expect(screen.getByText("HIT")).toBeTruthy();
  });
});
