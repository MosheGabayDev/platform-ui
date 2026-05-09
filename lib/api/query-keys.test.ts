/**
 * Query key registry — every shape should be stable, deterministic, and
 * include params where present (so React Query distinguishes cache entries).
 */
import { describe, it, expect } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys registry", () => {
  it("dashboard keys are stable arrays", () => {
    expect(queryKeys.dashboardStats).toEqual(["dashboard", "stats"]);
    expect(queryKeys.serviceHealth).toEqual(["dashboard", "health"]);
    expect(queryKeys.timeSeries(30)).toEqual(["dashboard", "timeseries", 30]);
    expect(queryKeys.timeSeries(7)).toEqual(["dashboard", "timeseries", 7]);
  });

  it("users keys", () => {
    expect(queryKeys.users.all()).toEqual(["users"]);
    expect(queryKeys.users.stats()).toEqual(["users", "stats"]);
    expect(queryKeys.users.list({ search: "x" })).toEqual(["users", "list", { search: "x" }]);
    expect(queryKeys.users.list()).toEqual(["users", "list", undefined]);
    expect(queryKeys.users.detail(7)).toEqual(["users", "detail", 7]);
    expect(queryKeys.users.pending()).toEqual(["users", "pending"]);
    expect(queryKeys.users.activity(7, { limit: 20 })).toEqual([
      "users",
      "activity",
      7,
      { limit: 20 },
    ]);
  });

  it("orgs keys", () => {
    expect(queryKeys.orgs.all()).toEqual(["orgs"]);
    expect(queryKeys.orgs.stats()).toEqual(["orgs", "stats"]);
    expect(queryKeys.orgs.list({ q: "a" })).toEqual(["orgs", "list", { q: "a" }]);
    expect(queryKeys.orgs.detail(3)).toEqual(["orgs", "detail", 3]);
  });

  it("roles keys", () => {
    expect(queryKeys.roles.all()).toEqual(["roles"]);
    expect(queryKeys.roles.list()).toEqual(["roles", "list", undefined]);
    expect(queryKeys.roles.detail(5)).toEqual(["roles", "detail", 5]);
    expect(queryKeys.roles.permissions()).toEqual(["roles", "permissions"]);
  });

  it("moduleRegistry keys", () => {
    expect(queryKeys.moduleRegistry.all()).toEqual(["module-registry"]);
    expect(queryKeys.moduleRegistry.modules()).toEqual(["module-registry", "modules"]);
    expect(queryKeys.moduleRegistry.status("helpdesk")).toEqual([
      "module-registry",
      "status",
      "helpdesk",
    ]);
  });

  it("notifications keys", () => {
    expect(queryKeys.notifications.all()).toEqual(["notifications"]);
    expect(queryKeys.notifications.list()).toEqual(["notifications", "list"]);
  });

  it("audit keys", () => {
    expect(queryKeys.audit.all()).toEqual(["audit"]);
    expect(queryKeys.audit.stats()).toEqual(["audit", "stats"]);
    expect(queryKeys.audit.list({ category: "ai" })).toEqual([
      "audit",
      "list",
      { category: "ai" },
    ]);
  });

  it("settings keys", () => {
    expect(queryKeys.settings.all()).toEqual(["settings"]);
    expect(queryKeys.settings.definitions()).toEqual(["settings", "definitions"]);
    expect(queryKeys.settings.byCategory("email")).toEqual(["settings", "category", "email"]);
    expect(queryKeys.settings.allCategories()).toEqual(["settings", "all-categories"]);
    expect(queryKeys.settings.one("smtp.host")).toEqual(["settings", "key", "smtp.host"]);
  });

  it("featureFlags keys", () => {
    expect(queryKeys.featureFlags.all()).toEqual(["feature-flags"]);
    expect(queryKeys.featureFlags.definitions()).toEqual(["feature-flags", "definitions"]);
    expect(queryKeys.featureFlags.flag("helpdesk.enabled")).toEqual([
      "feature-flags",
      "flag",
      "helpdesk.enabled",
    ]);
    expect(queryKeys.featureFlags.flagWithChain("helpdesk.enabled")).toEqual([
      "feature-flags",
      "flag",
      "helpdesk.enabled",
      "with-chain",
    ]);
  });

  it("policies keys", () => {
    expect(queryKeys.policies.all()).toEqual(["policies"]);
    expect(queryKeys.policies.list()).toEqual(["policies", "list"]);
    expect(queryKeys.policies.detail("p.x")).toEqual(["policies", "detail", "p.x"]);
  });

  it("search keys", () => {
    expect(queryKeys.search.global("foo")).toEqual(["search", "global", "foo"]);
  });

  it("billing keys", () => {
    expect(queryKeys.billing.all()).toEqual(["billing"]);
    expect(queryKeys.billing.overview()).toEqual(["billing", "overview"]);
    expect(queryKeys.billing.usageSeries(30)).toEqual(["billing", "usage-series", 30]);
  });

  it("feedback keys", () => {
    expect(queryKeys.feedback.all()).toEqual(["feedback"]);
    expect(queryKeys.feedback.list()).toEqual(["feedback", "list"]);
  });

  it("notes keys", () => {
    expect(queryKeys.notes.all()).toEqual(["notes"]);
    expect(queryKeys.notes.list()).toEqual(["notes", "list"]);
  });

  it("helpdesk keys", () => {
    expect(queryKeys.helpdesk.all()).toEqual(["helpdesk"]);
    expect(queryKeys.helpdesk.stats()).toEqual(["helpdesk", "stats"]);
    expect(queryKeys.helpdesk.tickets({ status: "open" })).toEqual([
      "helpdesk",
      "tickets",
      { status: "open" },
    ]);
    expect(queryKeys.helpdesk.ticket(42)).toEqual(["helpdesk", "ticket", 42]);
    expect(queryKeys.helpdesk.technicians(true)).toEqual([
      "helpdesk",
      "technicians",
      { availableOnly: true },
    ]);
    expect(queryKeys.helpdesk.technicians()).toEqual([
      "helpdesk",
      "technicians",
      { availableOnly: undefined },
    ]);
    expect(queryKeys.helpdesk.technicianUtilization()).toEqual([
      "helpdesk",
      "technicians",
      "utilization",
    ]);
    expect(queryKeys.helpdesk.slaPolicies()).toEqual(["helpdesk", "sla", "policies"]);
    expect(queryKeys.helpdesk.slaCompliance()).toEqual(["helpdesk", "sla", "compliance"]);
    expect(queryKeys.helpdesk.approvals({ pending: true })).toEqual([
      "helpdesk",
      "approvals",
      { pending: true },
    ]);
    expect(queryKeys.helpdesk.maintenance()).toEqual([
      "helpdesk",
      "maintenance",
      undefined,
    ]);
    expect(queryKeys.helpdesk.batch({ status: "running" })).toEqual([
      "helpdesk",
      "batch",
      { status: "running" },
    ]);
    expect(queryKeys.helpdesk.batchTask(99)).toEqual([
      "helpdesk",
      "batch",
      "task",
      99,
    ]);
  });

  it("identical params produce equal arrays (referential equality not required)", () => {
    expect(queryKeys.users.detail(1)).toEqual(queryKeys.users.detail(1));
    expect(queryKeys.helpdesk.ticket(7)).toEqual(queryKeys.helpdesk.ticket(7));
  });
});
