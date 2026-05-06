/**
 * @module lib/docs/types
 * Types for the in-app help surface (Phase 3.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-help-surface-spec.md
 */

export type DocCategory =
  | "quick-start"
  | "ai-cheatsheet"
  | "shortcuts"
  | "platform";

export interface DocStep {
  text: string;
  text_he?: string;
}

export interface DocArticle {
  id: string;
  category: DocCategory;
  title: string;
  title_he?: string;
  summary: string;
  summary_he?: string;
  body?: string;
  body_he?: string;
  steps?: DocStep[];
  tags?: string[];
  module_key?: string;
}

export type AICapabilityLevel = "READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE";

export interface AIShortcut {
  phrase: string;
  action_id: string;
  description: string;
  description_he?: string;
  capability_level: AICapabilityLevel;
}

export interface KeyboardShortcut {
  keys: string[];
  label: string;
  label_he?: string;
}

export interface DocsCatalog {
  articles: DocArticle[];
  aiShortcuts: AIShortcut[];
  keyboardShortcuts: KeyboardShortcut[];
}
