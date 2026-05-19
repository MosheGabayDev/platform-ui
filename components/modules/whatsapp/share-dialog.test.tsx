/**
 * ShareDialog permission gating tests (batch 164).
 *
 * Verifies the PermissionGate added in batch 160 RV-159-02. Catches
 * regressions where a viewer-tier user (whatsapp.access only) sees
 * the Share button and could leak chat content cross-team.
 *
 * Also covers the recipient-side banner path (whatsapp.access without
 * whatsapp.share) — the banner is intentionally NOT gated since
 * recipients always need to be able to revoke their own access.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { WhatsAppShareDialog } from "./share-dialog";
import type {
  WhatsAppChat,
  WhatsAppChatShare,
} from "@/lib/api/whatsapp";

interface SessionUser {
  id?: number;
  email?: string;
  permissions: string[];
  is_admin?: boolean;
}

let sessionMock: { data: { user: SessionUser } | null } = { data: null };

vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ownedChat: WhatsAppChat = {
  id: 11001,
  wa_chat_id: "972501112222@c.us",
  kind: "private",
  display_name: "Dana Levi",
  is_archived: false,
  is_muted: false,
  participant_count: 2,
  last_message_at: "2026-05-10T06:45:00.000Z",
  first_seen_at: "2026-05-01T08:10:00.000Z",
  last_seen_at: "2026-05-10T06:45:00.000Z",
  meta: {},
  access_kind: "owner",
  share: null,
};

const sharedShare: WhatsAppChatShare = {
  id: 88001,
  chat_id: 11004,
  shared_with_user_id: 42,
  shared_with_user_name: "Current User",
  shared_with_user_email: "current.user@example.com",
  shared_by_user_id: 7,
  shared_by_user_name: "Ops Lead",
  shared_by_user_email: "ops.lead@example.com",
  created_at: "2026-05-10T05:00:00.000Z",
  expires_at: "2026-06-10T05:00:00.000Z",
  note: "Review this escalation before the next shift.",
  revoked_at: null,
};

const sharedChat: WhatsAppChat = {
  ...ownedChat,
  id: 11004,
  wa_chat_id: "120363055555555555@g.us",
  access_kind: "shared",
  share: sharedShare,
};

function withQueryClient(node: ReactNode): ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  sessionMock = { data: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WhatsAppShareDialog — permission gating", () => {
  it("does NOT render the Share button when user lacks whatsapp.share", () => {
    sessionMock = {
      data: {
        user: { id: 42, permissions: ["whatsapp.access"], is_admin: false },
      },
    };
    renderWithIntl(
      withQueryClient(<WhatsAppShareDialog chat={ownedChat} />) as ReactElement,
      { locale: "en" },
    );
    // PermissionGate denies → entire Dialog renders nothing.
    expect(screen.queryByText(/^Share$/i)).toBeNull();
  });

  it("renders the Share button when user has whatsapp.share", () => {
    sessionMock = {
      data: {
        user: {
          id: 42,
          permissions: ["whatsapp.access", "whatsapp.share"],
          is_admin: false,
        },
      },
    };
    renderWithIntl(
      withQueryClient(<WhatsAppShareDialog chat={ownedChat} />) as ReactElement,
      { locale: "en" },
    );
    expect(screen.getAllByText(/Share/i).length).toBeGreaterThan(0);
  });

  it("admin shortcut bypasses the permission check", () => {
    sessionMock = {
      data: {
        user: { id: 1, permissions: [], is_admin: true },
      },
    };
    renderWithIntl(
      withQueryClient(<WhatsAppShareDialog chat={ownedChat} />) as ReactElement,
      { locale: "en" },
    );
    expect(screen.getAllByText(/Share/i).length).toBeGreaterThan(0);
  });

  it("recipient-side banner renders even without whatsapp.share (revoke is recipient's right)", () => {
    // Critical: the shared-in banner is NOT gated by whatsapp.share —
    // a recipient that received a chat must always be able to revoke
    // their own access, regardless of org-level share permission.
    sessionMock = {
      data: {
        user: { id: 42, permissions: ["whatsapp.access"], is_admin: false },
      },
    };
    renderWithIntl(
      withQueryClient(<WhatsAppShareDialog chat={sharedChat} />) as ReactElement,
    );
    // Banner shows who shared it.
    expect(screen.getByText(/Ops Lead|shared by/i)).toBeTruthy();
  });
});
