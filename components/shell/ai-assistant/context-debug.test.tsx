/**
 * ContextDebugPanel — dev-only JSON dump of the current page context.
 *
 * Tests both the production no-render path and the development render
 * path with + without a registered context.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { ContextDebugPanel } from "./context-debug";

function reset() {
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

beforeEach(reset);
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("ContextDebugPanel", () => {
  it("renders nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<ContextDebugPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the placeholder when development and no context registered", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<ContextDebugPanel />);
    expect(screen.getByText(/no page context registered/i)).toBeTruthy();
  });

  it("renders the JSON-serialized context when present", () => {
    vi.stubEnv("NODE_ENV", "development");
    useAssistantSession.setState({
      currentPageContext: {
        pageKey: "users.list",
        route: "/users",
        entityType: "user",
        summary: "Users list page",
        availableActions: ["users.create"],
      } as never,
    });
    render(<ContextDebugPanel />);
    const pre = screen.getByTestId("context-debug-json");
    expect(pre.textContent).toContain("users.list");
    expect(pre.textContent).toContain("/users");
    expect(pre.textContent).toContain("users.create");
  });

  it("shows the dev-only summary as a collapsible details element", () => {
    vi.stubEnv("NODE_ENV", "development");
    const { container } = render(<ContextDebugPanel />);
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    const summary = details!.querySelector("summary");
    expect(summary?.textContent).toMatch(/Page context.*dev only/i);
  });
});
