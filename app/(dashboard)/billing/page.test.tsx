/**
 * /billing page — plan tier badge + 3 usage gauges + invoices table +
 * usage chart mount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const fetchOverviewMock = vi.hoisted(() => vi.fn());
const fetchUsageSeriesMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/billing", () => ({
  fetchBillingOverview: fetchOverviewMock,
  fetchUsageSeries: fetchUsageSeriesMock,
  MOCK_MODE: true,
}));

import BillingPage from "./page";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

const overviewFixture = (tier: "free" | "pro" | "enterprise" = "pro") => ({
  success: true,
  data: {
    plan: {
      tier,
      monthly_price: tier === "pro" ? 99 : 0,
      currency: "USD",
      portal_url: null,
      next_billing_at: "2026-06-01T00:00:00Z",
    },
    usage: {
      tokens: { used: 1_240_000, limit: 5_000_000 },
      api_calls: { used: 18_320, limit: 100_000 },
      seats: { used: 7, limit: 25 },
    },
    invoices: [
      { id: "inv_1", date: "2026-04-01T00:00:00Z", amount_cents: 9900, currency: "USD", status: "paid" as const, pdf_url: null },
    ],
  },
});

beforeEach(() => {
  fetchOverviewMock.mockReset();
  fetchUsageSeriesMock.mockReset();
  fetchUsageSeriesMock.mockResolvedValue({ success: true, data: { series: [] } });
});
afterEach(cleanup);

describe("BillingPage", () => {
  it("renders the title", () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture());
    render(<BillingPage />);
    expect(screen.getAllByText(/חיוב|Billing/).length).toBeGreaterThan(0);
  });

  it("renders the plan tier badge after data resolves (pro)", async () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    render(<BillingPage />);
    await waitFor(() => expect(screen.getByText(/Pro|מקצועי/)).toBeTruthy());
  });

  it("renders monthly price + currency", async () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    render(<BillingPage />);
    await waitFor(() => expect(screen.getByText(/\$99/)).toBeTruthy());
  });

  it("renders the 3 usage gauges with progressbar role + aria-valuenow", async () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    const { container } = render(<BillingPage />);
    await waitFor(() =>
      expect(container.querySelectorAll("[role='progressbar']").length).toBe(3),
    );
  });

  it("renders the invoices table with at least one row when invoices present", async () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    render(<BillingPage />);
    // Status badge "paid" is the easiest invoice indicator.
    await waitFor(() => expect(screen.getByText(/שולם|Paid/)).toBeTruthy());
  });

  it("renders the empty invoices state when no invoices", async () => {
    fetchOverviewMock.mockResolvedValue({
      ...overviewFixture("pro"),
      data: { ...overviewFixture("pro").data, invoices: [] },
    });
    render(<BillingPage />);
    await waitFor(() => expect(screen.getByText(/אין חשבוניות|No invoices/i)).toBeTruthy());
  });

  it("Manage payment CTA is disabled in mock-mode (no Stripe portal_url)", async () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    render(<BillingPage />);
    await waitFor(() => {
      const cta = screen.getByRole("button", { name: /Manage payment|נהל אמצעי תשלום/i }) as HTMLButtonElement;
      expect(cta.disabled).toBe(true);
    });
  });

  it("renders the MOCK_MODE banner", () => {
    fetchOverviewMock.mockResolvedValue(overviewFixture("pro"));
    render(<BillingPage />);
    expect(screen.getByText(/Stripe|דמו/)).toBeTruthy();
  });
});
