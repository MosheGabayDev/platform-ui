"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSkuMapping, updateSkuMapping } from "@/lib/api/billing-automation";
import type { SkuMappingItem } from "@/lib/modules/billing-automation/types";

type EditKey = string;
const keyOf = (sku: string, bracket: string | null) => `${sku}|${bracket ?? ""}`;

function CodeCell({ sku, bracket, current, onSave, savedKey }: {
  sku: string; bracket: string | null; current: string | null;
  onSave: (sku: string, bracket: string | null, value: string) => void;
  savedKey: string | null;
}) {
  const k = keyOf(sku, bracket);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current ?? "");

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onSave(sku, bracket, draft); setEditing(false); }
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 text-xs font-mono w-40"
          placeholder="320-..."
        />
        <Button size="sm" variant="default" className="h-7 px-2"
          onClick={() => { onSave(sku, bracket, draft); setEditing(false); }}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 group">
      <span className="font-mono text-xs">{current ?? <span className="text-muted-foreground">—</span>}</span>
      <Button size="sm" variant="ghost" className="h-6 px-2 opacity-0 group-hover:opacity-100 transition"
        onClick={() => { setDraft(current ?? ""); setEditing(true); }}>
        <Pencil className="h-3 w-3" />
      </Button>
      {savedKey === k && <Badge variant="outline" className="text-green-600 border-green-500">נשמר</Badge>}
    </div>
  );
}

export default function SkuMappingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "sku-mapping"],
    queryFn: fetchSkuMapping,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "tiered">("all");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: updateSkuMapping,
    onSuccess: (_d, vars) => {
      setSavedKey(keyOf(vars.sku_name, vars.bracket));
      qc.invalidateQueries({ queryKey: ["billing-automation", "sku-mapping"] });
      setTimeout(() => setSavedKey(null), 2000);
    },
  });

  function onSave(sku: string, bracket: string | null, value: string) {
    mutation.mutate({ sku_name: sku, bracket, priority_sku: value });
  }

  const items = (data?.items ?? []).filter((s: SkuMappingItem) => {
    if (filter === "missing" && s.has_priority) return false;
    if (filter === "tiered" && !s.is_tiered) return false;
    if (search && !s.sku_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">מיפוי SKU → Priority</h1>
        <p className="text-sm text-muted-foreground mt-1">
          טבלת המאסטר של בוריס. לחץ על שורה (אייקון העיפרון) כדי לערוך את קוד ה-Priority. השינויים נשמרים מיד ל-DB.
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">סה&quot;כ SKUs</div><div className="text-2xl font-bold">{data.stats.total_skus}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">עם קוד Priority</div><div className="text-2xl font-bold text-green-600">{data.stats.with_priority_code}</div><div className="text-xs text-muted-foreground">{data.stats.coverage_pct}% כיסוי</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">חסר קוד</div><div className="text-2xl font-bold text-orange-500">{data.stats.without_priority_code}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Tiered</div><div className="text-2xl font-bold">{data.stats.tiered_skus}</div></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="חיפוש שם SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md flex-1"
        />
        {(["all", "missing", "tiered"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "הכל" : f === "missing" ? "חסר קוד" : "Tiered"}
          </Button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם SKU פנימי</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>קוד Priority</TableHead>
              <TableHead className="text-right"># Tiers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5" /></TableCell></TableRow>
            ))}
            {items.map((s: SkuMappingItem) => (
              <TableRow key={s.sku_name}>
                <TableCell className="font-medium align-top">{s.sku_name}</TableCell>
                <TableCell className="align-top">
                  {s.has_priority
                    ? <Badge variant="outline" className="text-green-600 border-green-500">מופה</Badge>
                    : <Badge variant="outline" className="text-orange-500 border-orange-500">חסר</Badge>}
                </TableCell>
                <TableCell className="align-top">
                  {s.is_tiered ? (
                    <details>
                      <summary className="cursor-pointer text-primary text-sm">{s.brackets} tiers</summary>
                      <div className="mt-2 border rounded">
                        <Table>
                          <TableHeader><TableRow><TableHead>טווח</TableHead><TableHead>קוד Priority</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {s.tiers.map((t, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{t.bracket}</TableCell>
                                <TableCell><CodeCell sku={s.sku_name} bracket={t.bracket} current={t.priority_sku} onSave={onSave} savedKey={savedKey} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  ) : (
                    <CodeCell sku={s.sku_name} bracket={s.tiers[0]?.bracket ?? null} current={s.tiers[0]?.priority_sku ?? null} onSave={onSave} savedKey={savedKey} />
                  )}
                </TableCell>
                <TableCell className="text-right align-top">{s.brackets}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
