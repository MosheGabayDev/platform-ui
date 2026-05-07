/**
 * @module components/shared/record-detail
 * Shared per-record actions primitive (Track C).
 *
 * Composition: a list page declares one `RecordDetailConfig<T>` and
 * gets the row-level menu (`<RecordActionsMenu>`) and an optional
 * slide-over (`<RecordDetailPane>`) with destructive-confirm + RBAC
 * gating + per-action pending state for free.
 *
 * Spec: docs/system-upgrade/PLATFORM_HARDENING_PLAN.md Track C.
 */
export type {
  RecordAction,
  RecordActionKind,
  RecordDetailSection,
  RecordDetailConfig,
} from "./types";
export { useRecordActions } from "./use-record-actions";
export { RecordActionsMenu } from "./record-actions-menu";
export { RecordDetailPane } from "./record-detail-pane";
