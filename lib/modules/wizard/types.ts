/**
 * @module lib/modules/wizard/types
 * Types for PlatformWizard (cap 15).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-wizard-spec.md
 */
import type { ReactNode } from "react";

export interface WizardStepProps<TState> {
  state: TState;
  update: (patch: Partial<TState>) => void;
  goNext: () => void;
  goBack: () => void;
}

export interface WizardStep<TState> {
  id: string;
  label: string;
  label_he?: string;
  description?: string;
  render: (props: WizardStepProps<TState>) => ReactNode;
  /** Returns null when valid (Next allowed), else an error message. */
  validate?: (state: TState) => string | null;
  optional?: boolean;
  hideWhen?: (state: TState) => boolean;
}

export interface WizardConfig<TState> {
  /** Stable key for localStorage. Pattern: `wizard:<area>:<version>`. */
  storageKey: string;
  steps: WizardStep<TState>[];
  initialState: TState;
  onComplete: (state: TState) => Promise<void> | void;
  onCancel?: () => void;
  /** Display name for the audit log + page title. */
  title: string;
  title_he?: string;
}

export interface PersistedWizardState<TState> {
  state: TState;
  currentIndex: number;
  version: 1;
}
