/**
 * /admin/ip-allowlist page — render contract.
 *
 * Verifies the FeatureGate split between the upgrade-nudge and the
 * full editor, plus the CIDR validation hook into the form.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import type { ReactElement } from "react";

const flagEnabled = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/hooks/use-feature-flag", () => ({
  useFeatureFlag: () => ({ enabled: flagEnabled.value, isLoading: false, isError: false, source: "default" as const }),
}));

import IpAllowlistPage from "./page";

function render(node: ReactElement) {
  return renderWithIntl(node);
}

beforeEach(() => {
  flagEnabled.value = false;
  localStorage.clear();
});
afterEach(cleanup);

describe("IpAllowlistPage", () => {
  it("shows the upgrade nudge when flag is disabled (Free / Pro orgs)", () => {
    flagEnabled.value = false;
    render(<IpAllowlistPage />);
    expect(screen.getAllByText(/Enterprise|תוכנית Enterprise/i).length).toBeGreaterThan(0);
    // Upgrade CTA links to /billing
    const link = screen.getByRole("link", { name: /Upgrade|שדרג/ });
    expect(link.getAttribute("href")).toBe("/billing");
  });

  it("shows the editor when flag is enabled (Enterprise tenants)", () => {
    flagEnabled.value = true;
    render(<IpAllowlistPage />);
    expect(screen.getByTestId("cidr-input")).toBeTruthy();
    expect(screen.getByTestId("cidr-add")).toBeTruthy();
  });

  it("rejects invalid CIDR with the i18n error message", () => {
    flagEnabled.value = true;
    render(<IpAllowlistPage />);
    fireEvent.change(screen.getByTestId("cidr-input"), { target: { value: "not-a-cidr" } });
    fireEvent.click(screen.getByTestId("cidr-add"));
    // The error renders as a `text-destructive` paragraph; match on its
    // distinctive content (range example) so we don't collide with the
    // DataTable column header named "CIDR".
    expect(screen.getByText(/192\.168\.1\.0\/24/)).toBeTruthy();
  });

  it("adds a valid CIDR and surfaces it in the table", () => {
    flagEnabled.value = true;
    render(<IpAllowlistPage />);
    fireEvent.change(screen.getByTestId("cidr-input"), { target: { value: "10.0.0.0/8" } });
    fireEvent.click(screen.getByTestId("cidr-add"));
    expect(screen.getByText("10.0.0.0/8")).toBeTruthy();
  });

  it("removes a CIDR via the trash button", () => {
    flagEnabled.value = true;
    render(<IpAllowlistPage />);
    fireEvent.change(screen.getByTestId("cidr-input"), { target: { value: "192.168.1.0/24" } });
    fireEvent.click(screen.getByTestId("cidr-add"));
    expect(screen.getByText("192.168.1.0/24")).toBeTruthy();
    fireEvent.click(screen.getByTestId("cidr-remove-0"));
    expect(screen.queryByText("192.168.1.0/24")).toBeNull();
  });

  it("persists allowlist across renders via localStorage", () => {
    flagEnabled.value = true;
    const { unmount } = render(<IpAllowlistPage />);
    fireEvent.change(screen.getByTestId("cidr-input"), { target: { value: "172.16.0.0/12" } });
    fireEvent.click(screen.getByTestId("cidr-add"));
    expect(screen.getByText("172.16.0.0/12")).toBeTruthy();
    unmount();
    cleanup();
    // Fresh render — localStorage carries the entry forward.
    render(<IpAllowlistPage />);
    expect(screen.getByText("172.16.0.0/12")).toBeTruthy();
  });
});
