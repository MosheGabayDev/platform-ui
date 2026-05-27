"use client";
/**
 * @module app/(dashboard)/billing-automation/admin/users
 * User management — admin only. Lists users, lets you add/edit/lock/unlock/delete.
 *
 * Only users with bcrypt password hash + role row in meteorit_users may login.
 * Password creation/change validates against the active meteorit_password_policy.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Lock, Unlock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  type AdminUser,
} from "@/lib/api/billing-automation";

function NewUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin" | "system_admin">("user");
  const [violations, setViolations] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () => createAdminUser({ email, full_name: fullName, password, role }),
    onSuccess: () => {
      toast.success("המשתמש נוסף בהצלחה");
      qc.invalidateQueries({ queryKey: ["billing-automation", "users"] });
      onClose();
      setEmail(""); setFullName(""); setPassword(""); setRole("user"); setViolations([]);
    },
    onError: (err: Error & { violations?: string[] }) => {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.violations) { setViolations(parsed.violations); return; }
      } catch { /* fallthrough */ }
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הוספת משתמש</DialogTitle>
          <DialogDescription>
            הסיסמה חייבת לעמוד במדיניות הסיסמאות של הארגון.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="email">אימייל</Label>
            <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="full_name">שם מלא</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">סיסמה</Label>
            <Input id="password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="role">תפקיד</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin" | "system_admin")}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="user">משתמש</option>
              <option value="admin">מנהל</option>
              <option value="system_admin">מנהל מערכת</option>
            </select>
          </div>
          {violations.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <div className="font-semibold mb-1">הסיסמה אינה עומדת בדרישות:</div>
              <ul className="list-disc pr-5 space-y-0.5">
                {violations.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "שומר…" : "הוסף"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "users"],
    queryFn: fetchAdminUsers,
  });
  const [open, setOpen] = useState(false);

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateAdminUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-automation", "users"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      toast.success("המשתמש נמחק");
      qc.invalidateQueries({ queryKey: ["billing-automation", "users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">משתמשים</h1>
          <p className="text-sm text-muted-foreground mt-1">
            רק משתמשים מאומתים ברשימה זו יכולים להיכנס. הסיסמה תיבדק מול מדיניות הסיסמאות.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4 ml-2" />
          הוסף משתמש
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>אימייל</TableHead>
              <TableHead>שם</TableHead>
              <TableHead>תפקיד</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>כניסה אחרונה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5" /></TableCell></TableRow>
            ))}
            {(data ?? []).map((u: AdminUser) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono">{u.email}</TableCell>
                <TableCell>{u.full_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "system_admin" ? "default" : u.role === "admin" ? "secondary" : "outline"}>
                    {u.role === "system_admin" ? "מנהל מערכת" : u.role === "admin" ? "מנהל" : "משתמש"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!u.is_active && <Badge variant="outline" className="text-destructive border-destructive">מושבת</Badge>}
                  {u.is_active && u.locked_until && new Date(u.locked_until) > new Date()
                    ? <Badge variant="outline" className="text-orange-500 border-orange-500">נעול</Badge>
                    : u.is_active && <Badge variant="outline" className="text-green-600 border-green-500">פעיל</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString("he-IL") : "אף פעם"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: u.id, is_active: !u.is_active })}>
                      {u.is_active ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm(`למחוק את ${u.email}?`)) del.mutate(u.id); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין משתמשים</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <NewUserDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
