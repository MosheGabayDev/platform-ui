/**
 * @module lib/api/_mock-storage
 * Tiny localStorage-backed persistence shim for MOCK_MODE clients.
 *
 * Goal: dev/demo users see their toggles + edits survive a hard refresh.
 * The shim is opt-in per mock client — clients call `loadMockState`
 * lazily on first read and `saveMockState` after every mutation.
 *
 * SSR-safe: every helper is a no-op when `window` is undefined.
 *
 * Versioning: each saved blob carries a `__v` schema version. If a future
 * change bumps the version, older payloads are discarded silently — that
 * way a stale localStorage value never crashes a fresh build.
 *
 * Reset: `clearMockState(prefix)` is exposed for tests + `__resetAll()`
 * helpers each client can re-export.
 *
 * THIS SHIM IS NOT THE BACKEND CONTRACT. It exists only to paper over
 * the page-reload reset of in-memory mock state. When MOCK_MODE flips to
 * false the shim is bypassed automatically (clients short-circuit before
 * touching it).
 */

interface VersionedBlob<T> {
  __v: number;
  data: T;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Load mock state from localStorage. Returns `fallback` when:
 * - running on the server (SSR)
 * - the key is absent
 * - the stored payload is malformed JSON
 * - the stored payload's `__v` does not match `version`
 */
export function loadMockState<T>(key: string, version: number, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as VersionedBlob<T>;
    if (!parsed || typeof parsed !== "object" || parsed.__v !== version) {
      return fallback;
    }
    return parsed.data;
  } catch {
    return fallback;
  }
}

/**
 * Persist mock state. Silently swallows storage errors (quota exceeded,
 * private-mode browsers, …) because the in-memory copy is authoritative
 * during the session — losing persistence is degraded UX, not a bug.
 */
export function saveMockState<T>(key: string, version: number, data: T): void {
  if (!isBrowser()) return;
  try {
    const blob: VersionedBlob<T> = { __v: version, data };
    window.localStorage.setItem(key, JSON.stringify(blob));
  } catch {
    // best-effort — never throw from a mock save
  }
}

/**
 * Remove every key under a prefix. Used by `__reset*` helpers per client.
 */
export function clearMockState(prefix: string): void {
  if (!isBrowser()) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) window.localStorage.removeItem(k);
  } catch {
    // best-effort
  }
}
