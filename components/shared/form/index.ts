/**
 * @module components/shared/form
 * Foundation building blocks for module create/edit forms.
 * Built for React Hook Form + Zod — do NOT use with uncontrolled forms.
 *
 * Usage:
 *   import { PlatformForm, FormError, FormActions } from "@/components/shared/form";
 *
 * Security note: org_id must come from session inside the mutation function,
 * never as a visible/hidden form field. See ADR-016 § Org ID rule.
 */

export { PlatformForm } from "./platform-form";
export { FormError } from "./form-error";
export { FormActions } from "./form-actions";
export type {
  PlatformFormProps,
  FormErrorProps,
  FormActionsProps,
} from "./types";
