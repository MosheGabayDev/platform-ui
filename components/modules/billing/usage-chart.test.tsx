/**
 * UsageChart smoke render — Recharts ResponsiveContainer needs measured
 * dimensions which happy-dom does not provide, so we verify the loading
 * state contract + post-rAF render path. Visual correctness is verified
 * by the Playwright E2E suite (out of scope for unit tests).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const fetchSeriesMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/billing", () => ({
  fetchUsageSeries: fetchSeriesMock,
}));

import { UsageChart } from "./usage-chart";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => fetchSeriesMock.mockReset());
afterEach(cleanup);

describe("UsageChart", () => {
  it("shows the loading skeleton on initial render (sync path)", () => {
    fetchSeriesMock.mockResolvedValue({ success: true, data: { series: [] } });
    const { container } = render(<UsageChart />);
    // Loading skeleton renders before the async query OR rAF have settled.
    expect(container.querySelector("[data-testid='usage-chart-loading']")).toBeTruthy();
  });

  it("renders the chart shell once data resolves and rAF fires", async () => {
    fetchSeriesMock.mockResolvedValue({
      success: true,
      data: { series: [
        { date: "2026-04-01", tokens: 1000, api_calls: 10 },
        { date: "2026-04-02", tokens: 2000, api_calls: 20 },
      ] },
    });
    const { container } = render(<UsageChart />);
    await waitFor(() =>
      expect(container.querySelector("[data-testid='usage-chart']")).toBeTruthy(),
    );
  });

  it("renders the i18n title", async () => {
    fetchSeriesMock.mockResolvedValue({ success: true, data: { series: [] } });
    render(<UsageChart />);
    await waitFor(() => expect(screen.getByText(/30 הימים|30 days/)).toBeTruthy());
  });

  it("forwards days prop to the API client", async () => {
    fetchSeriesMock.mockResolvedValue({ success: true, data: { series: [] } });
    render(<UsageChart days={7} />);
    await waitFor(() => expect(fetchSeriesMock).toHaveBeenCalledWith(7));
  });
});
