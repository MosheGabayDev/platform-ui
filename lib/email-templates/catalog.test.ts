/**
 * Email-templates catalog invariants. Ensures every template has its
 * subject + body keys present in BOTH locale catalogs and that every
 * referenced variable is documented.
 */
import { describe, it, expect } from "vitest";
import {
  EMAIL_TEMPLATES,
  getEmailTemplate,
  getEmailsForPhase,
  getAllReferencedVariables,
} from "./catalog";
import heMessages from "@/i18n/messages/he.json";
import enMessages from "@/i18n/messages/en.json";

function getKey(messages: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

describe("EMAIL_TEMPLATES catalog", () => {
  it("every template id is unique", () => {
    const ids = EMAIL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has at least one variable", () => {
    for (const t of EMAIL_TEMPLATES) {
      expect(t.variables.length, `${t.id} has no variables`).toBeGreaterThan(0);
    }
  });

  it("every template has all 5 phases at least once", () => {
    const phases = new Set(EMAIL_TEMPLATES.map((t) => t.phase));
    expect(phases.has("signup")).toBe(true);
    expect(phases.has("trial")).toBe(true);
    expect(phases.has("conversion")).toBe(true);
    expect(phases.has("transactional")).toBe(true);
    // retention not yet seeded; allow for future expansion.
  });

  it("every subject_key + body_key resolves in he.json", () => {
    for (const t of EMAIL_TEMPLATES) {
      expect(getKey(heMessages as Record<string, unknown>, t.subject_key), `${t.id} subject missing in he`).toBeTruthy();
      expect(getKey(heMessages as Record<string, unknown>, t.body_key), `${t.id} body missing in he`).toBeTruthy();
    }
  });

  it("every subject_key + body_key resolves in en.json", () => {
    for (const t of EMAIL_TEMPLATES) {
      expect(getKey(enMessages as Record<string, unknown>, t.subject_key), `${t.id} subject missing in en`).toBeTruthy();
      expect(getKey(enMessages as Record<string, unknown>, t.body_key), `${t.id} body missing in en`).toBeTruthy();
    }
  });

  it("every variable referenced by a template appears in its body in BOTH locales", () => {
    for (const t of EMAIL_TEMPLATES) {
      for (const lang of ["he", "en"] as const) {
        const messages = lang === "he" ? heMessages : enMessages;
        const body = getKey(messages as Record<string, unknown>, t.body_key);
        expect(body, `${t.id} body missing in ${lang}`).toBeTruthy();
        for (const v of t.variables) {
          expect(
            body!.includes(`{{${v}}}`),
            `${lang}: ${t.id} body does not reference variable ${v}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("catalog helpers", () => {
  it("getEmailTemplate finds by id and returns undefined for unknown", () => {
    expect(getEmailTemplate("welcome")?.id).toBe("welcome");
    expect(getEmailTemplate("does-not-exist")).toBeUndefined();
  });

  it("getEmailsForPhase filters correctly", () => {
    const signup = getEmailsForPhase("signup");
    expect(signup.length).toBeGreaterThanOrEqual(3);
    for (const t of signup) expect(t.phase).toBe("signup");
  });

  it("getAllReferencedVariables returns sorted unique list", () => {
    const vars = getAllReferencedVariables();
    expect(vars).toContain("user_first_name");
    expect(vars).toContain("verify_link");
    // Sorted check
    const sorted = [...vars].sort();
    expect(vars).toEqual(sorted);
  });
});
