import { Database, Flame, ShieldAlert, TableProperties } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardOverview, TableInventoryItem } from "@/types/dashboard";

interface LiveTableInsightsProps {
  inventory: TableInventoryItem[];
  overview: DashboardOverview;
}

export function LiveTableInsights({ inventory, overview }: LiveTableInsightsProps) {
  const mostActive = [...inventory]
    .sort((left, right) => right.rows - left.rows)
    .slice(0, 4)
    .map((item) => ({ table: item.table, value: item.rows }));
  const mostTampered = Object.entries(overview.tableVerification ?? {})
    .filter(([, summary]) => summary.invalid > 0)
    .sort(([, left], [, right]) => right.invalid - left.invalid)
    .slice(0, 4)
    .map(([table, summary]) => ({ table, value: summary.invalid }));
  const trackedRows = inventory.reduce((total, item) => total + item.rows, 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Table Insights</CardTitle>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
          {overview.monitoredTables ?? inventory.length} tracked
        </span>
      </CardHeader>
      <CardContent className="divide-y divide-line">
        <InsightGroup title="Most Active" icon={Flame} rows={mostActive} tone="text-success" suffix=" rows" />
        <InsightGroup title="Most Tampered" icon={ShieldAlert} rows={mostTampered} tone="text-danger" suffix=" invalid" />
        <div className="px-3.5 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-info">
            <TableProperties className="size-3" /> Coverage
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <Metric icon={Database} label="Rows tracked" value={trackedRows} />
            <Metric icon={TableProperties} label="Checks recorded" value={overview.totalVerifications} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightGroup({
  title,
  icon: Icon,
  rows,
  tone,
  suffix,
}: {
  title: string;
  icon: typeof Flame;
  rows: Array<{ table: string; value: number }>;
  tone: string;
  suffix: string;
}) {
  return (
    <div className="px-3.5 py-2.5">
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em]", tone)}>
        <Icon className="size-3" /> {title}
      </div>
      {rows.length === 0 ? (
        <EmptyState message="No server summary." />
      ) : (
        <div className="space-y-0.5">
          {rows.map((row) => (
            <div key={row.table} className="flex items-center justify-between rounded px-1.5 py-1 text-[10px] hover:bg-elevated/60">
              <span className="truncate font-mono text-ink-dim">{row.table}</span>
              <span className={cn("shrink-0 font-mono font-semibold", tone)}>{formatNumber(row.value)}{suffix}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return (
    <div className="min-w-0 bg-panel px-2.5 py-2">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-[0.08em] text-ink-faint">
        <Icon className="size-3 text-info" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-ink">{formatNumber(value)}</div>
    </div>
  );
}
