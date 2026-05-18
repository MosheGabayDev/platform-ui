/**
 * WhatsApp client (mock mode) — session lifecycle round-trip + audit emit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  approveWhatsappDsr,
  eraseMyWhatsappData,
  fetchWhatsappPrefs,
  fetchWhatsappChats,
  fetchWhatsappChatMessages,
  fetchWhatsappChatShares,
  fetchWhatsappDsrHistory,
  fetchWhatsappDsrStatus,
  fetchWhatsappSharedWithMe,
  fetchWhatsappSessions,
  fetchWhatsappSessionQr,
  linkWhatsappSession,
  deleteWhatsappDsr,
  previewWhatsappDsr,
  revokeWhatsappShare,
  relinkWhatsappSession,
  searchWhatsappShareRecipients,
  shareWhatsappChat,
  unlinkWhatsappSession,
  updateWhatsappPrefs,
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
    expect(list.data[0]!.attention_required).toBe(true);
    expect(list.data[0]!.attention_reason).toBe("session_state");
  });

  it("fetch/update WhatsApp notification preferences persists locally", async () => {
    const initial = await fetchWhatsappPrefs();
    expect(initial.data.notifications.session_stale.push).toBe(true);

    const updated = await updateWhatsappPrefs({
      notifications: { session_stale: { push: false } },
    });
    expect(updated.data.notifications.session_stale.push).toBe(false);
    expect(updated.data.notifications.session_stale.email).toBe(true);
    expect(updated.data.updated_at).toBeTruthy();

    const after = await fetchWhatsappPrefs();
    expect(after.data.notifications.session_stale.push).toBe(false);
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

  it("eraseMyWhatsappData clears mock sessions and records a self-erasure job", async () => {
    await linkWhatsappSession();
    await expect(eraseMyWhatsappData({ confirm: false })).rejects.toThrow(/confirmation_required/);

    const erased = await eraseMyWhatsappData({ confirm: true, reason: "User request" });
    expect(erased.status).toBe("ok");
    expect(erased.job_id).toContain("mock-self-erasure-");

    const sessions = await fetchWhatsappSessions();
    expect(sessions.data).toEqual([]);

    const history = await fetchWhatsappDsrHistory();
    expect(history.data[0]!.id).toBe(erased.job_id);
    expect(history.data[0]!.state).toBe("soft_deleted");
  });

  it("previews WhatsApp DSR without exposing the normalized phone", async () => {
    const res = await previewWhatsappDsr({ phone: "050-111-2222" });
    expect(res.status).toBe("ok");
    expect(res.preview.message_count).toBe(3);
    expect(res.preview.match_count_as_sender).toBe(2);
    expect(res.preview.match_count_as_counterparty).toBe(1);
    expect(res.preview.phone_masked).toContain("***");
    expect(JSON.stringify(res.preview)).not.toContain("+972501112222");
  });

  it("creates a mock DSR job and returns it in history/status", async () => {
    const created = await deleteWhatsappDsr({
      phone: "0501112222",
      reason: "GDPR request",
      acknowledge_irreversible: true,
    });
    expect(created.status).toBe("ok");
    expect(created.job_id).toContain("mock-dsr-");

    const status = await fetchWhatsappDsrStatus(created.job_id);
    expect(status.id).toBe(created.job_id);
    expect(status.state).toBe("soft_deleted");
    expect(JSON.stringify(status)).not.toContain("+972501112222");

    const history = await fetchWhatsappDsrHistory();
    expect(history.data[0]!.id).toBe(created.job_id);
  });

  it("requires reason and acknowledgement before mock DSR deletion", async () => {
    await expect(
      deleteWhatsappDsr({
        phone: "0501112222",
        reason: "",
        acknowledge_irreversible: true,
      }),
    ).rejects.toThrow(/reason_required/);

    await expect(
      deleteWhatsappDsr({
        phone: "0501112222",
        reason: "GDPR request",
        acknowledge_irreversible: false,
      }),
    ).rejects.toThrow(/acknowledge_required/);
  });

  it("approves a high-risk mock DSR job by matching the re-entered phone", async () => {
    const preview = await previewWhatsappDsr({ phone: "0501112222" });
    localStorage.setItem(
      "whatsapp:dsr:v1",
      JSON.stringify({
        __v: 1,
        data: [
          {
            id: "mock-dsr-approval",
            state: "awaiting_second_approval",
            job_type: "delete_by_phone",
            phone_masked: preview.preview.phone_masked,
            phone_hash: preview.preview.phone_hash,
            requested_by_user_id: 42,
            second_approver_user_id: null,
            reason: "High risk request",
            preview_counts: preview.preview,
            result_counts: {},
            recovery_until: null,
            created_at: new Date().toISOString(),
            started_at: null,
            finished_at: null,
            failed_reason: null,
          },
        ],
      }),
    );

    await expect(
      approveWhatsappDsr({ job_id: "mock-dsr-approval", phone: "0521234567" }),
    ).rejects.toThrow(/phone_mismatch/);

    const approved = await approveWhatsappDsr({
      job_id: "mock-dsr-approval",
      phone: "0501112222",
    });
    expect(approved.state).toBe("soft_deleted");

    const status = await fetchWhatsappDsrStatus("mock-dsr-approval");
    expect(status.second_approver_user_id).toBe(43);
    expect(status.recovery_until).toBeTruthy();
  });
});

describe("whatsapp client (live local session bridge)", () => {
  it("uses the local daemon for sessions, QR, relink, and unlink when enabled", async () => {
    const originalLive = process.env.NEXT_PUBLIC_WHATSAPP_DEV_LIVE_SESSIONS;
    const originalControlUrl = process.env.NEXT_PUBLIC_WHATSAPP_LIVE_CONTROL_URL;
    process.env.NEXT_PUBLIC_WHATSAPP_DEV_LIVE_SESSIONS = "true";
    process.env.NEXT_PUBLIC_WHATSAPP_LIVE_CONTROL_URL = "http://wa-live.test";
    vi.resetModules();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/state")) {
        return new Response(JSON.stringify({
          registryStatus: "ready",
          rawRegistryStatus: "ready",
          clientState: "CONNECTED",
          session_id: "qr-smoke-1",
        }));
      }
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({
          status: "ready",
          session_id: "qr-smoke-1",
          info: {
            pushname: "Moshe",
            wid: { user: "972507770369", _serialized: "972507770369@c.us" },
            platform: "android",
          },
        }));
      }
      if (url.endsWith("/api/qr")) {
        return new Response(JSON.stringify({
          status: "needs_qr",
          session_id: "qr-smoke-1",
          qrDataUrl: "data:image/png;base64,qr",
        }));
      }
      if (url.endsWith("/api/relink")) {
        return new Response(JSON.stringify({ status: "needs_qr" }), { status: 202 });
      }
      if (url.endsWith("/api/unlink")) {
        return new Response(JSON.stringify({ status: "unlinked" }), { status: 202 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const live = await import("./whatsapp");
      expect(live.WHATSAPP_LIVE_SESSIONS_MODE).toBe(true);

      const sessions = await live.fetchWhatsappSessions();
      expect(sessions.data[0]).toMatchObject({
        id: 1,
        session_state: "ready",
        connected_phone: "972507770369",
      });

      const qr = await live.fetchWhatsappSessionQr(1);
      expect(qr.qr).toBe("data:image/png;base64,qr");
      expect(qr.session_state).toBe("needs_qr");

      await expect(live.fetchWhatsappSessionQr(999)).rejects.toThrow(/not_found/);
      await expect(live.relinkWhatsappSession(1)).resolves.toMatchObject({
        session_state: "needs_qr",
      });
      await expect(live.unlinkWhatsappSession(1)).resolves.toMatchObject({
        session_state: "unlinked",
      });
    } finally {
      vi.unstubAllGlobals();
      if (originalLive === undefined) {
        delete process.env.NEXT_PUBLIC_WHATSAPP_DEV_LIVE_SESSIONS;
      } else {
        process.env.NEXT_PUBLIC_WHATSAPP_DEV_LIVE_SESSIONS = originalLive;
      }
      if (originalControlUrl === undefined) {
        delete process.env.NEXT_PUBLIC_WHATSAPP_LIVE_CONTROL_URL;
      } else {
        process.env.NEXT_PUBLIC_WHATSAPP_LIVE_CONTROL_URL = originalControlUrl;
      }
      vi.resetModules();
    }
  });
});
