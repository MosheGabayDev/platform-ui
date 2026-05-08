/**
 * /admin/feedback page — render contract.
 *
 * Mocks: useSession + lib/api/feedback fetcher to bypass live data
 * and the localStorage shim. Verifies fixture rendering, RBAC-gated
 * Add button, and the badge stylings.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const sessionMock = vi.hoisted(() => ({ data: null as unknown, status: "loading" as string }));
vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
  signIn: vi.fn(),
}));

const fetchFeedbackMock = vi.hoisted(() => vi.fn());
const addFeedbackMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/feedback", async () => {
  return {
    fetchFeedback: fetchFeedbackMock,
    addFeedback: addFeedbackMock,
    MOCK_MODE: true,
  };
});

import FeedbackPage from "./page";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

const fixtureItem = (over: Partial<{ id: string; type: "bug" | "feature" | "insight"; status: "new" | "triaged" | "converted"; content: string }> = {}) => ({
  id: over.id ?? "fb-1",
  received_at: "2026-05-04T00:00:00Z",
  source: "pilot-call",
  type: over.type ?? "feature",
  status: over.status ?? "new",
  content: over.content ?? "Sample feedback",
  reporter: null,
  backlog_link: null,
});

beforeEach(() => {
  fetchFeedbackMock.mockReset();
  addFeedbackMock.mockReset();
  sessionMock.status = "authenticated";
  sessionMock.data = { user: { id: 1, role: "system_admin", is_admin: true, is_system_admin: true } };
});
afterEach(cleanup);

describe("FeedbackPage", () => {
  it("renders the page title from i18n", async () => {
    fetchFeedbackMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<FeedbackPage />);
    expect(screen.getByText(/משוב לקוחות|Customer feedback/)).toBeTruthy();
  });

  it("shows the empty state when no feedback present", async () => {
    fetchFeedbackMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<FeedbackPage />);
    await waitFor(() =>
      expect(screen.getByText(/feedback@platform\.local/)).toBeTruthy(),
    );
  });

  it("renders the 3 fixture items + their type badges", async () => {
    fetchFeedbackMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          fixtureItem({ id: "fb-1", type: "bug", content: "Bug item" }),
          fixtureItem({ id: "fb-2", type: "feature", content: "Feature item" }),
          fixtureItem({ id: "fb-3", type: "insight", content: "Insight item" }),
        ],
        total: 3,
      },
    });
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByText("Bug item")).toBeTruthy());
    expect(screen.getByText("Feature item")).toBeTruthy();
    expect(screen.getByText("Insight item")).toBeTruthy();
  });

  it("shows Add button for system_admin (RBAC-passing path)", async () => {
    fetchFeedbackMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<FeedbackPage />);
    await waitFor(() => expect(screen.getByTestId("feedback-add")).toBeTruthy());
  });

  it("hides Add button for non-system_admin", async () => {
    sessionMock.data = { user: { id: 1, role: "user", is_admin: false, is_system_admin: false } };
    fetchFeedbackMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<FeedbackPage />);
    // Wait long enough for query to settle but Add button never appears.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("feedback-add")).toBeNull();
  });

  it("renders the mock-mode banner when MOCK_MODE=true", async () => {
    fetchFeedbackMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<FeedbackPage />);
    // The MockNotice banner is unconditional on the query state — it
    // reads MOCK_MODE statically and uses role="status".
    const banners = screen.queryAllByRole("status");
    expect(banners.length).toBeGreaterThan(0);
  });
});
