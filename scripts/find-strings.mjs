#!/usr/bin/env node
import fs from "node:fs";
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/find-strings.mjs <path>");
  process.exit(1);
}
const src = fs.readFileSync(file, "utf8");
const seen = new Set();
function emit(line, kind, text) {
  const key = `${line}:${kind}:${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.log(`L${line}  ${kind.padEnd(8)} ${text}`);
}
for (const m of src.matchAll(/>([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,5})</g)) {
  const line = src.substring(0, m.index).split("\n").length;
  emit(line, "JSX", m[1]);
}
for (const m of src.matchAll(/(?:label|title|placeholder|description):\s*"([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,5})"/g)) {
  const line = src.substring(0, m.index).split("\n").length;
  emit(line, "attr", m[1]);
}
for (const m of src.matchAll(/header:\s*"([A-Z][a-z]+(?:\s+[a-zA-Z]+)*)"/g)) {
  const line = src.substring(0, m.index).split("\n").length;
  emit(line, "header", m[1]);
}
for (const m of src.matchAll(/(?:title|placeholder|emptyMessage|description|aria-label)=["']([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,7}\??)["']/g)) {
  const line = src.substring(0, m.index).split("\n").length;
  emit(line, "JSXattr", m[1]);
}
