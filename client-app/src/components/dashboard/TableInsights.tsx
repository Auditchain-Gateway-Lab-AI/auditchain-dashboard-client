import { Flame, ShieldAlert, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn, formatNumber } from "@/lib/utils";
import type { InsightRow, TableInsightsData } from "@/types/dashboard";

export function TableInsights({ data }: { data: TableInsightsData }) {
  const groups = [
    { title: "Most Active", icon: Flame, rows: data.mostActive, tone: "text-success", suffix: "" },
    { title: "Most Tampered", icon: ShieldAlert, rows: data.mostTampered, tone: "text-danger", suffix: " issues" },
    { title: "Most Deletes", icon: Trash2, rows: data.mostDeletes, tone: "text-delete", suffix: "" },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader><CardTitle>Table Insights</CardTitle></CardHeader>
      <CardContent className="divide-y divide-line">
        {groups.map(({ title, icon: Icon, rows, tone, suffix }) => (
          <div key={title} className="px-3.5 py-2.5">
            <div className={cn("mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em]", tone)}>
              <Icon className="size-3" /> {title}
            </div>
            {rows.length === 0 ? <EmptyState message={`No ${title.toLowerCase()} data.`} /> : <InsightRows rows={rows} tone={tone} suffix={suffix} />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightRows({ rows, tone, suffix }: { rows: InsightRow[]; tone: string; suffix: string }) {
  return (
    <div className="space-y-0.5">
      {rows.map((row) => (
        <div key={row.table} className="flex items-center justify-between rounded px-1.5 py-0.5 text-[10px] hover:bg-elevated/60">
          <span className="font-mono text-ink-dim">{row.table}</span>
          <span className={cn("font-mono font-semibold", tone)}>{formatNumber(row.value)}{suffix}</span>
        </div>
      ))}
    </div>
  );
}
