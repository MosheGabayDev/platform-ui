/**
 * UpgradeCta — usage-aware nudge. Tests render gating, severity tier,
 * dismiss persistence, and the pure helper.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/billing", () => ({
  fetchBillingOverview: fetchMock,
}));

import { UpgradeCta, pickMostUtilized, UPGRADE_DISMISS_KEY } from "./upgrade-cta";

function makeOverview(usage: { tokens?: [number, number]; api_calls?: [number, number]; seats?: [number, number] }) {
  return {
    success: true,
    data: {
      plan: { tier: "pro", monthly_price: 99, currency: "USD", portal_url: null, next_billing_at: null },
      usage: {
        tokens: { used: usage.tokens?.[0] ?? 0, limit: usage.tokens?.[1] ?? 1000 },
        api_calls: { used: usage.api_calls?.[0] ?? 0, limit: usage.api_calls?.[1] ?? 1000 },
        seats: { used: usage.seats?.[0] ?? 0, limit: usage.seats?.[1] ?? 10 },
      },
      invoices: [],
    },
  };
}

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
});
afterEach(cleanup);

describe("pickMostUtilized", () => {
  it("returns null when nothing is at threshold", () => {
    expect(
      pickMostUtilized([
        { key: "tokens", used: 10, limit: 100, pct: 10 },
        { key: "api_calls", used: 50, limit: 100, pct: 50 },
      ]),
    ).toBeNull();
  });
  it("returns the metric closest to limit when ≥ 80%", () => {
    const out = pickMostUtilized([
      { key: "tokens", used: 60, limit: 100, pct: 60 },
      { key: "api_calls", used: 95, limit: 100, pct: 95 },
      { key: "seats", used: 7, limit: 10, pct: 70 },
    ]);
    expect(out?.key).toBe("api_calls");
  });
  it("handles the 100% over-limit case", () => {
    const out = pickMostUtilized([{ key: "seats", used: 11, limit: 10, pct: 110 }]);
    expect(out?.pct).toBe(110);
  });
  it("returns null for empty input", () => {
    expect(pickMostUtilized([])).toBeNull();
  });
});

describe("UpgradeCta", () => {
  it("renders nothing when all metrics under threshold", async () => {
    fetchMock.mockResolvedValue(makeOverview({ tokens: [10, 100], api_calls: [10, 100], seats: [1, 10] }));
    const { container } = render(<UpgradeCta />);
    // Wait long enough for the query to settle; banner should still be hidden.
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("shows warning variant when a metric crosses 80%", async () => {
    fetchMock.mockResolvedValue(makeOverview({ tokens: [85, 100] }));
    render(<UpgradeCta />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(screen.getByText(/85%/)).toBeTruthy();
  });

  it("shows destructive variant when a metric is over limit", async () => {
    fetchMock.mockResolvedValue(makeOverview({ seats: [11, 10] }));
    render(<UpgradeCta />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    const banner = screen.getByRole("status");
    expect(banner.className).toContain("destructive");
  });

  it("CTA button links to /billing", async () => {
    fetchMock.mockResolvedValue(makeOverview({ tokens: [85, 100] }));
    render(<UpgradeCta />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    const link = screen.getByRole("link", { name: /שדרג|Upgrade/ });
    expect(link.getAttribute("href")).toBe("/billing");
  });

  it("dismiss button hides the banner and persists per-metric key", async () => {
    fetchMock.mockResolvedValue(makeOverview({ tokens: [85, 100] }));
    render(<UpgradeCta />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /הסתר|Dismiss/ }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(localStorage.getItem(UPGRADE_DISMISS_KEY)).toBe("tokens:85");
  });

  it("respects a previously dismissed metric+bucket from localStorage", async () => {
    localStorage.setItem(UPGRADE_DISMISS_KEY, "tokens:85");
    fetchMock.mockResolvedValue(makeOverview({ tokens: [85, 100] }));
    const { container } = render(<UpgradeCta />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("re-shows when a NEW bucket crosses (e.g. 80% then 95%)", async () => {
    localStorage.setItem(UPGRADE_DISMISS_KEY, "tokens:85");
    fetchMock.mockResolvedValue(makeOverview({ tokens: [95, 100] }));
    render(<UpgradeCta />);
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  });

  it("returns null when query errors (never blocks page render)", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    const { container } = render(<UpgradeCta />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("[role='status']")).toBeNull();
  });
});
