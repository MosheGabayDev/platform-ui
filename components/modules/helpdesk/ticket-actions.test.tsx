import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TicketActions } from "./ticket-actions";
import type { TicketDetail } from "@/lib/modules/helpdesk/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const sessionUser = vi.hoisted(() => ({ id: 7, role: "system_admin" }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: sessionUser } }),
}));

// Capture mutation calls so we can assert on them
const mutateCalls = vi.hoisted(() => ({
  take: vi.fn(),
  resolve: vi.fn(),
  reassign: vi.fn(),
  comment: vi.fn(),
}));

vi.mock("@/lib/modules/helpdesk/hooks", () => ({
  useTakeTicket: () => ({
    mutate: mutateCalls.take,
    mutateAsync: mutateCalls.take,
    isPending: false,
    serverError: null,
  }),
  useResolveTicket: () => ({
    mutate: mutateCalls.resolve,
    mutateAsync: mutateCalls.resolve,
    isPending: false,
    serverError: null,
  }),
  useReassignTicket: () => ({
    mutate: mutateCalls.reassign,
    mutateAsync: mutateCalls.reassign,
    isPending: false,
    serverError: null,
  }),
  useCommentOnTicket: () => ({
    mutate: mutateCalls.comment,
    mutateAsync: mutateCalls.comment,
    isPending: false,
    serverError: null,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 1002,
    ticket_number: "TKT-2026-01002",
    title: "Printer offline in marketing wing",
    status: "new",
    priority: "low",
    assignee_id: null,
    requester_id: 42,
    requester_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    response_due_at: null,
    resolution_due_at: null,
    sla_response_breached: false,
    sla_resolution_breached: false,
    sla_breached: false,
    description: "Body",
    watchers: [],
    comment_count: 0,
    category: null,
    subcategory: null,
    tags: [],
    ...overrides,
  };
}

function withQueryClient(node: ReactNode): ReactNode {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  Object.values(mutateCalls).forEach((m) => m.mockReset());
  sessionUser.id = 7;
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketActions", () => {
  it("renders permission denied message when canManage is false", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={false} />));
    expect(screen.getByText(/don't have permission/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Take ticket/i })).toBeNull();
  });

  it("shows Take button when ticket is unassigned and not terminal", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    expect(screen.getByRole("button", { name: /Take ticket/i })).toBeTruthy();
  });

  it("hides Take button when ticket is already assigned to current user (Q-HD review fix)", () => {
    sessionUser.id = 7;
    render(
      withQueryClient(
        <TicketActions ticket={makeTicket({ assignee_id: 7 })} canManage={true} />,
      ),
    );
    expect(screen.queryByRole("button", { name: /Take ticket/i })).toBeNull();
    // But Resolve + Reassign remain
    expect(screen.getByRole("button", { name: /^Resolve$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Reassign$/i })).toBeTruthy();
  });

  it("shows Take button when ticket is assigned to a DIFFERENT user", () => {
    sessionUser.id = 7;
    render(
      withQueryClient(
        <TicketActions ticket={makeTicket({ assignee_id: 99 })} canManage={true} />,
      ),
    );
    expect(screen.getByRole("button", { name: /Take ticket/i })).toBeTruthy();
  });

  it("hides all action buttons when ticket is in a terminal status", () => {
    render(
      withQueryClient(
        <TicketActions
          ticket={makeTicket({ status: "resolved" })}
          canManage={true}
        />,
      ),
    );
    expect(screen.queryByRole("button", { name: /Take ticket/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Resolve$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reassign$/i })).toBeNull();
  });

  it("Take button fires takeTicket mutation with the right ticket id", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    fireEvent.click(screen.getByRole("button", { name: /Take ticket/i }));
    expect(mutateCalls.take).toHaveBeenCalledWith({ ticketId: 1002 });
  });

  it("Reassign button fires reassign mutation with assigneeId + reason", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    fireEvent.click(screen.getByRole("button", { name: /^Reassign$/i }));
    expect(mutateCalls.reassign).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 1002, assigneeId: expect.any(Number) }),
    );
  });

  it("Post comment button is disabled when draft is empty", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    const post = screen.getByRole("button", { name: /Post comment/i });
    expect(post.hasAttribute("disabled")).toBe(true);
  });

  it("Post comment button enables and fires mutation when draft is non-empty", async () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    const ta = screen.getByLabelText(/Add comment/i);
    fireEvent.change(ta, { target: { value: "Looking into this now" } });
    const post = screen.getByRole("button", { name: /Post comment/i });
    expect(post.hasAttribute("disabled")).toBe(false);
    fireEvent.click(post);
    expect(mutateCalls.comment).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 1002, content: "Looking into this now" }),
    );
  });

  it("Resolve button opens the confirmation dialog (does not fire mutation directly)", () => {
    render(withQueryClient(<TicketActions ticket={makeTicket()} canManage={true} />));
    fireEvent.click(screen.getByRole("button", { name: /^Resolve$/i }));
    // ConfirmActionDialog renders its content. The mutation should NOT have fired.
    expect(mutateCalls.resolve).not.toHaveBeenCalled();
    // Dialog body text from RESOLVE_ACTION
    expect(screen.getByText(/האם אתה בטוח שברצונך לסגור/)).toBeTruthy();
  });
});
