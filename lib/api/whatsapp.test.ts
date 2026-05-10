/**
 * WhatsApp client (mock mode) — session lifecycle round-trip + audit emit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchWhatsappChats,
  fetchWhatsappChatMessages,
  fetchWhatsappChatShares,
  fetchWhatsappSharedWithMe,
  fetchWhatsappSessions,
  fetchWhatsappSessionQr,
  linkWhatsappSession,
  revokeWhatsappShare,
  relinkWhatsappSession,
  searchWhatsappShareRecipients,
  shareWhatsappChat,
  unlinkWhatsappSession,
  searchWhatsappMessages,
  MOCK_MODE,
} from "./whatsapp";
import { clearMockState } from "@/lib/api/_mock-storage";
import * as auditModule from "@/lib/api/audit";

beforeEach(() => {
  clearMockState("whatsapp:");
  localStorage.clear();
});

describe("whatsapp client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchWhatsappSessions starts empty", async () => {
    const res = await fetchWhatsappSessions();
    expect(res.status).toBe("ok");
    expect(res.data).toEqual([]);
  });

  it("fetchWhatsappChats returns the mock chat fixture", async () => {
    const res = await fetchWhatsappChats();
    expect(res.status).toBe("ok");
    expect(res.meta.total).toBeGreaterThan(0);
    expect(res.data.every((chat) => chat.id > 0)).toBe(true);
  });

  it("fetchWhatsappChats filters by kind and query", async () => {
    const byKind = await fetchWhatsappChats({ kind: "group" });
    expect(byKind.data.length).toBeGreaterThanOrEqual(1);
    expect(byKind.data.every((chat) => chat.kind === "group")).toBe(true);

    const byQuery = await fetchWhatsappChats({ q: "invoice" });
    expect(byQuery.data).toHaveLength(1);
    expect(byQuery.data[0]!.display_name).toBe("Dana Levi");
  });

  it("fetchWhatsappSharedWithMe returns only shared chats", async () => {
    const res = await fetchWhatsappSharedWithMe();
    expect(res.status).toBe("ok");
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((chat) => chat.access_kind === "shared")).toBe(true);
  });

  it("fetchWhatsappChatMessages returns chat metadata and media-safe messages", async () => {
    const res = await fetchWhatsappChatMessages(11001);
    expect(res.status).toBe("ok");
    expect(res.chat.id).toBe(11001);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.some((message) => message.has_media)).toBe(true);
    expect(JSON.stringify(res.data)).not.toContain("media_s3_key");
  });

  it("fetchWhatsappChatMessages rejects a missing chat", async () => {
    await expect(fetchWhatsappChatMessages(999999)).rejects.toThrow(/not_found/);
  });

  it("fetchWhatsappChatShares lists active shares for owned chats", async () => {
    const res = await fetchWhatsappChatShares(11001);
    expect(res.status).toBe("ok");
    expect(res.data[0]!.shared_with_user_email).toContain("@");
  });

  it("shareWhatsappChat creates, rejects duplicate, and revoke hides a share", async () => {
    const recipients = await searchWhatsappShareRecipients("Maya");
    const recipient = recipients.data[0]!;

    const created = await shareWhatsappChat(11001, {
      shared_with_user_id: recipient.id,
      note: "Please review",
    });
    expect(created.status).toBe("ok");

    await expect(
      shareWhatsappChat(11001, { shared_with_user_id: recipient.id }),
    ).rejects.toThrow(/share_already_exists/);

    const withShare = await fetchWhatsappChatShares(11001);
    expect(withShare.data.some((share) => share.id === created.share_id)).toBe(true);

    await revokeWhatsappShare(created.share_id);
    const afterRevoke = await fetchWhatsappChatShares(11001);
    expect(afterRevoke.data.some((share) => share.id === created.share_id)).toBe(false);
  });

  it("shareWhatsappChat rejects shared-in chats", async () => {
    await expect(
      shareWhatsappChat(11004, { shared_with_user_id: 201 }),
    ).rejects.toThrow(/not_found/);
  });

  it("searchWhatsappMessages returns matching message hits", async () => {
    const res = await searchWhatsappMessages({ q: "invoice" });
    expect(res.status).toBe("ok");
    expect(res.meta.total).toBeGreaterThan(0);
    expect(res.data[0]!.chat?.id).toBe(11001);
    expect(res.data[0]!.highlight.toLowerCase()).toContain("invoice");
  });

  it("searchWhatsappMessages returns an empty result for empty q", async () => {
    const res = await searchWhatsappMessages({ q: "" });
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
  });

  it("link → fetch shows a needs_qr session", async () => {
    const linked = await linkWhatsappSession();
    expect(linked.session_state).toBe("needs_qr");
    const list = await fetchWhatsappSessions();
    expect(list.data.length).toBe(1);
    expect(list.data[0]!.session_state).toBe("needs_qr");
    expect(list.data[0]!.id).toBe(linked.session_id);
  });

  it("link refuses a second active session", async () => {
    await linkWhatsappSession();
    await expect(linkWhatsappSession()).rejects.toThrow(/already/);
  });

  it("link emits whatsapp.session.linked audit event", async () => {
    const spy = vi
      .spyOn(auditModule, "recordAuditEntry")
      .mockResolvedValue({ success: true } as never);
    const linked = await linkWhatsappSession();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0]![0];
    expect(arg.action).toBe("whatsapp.session.linked");
    expect(arg.category).toBe("create");
    expect(arg.resource_type).toBe("whatsapp_session");
    expect(arg.resource_id).toBe(String(linked.session_id));
    spy.mockRestore();
  });

  it("fetchSessionQr returns the mock QR while needs_qr/connecting", async () => {
    const linked = await linkWhatsappSession();
    const qr = await fetchWhatsappSessionQr(linked.session_id);
    expect(qr.qr).toBeTruthy();
    expect(qr.session_state).toBe("needs_qr");
  });

  it("fetchSessionQr throws when session is missing", async () => {
    await expect(fetchWhatsappSessionQr(999_999)).rejects.toThrow();
  });

  it("relink resets to needs_qr and emits relinked audit", async () => {
    const linked = await linkWhatsappSession();
    const spy = vi
      .spyOn(auditModule, "recordAuditEntry")
      .mockResolvedValue({ success: true } as never);
    const res = await relinkWhatsappSession(linked.session_id);
    await Promise.resolve();
    expect(res.session_state).toBe("needs_qr");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0].action).toBe("whatsapp.session.relinked");
    expect(spy.mock.calls[0]![0].category).toBe("update");
    spy.mockRestore();
  });

  it("unlink moves session to unlinked + emits unlinked audit", async () => {
    const linked = await linkWhatsappSession();
    const spy = vi
      .spyOn(auditModule, "recordAuditEntry")
      .mockResolvedValue({ success: true } as never);
    const res = await unlinkWhatsappSession(linked.session_id);
    await Promise.resolve();
    expect(res.session_state).toBe("unlinked");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0].action).toBe("whatsapp.session.unlinked");
    expect(spy.mock.calls[0]![0].category).toBe("delete");
    spy.mockRestore();
  });

  it("unlink is idempotent — second call does NOT emit a second audit event", async () => {
    const linked = await linkWhatsappSession();
    await unlinkWhatsappSession(linked.session_id);
    const spy = vi
      .spyOn(auditModule, "recordAuditEntry")
      .mockResolvedValue({ success: true } as never);
    await unlinkWhatsappSession(linked.session_id);
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("after unlink the session can be re-linked (no active blocker)", async () => {
    const first = await linkWhatsappSession();
    await unlinkWhatsappSession(first.session_id);
    const second = await linkWhatsappSession();
    expect(second.session_id).not.toBe(first.session_id);
    expect(second.session_state).toBe("needs_qr");
  });
});
