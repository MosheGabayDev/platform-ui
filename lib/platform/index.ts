/**
 * @module lib/platform
 * Cross-platform logic boundary for platform-ui.
 *
 * @platform cross — everything exported from here must be safe for:
 *   - Next.js web (current)
 *   - React Native mobile (future)
 *   - Electron desktop (future)
 *   - Node.js (tests, CLI tools)
 *
 * Rules:
 *   ✅ Pure TypeScript interfaces and types
 *   ✅ Pure functions using only standard JS (Intl.*, Math, Date, String)
 *   ❌ No React imports
 *   ❌ No Next.js imports (next/navigation, next-auth, next/server)
 *   ❌ No DOM APIs (document, window, navigator, Blob, URL.createObjectURL)
 *   ❌ No CSS classes or Tailwind utilities
 *
 * See docs/system-upgrade/28-cross-platform-structure-audit.md for full rules.
 */

// Auth user types (no next-auth dependency)
export type {
  FlaskLoginResponse,
  FlaskRefreshResponse,
  FlaskUserPayload,
  NormalizedAuthUser,
} from "./auth/types";

// RBAC pure logic
export type { SessionLike } from "./permissions/rbac";
export {
  hasRole,
  hasAnyRole,
  hasPermission,
  isSystemAdmin,
  getOrgId,
} from "./permissions/rbac";

// Formatting utilities
export {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatBytes,
} from "./formatting/format";

// CSV serialization (no browser download)
export { escapeCsvCell, rowsToCsv } from "./export/csv";

// Request context + audit headers
export { generateRequestId, buildAuditHeaders } from "./request/context";

// Data grid type contracts
export type {
  SortDirection,
  ColumnSort,
  TableFilter,
  ColumnVisibilityState,
  TableExportOptions,
  PaginationParams,
  PaginatedEnvelope,
} from "./data-grid/types";
