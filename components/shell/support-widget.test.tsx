/**
 * SupportWidget — env-driven mount point. Tests the no-op default and
 * the script-injection paths for Intercom + Crisp.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { SupportWidget } from "./support-widget";

beforeEach(() => {
  // Clean slate per test.
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  // Reset any window globals our mounts may have set.
  const w = window as unknown as Record<string, unknown>;
  delete w.Intercom;
  delete w.$crisp;
  delete w.CRISP_WEBSITE_ID;
});

describe("SupportWidget", () => {
  it("renders nothing in the DOM (it's a side-effect mount)", () => {
    const { container } = render(<SupportWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("default (no env) is a no-op — does not inject scripts", () => {
    render(<SupportWidget />);
    expect(document.querySelectorAll("script[src*='intercom']").length).toBe(0);
    expect(document.querySelectorAll("script[src*='crisp']").length).toBe(0);
  });

  it("injects the Intercom loader when provider=intercom + app id set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_PROVIDER", "intercom");
    vi.stubEnv("NEXT_PUBLIC_INTERCOM_APP_ID", "abc123");
    render(<SupportWidget />);
    const scripts = document.querySelectorAll("script[src*='widget.intercom.io']");
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).src).toContain("/widget/abc123");
  });

  it("does NOT inject Intercom when provider=intercom but app id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_PROVIDER", "intercom");
    vi.stubEnv("NEXT_PUBLIC_INTERCOM_APP_ID", "");
    render(<SupportWidget />);
    expect(document.querySelectorAll("script[src*='intercom']").length).toBe(0);
  });

  it("injects Crisp loader when provider=crisp + website id set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_PROVIDER", "crisp");
    vi.stubEnv("NEXT_PUBLIC_CRISP_WEBSITE_ID", "site-xyz");
    render(<SupportWidget />);
    const w = window as unknown as { CRISP_WEBSITE_ID?: string };
    expect(w.CRISP_WEBSITE_ID).toBe("site-xyz");
    expect(document.querySelectorAll("script[src*='client.crisp.chat']").length).toBe(1);
  });

  it("provider=plain + provider=unknown both no-op", () => {
    for (const p of ["plain", "garbage"]) {
      vi.stubEnv("NEXT_PUBLIC_SUPPORT_PROVIDER", p);
      render(<SupportWidget />);
      expect(document.querySelectorAll("script[src*='intercom']").length).toBe(0);
      expect(document.querySelectorAll("script[src*='crisp']").length).toBe(0);
      cleanup();
    }
  });
});
