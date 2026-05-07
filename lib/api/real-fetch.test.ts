/**
 * Real-fetch path coverage for every lib/api/ client.
 *
 * Each client guards real network calls behind `MOCK_MODE` (now env-driven
 * via NEXT_PUBLIC_MOCK_API). This file flips the env to "false" before each
 * dynamic import so the apiFetch helper + URL building branches are exercised.
 *
 * Strategy: stub global fetch with a JSON-returning Response shim, dynamic-
 * import each client fresh, call the public API, and assert the downstream
 * URL/method. We don't test response shape here (the mock-mode tests already
 * cover that).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function okJson(body: unknown = { success: true, data: {} }) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function errJson(status: number, body: unknown = { error: "boom" }) {
  return {
    ok: false,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MOCK_API", "false");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client.ts real-fetch", () => {
  it("MOCK_MODE flips to false when env is 'false'", async () => {
    const { MOCK_MODE } = await import("./client");
    expect(MOCK_MODE).toBe(false);
  });

  it("fetchDashboardStats hits /ai-settings/stats", async () => {
    fetchMock.mockResolvedValue(okJson({ generated_at: "x" }));
    const { fetchDashboardStats } = await import("./client");
    await fetchDashboardStats();
    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]![0]).toContain("/ai-settings/stats");
  });

  it("fetchTimeSeries appends days query param", async () => {
    fetchMock.mockResolvedValue(okJson({ days: 14 }));
    const { fetchTimeSeries } = await import("./client");
    await fetchTimeSeries(14);
    expect(fetchMock.mock.calls[0]![0]).toContain("days=14");
  });

  it("fetchServiceHealth hits /monitoring/health", async () => {
    fetchMock.mockResolvedValue(okJson({ services: {} }));
    const { fetchServiceHealth } = await import("./client");
    await fetchServiceHealth();
    expect(fetchMock.mock.calls[0]![0]).toContain("/monitoring/health");
  });

  it("apiFetch throws on non-OK with backend error message", async () => {
    fetchMock.mockResolvedValue(errJson(500, { error: "kaboom" }));
    const { fetchDashboardStats } = await import("./client");
    await expect(fetchDashboardStats()).rejects.toThrow(/kaboom/);
  });

  it("apiFetch throws with HTTP status fallback when error body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("not json");
      },
    });
    const { fetchDashboardStats } = await import("./client");
    await expect(fetchDashboardStats()).rejects.toThrow(/HTTP 503/);
  });
});

describe("notifications.ts real-fetch", () => {
  it("fetchNotifications GETs the base", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { notifications: [], unread_count: 0 } }));
    const { fetchNotifications } = await import("./notifications");
    await fetchNotifications();
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/proxy/notifications");
  });
  it("markNotificationRead PATCHes /<id>/read", async () => {
    fetchMock.mockResolvedValue(okJson({ success: true }));
    const { markNotificationRead } = await import("./notifications");
    await markNotificationRead("note-1");
    expect(fetchMock.mock.calls[0]![0]).toContain("/note-1/read");
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PATCH");
  });
  it("markAllNotificationsRead PATCHes /read-all", async () => {
    fetchMock.mockResolvedValue(okJson({ success: true }));
    const { markAllNotificationsRead } = await import("./notifications");
    await markAllNotificationsRead();
    expect(fetchMock.mock.calls[0]![0]).toContain("/read-all");
  });
});

describe("users.ts real-fetch", () => {
  it("fetchUsers builds query string from params", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { users: [], total: 0, page: 1, per_page: 25, total_pages: 1 } }));
    const { fetchUsers } = await import("./users");
    await fetchUsers({ page: 2, per_page: 10, search: "ada", role: "admin", is_active: true });
    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=10");
    expect(url).toContain("search=ada");
    expect(url).toContain("role=admin");
    expect(url).toContain("is_active=true");
  });
  it("fetchUserStats GET /stats", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { total: 0 } }));
    const { fetchUserStats } = await import("./users");
    await fetchUserStats();
    expect(fetchMock.mock.calls[0]![0]).toContain("/stats");
  });
  it("fetchPendingUsers GET /pending", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchPendingUsers } = await import("./users");
    await fetchPendingUsers();
    expect(fetchMock.mock.calls[0]![0]).toContain("/pending");
  });
  it("fetchUser GET /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchUser } = await import("./users");
    await fetchUser(7);
    expect(fetchMock.mock.calls[0]![0]).toContain("/7");
  });
  it("approveUser POST /<id>/approve", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { approveUser } = await import("./users");
    await approveUser(5);
    expect(fetchMock.mock.calls[0]![0]).toContain("/5/approve");
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("createUser POSTs with body", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { createUser } = await import("./users");
    await createUser({ email: "x@y.com" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
    expect(fetchMock.mock.calls[0]![1]!.body).toContain("x@y.com");
  });
  it("updateUser PATCHes /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { updateUser } = await import("./users");
    await updateUser(3, { email: "y" } as never);
    expect(fetchMock.mock.calls[0]![0]).toContain("/3");
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PATCH");
  });
  it("setUserActive PATCHes /<id>/active with reason", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { setUserActive } = await import("./users");
    await setUserActive(9, false, "audit");
    expect(fetchMock.mock.calls[0]![0]).toContain("/9/active");
    expect(fetchMock.mock.calls[0]![1]!.body).toContain('"reason":"audit"');
  });
  it("fetchUserActivity GET /<id>/activity with default limit + offset", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { events: [], total: 0 } }));
    const { fetchUserActivity } = await import("./users");
    await fetchUserActivity(7);
    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("/7/activity");
    expect(url).toContain("limit=20");
    expect(url).toContain("offset=0");
  });
  it("fetchUserActivity forwards type filter", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchUserActivity } = await import("./users");
    await fetchUserActivity(1, { type: "login" });
    expect(fetchMock.mock.calls[0]![0]).toContain("type=login");
  });
});

describe("organizations.ts real-fetch", () => {
  it("fetchOrgs query string", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchOrgs } = await import("./organizations");
    await fetchOrgs({ page: 1, per_page: 5, search: "x", is_active: false });
    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("search=x");
    expect(url).toContain("is_active=false");
  });
  it("fetchOrg GET /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchOrg } = await import("./organizations");
    await fetchOrg(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/1");
  });
  it("createOrg POSTs body", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { createOrg } = await import("./organizations");
    await createOrg({ name: "x", slug: "y", is_active: true });
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("updateOrg PATCHes /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { updateOrg } = await import("./organizations");
    await updateOrg(1, { name: "x" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PATCH");
  });
  it("setOrgActive PATCHes /<id>/active", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { setOrgActive } = await import("./organizations");
    await setOrgActive(1, true);
    expect(fetchMock.mock.calls[0]![0]).toContain("/1/active");
  });
});

describe("roles.ts real-fetch", () => {
  it("fetchRoles with search", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchRoles } = await import("./roles");
    await fetchRoles({ search: "admin" });
    expect(fetchMock.mock.calls[0]![0]).toContain("search=admin");
  });
  it("fetchRole GET /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchRole } = await import("./roles");
    await fetchRole(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/1");
  });
  it("fetchAllPermissions GET /permissions", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchAllPermissions } = await import("./roles");
    await fetchAllPermissions();
    expect(fetchMock.mock.calls[0]![0]).toContain("/permissions");
  });
  it("createRole POST", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { createRole } = await import("./roles");
    await createRole({ name: "x" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("updateRole PATCH", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { updateRole } = await import("./roles");
    await updateRole(1, { name: "x" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PATCH");
  });
  it("setRolePermissions PATCH /<id>/permissions", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { setRolePermissions } = await import("./roles");
    await setRolePermissions(1, [1, 2]);
    expect(fetchMock.mock.calls[0]![0]).toContain("/1/permissions");
  });
});

describe("audit.ts real-fetch", () => {
  it("fetchAuditLog builds query string", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { entries: [], total: 0 } }));
    const { fetchAuditLog } = await import("./audit");
    await fetchAuditLog({ page: 1, per_page: 10, category: "ai", search: "x", actor_id: 7 });
    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("category=ai");
    expect(url).toContain("actor_id=7");
  });
  it("fetchAuditLogStats GET /stats", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchAuditLogStats } = await import("./audit");
    await fetchAuditLogStats();
    expect(fetchMock.mock.calls[0]![0]).toContain("/stats");
  });
  it("recordAuditEntry POSTs body", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { recordAuditEntry } = await import("./audit");
    await recordAuditEntry({ action: "x", category: "ai", resource_type: "y" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
});

describe("helpdesk.ts real-fetch", () => {
  it("fetchHelpdeskStats GET /stats", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchHelpdeskStats } = await import("./helpdesk");
    await fetchHelpdeskStats();
    expect(fetchMock.mock.calls[0]![0]).toContain("/stats");
  });
  it("fetchTickets builds query string", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { tickets: [], total: 0, page: 1, per_page: 25 } }));
    const { fetchTickets } = await import("./helpdesk");
    await fetchTickets({ page: 1, per_page: 25, status: "open" as never, search: "x" });
    expect(fetchMock.mock.calls[0]![0]).toContain("status=open");
  });
  it("fetchTicket GET /<id>", async () => {
    fetchMock.mockResolvedValue(okJson({ data: { ticket: {}, events: [] } }));
    const { fetchTicket } = await import("./helpdesk");
    await fetchTicket(42);
    expect(fetchMock.mock.calls[0]![0]).toContain("/42");
  });
  it("takeTicket POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { takeTicket } = await import("./helpdesk");
    await takeTicket({ ticket_id: 1 } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("resolveTicket POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { resolveTicket } = await import("./helpdesk");
    await resolveTicket({ ticket_id: 1, resolution: "fixed" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("reassignTicket POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { reassignTicket } = await import("./helpdesk");
    await reassignTicket({ ticket_id: 1, technician_id: 5 } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("commentOnTicket POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { commentOnTicket } = await import("./helpdesk");
    await commentOnTicket({ ticket_id: 1, comment: "x" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("fetchTechnicians GET /technicians", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchTechnicians } = await import("./helpdesk");
    await fetchTechnicians();
    expect(fetchMock.mock.calls[0]![0]).toContain("/technicians");
  });
  it("fetchTechnicians passes availableOnly query", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchTechnicians } = await import("./helpdesk");
    await fetchTechnicians(true);
    expect(fetchMock.mock.calls[0]![0]).toContain("available=true");
  });
  it("fetchTechnicianUtilization GET", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchTechnicianUtilization } = await import("./helpdesk");
    await fetchTechnicianUtilization();
    expect(fetchMock).toHaveBeenCalled();
  });
  it("fetchSLAPolicies + fetchSLACompliance GET", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { fetchSLAPolicies, fetchSLACompliance } = await import("./helpdesk");
    await fetchSLAPolicies();
    await fetchSLACompliance();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("bulkReassignTickets POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { bulkReassignTickets } = await import("./helpdesk");
    await bulkReassignTickets({ ticket_ids: [1, 2], technician_id: 3 } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("bulkStatusChange POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { bulkStatusChange } = await import("./helpdesk");
    await bulkStatusChange({ ticket_ids: [1, 2], status: "resolved" } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
});

describe("helpdesk submodules real-fetch", () => {
  it("fetchApprovals + approve + reject", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./helpdesk.approvals");
    await m.fetchApprovals({ status: "pending" } as never);
    await m.approveInvocation({ invocation_id: 1 } as never);
    await m.rejectInvocation({ invocation_id: 1, reason: "x" } as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("fetchBatchTasks + fetchBatchTask + start + cancel", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./helpdesk.batch");
    await m.fetchBatchTasks({} as never);
    await m.fetchBatchTask(1);
    await m.startBatchTask({ task_id: 1 } as never);
    await m.cancelBatchTask({ task_id: 1 } as never);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("maintenance windows: list + create + cancel", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./helpdesk.maintenance");
    await m.fetchMaintenanceWindows({} as never);
    await m.createMaintenanceWindow({ title: "t", starts_at: "x", ends_at: "y" } as never);
    await m.cancelMaintenanceWindow({ window_id: 1 } as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("ai*.ts real-fetch", () => {
  it("ai sendChatMessage POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { sendChatMessage } = await import("./ai");
    await sendChatMessage({ messages: [] } as never);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
  });
  it("ai-providers: catalog + configs + config + update + test + resolve", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./ai-providers");
    await m.fetchProviderCatalog();
    await m.fetchProviderConfigs();
    await m.fetchProviderConfig("openai");
    await m.updateProviderConfig({ provider_id: "openai", settings: {} } as never);
    await m.testProviderConnection({ provider_id: "openai" } as never);
    await m.resolveRouting({ purpose: "chat" } as never);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(6);
  });
  it("ai-skills: list + setEnabled + validate", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./ai-skills");
    await m.fetchAISkills({});
    await m.setSkillEnablement({ skill_id: "x", enabled: true } as never);
    await m.validateSkillInvocation({ skill_id: "x", params: {} } as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("ai-usage: stats + events + setBudget", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./ai-usage");
    await m.fetchUsageStats("mtd");
    await m.fetchUsageEvents({} as never);
    await m.setUsageBudget({ scope: "org", scope_id: 1, monthly_budget_usd: 100 } as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("module-registry, settings, feature-flags, policies, search, sample-data real-fetch", () => {
  it("module-registry: fetchModules + setEnablement", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./module-registry");
    await m.fetchModules();
    await m.setModuleEnablement({ module_key: "helpdesk", enabled: true } as never);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("settings: definitions + fetch + byCategory + setSetting", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./settings");
    await m.fetchSettingDefinitions();
    await m.fetchSetting("smtp.host");
    await m.fetchSettingsByCategory("email" as never);
    await m.setSetting({ key: "smtp.host", scope: "org", scope_id: 1, value: "x" } as never);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("feature-flags: fetchFlag + definitions + setOverride", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./feature-flags");
    await m.fetchFeatureFlag("helpdesk.enabled" as never);
    await m.fetchFeatureFlagDefinitions();
    await m.setFeatureFlagOverride({
      flag_key: "helpdesk.enabled",
      scope: "org",
      scope_id: 1,
      value: true,
    } as never);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("policies: list + fetch + setEnabled + evaluate", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./policies");
    await m.fetchPolicies();
    await m.fetchPolicy("p.x");
    await m.setPolicyEnabled("p.x", false);
    await m.evaluatePolicy({ action_id: "y", context: {} } as never);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("search: searchGlobal", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const { searchGlobal } = await import("./search");
    await searchGlobal({ q: "abc" });
    expect(fetchMock.mock.calls[0]![0]).toContain("q=abc");
  });
  it("billing: fetchBillingOverview GET /overview", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./billing");
    await m.fetchBillingOverview();
    expect(fetchMock.mock.calls[0]![0]).toContain("/overview");
  });
  it("signup: submitSignup POSTs to /api/proxy/signup with body", async () => {
    fetchMock.mockResolvedValue(okJson({ success: true }));
    const m = await import("./signup");
    await m.submitSignup({ org_name: "X", email: "x@y.com", password: "Password123" });
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/proxy/signup");
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("POST");
    expect(fetchMock.mock.calls[0]![1]!.body).toContain('"org_name":"X"');
  });
  it("sample-data: seed + status", async () => {
    fetchMock.mockResolvedValue(okJson({}));
    const m = await import("./sample-data");
    await m.seedSampleData({ scope: "helpdesk" } as never);
    await m.getSampleDataStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("error envelope handling (shared across all clients)", () => {
  it("non-OK response throws with backend error string", async () => {
    fetchMock.mockResolvedValue(errJson(403, { error: "denied" }));
    const { fetchUsers } = await import("./users");
    await expect(fetchUsers()).rejects.toThrow(/denied/);
  });
  it("non-OK response with body.message uses it", async () => {
    fetchMock.mockResolvedValue(errJson(500, { message: "server boom" }));
    const { fetchUsers } = await import("./users");
    await expect(fetchUsers()).rejects.toThrow(/server boom/);
  });
});
