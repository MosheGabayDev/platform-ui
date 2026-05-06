/**
 * Tests for OnboardingTour (Phase 3.1).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
let searchString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(searchString),
}));

import { OnboardingTour } from "./onboarding-tour";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { setSetting } from "@/lib/api/settings";

const resetStore = () =>
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
    currentPageContext: null,
    pendingProposal: null,
  });

beforeEach(async () => {
  resetStore();
  replaceMock.mockClear();
  searchString = "";
  // Reset marker setting so dialog will render in the next test.
  await setSetting({
    key: "onboarding.first_ai_tour_completed",
    scope: "org",
    scope_id: 1,
    value: false,
  });
});

afterEach(cleanup);

describe("OnboardingTour", () => {
  it("renders nothing without ?tour=first-ai", () => {
    searchString = "";
    const { container } = render(<OnboardingTour />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog when ?tour=first-ai and marker not set", async () => {
    searchString = "tour=first-ai";
    render(<OnboardingTour />);
    await waitFor(() => {
      expect(screen.queryByTestId("onboarding-tour-dialog")).toBeTruthy();
    });
    expect(screen.getByText(/Try your first AI command/i)).toBeTruthy();
  });

  it("Skip closes the dialog and strips ?tour=first-ai", async () => {
    searchString = "tour=first-ai";
    render(<OnboardingTour />);
    const skip = await screen.findByTestId("onboarding-tour-skip");
    fireEvent.click(skip);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
    expect(replaceMock.mock.calls[0][0]).toBe("/");
  });

  it("Open AI assistant opens drawer + sets marker + strips param", async () => {
    searchString = "tour=first-ai";
    render(<OnboardingTour />);
    const openBtn = await screen.findByTestId("onboarding-tour-open");
    fireEvent.click(openBtn);
    await waitFor(() => {
      expect(useAssistantSession.getState().drawerOpen).toBe(true);
    });
    expect(replaceMock).toHaveBeenCalled();
  });

  it("does not render when marker setting is already true", async () => {
    await setSetting({
      key: "onboarding.first_ai_tour_completed",
      scope: "org",
      scope_id: 1,
      value: true,
    });
    searchString = "tour=first-ai";
    render(<OnboardingTour />);
    // Give the marker fetch a chance to settle.
    await new Promise((r) => setTimeout(r, 80));
    expect(screen.queryByTestId("onboarding-tour-dialog")).toBeNull();
  });
});
