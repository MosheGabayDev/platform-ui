import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ActionPreviewCard } from "./action-preview-card";
import {
  useAssistantSession,
  type ActionProposal,
} from "@/lib/hooks/use-assistant-session";

// Mock toast to avoid noise
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function makeProposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    tokenId: "tok-test-1",
    actionId: "helpdesk.ticket.take",
    label: "Take ticket #1002",
    targetSummary: "Assign helpdesk ticket #1002 to the current user",
    capabilityLevel: "WRITE_LOW",
    expiresAt: Date.now() + 60_000,
    params: { ticketId: 1002 },
    ...overrides,
  };
}

function resetStore() {
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
    currentPageContext: null,
    pendingProposal: null,
  });
}

function withQueryClient(node: ReactNode): ReactNode {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ActionPreviewCard (AI-shell-C)", () => {
  it("renders nothing when there is no pending proposal", () => {
    const { container } = render(withQueryClient(<ActionPreviewCard />));
    expect(container.firstChild).toBeNull();
  });

  it("renders the proposal label, target summary, and capability badge", () => {
    const proposal = makeProposal();
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    expect(screen.getByText("Take ticket #1002")).toBeTruthy();
    expect(screen.getByText(/Assign helpdesk ticket/)).toBeTruthy();
    expect(screen.getByText(/Write \(low risk\)/i)).toBeTruthy();
  });

  it("renders WRITE_HIGH proposal with the high-risk label", () => {
    const proposal = makeProposal({
      capabilityLevel: "WRITE_HIGH",
      label: "Resolve ticket #1004",
    });
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    expect(screen.getByText(/Write \(high risk\)/i)).toBeTruthy();
  });

  it("Reject button transitions store back to chatting_idle and clears proposal", () => {
    const proposal = makeProposal();
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));

    const s = useAssistantSession.getState();
    expect(s.state.kind).toBe("chatting_idle");
    expect(s.pendingProposal).toBeNull();
  });

  it("countdown text shows seconds remaining", () => {
    const proposal = makeProposal({ expiresAt: Date.now() + 30_000 });
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    // "30s" or "29s" depending on timing
    const text = screen.getByLabelText(/Token expires/i).textContent ?? "";
    expect(text).toMatch(/^(2\d|30)s$/);
  });

  it("Parameters details element exposes params JSON", () => {
    const proposal = makeProposal({ params: { ticketId: 1002, force: true } });
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    // The <pre> with the JSON dump must contain ticketId
    expect(screen.getByText(/"ticketId": 1002/)).toBeTruthy();
  });

  it("expired proposal triggers expireConfirmation transition", async () => {
    vi.useFakeTimers();
    const proposal = makeProposal({ expiresAt: Date.now() + 1_000 }); // 1s
    useAssistantSession.setState({
      state: {
        kind: "awaiting_action_confirmation",
        tokenId: proposal.tokenId,
        expiresAt: proposal.expiresAt,
      },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: proposal.tokenId,
      currentPageContext: null,
      pendingProposal: proposal,
    });

    render(withQueryClient(<ActionPreviewCard />));
    // Advance past the TTL — the 500ms tick will eventually mark it expired.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    const s = useAssistantSession.getState();
    expect(s.state.kind).toBe("error");
    if (s.state.kind === "error") {
      expect(s.state.subtype).toBe("confirmation_expired");
    }
  });
});
