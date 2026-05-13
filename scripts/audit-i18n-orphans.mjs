#!/usr/bin/env node
/**
 * Audit: i18n leaf keys that aren't referenced anywhere in the source.
 *
 * Heuristic: walk every catalog leaf path (e.g. `admin.aiSkills.title`),
 * then scan source for any literal that contains the leaf segment. This
 * is intentionally lenient — it matches a key as "used" if its short
 * dotted suffix or the leaf name appears anywhere in a `t(...)` call,
 * a template string, or any literal text. So this exists to surface
 * keys nobody could possibly be using.
 *
 * Usage:
 *   `node scripts/audit-i18n-orphans.mjs`         — informational
 *   `node scripts/audit-i18n-orphans.mjs --gate`  — exit 1 if any drift
 *
 * Currently informational. To wire as a gate, capture the baseline once
 * (an allowlist of known orphans, e.g. backend-emitted error keys).
 */
import fs from "node:fs";
import path from "node:path";

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function flatten(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function walkSrc(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walkSrc(p, out);
    } else if (
      /\.(tsx?|jsx?|json)$/.test(e.name) &&
      !p.includes("i18n/messages/")
    ) {
      out.push(p);
    }
  }
  return out;
}

const en = loadJson("i18n/messages/en.json");
const leafKeys = flatten(en);

const sources = [...walkSrc("app"), ...walkSrc("components"), ...walkSrc("lib")];
const haystack = sources.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// A key like "admin.aiSkills.actions.copySkillId" is "referenced" if:
//   1) the whole dotted suffix appears (e.g. `t("actions.copySkillId")`), OR
//   2) the last 2 segments appear together, OR
//   3) the leaf segment alone appears in a t(...) call.
// This is heuristic and lenient — false-positive-friendly.
function looksUsed(key) {
  const parts = key.split(".");
  const leaf = parts[parts.length - 1];
  const last2 = parts.slice(-2).join(".");
  if (haystack.includes(`"${key}"`)) return true;
  if (haystack.includes(`"${last2}"`)) return true;
  if (haystack.includes(`'${last2}'`)) return true;
  // Substring match for deeper paths (e.g. `t("a.b.c.leaf")` — last2 is
  // `c.leaf` which appears inside the full quoted dotted path).
  if (haystack.includes(`.${last2}"`)) return true;
  if (haystack.includes(`.${last2}'`)) return true;
  if (haystack.includes(`"${leaf}"`)) return true;
  if (haystack.includes(`'${leaf}'`)) return true;
  // Dotted-path quoted that ends with leaf — same fix for very deep keys.
  if (haystack.includes(`.${leaf}"`)) return true;
  if (haystack.includes(`.${leaf}'`)) return true;
  // Template-string call like t(`services.status${STATUS_KEY[status]}`)
  // is a dynamic lookup — we can't statically prove the leaf is reached.
  // Be lenient: if the parent scope's literal prefix appears inside a
  // backtick `t(\`<prefix>` template, treat all its leaves as "used".
  for (let i = parts.length - 1; i >= 1; i--) {
    const scopePrefix = parts.slice(0, i).join(".");
    if (haystack.includes(`t(\`${scopePrefix}.`)) return true;
    // tFoo(`<rest>...`) pattern where the scope is the useTranslations arg.
    // We don't know which `t` binding is bound to which scope statically,
    // so just look for any backtick template starting with a sub-prefix.
    if (haystack.includes(`(\`${parts[i - 1]}.`)) return true;
  }
  // Parent scope used as a translator scope (useTranslations("parent")) +
  // any flat ICU-style key access in the body.
  const parentScope = parts.slice(0, -1).join(".");
  if (haystack.includes(`useTranslations("${parentScope}")`)) return true;
  if (haystack.includes(`useTranslations('${parentScope}')`)) return true;
  return false;
}

const orphans = leafKeys.filter((k) => !looksUsed(k));
console.log(`Total leaf keys: ${leafKeys.length}`);
console.log(`Likely unused: ${orphans.length}`);
const sample = orphans.slice(0, 25);
for (const k of sample) console.log(`  ${k}`);
if (orphans.length > sample.length) {
  console.log(`  … ${orphans.length - sample.length} more`);
}

if (process.argv.includes("--gate") && orphans.length > 0) {
  console.error(
    "\n✗ i18n orphan gate: catalog leaves no consumer references.",
  );
  process.exit(1);
}
