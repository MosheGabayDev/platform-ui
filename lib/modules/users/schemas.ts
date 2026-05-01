/**
 * @module lib/modules/users/schemas
 * Zod validation schemas for user create/edit forms.
 * Rules mirror Flask user_api_routes.py server-side validation so errors are
 * caught client-side before the request is sent.
 *
 * Do NOT import React or UI libraries here.
 */

import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "שם משתמש חייב להיות לפחות 3 תווים")
    .max(50, "שם משתמש ארוך מדי"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z
    .string()
    .min(8, "סיסמה חייבת להיות לפחות 8 תווים")
    .max(128, "סיסמה ארוכה מדי"),
  first_name: z.string().max(100, "שם פרטי ארוך מדי").optional(),
  last_name: z.string().max(100, "שם משפחה ארוך מדי").optional(),
  role_id: z.number().int().positive().nullable().optional(),
  is_admin: z.boolean(),
  is_manager: z.boolean(),
});

export const editUserSchema = z.object({
  username: z.string().min(3, "שם משתמש חייב להיות לפחות 3 תווים").max(50, "שם משתמש ארוך מדי"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500, "ביוגרפיה ארוכה מדי").optional(),
  phone: z.string().max(20).optional(),
  job_title: z.string().max(100).optional(),
  preferred_language: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
  email_notifications: z.boolean(),
  security_alerts: z.boolean(),
  system_updates: z.boolean(),
  role_id: z.number().int().positive().nullable().optional(),
  is_admin: z.boolean(),
  is_manager: z.boolean(),
  is_active: z.boolean(),
  is_approved: z.boolean(),
  mfa_enabled: z.boolean(),
  mfa_exempt: z.boolean(),
  email_confirmed: z.boolean(),
  is_system_admin: z.boolean(),
  auto_approve_commands: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
