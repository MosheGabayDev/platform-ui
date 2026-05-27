"use client";
/**
 * @module app/(dashboard)/billing-automation/admin/password-policy
 * Password policy editor — admin only. Affects all new passwords + every login validation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPasswordPolicy, updatePasswordPolicy, type PasswordPolicy } from "@/lib/api/billing-automation";

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:border-primary/30">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <div>
        <div className="font-medium text-sm">{label}</div>
        {help && <div className="text-xs text-muted-foreground">{help}</div>}
      </div>
    </label>
  );
}

export default function PasswordPolicyPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "password-policy"],
    queryFn: fetchPasswordPolicy,
  });
  const [draft, setDraft] = useState<PasswordPolicy | null>(null);

  useEffect(() => { if (data) setDraft(data); }, [data]);

  const save = useMutation({
    mutationFn: (vars: Partial<PasswordPolicy>) => updatePasswordPolicy(vars),
    onSuccess: () => {
      toast.success("מדיניות הסיסמאות עודכנה");
      qc.invalidateQueries({ queryKey: ["billing-automation", "password-policy"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !draft) {
    return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-96" /></div>;
  }

  const set = <K extends keyof PasswordPolicy>(k: K, v: PasswordPolicy[K]) => setDraft({ ...draft, [k]: v });
  const dirty = data && JSON.stringify(draft) !== JSON.stringify(data);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">מדיניות סיסמאות</h1>
        <p className="text-sm text-muted-foreground mt-1">
          חוקי מינימום לסיסמאות חדשות. כל יצירת/שינוי סיסמה תיבדק מול הכללים האלה.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">דרישות מבנה</CardTitle>
          <CardDescription>הרכב מינימלי של תווים בסיסמה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="min_length">אורך מינימלי (8–128)</Label>
            <Input
              id="min_length"
              type="number"
              min={8}
              max={128}
              value={draft.min_length}
              onChange={(e) => set("min_length", parseInt(e.target.value || "12", 10))}
              className="max-w-[140px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Toggle checked={draft.require_uppercase} onChange={(v) => set("require_uppercase", v)} label="אות גדולה (A–Z)" help="חייבת לכלול לפחות אחת" />
            <Toggle checked={draft.require_lowercase} onChange={(v) => set("require_lowercase", v)} label="אות קטנה (a–z)" help="חייבת לכלול לפחות אחת" />
            <Toggle checked={draft.require_digit} onChange={(v) => set("require_digit", v)} label="ספרה (0–9)" help="חייבת לכלול לפחות אחת" />
            <Toggle checked={draft.require_special} onChange={(v) => set("require_special", v)} label="תו מיוחד (!@#…)" help="חייבת לכלול לפחות אחד" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ניהול חשבון</CardTitle>
          <CardDescription>תוקף סיסמה ונעילת חשבון אחרי כשלי כניסה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="max_age_days">תוקף סיסמה (ימים — 0 = ללא הגבלה)</Label>
            <Input id="max_age_days" type="number" min={0} value={draft.max_age_days}
              onChange={(e) => set("max_age_days", parseInt(e.target.value || "0", 10))} className="max-w-[140px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_failed_attempts">מספר כשלי כניסה לפני נעילה</Label>
              <Input id="max_failed_attempts" type="number" min={1} value={draft.max_failed_attempts}
                onChange={(e) => set("max_failed_attempts", parseInt(e.target.value || "5", 10))} className="max-w-[140px]" />
            </div>
            <div>
              <Label htmlFor="lockout_minutes">זמן נעילה (דקות)</Label>
              <Input id="lockout_minutes" type="number" min={1} value={draft.lockout_minutes}
                onChange={(e) => set("lockout_minutes", parseInt(e.target.value || "15", 10))} className="max-w-[140px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => save.mutate(draft)} disabled={!dirty || save.isPending}>
          <Save className="h-4 w-4 ml-2" />
          {save.isPending ? "שומר…" : "שמור שינויים"}
        </Button>
        {data && <Button variant="ghost" onClick={() => setDraft(data)} disabled={!dirty}>בטל</Button>}
      </div>
    </div>
  );
}
