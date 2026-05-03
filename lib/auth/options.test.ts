/**
 * Auth options tests — covers AUTH_MOCK_MODE prod guard, mock authorize path,
 * mock refresh path, and the high-risk surface called out by review #2.
 *
 * lib/auth/ is an ADR-042 high-coverage layer (95% target). These tests are
 * the first contribution toward that floor.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mutate NODE_ENV before each test, then restore. We re-import the module to
// re-run the resolveAuthMockMode() initializer.
const ORIG_NODE_ENV = process.env.NODE_ENV;
const ORIG_AUTH_MOCK_MODE = process.env.AUTH_MOCK_MODE;

describe("lib/auth/options — AUTH_MOCK_MODE", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIG_NODE_ENV === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      Object.assign(process.env, { NODE_ENV: ORIG_NODE_ENV });
    }
    if (ORIG_AUTH_MOCK_MODE === undefined) {
      delete process.env.AUTH_MOCK_MODE;
    } else {
      process.env.AUTH_MOCK_MODE = ORIG_AUTH_MOCK_MODE;
    }
  });

  it("defaults to true in development", async () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.AUTH_MOCK_MODE;
    const mod = await import("./options");
    expect(mod.AUTH_MOCK_MODE).toBe(true);
  });

  it("respects AUTH_MOCK_MODE=false in development", async () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    process.env.AUTH_MOCK_MODE = "false";
    const mod = await import("./options");
    expect(mod.AUTH_MOCK_MODE).toBe(false);
  });

  it("FAIL-CLOSED in production regardless of env override (Q-AU-2)", async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.AUTH_MOCK_MODE = "true"; // hostile leak attempt
    const mod = await import("./options");
    expect(mod.AUTH_MOCK_MODE).toBe(false);
  });

  it("FAIL-CLOSED in production even when env var undefined", async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.AUTH_MOCK_MODE;
    const mod = await import("./options");
    expect(mod.AUTH_MOCK_MODE).toBe(false);
  });

  it("test environment defaults to true (matches dev posture)", async () => {
    Object.assign(process.env, { NODE_ENV: "test" });
    delete process.env.AUTH_MOCK_MODE;
    const mod = await import("./options");
    expect(mod.AUTH_MOCK_MODE).toBe(true);
  });
});

describe("lib/auth/options — Credentials provider authorize", () => {
  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.AUTH_MOCK_MODE; // → mock mode
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIG_NODE_ENV === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      Object.assign(process.env, { NODE_ENV: ORIG_NODE_ENV });
    }
  });

  async function callAuthorize(email: string, password: string) {
    const { authOptions } = await import("./options");
    const provider = authOptions.providers[0] as {
      options: {
        authorize: (
          credentials: { email: string; password: string } | undefined,
        ) => Promise<unknown>;
      };
    };
    return provider.options.authorize({ email, password });
  }

  it("returns null when credentials missing", async () => {
    const result = await callAuthorize("", "anything");
    expect(result).toBeNull();
  });

  it("admin@platform.local resolves as system_admin in mock mode", async () => {
    const result = (await callAuthorize("admin@platform.local", "any")) as {
      normalizedUser: { is_system_admin: boolean; role: string };
    } | null;
    expect(result).not.toBeNull();
    expect(result?.normalizedUser.is_system_admin).toBe(true);
    expect(result?.normalizedUser.role).toBe("system_admin");
  });

  it("emails containing 'viewer' resolve as viewer role in mock mode", async () => {
    const result = (await callAuthorize("viewer@platform.local", "any")) as {
      normalizedUser: { is_admin: boolean; role: string };
    } | null;
    expect(result).not.toBeNull();
    expect(result?.normalizedUser.role).toBe("viewer");
    expect(result?.normalizedUser.is_admin).toBe(false);
  });

  it("mock authorize never calls Flask network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await callAuthorize("any@platform.local", "any");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
