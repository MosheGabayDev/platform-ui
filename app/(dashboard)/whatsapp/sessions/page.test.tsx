/**
 * /whatsapp/sessions page — render contract.
 *
 * Mocks lib/api/whatsapp + the feature flag query so the page renders
 * past the FeatureGate. Verifies title, mock-mode banner, empty state,
 * link CTA, and the unlink confirmation dialog flow.
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

const fetchSessionsMock = vi.hoisted(() => vi.fn());
const fetchQrMock = vi.hoisted(() => vi.fn());
const linkMock = vi.hoisted(() => vi.fn());
const relinkMock = vi.hoisted(() => vi.fn());
const unlinkMock = vi.hoisted(() => vi.fn());
const fetchPrefsMock = vi.hoisted(() => vi.fn());
const updatePrefsMock = vi.hoisted(() => vi.fn());
const eraseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/whatsapp", () => ({
  fetchWhatsappSessions: fetchSessionsMock,
  fetchWhatsappSessionQr: fetchQrMock,
  fetchWhatsappPrefs: fetchPrefsMock,
  updateWhatsappPrefs: updatePrefsMock,
  eraseMyWhatsappData: eraseMock,
  linkWhatsappSession: linkMock,
  relinkWhatsappSession: relinkMock,
  unlinkWhatsappSession: unlinkMock,
  MOCK_MODE: true,
  WHATSAPP_LIVE_SESSIONS_MODE: false,
}));

// FeatureGate reads the whatsapp.enabled flag via fetchFeatureFlag.
// Mock that to always-enabled for the tests below. Must mirror the
// real module's exports (fetchFeatureFlag + STATIC_FLAG_DEFAULTS).
vi.mock("@/lib/api/feature-flags", () => ({
  fetchFeatureFlag: vi.fn().mockResolvedValue({
    key: "whatsapp.enabled",
    enabled: true,
    source: "system",
  }),
  STATIC_FLAG_DEFAULTS: new Proxy({}, { get: () => true }),
}));

// useRegisterPageContext is a no-op stub for tests; it pushes context
// into a Zustand store we don't care about here.
vi.mock("@/lib/hooks/use-register-page-context", () => ({
  useRegisterPageContext: vi.fn(),
}));

import WhatsAppSessionsPage from "./page";

function render(node: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

const mockSession = (over: Partial<{ id: number; state: string }> = {}) => ({
  id: over.id ?? 1001,
  session_state: over.state ?? "needs_qr",
  session_state_updated_at: "2026-05-10T00:00:00Z",
  last_qr_generated_at: "2026-05-10T00:00:00Z",
  connected_phone: null,
  last_heartbeat_at: null,
  assigned_replica: "mock",
  lease_expires_at: null,
  relink_requested_at: null,
  meta: {},
  created_at: "2026-05-10T00:00:00Z",
});

beforeEach(() => {
  fetchSessionsMock.mockReset();
  fetchQrMock.mockReset();
  linkMock.mockReset();
  relinkMock.mockReset();
  unlinkMock.mockReset();
  fetchPrefsMock.mockReset();
  updatePrefsMock.mockReset();
  eraseMock.mockReset();
  fetchPrefsMock.mockResolvedValue({
    status: "ok",
    data: {
      user_id: 1,
      notifications: {
        session_stale: { push: true, email: true },
        session_linked: { push: true, email: false },
        share_received: { push: true, email: true },
        share_expiring_soon: { push: true, email: true },
        erasure_done: { push: true, email: true },
      },
      updated_at: null,
    },
  });
  sessionMock.status = "authenticated";
  sessionMock.data = {
    user: { id: 1, role: "user", is_admin: true, is_system_admin: true, permissions: [] },
  };
});
afterEach(cleanup);

describe("WhatsAppSessionsPage", () => {
  it("renders the title from i18n", async () => {
    fetchSessionsMock.mockResolvedValue({ status: "ok", data: [] });
    render(<WhatsAppSessionsPage />);
    await waitFor(() =>
      expect(screen.getAllByText(/^WhatsApp$/).length).toBeGreaterThan(0),
    );
  });

  it("renders the mock-mode banner", async () => {
    fetchSessionsMock.mockResolvedValue({ status: "ok", data: [] });
    render(<WhatsAppSessionsPage />);
    await waitFor(() => {
      const banners = screen.queryAllByRole("status");
      expect(banners.length).toBeGreaterThan(0);
    });
  });

  it("renders empty state with link CTA when no sessions", async () => {
    fetchSessionsMock.mockResolvedValue({ status: "ok", data: [] });
    render(<WhatsAppSessionsPage />);
    await waitFor(() =>
      expect(screen.getByText(/No linked WhatsApp session|אין חיבור/)).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ }),
    ).toBeTruthy();
  });

  it("link CTA dispatches linkWhatsappSession", async () => {
    fetchSessionsMock.mockResolvedValue({ status: "ok", data: [] });
    linkMock.mockResolvedValue({
      status: "ok",
      session_id: 1234,
      session_state: "needs_qr",
    });
    render(<WhatsAppSessionsPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ })).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Link WhatsApp|חבר WhatsApp/ }),
    );
    await waitFor(() => expect(linkMock).toHaveBeenCalled());
  });

  it("active session renders the panel with relink + unlink", async () => {
    fetchSessionsMock.mockResolvedValue({
      status: "ok",
      data: [mockSession({ id: 5001, state: "ready" })],
    });
    render(<WhatsAppSessionsPage />);
    await waitFor(() => expect(screen.getByTestId("whatsapp-relink")).toBeTruthy());
    expect(screen.getByTestId("whatsapp-unlink")).toBeTruthy();
  });

  it("unlink opens the confirm dialog (no window.confirm)", async () => {
    fetchSessionsMock.mockResolvedValue({
      status: "ok",
      data: [mockSession({ id: 5002, state: "ready" })],
    });
    render(<WhatsAppSessionsPage />);
    await waitFor(() => expect(screen.getByTestId("whatsapp-unlink")).toBeTruthy());
    fireEvent.click(screen.getByTestId("whatsapp-unlink"));
    await waitFor(() =>
      expect(screen.getByTestId("whatsapp-unlink-confirm")).toBeTruthy(),
    );
  });

  it("confirm dialog dispatches unlinkWhatsappSession with the session id", async () => {
    fetchSessionsMock.mockResolvedValue({
      status: "ok",
      data: [mockSession({ id: 5003, state: "ready" })],
    });
    unlinkMock.mockResolvedValue({
      status: "ok",
      session_id: 5003,
      session_state: "unlinked",
    });
    render(<WhatsAppSessionsPage />);
    await waitFor(() => expect(screen.getByTestId("whatsapp-unlink")).toBeTruthy());
    fireEvent.click(screen.getByTestId("whatsapp-unlink"));
    fireEvent.click(screen.getByTestId("whatsapp-unlink-confirm"));
    await waitFor(() => expect(unlinkMock).toHaveBeenCalled());
    expect(unlinkMock.mock.calls[0]![0]).toBe(5003);
  });
});
