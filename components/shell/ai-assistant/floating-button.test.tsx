import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FloatingAIButton } from "./floating-button";
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

describe("FloatingAIButton (Story 1.3)", () => {
  it("renders a button with aria-label", () => {
    render(<FloatingAIButton />);
    const button = screen.getByRole("button", { name: /open ai assistant/i });
    expect(button).toBeTruthy();
  });

  it("clicking dispatches openDrawer (state → chatting_idle, drawerOpen=true)", () => {
    render(<FloatingAIButton />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    const s = useAssistantSession.getState();
    expect(s.drawerOpen).toBe(true);
    expect(s.state).toEqual({ kind: "chatting_idle" });
  });

  it("hides itself when drawer is open", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: null,
      currentPageContext: null,
    });
    const { container } = render(<FloatingAIButton />);
    expect(container.firstChild).toBeNull();
  });

  it("uses logical CSS positioning (no left/right)", () => {
    render(<FloatingAIButton />);
    const wrapper = screen.getByRole("button", { name: /open ai assistant/i }).parentElement;
    const cls = wrapper?.className ?? "";
    // Must use logical inline-end, not physical right
    expect(cls).toMatch(/inset-inline-end/);
    expect(cls).not.toMatch(/\bright-/);
    expect(cls).not.toMatch(/\bleft-/);
  });

  it("positions above BottomNav on mobile (bottom-24 base, bottom-4 at md)", () => {
    render(<FloatingAIButton />);
    const wrapper = screen.getByRole("button", { name: /open ai assistant/i }).parentElement;
    const cls = wrapper?.className ?? "";
    expect(cls).toMatch(/bottom-24/);
    expect(cls).toMatch(/md:bottom-4/);
  });
});
