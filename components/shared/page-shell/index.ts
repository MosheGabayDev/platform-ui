/**
 * @module components/shared/page-shell
 * Standard page layout shell for module list pages.
 *
 * Usage:
 *   import { PageShell } from "@/components/shared/page-shell";
 *
 * Security note: PermissionGate must be placed OUTSIDE PageShell by the caller
 * when the entire page requires a role restriction.
 */

export { PageShell } from "./page-shell";
export type { PageShellProps } from "./types";
