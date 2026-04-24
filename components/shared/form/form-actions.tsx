/**
 * @module components/shared/form/form-actions
 * Submit + Cancel button row for PlatformForm.
 * Handles loading spinner and disabled state during mutation.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormActionsProps } from "./types";

export function FormActions({
  submitLabel = "שמור",
  cancelLabel = "ביטול",
  onCancel,
  isSubmitting = false,
  disabled = false,
}: FormActionsProps) {
  return (
    <div className="flex items-center gap-3 justify-end pt-2 border-t border-border/50">
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        size="sm"
        disabled={disabled || isSubmitting}
        className={cn(isSubmitting && "cursor-not-allowed opacity-80")}
      >
        {isSubmitting && (
          <span
            aria-hidden
            className="size-3 rounded-full border-2 border-primary-foreground/60 border-t-transparent animate-spin me-2"
          />
        )}
        {submitLabel}
      </Button>
    </div>
  );
}
