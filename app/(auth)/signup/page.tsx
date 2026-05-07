"use client";
/**
 * @module app/(auth)/signup/page
 * Public self-service signup page.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.07.
 *
 * Mock-mode shell — backend wiring deferred to BE work + 6.08 email
 * verification. Form is fully validated client-side via Zod and uses
 * the platform's standard PlatformForm + usePlatformMutation primitives.
 *
 * Sits in (auth) route group so middleware does not gate it.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformForm, FormError } from "@/components/shared/form";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { submitSignup, MOCK_MODE } from "@/lib/api/signup";
import { signupSchema, type SignupInput } from "@/lib/modules/signup/schemas";

function FieldError({ messageKey, t }: { messageKey?: string; t: (k: string) => string }) {
  if (!messageKey) return null;
  // Zod schema stores translation keys (e.g. "errors.orgNameTooShort") so
  // copy can be localized without touching the schema.
  const text = messageKey.startsWith("errors.") ? t(messageKey) : messageKey;
  return <p className="text-xs text-destructive mt-1">{text}</p>;
}

function SignupForm() {
  const t = useTranslations("signup");
  const tFields = useTranslations("signup.fields");
  const tPlace = useTranslations("signup.placeholders");
  const [done, setDone] = useState<{ email: string } | null>(null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      org_name: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
    },
  });

  const { mutateAsync, isPending, serverError } = usePlatformMutation({
    mutationFn: submitSignup,
    onSuccess: (_data, variables) => {
      setDone({ email: variables.email });
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values);
  });

  const { errors } = form.formState;

  if (done) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <CheckCircle2 className="size-12 text-emerald-500 mx-auto" aria-hidden />
          <h2 className="text-lg font-semibold">{t("success.title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("success.message")}</p>
          <p className="text-xs text-muted-foreground/70 font-mono pt-1">{done.email}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("tagline")}</CardDescription>
      </CardHeader>
      <CardContent>
        {MOCK_MODE && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {t("backendNotice")}
          </div>
        )}

        <PlatformForm
          onSubmit={onSubmit}
          isSubmitting={isPending}
          ariaLabel={t("title")}
          className="space-y-4"
        >
          <FormError error={serverError ? t("errors.generic") : null} />

          <div className="space-y-1.5">
            <Label htmlFor="org_name">
              {tFields("orgName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org_name"
              {...form.register("org_name")}
              disabled={isPending}
              placeholder={tPlace("orgName")}
            />
            <FieldError messageKey={errors.org_name?.message} t={t} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{tFields("firstName")}</Label>
              <Input id="first_name" {...form.register("first_name")} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{tFields("lastName")}</Label>
              <Input id="last_name" {...form.register("last_name")} disabled={isPending} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              {tFields("email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              {...form.register("email")}
              disabled={isPending}
              placeholder={tPlace("email")}
            />
            <FieldError messageKey={errors.email?.message} t={t} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {tFields("password")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
              disabled={isPending}
            />
            <FieldError messageKey={errors.password?.message} t={t} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin me-2" />}
            {isPending ? t("submitting") : t("cta")}
          </Button>

          <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center">
            {t.rich("legal", {
              terms: (chunks) => (
                <Link href="/legal/terms" className="text-primary hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/legal/privacy" className="text-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </PlatformForm>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  const t = useTranslations("signup");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto">
            PE
          </div>
          <h1 className="text-2xl font-bold">Platform Engineer</h1>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
