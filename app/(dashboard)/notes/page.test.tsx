/**
 * /notes page — render contract for the second vertical module.
 *
 * Mocks: useSession + lib/api/notes. Verifies fixture rendering,
 * owner-only delete button gating, and the mock-mode banner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
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

const fetchNotesMock = vi.hoisted(() => vi.fn());
const addNoteMock = vi.hoisted(() => vi.fn());
const deleteNoteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/notes", () => ({
  fetchNotes: fetchNotesMock,
  addNote: addNoteMock,
  deleteNote: deleteNoteMock,
  MOCK_MODE: true,
}));

import NotesPage from "./page";

function render(node: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

const note = (over: Partial<{ id: string; title: string; author_id: number; tags: string[] }> = {}) => ({
  id: over.id ?? "n-1",
  created_at: "2026-05-10T00:00:00Z",
  updated_at: "2026-05-10T00:00:00Z",
  title: over.title ?? "Sample title",
  body: "Sample body",
  tags: over.tags ?? [],
  author_id: over.author_id ?? 1,
  author_name: "Demo Admin",
});

beforeEach(() => {
  fetchNotesMock.mockReset();
  addNoteMock.mockReset();
  deleteNoteMock.mockReset();
  sessionMock.status = "authenticated";
  sessionMock.data = { user: { id: 1, role: "user" } };
});
afterEach(cleanup);

describe("NotesPage", () => {
  it("renders the page title from i18n", () => {
    fetchNotesMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<NotesPage />);
    expect(screen.getAllByText(/^פתקים$|^Notes$/).length).toBeGreaterThan(0);
  });

  it("renders the mock-mode banner when MOCK_MODE=true", () => {
    fetchNotesMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<NotesPage />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("shows the empty state when no notes present", async () => {
    fetchNotesMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<NotesPage />);
    await waitFor(() =>
      expect(screen.getByText(/אין פתקים עדיין|No notes yet/)).toBeTruthy(),
    );
  });

  it("renders fixture notes with their titles and tags", async () => {
    fetchNotesMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          note({ id: "n-1", title: "First note", tags: ["meeting"] }),
          note({ id: "n-2", title: "Second note", tags: ["okr"] }),
        ],
        total: 2,
      },
    });
    render(<NotesPage />);
    await waitFor(() => expect(screen.getByText("First note")).toBeTruthy());
    expect(screen.getByText("Second note")).toBeTruthy();
    expect(screen.getByText("#meeting")).toBeTruthy();
    expect(screen.getByText("#okr")).toBeTruthy();
  });

  it("renders the Add button (no RBAC gate — any user)", async () => {
    fetchNotesMock.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    render(<NotesPage />);
    await waitFor(() => expect(screen.getByTestId("notes-add")).toBeTruthy());
  });

  it("delete button shows for owner-authored notes only", async () => {
    fetchNotesMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          note({ id: "n-mine", author_id: 1, title: "Mine" }),
          note({ id: "n-theirs", author_id: 2, title: "Theirs" }),
        ],
        total: 2,
      },
    });
    render(<NotesPage />);
    await waitFor(() => expect(screen.getByText("Mine")).toBeTruthy());
    expect(screen.getByTestId("notes-delete-n-mine")).toBeTruthy();
    expect(screen.queryByTestId("notes-delete-n-theirs")).toBeNull();
  });
});
