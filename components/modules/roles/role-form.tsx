"use client";
/**
 * @module components/modules/roles/role-form
 * Create and Edit role Sheet forms.
 *
 * Exports:
 *   RoleCreateSheet — Sheet for creating a new global role (system_admin only)
 *   RoleEditSheet   — Sheet for editing role name/description (system_admin only)
 *   RolePermissionsSheet — Sheet for replacing a role's full permission set (system_admin only)
 *
 * Pattern: PlatformForm + React Hook Form + Zod + usePlatformMutation
 */

import { useEffect, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { PlatformForm, FormError, FormActions } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { createRole, updateRole, setRolePermissions, fetchAllPermissions } from "@/lib/api/roles";
import { createRoleSchema, editRoleSchema } from "@/lib/modules/roles/schemas";
import { groupPermissions } from "@/lib/modules/roles/types";
import { queryKeys } from "@/lib/api/query-keys";
import type { CreateRoleInput, EditRoleInput } from "@/lib/modules/roles/schemas";
import type { RoleDetail } from "@/lib/modules/roles/types";

// ─── Shared field components ─────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

/** Grouped permission checklist — fetches all available permissions. */
function PermissionChecklist({
  selected,
  onChange,
  disabled,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: fetchAllPermissions,
    staleTime: 10 * 60_000,
  });

  const grouped = useMemo(
    () => groupPermissions(data?.data?.permissions ?? []),
    [data],
  );

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">טוען הרשאות...</p>;
  }

  const toggle = (id: number) => {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  };

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
      {Array.from(grouped.entries()).map(([ns, perms]) => (
        <div key={ns}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            {ns}
          </p>
          <div className="space-y-1">
            {perms.map((p) => (
              <label
                key={p.id}
                className="flex items-start gap-2.5 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  disabled={disabled}
                  className="mt-0.5 size-4 rounded border-border accent-primary"
                />
                <div className="leading-none min-w-0">
                  <span className="text-xs font-mono text-foreground">{p.name}</span>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Create Sheet ─────────────────────────────────────────────────────────────

export interface RoleCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (role: RoleDetail) => void;
}

export function RoleCreateSheet({ open, onOpenChange, onSuccess }: RoleCreateSheetProps) {
  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      permission_ids: [],
    },
  });

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: createRole,
    invalidateKeys: [queryKeys.roles.all()],
    onSuccess: (data) => {
      toast.success(`תפקיד "${data.data.role.name}" נוצר בהצלחה`);
      onSuccess?.(data.data.role);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      reset();
    }
  }, [open, reset]); // form.reset stable (RHF)

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      ...values,
      description: values.description || undefined,
    });
  });

  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>יצירת תפקיד חדש</SheetTitle>
          <SheetDescription>תפקידים הם גלובליים ומשותפים לכל הארגונים</SheetDescription>
        </SheetHeader>

        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel="טופס יצירת תפקיד">
          <FormError error={serverError} />

          <FieldRow>
            <Label htmlFor="role_name">
              שם תפקיד <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role_name"
              {...form.register("name")}
              disabled={isPending}
              placeholder='לדוגמה: "טכנאי בכיר"'
            />
            <FieldError message={errors.name?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="role_description">תיאור</Label>
            <Input
              id="role_description"
              {...form.register("description")}
              disabled={isPending}
              placeholder="תיאור קצר של התפקיד (אופציונלי)"
            />
            <FieldError message={errors.description?.message} />
          </FieldRow>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">הרשאות</Label>
            <PermissionChecklist
              selected={form.watch("permission_ids") ?? []}
              onChange={(ids) => form.setValue("permission_ids", ids)}
              disabled={isPending}
            />
          </div>

          <FormActions
            submitLabel="צור תפקיד"
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

export interface RoleEditSheetProps {
  role: RoleDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (role: RoleDetail) => void;
}

export function RoleEditSheet({ role, open, onOpenChange, onSuccess }: RoleEditSheetProps) {
  const form = useForm<EditRoleInput>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: buildEditDefaults(role),
  });

  useEffect(() => {
    if (role) form.reset(buildEditDefaults(role));
  }, [role, form]);

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: (values: EditRoleInput) =>
      updateRole(role!.id, { name: values.name, description: values.description }),
    invalidateKeys: role
      ? [queryKeys.roles.detail(role.id), queryKeys.roles.all()]
      : [],
    onSuccess: (data) => {
      toast.success("פרטי התפקיד עודכנו");
      onSuccess?.(data.data.role);
      onOpenChange(false);
    },
  });

  // Separate mutation for permissions (full replace)
  const { mutateAsync: savePerms, isPending: savingPerms, serverError: permsError } =
    usePlatformMutation({
      mutationFn: (ids: number[]) => setRolePermissions(role!.id, ids),
      invalidateKeys: role
        ? [queryKeys.roles.detail(role.id), queryKeys.roles.all()]
        : [],
      onSuccess: (data) => {
        toast.success("הרשאות התפקיד עודכנו");
        onSuccess?.(data.data.role);
      },
    });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values);
    // If permissions changed, save them in parallel (after meta update)
    const currentIds = (role?.permissions ?? []).map((p) => p.id).sort().join(",");
    const newIds = [...(values.permission_ids ?? [])].sort().join(",");
    if (currentIds !== newIds) {
      await savePerms(values.permission_ids ?? []);
    }
  });

  const { errors } = form.formState;
  const busy = isPending || savingPerms;
  const combinedError = serverError ?? permsError;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>עריכת תפקיד</SheetTitle>
          {role && <SheetDescription>{role.name}</SheetDescription>}
        </SheetHeader>

        <PlatformForm onSubmit={handleSubmit} isSubmitting={busy} ariaLabel="טופס עריכת תפקיד">
          <FormError error={combinedError} />

          <FieldRow>
            <Label htmlFor="edit_role_name">
              שם תפקיד <span className="text-destructive">*</span>
            </Label>
            <Input id="edit_role_name" {...form.register("name")} disabled={busy} />
            <FieldError message={errors.name?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="edit_role_description">תיאור</Label>
            <Input id="edit_role_description" {...form.register("description")} disabled={busy} />
            <FieldError message={errors.description?.message} />
          </FieldRow>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">הרשאות</Label>
            <PermissionChecklist
              selected={form.watch("permission_ids") ?? []}
              onChange={(ids) => form.setValue("permission_ids", ids)}
              disabled={busy}
            />
          </div>

          <FormActions
            submitLabel="שמור שינויים"
            onCancel={() => onOpenChange(false)}
            isSubmitting={busy}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEditDefaults(role: RoleDetail | null): EditRoleInput {
  return {
    name: role?.name ?? "",
    description: role?.description ?? "",
    permission_ids: role?.permissions?.map((p) => p.id) ?? [],
  };
}
