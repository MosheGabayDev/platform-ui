/**
 * /bookmarks page — render contract for the third vertical (lite).
 *
 * Mocks lib/api/bookmarks. Verifies fixture rendering, mock-mode banner,
 * Add CTA, and the inline error path when the user submits a bad URL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const sessionMock = vi.hoisted(() => ({
  data: null as unknown,
  status: "loading" as string,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
  signIn: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());
const addMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/bookmarks", () => {
  class InvalidUrlErrorMock extends Error {
    constructor() {
      super("INVALID_URL");
      this.name = "InvalidUrlError";
    }
  }
  return {
    fetchBookmarks: fetchMock,
    addBookmark: addMock,
    deleteBookmark: deleteMock,
    InvalidUrlError: InvalidUrlErrorMock,
    MOCK_MODE: true,
  };
});

import BookmarksPage from "./page";
import { InvalidUrlError } from "@/lib/api/bookmarks";

function render(node: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

const item = (over: Partial<{ id: string; title: string; url: string; added_by_id: number }> = {}) => ({
  id: over.id ?? "bm-1",
  created_at: "2026-05-10T00:00:00Z",
  title: over.title ?? "Sample",
  url: over.url ?? "https://example.com/",
  added_by_id: over.added_by_id ?? 1,
  added_by_name: "Demo Admin",
});

beforeEach(() => {
  fetchMock.mockReset();
  addMock.mockReset();
  deleteMock.mockReset();
  sessionMock.status = "authenticated";
  sessionMock.data = { user: { id: 1, role: "user" } };
});
afterEach(cleanup);

describe("BookmarksPage", () => {
  it("renders the page title from i18n", () => {
    fetchMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<BookmarksPage />);
    expect(screen.getAllByText(/^סימניות$|^Bookmarks$/).length).toBeGreaterThan(0);
  });

  it("renders the mock-mode banner", () => {
    fetchMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<BookmarksPage />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("shows the empty state when no bookmarks", async () => {
    fetchMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<BookmarksPage />);
    await waitFor(() =>
      expect(screen.getByText(/אין סימניות עדיין|No bookmarks yet/)).toBeTruthy(),
    );
  });

  it("renders fixture bookmarks and exposes the host name", async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          item({ id: "bm-1", title: "Wiki", url: "https://wiki.example.com/eng" }),
          item({ id: "bm-2", title: "Status", url: "https://status.example.com/" }),
        ],
        total: 2,
      },
    });
    render(<BookmarksPage />);
    await waitFor(() => expect(screen.getByText("Wiki")).toBeTruthy());
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("wiki.example.com")).toBeTruthy();
  });

  it("renders the Add CTA", async () => {
    fetchMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<BookmarksPage />);
    await waitFor(() => expect(screen.getByTestId("bookmarks-add")).toBeTruthy());
  });

  it("surfaces the inline error when addBookmark throws InvalidUrlError", async () => {
    fetchMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    addMock.mockRejectedValueOnce(new InvalidUrlError());
    render(<BookmarksPage />);
    fireEvent.click(screen.getByTestId("bookmarks-add"));
    fireEvent.change(screen.getByLabelText(/^Title$|^כותרת$/i), {
      target: { value: "ftp test" },
    });
    fireEvent.change(screen.getByLabelText(/^URL$|^כתובת URL$/i), {
      target: { value: "ftp://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$|^שמור$/i }));
    await waitFor(() =>
      expect(screen.getByTestId("bookmark-url-error")).toBeTruthy(),
    );
  });

  it("delete button shows for owner-authored bookmarks only", async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          item({ id: "bm-mine", added_by_id: 1, title: "Mine" }),
          item({ id: "bm-theirs", added_by_id: 2, title: "Theirs" }),
        ],
        total: 2,
      },
    });
    render(<BookmarksPage />);
    await waitFor(() => expect(screen.getByText("Mine")).toBeTruthy());
    expect(screen.getByTestId("bookmarks-delete-bm-mine")).toBeTruthy();
    expect(screen.queryByTestId("bookmarks-delete-bm-theirs")).toBeNull();
  });

  it("confirm dialog dispatches deleteBookmark with the row id", async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: {
        items: [item({ id: "bm-mine", added_by_id: 1, title: "Mine" })],
        total: 1,
      },
    });
    deleteMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<BookmarksPage />);
    await waitFor(() => expect(screen.getByText("Mine")).toBeTruthy());
    fireEvent.click(screen.getByTestId("bookmarks-delete-bm-mine"));
    fireEvent.click(screen.getByTestId("bookmarks-delete-confirm-bm-mine"));
    // TanStack Query passes a context obj as the 2nd mutationFn arg; only
    // assert on the id we control.
    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(deleteMock.mock.calls[0]![0]).toBe("bm-mine");
  });
});
