/**
 * @module components/shared/form/platform-form
 * Standard form shell for all module create/edit forms.
 * Designed for use with React Hook Form — pass RHF's handleSubmit as onSubmit.
 *
 * Security note: org_id must NEVER appear as a form field. Inject from session
 * inside the mutation function, not from form state.
 */

import { cn } from "@/lib/utils";
import type { PlatformFormProps } from "./types";

export function PlatformForm({
  onSubmit,
  children,
  className,
  isSubmitting = false,
  ariaLabel,
}: PlatformFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isSubmitting}
      aria-label={ariaLabel}
      className={cn("space-y-4", className)}
    >
      {children}
    </form>
  );
}
