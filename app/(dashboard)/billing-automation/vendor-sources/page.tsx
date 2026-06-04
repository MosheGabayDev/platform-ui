"use client";
/**
 * @module app/(dashboard)/billing-automation/vendor-sources
 * Living catalog of the 21 data sources Boris listed in "Data collection for
 * Meteorit billing.docx" (2026-06-04).
 *
 * Each source has: collection method (auto/email/manual), URL, instructions,
 * owner, status. The page also surfaces the open issues from Boris's whatsapp
 * note as a separate section.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Server, Mail, MousePointer, CheckCircle2, AlertTriangle, AlertOctagon,
  ExternalLink, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchVendorSources, type VendorMethod, type VendorStatus,
} from "@/lib/api/billing-automation";

const METHOD_META: Record<VendorMethod, { label: string; Icon: React.ElementType; cls: string }> = {
  auto_scheduled: { label: "אוטומטי (Scheduled)", Icon: Server, cls: "text-green-600 border-green-500/40" },
  email_from_vendor: { label: "אימייל מהספק", Icon: Mail, cls: "text-blue-600 border-blue-500/40" },
  manual_portal: { label: "ידני בפורטל", Icon: MousePointer, cls: "text-orange-600 border-orange-500/40" },
};

const STATUS_META: Record<VendorStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  working: { label: "תקין", cls: "bg-green-500/10 text-green-600 border-green-500/30", Icon: CheckCircle2 },
  needs_improvement: { label: "דורש שיפור", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30", Icon: AlertTriangle },
  blocked: { label: "חסום", cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertOctagon },
};

const ISSUE_SEV_CLS = {
  blocker: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

export default function VendorSourcesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "vendor-sources"],
    queryFn: fetchVendorSources,
  });
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<VendorMethod | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const sources = data.sources.filter((s) => {
    if (methodFilter && s.method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [s.name, s.vendor, s.owner].some((f) => f.toLowerCase().includes(q));
    }
    return true;
  });

  const openIssues = data.open_issues.filter((i) => i.status !== "resolved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">מקורות נתונים</h1>
        <p className="text-sm text-muted-foreground mt-1">
          קטלוג חי של {data.summary.total_sources} המקורות שמטאורית אוספת מהם נתונים לחיוב חודשי.
          מקור: {data.author} · {data.source_doc_date}
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">סה&quot;כ מקורות</div>
            <div className="text-2xl font-bold">{data.summary.total_sources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3 text-green-600" /> אוטומטי
            </div>
            <div className="text-2xl font-bold text-green-600">{data.summary.auto_scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3 text-blue-600" /> מייל ספק
            </div>
            <div className="text-2xl font-bold text-blue-600">{data.summary.email_from_vendor}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MousePointer className="h-3 w-3 text-orange-600" /> ידני
            </div>
            <div className="text-2xl font-bold text-orange-600">{data.summary.manual_portal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Open issues banner */}
      {openIssues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-orange-600" />
              נושאים פתוחים מההתכתבות עם בוריס ({openIssues.length})
            </CardTitle>
            <CardDescription>
              סוקרים יחד עם פליקס לפני הפגישה הבאה.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {openIssues.map((iss) => (
              <div key={iss.id} className="rounded-md border bg-card px-3 py-2 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={ISSUE_SEV_CLS[iss.severity]}>{iss.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{iss.topic}</Badge>
                    <span className="text-xs text-muted-foreground">בעלים: {iss.owner}</span>
                  </div>
                  <div className="font-medium text-sm">{iss.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{iss.description}</div>
                  {iss.missing_customers && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {iss.missing_customers.length} לקוחות: {iss.missing_customers.slice(0, 3).join(", ")}
                      {iss.missing_customers.length > 3 && ` + עוד ${iss.missing_customers.length - 3}`}
                    </div>
                  )}
                  {iss.affected_skus && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {iss.affected_skus.length} מק&quot;טים
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="חיפוש מקור / ספק / בעלים..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {(["auto_scheduled", "email_from_vendor", "manual_portal"] as const).map((m) => {
          const meta = METHOD_META[m];
          return (
            <Button
              key={m}
              size="sm"
              variant={methodFilter === m ? "default" : "outline"}
              onClick={() => setMethodFilter(methodFilter === m ? null : m)}
              className="gap-1"
            >
              <meta.Icon className="h-3 w-3" />
              {meta.label}
            </Button>
          );
        })}
        {methodFilter && (
          <Button size="sm" variant="ghost" onClick={() => setMethodFilter(null)}>נקה</Button>
        )}
      </div>

      {/* Sources table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מקור</TableHead>
              <TableHead>ספק</TableHead>
              <TableHead>שיטת איסוף</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>בעלים</TableHead>
              <TableHead>קישור</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => {
              const methodMeta = METHOD_META[s.method];
              const statusMeta = STATUS_META[s.status];
              return (
                <TableRow key={s.key}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.notes && <div className="text-xs text-muted-foreground mt-0.5">{s.notes}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{s.vendor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${methodMeta.cls}`}>
                      <methodMeta.Icon className="h-3 w-3" />
                      {methodMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${statusMeta.cls}`}>
                      <statusMeta.Icon className="h-3 w-3" />
                      {statusMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.owner}</TableCell>
                  <TableCell>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                         className="text-primary inline-flex items-center gap-1 text-xs">
                        פתח <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
            {sources.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין תוצאות</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <FileText className="h-3 w-3" />
        מקור התיעוד: <code className="bg-muted px-1 rounded">{data.source_doc}</code>
      </div>
    </div>
  );
}
