/**
 * @module lib/modules/roles/schemas
 * Zod validation schemas for role create/edit forms.
 * Mirrors backend validation in apps/authentication/role_api_routes.py.
 *
 * Do NOT import React or UI libraries here.
 */

import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "שם תפקיד חייב להיות לפחות 2 תווים")
    .max(64, "שם תפקיד ארוך מדי"),
  description: z.string().max(255, "תיאור ארוך מדי").optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
});

export const editRoleSchema = z.object({
  name: z
    .string()
    .min(2, "שם תפקיד חייב להיות לפחות 2 תווים")
    .max(64, "שם תפקיד ארוך מדי"),
  description: z.string().max(255, "תיאור ארוך מדי").optional(),
  permission_ids: z.array(z.number().int().positive()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type EditRoleInput = z.infer<typeof editRoleSchema>;
