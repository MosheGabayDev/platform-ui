/**
 * PlatformSettings client tests (cap 16, Phase 1.2).
 * Covers: definitions list, resolution hierarchy, set/clear, secret masking,
 * schema validation, scope rejection.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  fetchSettingDefinitions,
  fetchSetting,
  fetchSettingsByCategory,
  setSetting,
} from "./settings";

describe("settings client (mock mode)", () => {
  it("fetchSettingDefinitions returns the catalog with required fields", async () => {
    const res = await fetchSettingDefinitions();
    expect(res.success).toBe(true);
    expect(res.data.definitions.length).toBeGreaterThanOrEqual(13);
    const sysprompt = res.data.definitions.find((d) => d.key === "ai.system_prompt");
    expect(sysprompt).toBeDefined();
    expect(sysprompt!.type).toBe("string");
    expect(sysprompt!.allowed_scopes).toContain("org");
  });

  it("resolves a setting with org-scope override (branding.org_name)", async () => {
    const res = await fetchSetting("branding.org_name");
    expect(res.data.type).toBe("string");
    if (res.data.type !== "string") throw new Error("type narrowing");
    expect(res.data.value).toBe("Acme Corporation");
    expect(res.data.source).toBe("org");
  });

  it("falls back to default when no override exists at any scope", async () => {
    const res = await fetchSetting("ai.system_prompt");
    expect(res.data.type).toBe("string");
    if (res.data.type !== "string") throw new Error("type narrowing");
    expect(res.data.source).toBe("default");
    expect(res.data.value).toContain("helpful operations assistant");
  });

  it("plan-scope value resolves when no org override (ai.max_tokens_per_message)", async () => {
    const res = await fetchSetting("ai.max_tokens_per_message");
    expect(res.data.type).toBe("int");
    if (res.data.type !== "int") throw new Error("type narrowing");
    expect(res.data.source).toBe("plan");
    expect(res.data.value).toBe(4096);
  });

  it("secret values return masked + has_value=true, never plaintext", async () => {
    const res = await fetchSetting("ai.openai_api_key");
    expect(res.data.is_sensitive).toBe(true);
    if (res.data.type !== "secret") throw new Error("type narrowing");
    expect(res.data.has_value).toBe(true);
    expect(res.data.masked).toMatch(/sk-\.\.\./);
    // The plaintext "sk-acme-test-12345-XYZ" must NOT leak into the envelope.
    expect(JSON.stringify(res.data)).not.toContain("acme-test");
  });

  it("setSetting writes a value and resolution flips to that scope", async () => {
    await setSetting({
      key: "ai.persona_name",
      scope: "org",
      scope_id: 1,
      value: "TestBot 9000",
    });
    const res = await fetchSetting("ai.persona_name");
    if (res.data.type !== "string") throw new Error("type narrowing");
    expect(res.data.value).toBe("TestBot 9000");
    expect(res.data.source).toBe("org");
  });

  it("clearing an org override (value=null) falls back", async () => {
    await setSetting({
      key: "ai.persona_name",
      scope: "org",
      scope_id: 1,
      value: "Temporary",
    });
    await setSetting({
      key: "ai.persona_name",
      scope: "org",
      scope_id: 1,
      value: null,
    });
    const res = await fetchSetting("ai.persona_name");
    if (res.data.type !== "string") throw new Error("type narrowing");
    expect(res.data.source).not.toBe("org");
  });

  it("rejects scope not in allowed_scopes", async () => {
    await expect(
      setSetting({
        key: "rate_limits.api_requests_per_minute",
        scope: "user",
        scope_id: 7,
        value: 100,
      }),
    ).rejects.toThrow(/scope 'user' not allowed/i);
  });

  it("validates int min/max", async () => {
    await expect(
      setSetting({
        key: "ai.max_tokens_per_message",
        scope: "org",
        scope_id: 1,
        value: 50, // below min:256
      }),
    ).rejects.toThrow(/below minimum/i);
  });

  it("validates string maxLength", async () => {
    await expect(
      setSetting({
        key: "ai.persona_name",
        scope: "org",
        scope_id: 1,
        value: "x".repeat(200),
      }),
    ).rejects.toThrow(/longer than/i);
  });

  it("validates enum allowed_values", async () => {
    await expect(
      setSetting({
        key: "ai.default_model",
        scope: "org",
        scope_id: 1,
        value: "not-a-real-model",
      }),
    ).rejects.toThrow(/not in allowed_values/i);
  });

  it("validates string pattern (logo_url must start with http)", async () => {
    await expect(
      setSetting({
        key: "branding.logo_url",
        scope: "org",
        scope_id: 1,
        value: "ftp://nope.example.com/logo.png",
      }),
    ).rejects.toThrow(/pattern/i);
  });

  it("rejects empty secret (use null to clear)", async () => {
    await expect(
      setSetting({
        key: "notifications.slack_webhook",
        scope: "org",
        scope_id: 1,
        value: "",
      }),
    ).rejects.toThrow(/cannot be empty/i);
  });

  it("fetchSettingsByCategory returns all settings in the category", async () => {
    const res = await fetchSettingsByCategory("branding");
    expect(res.data.category).toBe("branding");
    expect(res.data.settings.length).toBeGreaterThanOrEqual(3);
    const keys = res.data.settings.map((s) => s.key);
    expect(keys).toContain("branding.org_name");
    expect(keys).toContain("branding.accent_color");
    expect(keys).toContain("branding.logo_url");
  });

  it("fetchSetting throws 404 for unknown key", async () => {
    await expect(fetchSetting("nonexistent.key")).rejects.toThrow(/404/);
  });

  it("setting a secret then re-reading returns updated mask, never plaintext", async () => {
    await setSetting({
      key: "notifications.slack_webhook",
      scope: "org",
      scope_id: 1,
      value: "https://hooks.slack.com/services/T/B/SECRET-TOKEN-XYZ",
    });
    const res = await fetchSetting("notifications.slack_webhook");
    if (res.data.type !== "secret") throw new Error("type narrowing");
    expect(res.data.has_value).toBe(true);
    expect(res.data.masked).toBeTruthy();
    expect(JSON.stringify(res.data)).not.toContain("SECRET-TOKEN");
  });

  it("every literal useSetting / setSetting key in app+components+lib resolves to a catalog entry (batch 90)", async () => {
    // Cross-cut: settings keys are typed as `string`, so a typo
    // compiles fine but fetchSetting silently returns "not found"
    // → page renders empty value, save mutation 404s. Walk the
    // dashboard sources for literal `useSetting("X")` and
    // `setSetting({ key: "X", ... })` calls and assert each key
    // exists in the live catalog.
    function walk(dir: string, out: string[] = []): string[] {
      if (!fs.existsSync(dir)) return out;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name === ".next") continue;
          walk(p, out);
        } else if (
          /\.(tsx?|jsx?)$/.test(e.name) &&
          !/\.test\.(tsx?|jsx?)$/.test(e.name)
        ) {
          out.push(p);
        }
      }
      return out;
    }
    const sources = [...walk("app"), ...walk("components"), ...walk("lib")];
    const refs = new Set<string>();
    for (const file of sources) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(/useSetting\(\s*"([^"]+)"\s*\)/g))
        refs.add(m[1]!);
      // setSetting({ key: "...", ...) — key may not be the first prop.
      for (const m of src.matchAll(
        /setSetting\(\s*\{[^{}]*?key:\s*"([^"]+)"/g,
      )) refs.add(m[1]!);
    }
    expect(refs.size).toBeGreaterThan(3);
    const defs = await fetchSettingDefinitions();
    const known = new Set(defs.data.definitions.map((d) => d.key));
    const orphans = [...refs].filter((k) => !known.has(k));
    expect(orphans).toEqual([]);
  });
});
