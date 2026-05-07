/**
 * @module components/shared/record-detail/types
 * Shared types for RecordDetail (Track C).
 *
 * Goal: a single primitive that renders the "view details / edit / delete /
 * duplicate" affordance for any record kind, with per-action RBAC gating.
 *
 * Spec: docs/system-upgrade/PLATFORM_HARDENING_PLAN.md Track C
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Built-in action kinds — most records expose some subset of these. */
export type RecordActionKind = "view" | "edit" | "duplicate" | "delete" | "custom";

/**
 * One row-level action. Generic over the record type so callbacks see
 * the typed record.
 */
export interface RecordAction<T> {
  /** Unique id used for keyboard navigation, telemetry, and tests. */
  id: string;
  /** Built-in kind drives default labels + icons + tone. `custom` opts out. */
  kind: RecordActionKind;
  /** Display label. Caller passes already-translated string (use `t()`). */
  label: string;
  /** Icon to render in the menu + dialog header. Defaults vary by kind. */
  icon?: LucideIcon;
  /**
   * RBAC gate. If present, the action is hidden when
   * `usePermission().isRole(...required)` returns false. Empty array = no gate.
   * (Convenience over passing `disabled` from outside.)
   */
  requiredRoles?: string[];
  /**
   * RBAC gate, permission-codename style. Same hiding semantics as roles.
   */
  requiredPermission?: string;
  /**
   * Predicate against the record. Hides the action when false. Useful for
   * "delete only allowed when status === draft" kind of logic.
   */
  visibleWhen?: (record: T) => boolean;
  /**
   * If `true`, the action requires a typed-name confirmation before
   * `onInvoke` runs. The shared `ConfirmActionDialog` is used.
   */
  destructive?: boolean;
  /** Confirmation dialog title. Required when `destructive: true`. */
  confirmTitle?: string;
  /** Confirmation dialog description. Required when `destructive: true`. */
  confirmDescription?: string;
  /**
   * String the user must type to confirm. When present, the dialog renders
   * a typed-name input and disables the confirm button until it matches.
   */
  confirmTypedName?: (record: T) => string;
  /**
   * The actual handler. May be async; the menu disables the action while
   * a previous invocation is pending. Errors thrown here surface as toasts
   * via `useRecordActions`.
   */
  onInvoke: (record: T) => void | Promise<void>;
}

/**
 * Optional section in the detail pane. Each section gets a heading +
 * arbitrary children (caller decides what to render — InfoRow, custom
 * widgets, etc.).
 */
export interface RecordDetailSection<T> {
  id: string;
  title: string;
  /** Hide the whole section conditionally (e.g. only show audit section to admins). */
  visibleWhen?: (record: T) => boolean;
  render: (record: T) => ReactNode;
}

/**
 * Full configuration for a record kind. Pass once to the table or pane
 * and the primitive owns everything else (menu, dialog, RBAC, confirm).
 */
export interface RecordDetailConfig<T> {
  /** Stable id for the record kind, used in test selectors + telemetry. */
  recordKind: string;
  /** Pull a stable id off the record for React keys + dialog state. */
  getId: (record: T) => string | number;
  /** Display label for the record (used in dialog headers, e.g. "User: Alice"). */
  getLabel: (record: T) => string;
  /** Optional sections rendered top-to-bottom in the detail pane. */
  sections?: RecordDetailSection<T>[];
  /** Action list — order is preserved in the dropdown. */
  actions: RecordAction<T>[];
}
