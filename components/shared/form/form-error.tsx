/**
 * @module components/shared/form/form-error
 * Displays a backend or server-side validation error inside a form.
 * For field-level errors, use react-hook-form's fieldState.error instead.
 */

import { AlertCircle } from "lucide-react";
import type { FormErrorProps } from "./types";

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 flex items-center gap-2"
    >
      <AlertCircle className="size-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive">{error}</span>
    </div>
  );
}
