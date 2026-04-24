/**
 * @module components/shared/form/types
 * Shared types for PlatformForm foundation components.
 */

import type { ReactNode } from "react";

export interface PlatformFormProps {
  /** Form submit handler (wraps native onSubmit). */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
  /** Set to true while the form is being submitted (disables interactions). */
  isSubmitting?: boolean;
  /** aria-label for the form element (accessibility). */
  ariaLabel?: string;
}

export interface FormErrorProps {
  /** Backend or validation error string. Renders nothing when falsy. */
  error: string | null | undefined;
}

export interface FormActionsProps {
  /** Submit button label. Defaults to "שמור". */
  submitLabel?: string;
  /** Cancel button label. Defaults to "ביטול". */
  cancelLabel?: string;
  /** Called when cancel is clicked. Renders cancel button only when provided. */
  onCancel?: () => void;
  /** Mirrors isSubmitting from the form to disable buttons. */
  isSubmitting?: boolean;
  /** Disables the submit button (e.g., form is pristine). */
  disabled?: boolean;
}
