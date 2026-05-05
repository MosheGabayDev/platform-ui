/**
 * AIProviderGateway client tests (Phase 2.1).
 */
import { describe, it, expect } from "vitest";
import {
  fetchProviderCatalog,
  fetchProviderConfigs,
  fetchProviderConfig,
  updateProviderConfig,
  testProviderConnection,
  resolveRouting,
  estimateCostUsd,
} from "./ai-providers";

describe("ai-providers client (mock mode)", () => {
  it("fetchProviderCatalog returns 5 providers with full metadata", async () => {
    const res = await fetchProviderCatalog();
    expect(res.success).toBe(true);
    expect(res.data.providers.length).toBeGreaterThanOrEqual(5);
    const ids = res.data.providers.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(["anthropic", "openai", "bedrock", "azure_openai", "ollama"]),
    );
    const anthropic = res.data.providers.find((p) => p.id === "anthropic")!;
    expect(anthropic.models.length).toBeGreaterThan(0);
    expect(anthropic.auth.fields.find((f) => f.key === "api_key")?.sensitive).toBe(true);
  });

  it("fetchProviderConfigs returns one config per provider for the org", async () => {
    const res = await fetchProviderConfigs();
    expect(res.success).toBe(true);
    expect(res.data.configs.length).toBeGreaterThanOrEqual(5);
    const anthropicCfg = res.data.configs.find((c) => c.provider_id === "anthropic");
    expect(anthropicCfg?.enabled).toBe(true);
  });

  it("fetchProviderConfig returns sensitive credentials masked, never plaintext", async () => {
    const res = await fetchProviderConfig("anthropic");
    expect(res.data.config.provider_id).toBe("anthropic");
    const apiKey = res.data.config.credentials.api_key;
    if (typeof apiKey === "string") throw new Error("api_key should be masked, not string");
    expect(apiKey?.has_value).toBe(true);
    expect(apiKey?.masked).toMatch(/sk-/);
    // Plaintext fixture is never in the envelope
    expect(JSON.stringify(res.data.config)).not.toContain("test-real-key");
  });

  it("fetchProviderConfig throws for unknown provider", async () => {
    await expect(fetchProviderConfig("nonexistent")).rejects.toThrow(/404/);
  });

  it("updateProviderConfig writes plaintext credential and returns masked", async () => {
    const plaintext = "sk-test-real-NEW-VALUE-zzz";
    const res = await updateProviderConfig({
      provider_id: "anthropic",
      credentials: { api_key: plaintext },
    });
    const stored = res.data.config.credentials.api_key;
    if (typeof stored === "string") throw new Error("expected masked");
    expect(stored.masked).toContain("...");
    // Plaintext NEVER in envelope (catches future regressions if backend leaks it)
    expect(JSON.stringify(res.data.config)).not.toContain(plaintext);
  });

  it("updateProviderConfig flips enabled + default_model", async () => {
    const res = await updateProviderConfig({
      provider_id: "openai",
      enabled: true,
      default_model: "gpt-5-mini",
      credentials: { api_key: "sk-openai-test" },
    });
    expect(res.data.config.enabled).toBe(true);
    expect(res.data.config.default_model).toBe("gpt-5-mini");
  });

  it("updateProviderConfig clears credential when value is null", async () => {
    await updateProviderConfig({
      provider_id: "openai",
      credentials: { api_key: "to-clear" },
    });
    const after = await updateProviderConfig({
      provider_id: "openai",
      credentials: { api_key: null },
    });
    expect(after.data.config.credentials.api_key).toBeUndefined();
  });

  it("testProviderConnection returns ok=true with latency for configured providers", async () => {
    const res = await testProviderConnection("anthropic");
    expect(res.success).toBe(true);
    expect(res.data.ok).toBe(true);
    expect(res.data.latency_ms).toBeGreaterThan(0);
  });

  it("testProviderConnection returns ok=false when required creds missing", async () => {
    // bedrock requires aws_region + has no creds set in seed
    const res = await testProviderConnection("bedrock");
    expect(res.data.ok).toBe(false);
    expect(res.data.error).toMatch(/credentials/i);
  });

  it("estimateCostUsd uses model pricing", () => {
    const cost = estimateCostUsd("anthropic", "claude-haiku-4-5", 1000, 500);
    // 1000 in × $0.8/M + 500 out × $4/M
    expect(cost).toBeCloseTo(0.0008 + 0.002, 5);
  });

  it("resolveRouting picks routing rule when conditions match", async () => {
    const res = await resolveRouting({
      purpose: "chat",
      estimated_input_tokens: 100,
      estimated_output_tokens: 50,
    });
    expect(res.data.provider_id).toBe("anthropic");
    // The seeded "Cheap chat → Haiku" rule fires for low-cost chat requests.
    expect(res.data.model).toBe("claude-haiku-4-5");
    expect(res.data.matched_rule_id).toBe("rule-1");
  });

  it("resolveRouting falls back to default when no rule matches", async () => {
    // Use a purpose that no rule matches
    const res = await resolveRouting({
      purpose: "embedding",
      estimated_input_tokens: 100,
      estimated_output_tokens: 0,
    });
    expect(res.data.matched_rule_id).toBeNull();
    expect(res.data.provider_id).toBe("anthropic"); // primary enabled config
  });

  it("resolveRouting throws when no provider is enabled", async () => {
    // Disable every provider that earlier tests in this file may have enabled.
    const allProviders = (await fetchProviderCatalog()).data.providers.map((p) => p.id);
    for (const id of allProviders) {
      await updateProviderConfig({ provider_id: id, enabled: false });
    }
    await expect(
      resolveRouting({ purpose: "chat" }),
    ).rejects.toThrow(/no provider enabled/);
    // Restore the seeded primary so other tests aren't affected by file order.
    await updateProviderConfig({ provider_id: "anthropic", enabled: true });
  });
});
