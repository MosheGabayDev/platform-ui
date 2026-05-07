/**
 * @module lib/modules/signup/schemas
 * Zod validation for the public self-service signup form.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.07.
 *
 * Mirrors the create-org + create-admin-user shape Flask backend will
 * receive at POST /api/proxy/signup once 6.07 BE work lands. Slug is
 * derived server-side from org_name to avoid an extra public field.
 */

import { z } from "zod";

export const signupSchema = z.object({
  org_name: z.string().min(2, "errors.orgNameTooShort"),
  email: z.string().email("errors.emailInvalid"),
  password: z.string().min(8, "errors.passwordTooShort"),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
