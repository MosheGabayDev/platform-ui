/**
 * @module lib/docs/types
 * Types for the in-app help surface (Phase 3.3).
 *
 * Track E refactor: catalog entries reference translation KEYS rather
 * than embed copy. The page resolves keys via `useTranslations()` so
 * adding a locale is a single JSON edit.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-help-surface-spec.md
 */

export type DocCategory =
  | "quick-start"
  | "ai-cheatsheet"
  | "shortcuts"
  | "platform";

export interface DocArticle {
  id: string;
  category: DocCategory;
  /** Key into the i18n catalog (e.g. "help.modules.helpdesk.title"). */
  titleKey: string;
  summaryKey: string;
  /** Optional longer body. */
  bodyKey?: string;
  /** Ordered numbered steps; each is a key into the catalog. */
  stepKeys?: string[];
  /** Free-form tags used for substring-search across the catalog. */
  tags?: string[];
  /** Module-registry key when the article belongs to a vertical module. */
  module_key?: string;
}

export type AICapabilityLevel = "READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE";

export interface AIShortcut {
  /** Verbatim phrase to type into the AI assistant. */
  phrase: string;
  /** Skill id from `lib/platform/ai-skills/registry.ts`. */
  action_id: string;
  /** i18n key for the user-visible description. */
  descriptionKey: string;
  capability_level: AICapabilityLevel;
}

export interface KeyboardShortcut {
  keys: string[];
  /** i18n key for the user-visible label. */
  labelKey: string;
}

export interface DocsCatalog {
  articles: DocArticle[];
  aiShortcuts: AIShortcut[];
  keyboardShortcuts: KeyboardShortcut[];
}
