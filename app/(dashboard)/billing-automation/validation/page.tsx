"use client";
/**
 * @module app/(dashboard)/billing-automation/validation
 * Pre-export validation report — the "gate" the user mentioned in his sync
 * with Felix. Surfaces every blocker/warning/info that needs human review
 * BEFORE the data is pushed to Priority.
 *
 * Categories (6):
 *   1. SKUs ללא קוד Priority (blocker)
 *   2. לקוחות לא מזוהים (blocker)
 *   3. לקוחות פנימיים (warning)
 *   4. חריגות צריכה / תמחור (warning)
 *   5. מחירים חסרים (warning)
 *   6. כפילויות (info)
 *
 * Visual state: the "ייצא ל-Priority" button is DISABLED while any blocker
 * remains. Click on a category chip to filter; click on a finding to open
 * its details + action buttons (approve / skip / fix → deep-link).
 */
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle2, ExternalLink,
  Send, ArrowLeftRight, TrendingUp, TrendingDown, UserPlus, UserMinus,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchValidation, fetchBaselineComparison,
  type Severity, type ValidationFinding,
} from "@/lib/api/billing-automation";

const ils = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const SEVERITY_META: Record<Severity, { label: string; cls: string; Icon: React.ElementType }> = {
  blocker: { label: "חוסם", cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertOctagon },
  warning: { label: "אזהרה", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30", Icon: AlertTriangle },
  info: { label: "מידע", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", Icon: Info },
};

function SeverityBadge({ s }: { s: Severity }) {
  const m = SEVERITY_META[s];
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <m.Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

function FindingRow({ f }: { f: ValidationFinding }) {
  const link = f.meta?.link as string | undefined;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <SeverityBadge s={f.severity} />
              <Badge variant="outline" className="text-xs font-mono">{f.entity_label}</Badge>
            </div>
            <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{f.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">פעולה מומלצת: </span>
          <span>{f.suggested_action}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {f.can_fix && link && (
            <Link href={link}>
              <Button size="sm" variant="default" className="h-8">
                <ExternalLink className="h-3 w-3 ml-1" />
                תקן
              </Button>
            </Link>
          )}
          {f.can_approve && (
            <Button size="sm" variant="outline" className="h-8">
              <CheckCircle2 className="h-3 w-3 ml-1" />
              אשר
            </Button>
          )}
          {f.can_skip && (
            <Button size="sm" variant="ghost" className="h-8">
              <ArrowLeftRight className="h-3 w-3 ml-1" />
              דלג בייצוא
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryChip({
  k, label, total, blockerCount, active, onClick,
}: { k: string; label: string; total: number; blockerCount: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary/50"
      }`}
    >
      <span>{label}</span>
      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
        {total}
      </Badge>
      {blockerCount > 0 && (
        <Badge variant="outline" className="h-5 px-1.5 text-xs bg-destructive/10 text-destructive border-destructive/30">
          {blockerCount} ⛔
        </Badge>
      )}
    </button>
  );
}

export default function ValidationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "validation"],
    queryFn: fetchValidation,
  });
  const { data: baseline } = useQuery({
    queryKey: ["billing-automation", "baseline"],
    queryFn: fetchBaselineComparison,
  });
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedSev, setSelectedSev] = useState<Severity | null>(null);

  // Merge validation findings + baseline M/M findings into a single feed.
  const allFindings = useMemo(
    () => [...(data?.findings ?? []), ...(baseline?.findings ?? [])],
    [data, baseline],
  );

  const filtered = useMemo(() => {
    return allFindings.filter((f) =>
      (!selectedCat || f.category === selectedCat) &&
      (!selectedSev || f.severity === selectedSev),
    );
  }, [allFindings, selectedCat, selectedSev]);

  // Combined summary (static categories + M/M counts).
  const combinedSummary = useMemo(() => {
    const base = data?.summary;
    const mom = baseline?.summary.counts;
    if (!base) return null;
    const momTotal = mom
      ? (mom.new_customers + mom.lost_customers + mom.big_swings +
         mom.new_skus_for_existing + mom.lost_skus + mom.qty_swings)
      : 0;
    const momByCat: Record<string, { total: number; blocker: number; warning: number; info: number }> = {};
    for (const f of baseline?.findings ?? []) {
      const c = momByCat[f.category] ?? { total: 0, blocker: 0, warning: 0, info: 0 };
      c.total += 1;
      c[f.severity] += 1;
      momByCat[f.category] = c;
    }
    const sumSev = (s: "blocker" | "warning" | "info") =>
      base[s] + (baseline?.findings ?? []).filter((f) => f.severity === s).length;
    return {
      ...base,
      total: base.total + momTotal,
      blocker: sumSev("blocker"),
      warning: sumSev("warning"),
      info: sumSev("info"),
      export_blocked: sumSev("blocker") > 0,
      by_category: { ...base.by_category, ...momByCat },
    };
  }, [data, baseline]);

  const combinedCategories = useMemo(() => {
    const cats = data?.categories ? [...data.categories] : [];
    // M/M categories that exist in findings
    const momCats = [
      { key: "mom_new_customer", label: "לקוחות חדשים החודש" },
      { key: "mom_lost_customer", label: "לקוחות שאבדו החודש" },
      { key: "mom_total_delta", label: "שינוי בסך החיוב (חודש/חודש)" },
      { key: "mom_new_sku", label: "שירותים חדשים ללקוח קיים" },
      { key: "mom_lost_sku", label: "שירותים שהופסקו" },
      { key: "mom_qty_delta", label: "שינוי כמות (חודש/חודש)" },
    ];
    const present = new Set((baseline?.findings ?? []).map((f) => f.category));
    return [...cats, ...momCats.filter((c) => present.has(c.key))];
  }, [data, baseline]);

  if (isLoading || !data || !combinedSummary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const summary = combinedSummary;
  const categories = combinedCategories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">חריגים ובדיקות לפני ייצוא</h1>
          <p className="text-sm text-muted-foreground mt-1">
            כל פריט שיש לסקור לפני שדוחפים את חשבוניות הטיוטה ל-Priority.
            <span className="font-medium text-destructive"> חוסמים</span> חייבים תיקון,
            <span className="font-medium text-orange-600"> אזהרות</span> דורשות אישור,
            <span className="font-medium text-blue-600"> מידע</span> ל-FYI.
          </p>
        </div>
        <Button size="lg" disabled={summary.export_blocked} className="gap-2">
          <Send className="h-4 w-4" />
          {summary.export_blocked
            ? `חסום (${summary.blocker} חוסמים פתוחים)`
            : "ייצא ל-Priority כטיוטה"}
        </Button>
      </div>

      {/* Banner if blocked */}
      {summary.export_blocked && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" />
              לא ניתן לייצא ל-Priority עד שהחוסמים נפתרים
            </CardTitle>
            <CardDescription>
              ייצוא במצב הנוכחי יוביל לחשבוניות חלקיות או שגויות. תקן את {summary.blocker} החוסמים למטה ואז כפתור הייצוא ישתחרר.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">סה&quot;כ ממצאים</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertOctagon className="h-3 w-3" /> חוסמים
            </div>
            <div className="text-2xl font-bold text-destructive">{summary.blocker}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> אזהרות
            </div>
            <div className="text-2xl font-bold text-orange-600">{summary.warning}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> מידע
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
          </CardContent>
        </Card>
      </div>

      {/* M/M baseline comparison panel */}
      {baseline && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                השוואה לחודש קודם
                {baseline.summary.is_synthetic_baseline && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-500/40">
                    baseline סינתטי - יוחלף בנתוני אמת כשפליקס יספק M-1
                  </Badge>
                )}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                סף חריגה: {baseline.summary.threshold_pct}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Top: month totals comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs text-muted-foreground">{baseline.summary.baseline.month_label}</div>
                <div className="text-xl font-bold mt-1">{ils(baseline.summary.baseline.total_ils)}</div>
                <div className="text-xs text-muted-foreground mt-1">{baseline.summary.baseline.customers} לקוחות</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs text-muted-foreground">{baseline.summary.current.month_label}</div>
                <div className="text-xl font-bold mt-1">{ils(baseline.summary.current.total_ils)}</div>
                <div className="text-xs text-muted-foreground mt-1">{baseline.summary.current.customers} לקוחות</div>
              </div>
              <div className={`rounded-lg border p-3 ${
                Math.abs(baseline.summary.delta.total_pct) >= 0.2
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "bg-card"
              }`}>
                <div className="text-xs text-muted-foreground">דלתא</div>
                <div className={`text-xl font-bold mt-1 ${
                  baseline.summary.delta.total_ils >= 0 ? "text-green-600" : "text-destructive"
                }`}>
                  {baseline.summary.delta.total_ils >= 0 ? "+" : ""}
                  {ils(baseline.summary.delta.total_ils)}
                  {" "}
                  <span className="text-sm">({(baseline.summary.delta.total_pct * 100).toFixed(1)}%)</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baseline.summary.delta.customers >= 0 ? "+" : ""}{baseline.summary.delta.customers} לקוחות
                </div>
              </div>
            </div>

            {/* Bottom: 6 buckets of M/M anomaly counts */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
              {[
                { label: "לקוחות חדשים", value: baseline.summary.counts.new_customers, Icon: UserPlus, cls: "text-green-600" },
                { label: "לקוחות שאבדו", value: baseline.summary.counts.lost_customers, Icon: UserMinus, cls: "text-destructive" },
                { label: "שינויי סך-חיוב", value: baseline.summary.counts.big_swings, Icon: TrendingUp, cls: "text-orange-600" },
                { label: "שירותים חדשים", value: baseline.summary.counts.new_skus_for_existing, Icon: TrendingUp, cls: "text-blue-600" },
                { label: "שירותים שהופסקו", value: baseline.summary.counts.lost_skus, Icon: TrendingDown, cls: "text-orange-600" },
                { label: "שינויי כמות", value: baseline.summary.counts.qty_swings, Icon: TrendingUp, cls: "text-orange-600" },
              ].map((b) => (
                <div key={b.label} className="rounded border bg-card px-2 py-2">
                  <b.Icon className={`h-4 w-4 mx-auto mb-1 ${b.cls}`} />
                  <div className={`text-lg font-bold ${b.cls}`}>{b.value}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{b.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category filters */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">קטגוריות</div>
        <div className="flex flex-wrap gap-2">
          <CategoryChip
            k="all"
            label="הכל"
            total={summary.total}
            blockerCount={summary.blocker}
            active={!selectedCat}
            onClick={() => setSelectedCat(null)}
          />
          {categories.map((c) => {
            const stats = summary.by_category[c.key];
            if (!stats) return null;
            return (
              <CategoryChip
                key={c.key}
                k={c.key}
                label={c.label}
                total={stats.total}
                blockerCount={stats.blocker}
                active={selectedCat === c.key}
                onClick={() => setSelectedCat(selectedCat === c.key ? null : c.key)}
              />
            );
          })}
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex gap-2">
        {(["blocker", "warning", "info"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={selectedSev === s ? "default" : "outline"}
            onClick={() => setSelectedSev(selectedSev === s ? null : s)}
            className="gap-1"
          >
            <SeverityBadge s={s} />
          </Button>
        ))}
        {selectedSev && (
          <Button size="sm" variant="ghost" onClick={() => setSelectedSev(null)}>
            נקה סינון
          </Button>
        )}
      </div>

      {/* Findings list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              ✅ אין ממצאים בקטגוריה הנבחרת
            </CardContent>
          </Card>
        )}
        {filtered.map((f) => <FindingRow key={f.id} f={f} />)}
      </div>
    </div>
  );
}
