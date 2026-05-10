/**
 * Cross-cutting invariant: the he/en i18n catalogs MUST have the same
 * shape — every key path in one MUST exist in the other. A drift here
 * means a Hebrew user sees an English fallback (or worse, a missing-
 * translation key string) for whatever leaf is missing.
 *
 * Catches the bug class where someone adds a new English string but
 * forgets to add the Hebrew counterpart (or vice-versa).
 *
 * Batch 57 — added after the i18n debt cleanup arc closed
 * (batches 44–52) so we don't backslide.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import he from "@/i18n/messages/he.json";
import en from "@/i18n/messages/en.json";

type Catalog = Record<string, unknown>;

function flatten(obj: Catalog, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v as Catalog, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

describe("i18n catalog parity (he ↔ en)", () => {
  const heKeys = new Set(flatten(he as Catalog));
  const enKeys = new Set(flatten(en as Catalog));

  it("every English leaf key exists in Hebrew catalog", () => {
    const missingInHe = [...enKeys].filter((k) => !heKeys.has(k));
    expect(missingInHe).toEqual([]);
  });

  it("every Hebrew leaf key exists in English catalog", () => {
    const missingInEn = [...heKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it("catalogs are non-trivial (sanity check — must have many keys)", () => {
    expect(heKeys.size).toBeGreaterThan(500);
    expect(enKeys.size).toBe(heKeys.size);
  });

  it("every useTranslations(\"scope\") resolves to a sub-object in both catalogs", () => {
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          walk(p, out);
        } else if (
          /\.(tsx?|jsx?)$/.test(entry.name) &&
          !/\.test\.(tsx?|jsx?)$/.test(entry.name)
        ) {
          out.push(p);
        }
      }
      return out;
    }
    const sources = [
      ...walk("app"),
      ...walk("components"),
      ...walk("lib"),
    ];
    const scopes = new Set<string>();
    const re = /useTranslations\(\s*["']([^"']+)["']\s*\)/g;
    for (const file of sources) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(re)) scopes.add(m[1]!);
    }

    function resolve(obj: Catalog, dotted: string): unknown {
      let node: unknown = obj;
      for (const seg of dotted.split(".")) {
        if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
        node = (node as Record<string, unknown>)[seg];
      }
      return node;
    }

    const broken: string[] = [];
    for (const scope of scopes) {
      const heNode = resolve(he as Catalog, scope);
      const enNode = resolve(en as Catalog, scope);
      // useTranslations expects an OBJECT scope (so callers can `t("key")`).
      const ok =
        heNode !== null && typeof heNode === "object" && !Array.isArray(heNode) &&
        enNode !== null && typeof enNode === "object" && !Array.isArray(enNode);
      if (!ok) broken.push(scope);
    }
    expect(broken).toEqual([]);
    // Sanity floor — make sure the walker actually found scopes.
    expect(scopes.size).toBeGreaterThan(50);
  });

  it("no leaf value is empty string in either locale", () => {
    function emptyLeaves(obj: Catalog, prefix = ""): string[] {
      const out: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          out.push(...emptyLeaves(v as Catalog, path));
        } else if (typeof v === "string" && v.trim() === "") {
          out.push(path);
        }
      }
      return out;
    }
    expect(emptyLeaves(he as Catalog)).toEqual([]);
    expect(emptyLeaves(en as Catalog)).toEqual([]);
  });
});
