"use client";
/**
 * @module components/modules/organizations/organization-form
 * Create and Edit organization Sheet forms. System admin only.
 *
 * Exports:
 *   OrgCreateSheet — Sheet for creating a new organization (system_admin only)
 *   OrgEditSheet   — Sheet for editing org name/description/status (system_admin only)
 *
 * Security: org_id is NEVER passed as a form field — the backend derives it from context.
 * Slug is immutable after creation — the edit form shows it read-only.
 * Pattern: PlatformForm + React Hook Form + Zod + usePlatformMutation
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { createOrg, updateOrg } from "@/lib/api/organizations";
import { createOrgSchema, editOrgSchema } from "@/lib/modules/organizations/schemas";
import { queryKeys } from "@/lib/api/query-keys";
import type { CreateOrgInput, EditOrgInput } from "@/lib/modules/organizations/schemas";
import type { OrgSummary } from "@/lib/modules/organizations/types";

// ─── Shared field components ─────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function ActiveToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("organizations.form.fields");
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-border accent-primary"
      />
      <div className="leading-none">
        <span className="text-sm font-medium">{t("isActive")}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{t("isActiveDescription")}</p>
      </div>
    </label>
  );
}

/** Derives a URL-safe slug from a display name. */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// ─── Create Sheet ─────────────────────────────────────────────────────────────

export interface OrgCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: number) => void;
}

export function OrgCreateSheet({ open, onOpenChange, onSuccess }: OrgCreateSheetProps) {
  const t = useTranslations("organizations.form");
  const tFields = useTranslations("organizations.form.fields");
  const router = useRouter();

  const form = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
    },
  });

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: createOrg,
    invalidateKeys: [queryKeys.orgs.all(), queryKeys.orgs.stats()],
    onSuccess: (data) => {
      const { id, name } = data.data.org;
      toast.success(t("create.toast", { name }));
      onSuccess?.(id);
      onOpenChange(false);
      router.push(`/organizations/${id}`);
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      reset();
    }
  }, [open, reset]); // form.reset is stable (RHF); reset is now stable via useCallback

  // Auto-generate slug from name (only when slug hasn't been manually changed)
  const watchedName = form.watch("name");
  const watchedSlug = form.watch("slug");
  useEffect(() => {
    const derived = nameToSlug(watchedName);
    // Only auto-fill if slug still matches what we'd auto-generate, or is empty
    if (!watchedSlug || watchedSlug === nameToSlug(watchedName.slice(0, -1))) {
      form.setValue("slug", derived, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName]);

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      ...values,
      description: values.description || undefined,
    });
  });

  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{t("create.title")}</SheetTitle>
          <SheetDescription>{t("create.description")}</SheetDescription>
        </SheetHeader>

        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel={t("create.aria")}>
          <FormError error={serverError} />

          <FieldRow>
            <Label htmlFor="org_name">
              {tFields("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org_name"
              {...form.register("name")}
              disabled={isPending}
              placeholder={tFields("namePlaceholder")}
              dir="rtl"
            />
            <FieldError message={errors.name?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="org_slug">
              {tFields("slug")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org_slug"
              {...form.register("slug")}
              disabled={isPending}
              placeholder={tFields("slugPlaceholder")}
              dir="ltr"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{tFields("slugHelp")}</p>
            <FieldError message={errors.slug?.message} />
          </FieldRow>

          <FieldRow>
            <Label htmlFor="org_description">{tFields("description")}</Label>
            <Input
              id="org_description"
              {...form.register("description")}
              disabled={isPending}
              placeholder={tFields("descriptionPlaceholder")}
              dir="rtl"
            />
            <FieldError message={errors.description?.message} />
          </FieldRow>

          <ActiveToggle
            checked={form.watch("is_active")}
            onChange={(v) => form.setValue("is_active", v)}
            disabled={isPending}
          />

          <FormActions
            submitLabel={t("create.cta")}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

export interface OrgEditSheetProps {
  org: OrgSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (org: OrgSummary) => void;
}

export function OrgEditSheet({ org, open, onOpenChange, onSuccess }: OrgEditSheetProps) {
  const t = useTranslations("organizations.form");
  const tFields = useTranslations("organizations.form.fields");
  const form = useForm<EditOrgInput>({
    resolver: zodResolver(editOrgSchema),
    defaultValues: buildEditDefaults(org),
  });

  useEffect(() => {
    if (org) form.reset(buildEditDefaults(org));
  }, [org, form]);

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
    mutationFn: (values: EditOrgInput) => updateOrg(org!.id, values),
    invalidateKeys: org
      ? [queryKeys.orgs.detail(org.id), queryKeys.orgs.all(), queryKeys.orgs.stats()]
      : [],
    onSuccess: (data) => {
      toast.success(t("edit.toast"));
      onSuccess?.(data.data.org);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      ...values,
      description: values.description || undefined,
    });
  });

  const { errors } = form.formState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{t("edit.title")}</SheetTitle>
          {org && (
            <SheetDescription>
              {org.name}
              {" · "}
              <span className="font-mono text-xs">{org.slug}</span>
            </SheetDescription>
          )}
        </SheetHeader>

        <PlatformForm onSubmit={onSubmit} isSubmitting={isPending} ariaLabel={t("edit.aria")}>
          <FormError error={serverError} />

          <FieldRow>
            <Label htmlFor="edit_org_name">
              {tFields("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit_org_name"
              {...form.register("name")}
              disabled={isPending}
              dir="rtl"
            />
            <FieldError message={errors.name?.message} />
          </FieldRow>

          {/* Slug is immutable — shown read-only for transparency */}
          {org && (
            <FieldRow>
              <Label className="text-muted-foreground">{tFields("slugReadonly")}</Label>
              <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                {org.slug}
              </div>
            </FieldRow>
          )}

          <FieldRow>
            <Label htmlFor="edit_org_description">{tFields("description")}</Label>
            <Input
              id="edit_org_description"
              {...form.register("description")}
              disabled={isPending}
              dir="rtl"
            />
            <FieldError message={errors.description?.message} />
          </FieldRow>

          <ActiveToggle
            checked={form.watch("is_active")}
            onChange={(v) => form.setValue("is_active", v)}
            disabled={isPending}
          />

          <FormActions
            submitLabel={t("edit.cta")}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isPending}
          />
        </PlatformForm>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEditDefaults(org: OrgSummary | null): EditOrgInput {
  return {
    name: org?.name ?? "",
    description: org?.description ?? "",
    is_active: org?.is_active ?? true,
  };
}
