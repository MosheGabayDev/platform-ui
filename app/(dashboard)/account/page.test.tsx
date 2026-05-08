/**
 * /account page — GDPR data export + Right-to-be-Forgotten + data
 * residency notice.
 *
 * Covers the typed-confirm gate: the destructive Delete button stays
 * disabled until the user retypes their email exactly. This is the
 * UX-side of the safety contract; backend re-validates regardless.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const sessionMock = vi.hoisted(() => ({ data: null as unknown, status: "loading" as string }));
vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
}));

const exportMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/account", () => ({
  requestDataExport: exportMock,
  requestAccountDelete: deleteMock,
  MOCK_MODE: true,
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import AccountPage from "./page";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  exportMock.mockReset();
  deleteMock.mockReset();
  toastMock.success.mockReset();
  sessionMock.status = "authenticated";
  sessionMock.data = { user: { id: 1, email: "user@example.com", role: "user" } };
});
afterEach(cleanup);

describe("AccountPage", () => {
  it("renders the page title + 3 cards (residency / export / delete)", () => {
    render(<AccountPage />);
    // h1 + subtitle both contain the title text — getAllByText handles either.
    expect(screen.getAllByText(/החשבון שלי|My account/).length).toBeGreaterThan(0);
    // 3 section h2 headings: residency, export, delete
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it("export CTA fires requestDataExport and shows success toast", async () => {
    exportMock.mockResolvedValue({
      success: true,
      message: "ok",
      data: { request_id: "exp_1", estimated_email_at: "2026-05-09T00:00:00Z" },
    });
    render(<AccountPage />);
    fireEvent.click(screen.getByTestId("account-export-cta"));
    await waitFor(() => expect(exportMock).toHaveBeenCalled());
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("Delete button stays disabled until typed email matches", () => {
    render(<AccountPage />);
    const cta = screen.getByTestId("account-delete-cta") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    const input = screen.getByTestId("account-delete-typed-confirm") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "wrong@email.com" } });
    expect(cta.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "user@example.com" } });
    expect(cta.disabled).toBe(false);
  });

  it("Delete email match is case-insensitive (matches typed-confirm contract)", () => {
    render(<AccountPage />);
    const cta = screen.getByTestId("account-delete-cta") as HTMLButtonElement;
    const input = screen.getByTestId("account-delete-typed-confirm") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "USER@EXAMPLE.COM" } });
    expect(cta.disabled).toBe(false);
  });

  it("Delete CTA fires requestAccountDelete with the typed email and shows success", async () => {
    deleteMock.mockResolvedValue({
      success: true,
      message: "ok",
      data: { request_id: "del_1", effective_at: "2026-05-15T00:00:00Z" },
    });
    render(<AccountPage />);
    const input = screen.getByTestId("account-delete-typed-confirm");
    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByTestId("account-delete-cta"));
    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(deleteMock.mock.calls[0]![0]).toEqual({ email_confirmation: "user@example.com" });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("renders MockNotice banners on both export + delete cards (MOCK_MODE=true)", () => {
    render(<AccountPage />);
    const banners = screen.getAllByRole("status");
    // export banner + delete banner = 2
    expect(banners.length).toBeGreaterThanOrEqual(2);
  });
});
