/**
 * @module lib/modules/organizations/schemas
 * Zod validation schemas for organization create/edit forms.
 * Mirrors backend validation in apps/admin/org_api_routes.py.
 *
 * Do NOT import React or UI libraries here.
 */

import { z } from "zod";

const slugRegex = /^[a-z0-9][a-z0-9\-]{0,48}[a-z0-9]$|^[a-z0-9]$/;

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, "שם ארגון חייב להיות לפחות 2 תווים")
    .max(100, "שם ארגון ארוך מדי"),
  slug: z
    .string()
    .min(1, "Slug הוא שדה חובה")
    .max(50, "Slug ארוך מדי")
    .regex(slugRegex, "Slug מכיל תווים לא חוקיים — אותיות קטנות, מספרים ומקפים בלבד"),
  description: z.string().max(500, "תיאור ארוך מדי").optional(),
  is_active: z.boolean(),
});

export const editOrgSchema = z.object({
  name: z
    .string()
    .min(2, "שם ארגון חייב להיות לפחות 2 תווים")
    .max(100, "שם ארגון ארוך מדי"),
  description: z.string().max(500, "תיאור ארוך מדי").optional(),
  is_active: z.boolean(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type EditOrgInput = z.infer<typeof editOrgSchema>;
