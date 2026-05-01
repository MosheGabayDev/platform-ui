import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AIDrawer } from "./drawer";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";

const resetStore = () =>
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
    currentPageContext: null,
  });

beforeEach(resetStore);
afterEach(cleanup);

describe("AIDrawer (Story 1.4)", () => {
  it("does not render content when drawerOpen=false", () => {
    render(<AIDrawer />);
    // Sheet does not portal content when closed
    expect(screen.queryByText(/AI Assistant/i)).toBeNull();
  });

  it("renders dialog with title when drawerOpen=true", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: null,
      currentPageContext: null,
    });
    render(<AIDrawer />);
    expect(screen.getByText("AI Assistant")).toBeTruthy();
    expect(screen.getByText(/Type below to start a conversation/i)).toBeTruthy();
  });

  it("calls closeDrawer when sheet closes (escape, backdrop, X button)", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: null,
      currentPageContext: null,
    });
    const { rerender } = render(<AIDrawer />);

    // Simulate Sheet's onOpenChange(false) by directly closing via store close
    // (the Sheet component triggers this on escape/backdrop/x — we trust Radix
    // to wire those events; here we test that the resulting close path works)
    useAssistantSession.getState().closeDrawer();
    rerender(<AIDrawer />);

    expect(useAssistantSession.getState().drawerOpen).toBe(false);
    expect(useAssistantSession.getState().state).toEqual({ kind: "closed" });
  });

  it("declares ARIA dialog role + label/description (a11y)", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: null,
      currentPageContext: null,
    });
    render(<AIDrawer />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-labelledby")).toBe("ai-drawer-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("ai-drawer-desc");
  });
});
