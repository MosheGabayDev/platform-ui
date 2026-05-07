/**
 * @module lib/platform/security/cidr
 * Pure CIDR validation helpers.
 *
 * @platform cross — no React, no DOM, no IP libraries.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §6 task 9.06.
 *
 * Backend MUST re-validate before persisting (frontend validation is
 * UX only, not a security boundary).
 */

const IPV4_OCTET = /^(25[0-5]|2[0-4]\d|1?\d{1,2})$/;

/**
 * Returns true if `value` is a syntactically valid IPv4 CIDR. Examples:
 * "10.0.0.0/8", "192.168.1.0/24", "0.0.0.0/0". Empty / whitespace input
 * is rejected.
 */
export function isValidIpv4Cidr(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const slashIdx = trimmed.indexOf("/");
  if (slashIdx === -1) return false;

  const ip = trimmed.slice(0, slashIdx);
  const prefix = trimmed.slice(slashIdx + 1);

  // Prefix length must be 0..32, no leading zeros (other than the digit 0).
  if (!/^(0|[1-9]\d?|3[0-2])$/.test(prefix)) return false;
  const prefixNum = Number(prefix);
  if (prefixNum < 0 || prefixNum > 32) return false;

  const octets = ip.split(".");
  if (octets.length !== 4) return false;
  for (const o of octets) {
    if (!IPV4_OCTET.test(o)) return false;
  }
  return true;
}

/**
 * Normalize a CIDR string for storage: trim + lowercase. Returns null
 * when invalid. Pure — does not reach out for DNS or anything network.
 */
export function normalizeCidr(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return isValidIpv4Cidr(trimmed) ? trimmed : null;
}
