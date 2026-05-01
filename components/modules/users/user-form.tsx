"use client";
/**
 * @module components/modules/users/user-form
 * Create and Edit user Sheet forms.
 *
 * Exports:
 *   UserCreateSheet — Sheet for creating a new user (admin only)
 *   UserEditSheet   — Sheet for editing an existing user (admin, or own profile for name)
 *
 * Auth: org_id is injected server-side by the Flask proxy from the JWT claim.
 *       It is NEVER passed as a form field or prop.
 * Pattern: PlatformForm + React Hook Form + Zod + usePlatformMutation
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PlatformForm, FormError, FormActions } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { createUser, updateUser, fetchRoles } from "@/lib/api/users";
import { createUserSchema, editUserSchema } from "@/lib/modules/users/schemas";
import { queryKeys } from "@/lib/api/query-keys";
import type { CreateUserInput, EditUserInput } from "@/lib/modules/users/schemas";
import type { UserDetail } from "@/lib/modules/users/types";

// ─── Shared field components ─────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FormSection({ title, children, variant = "default" }: {
  title: string;
  children: React.ReactNode;
  variant?: "default" | "warning";
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          variant === "warning"
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground"
        }`}>
          {title}
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function CheckRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-border accent-primary"
      />
      <div className="leading-none">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const { data } = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: fetchRoles,
    staleTime: 5 * 60_000,
  });

  const roles = data?.data?.roles ?? [];

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
    >
      <option value="">ללא תפקיד</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

// ─── Create Sheet ─────────────────────────────────────────────────────────────

export interface UserCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: UserDetail) => void;
}

export function UserCreateSheet({ open, onOpenChange, onSuccess }: UserCreateSheetProps) {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role_id: null,
      is_admin: false,
      is_manager: false,
    },
  });

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: createUser,
    invalidateKeys: [queryKeys.users.all(), queryKeys.users.stats()],
    onSuccess: (data) => {
      toast.success(`משתמש "${data.data.user.username}" נוצר בהצלחה`);
      onSuccess?.(data.data.user);
      onOpenChange(false);
    },
  });

  // Reset form + mutation state when sheet closes
  useEffect(() => {
    if (!open) {
      form.reset();
      reset();
    }
  }, [open, reset]); // form.reset stable (RHF)

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      ...values,
      first_name: values.first_name || undefined,
      last_name: values.last_name || undefined,
    });
  });

  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-6 pt-6 pb-6">
        <SheetHeader className="mb-4 px-0 pt-0">
          <SheetTitle>הוספת משתמש חדש</SheetTitle>
          <SheetDescription>
            המשתמש יווצר עם סיסמה ויהיה פעיל ומאושר מיד
          </SheetDescription>
        </SheetHeader>

        <PlatformForm
          onSubmit={onSubmit}
          isSubmitting={isPending}
          ariaLabel="טופס יצירת משתמש"
        >
          <FormError error={serverError} />

          <div className="grid grid-cols-2 gap-3">
            <FieldRow>
              <Label htmlFor="first_name">שם פרטי</Label>
              <Input id="first_name" {...form.register("first_name")} disabled={isPending} />
              <FieldError message={errors.first_name?.message} />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="last_name">שם משפחה</Label>
              <Input id="last_name" {...form.register("last_name")} disabled={isPending} />
              <FieldError message={errors.last_name?.message} />
            </FieldRow>
          </div>

          <FieldRow>
            <Label htmlFor="username">
              שם משתמש <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              autoComplete="username"
              {...form.register("username")}
              disabled={isPending}
            />
            <FieldError message={errors.username?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="email">
              אימייל <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              disabled={isPending}
            />
            <FieldError message={errors.email?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="password">
              סיסמה <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
              disabled={isPending}
            />
            <FieldError message={errors.password?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="role_id">תפקיד</Label>
            <RoleSelect
              value={form.watch("role_id")}
              onChange={(v) => form.setValue("role_id", v, { shouldValidate: true })}
              disabled={isPending}
            />
          </FieldRow>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">הרשאות</Label>
            <CheckRow
              id="is_admin"
              label="אדמין"
              description="גישה לכל האזורים וניהול משתמשים"
              checked={form.watch("is_admin")}
              onChange={(v) => form.setValue("is_admin", v)}
              disabled={isPending}
            />
            <CheckRow
              id="is_manager"
              label="מנהל"
              description="אישור כרטיסים ופיקוח על צוות"
              checked={form.watch("is_manager")}
              onChange={(v) => form.setValue("is_manager", v)}
              disabled={isPending}
            />
          </div>

          <FormActions
            submitLabel="צור משתמש"
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

export interface UserEditSheetProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the viewer is an admin (shows extra fields). */
  isAdmin?: boolean;
  /** Whether the viewer is editing their own profile (restricts some fields). */
  isSelf?: boolean;
  /** Whether the viewer is a system admin (shows system-admin-only fields). */
  isSystemAdmin?: boolean;
  onSuccess?: (user: UserDetail) => void;
}

export function UserEditSheet({
  user,
  open,
  onOpenChange,
  isAdmin = false,
  isSelf = false,
  isSystemAdmin = false,
  onSuccess,
}: UserEditSheetProps) {
  const form = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
    defaultValues: buildEditDefaults(user),
  });

  // Re-populate when `user` changes (e.g. navigating between users)
  useEffect(() => {
    if (user) form.reset(buildEditDefaults(user));
  }, [user, form]);

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: (values: EditUserInput) => updateUser(user!.id, values),
    invalidateKeys: user
      ? [queryKeys.users.detail(user.id), queryKeys.users.all(), queryKeys.users.stats()]
      : [],
    onSuccess: (data) => {
      toast.success("פרטי המשתמש עודכנו");
      onSuccess?.(data.data.user);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      ...values,
      first_name: values.first_name || undefined,
      last_name: values.last_name || undefined,
    });
  });

  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto px-6 pt-6 pb-6">
        <SheetHeader className="mb-4 px-0 pt-0">
          <SheetTitle>עריכת משתמש</SheetTitle>
          {user && (
            <SheetDescription>
              {user.name} · {user.email}
            </SheetDescription>
          )}
        </SheetHeader>

        <PlatformForm
          onSubmit={onSubmit}
          isSubmitting={isPending}
          ariaLabel="טופס עריכת משתמש"
        >
          <FormError error={serverError} />

          <FormSection title="פרופיל">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow>
                <Label htmlFor="edit_first_name">שם פרטי</Label>
                <Input id="edit_first_name" {...form.register("first_name")} disabled={isPending} />
                <FieldError message={errors.first_name?.message} />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="edit_last_name">שם משפחה</Label>
                <Input id="edit_last_name" {...form.register("last_name")} disabled={isPending} />
                <FieldError message={errors.last_name?.message} />
              </FieldRow>
            </div>
            <FieldRow>
              <Label htmlFor="edit_display_name">שם תצוגה</Label>
              <Input id="edit_display_name" {...form.register("display_name")} disabled={isPending} />
              <FieldError message={errors.display_name?.message} />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="edit_phone">טלפון</Label>
              <Input id="edit_phone" type="tel" dir="ltr" {...form.register("phone")} disabled={isPending} />
              <FieldError message={errors.phone?.message} />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="edit_bio">ביוגרפיה</Label>
              <Textarea id="edit_bio" rows={3} {...form.register("bio")} disabled={isPending} className="resize-none" />
              <FieldError message={errors.bio?.message} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow>
                <Label htmlFor="edit_language">שפה מועדפת</Label>
                <Input id="edit_language" placeholder="he / en" dir="ltr" {...form.register("preferred_language")} disabled={isPending} />
                <FieldError message={errors.preferred_language?.message} />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="edit_timezone">אזור זמן</Label>
                <Input id="edit_timezone" placeholder="Asia/Jerusalem" dir="ltr" {...form.register("timezone")} disabled={isPending} />
                <FieldError message={errors.timezone?.message} />
              </FieldRow>
            </div>
          </FormSection>

          <FormSection title="התראות">
            <CheckRow id="edit_email_notifications" label="התראות במייל" checked={form.watch("email_notifications")} onChange={(v) => form.setValue("email_notifications", v)} disabled={isPending} />
            <CheckRow id="edit_security_alerts" label="התראות אבטחה" checked={form.watch("security_alerts")} onChange={(v) => form.setValue("security_alerts", v)} disabled={isPending} />
            <CheckRow id="edit_system_updates" label="עדכוני מערכת" checked={form.watch("system_updates")} onChange={(v) => form.setValue("system_updates", v)} disabled={isPending} />
          </FormSection>

          {isAdmin && (
            <>
              <FormSection title="חשבון">
                <FieldRow>
                  <Label htmlFor="edit_username">שם משתמש</Label>
                  <Input id="edit_username" dir="ltr" {...form.register("username")} disabled={isPending} />
                  <FieldError message={errors.username?.message} />
                </FieldRow>
                <FieldRow>
                  <Label htmlFor="edit_email">אימייל</Label>
                  <Input id="edit_email" type="email" dir="ltr" {...form.register("email")} disabled={isPending} />
                  <FieldError message={errors.email?.message} />
                </FieldRow>
                <FieldRow>
                  <Label htmlFor="edit_job_title">כותרת תפקיד</Label>
                  <Input id="edit_job_title" {...form.register("job_title")} disabled={isPending} />
                  <FieldError message={errors.job_title?.message} />
                </FieldRow>
                <FieldRow>
                  <Label htmlFor="edit_role_id">תפקיד</Label>
                  <RoleSelect
                    value={form.watch("role_id")}
                    onChange={(v) => form.setValue("role_id", v, { shouldValidate: true })}
                    disabled={isPending}
                  />
                </FieldRow>
              </FormSection>

              <FormSection title="הרשאות">
                {!isSelf && (
                  <CheckRow id="edit_is_admin" label="אדמין" description="גישה לכל האזורים וניהול משתמשים" checked={form.watch("is_admin")} onChange={(v) => form.setValue("is_admin", v)} disabled={isPending} />
                )}
                <CheckRow id="edit_is_manager" label="מנהל" description="אישור כרטיסים ופיקוח על צוות" checked={form.watch("is_manager")} onChange={(v) => form.setValue("is_manager", v)} disabled={isPending} />
                {!isSelf && (
                  <CheckRow id="edit_is_active" label="חשבון פעיל" description="ביטול הסימון יחסום כניסה לחשבון" checked={form.watch("is_active")} onChange={(v) => form.setValue("is_active", v)} disabled={isPending} />
                )}
                {!isSelf && (
                  <CheckRow id="edit_is_approved" label="מאושר" description="משתמש שלא אושר לא יכול להיכנס למערכת" checked={form.watch("is_approved")} onChange={(v) => form.setValue("is_approved", v)} disabled={isPending} />
                )}
              </FormSection>

              <FormSection title="אבטחה">
                <CheckRow id="edit_mfa_enabled" label="MFA מופעל" description="אימות דו-שלבי — ניתן לאפס/להפעיל ידנית" checked={form.watch("mfa_enabled")} onChange={(v) => form.setValue("mfa_enabled", v)} disabled={isPending} />
                <CheckRow id="edit_mfa_exempt" label="פטור מ-MFA" description="המשתמש לא יידרש לאמות ב-MFA גם אם מופעל ברמת ארגון" checked={form.watch("mfa_exempt")} onChange={(v) => form.setValue("mfa_exempt", v)} disabled={isPending} />
                <CheckRow id="edit_email_confirmed" label="אימייל אומת" description="סימון ידני — מאשר את כתובת האימייל ללא שליחת מייל" checked={form.watch("email_confirmed")} onChange={(v) => form.setValue("email_confirmed", v)} disabled={isPending} />
              </FormSection>
            </>
          )}

          {isSystemAdmin && !isSelf && (
            <FormSection title="מנהל מערכת בלבד" variant="warning">
              <CheckRow id="edit_is_system_admin" label="מנהל מערכת" description="גישה לכל הארגונים ויכולת לנהל מנהלים" checked={form.watch("is_system_admin")} onChange={(v) => form.setValue("is_system_admin", v)} disabled={isPending} />
              <CheckRow id="edit_auto_approve_commands" label="אישור אוטומטי פקודות" description="הפקודות של משתמש זה יאושרו אוטומטית ללא בקרת אדמין — פעולה רגישה" checked={form.watch("auto_approve_commands")} onChange={(v) => form.setValue("auto_approve_commands", v)} disabled={isPending} />
            </FormSection>
          )}

          <FormActions
            submitLabel="שמור שינויים"
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEditDefaults(user: UserDetail | null): EditUserInput {
  return {
    username: user?.username ?? "",
    email: user?.email ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    display_name: user?.display_name ?? "",
    bio: user?.bio ?? "",
    phone: user?.phone ?? "",
    job_title: user?.job_title ?? "",
    preferred_language: user?.preferred_language ?? "",
    timezone: user?.timezone ?? "",
    email_notifications: user?.email_notifications ?? true,
    security_alerts: user?.security_alerts ?? true,
    system_updates: user?.system_updates ?? true,
    role_id: user?.role_id ?? null,
    is_admin: user?.is_admin ?? false,
    is_manager: user?.is_manager ?? false,
    is_active: user?.is_active ?? true,
    is_approved: user?.is_approved ?? false,
    mfa_enabled: user?.mfa_enabled ?? false,
    mfa_exempt: user?.mfa_exempt ?? false,
    email_confirmed: user?.email_confirmed ?? false,
    is_system_admin: user?.is_system_admin ?? false,
    auto_approve_commands: user?.auto_approve_commands ?? false,
  };
}
