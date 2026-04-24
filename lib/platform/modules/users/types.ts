/**
 * @module lib/platform/modules/users/types
 * Cross-platform re-export of Users module type contracts.
 *
 * @platform cross — pure TypeScript, no framework imports
 *
 * Import from this path in platform-agnostic code (mobile, desktop, shared utils).
 * Web-specific code may continue to import from lib/modules/users/types directly.
 */
export type {
  UserStatus,
  UserSummary,
  UserDetail,
  UsersListResponse,
  UserDetailResponse,
  UserStatsResponse,
  PendingUsersResponse,
  UsersListParams,
} from "@/lib/modules/users/types";
