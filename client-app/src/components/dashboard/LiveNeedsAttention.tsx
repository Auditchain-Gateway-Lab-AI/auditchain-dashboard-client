import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { DashboardOverview } from "@/types/dashboard";

export function LiveNeedsAttention({ overview }: { overview: DashboardOverview }) {
  const issues = Object.entries(overview.tableVerification ?? {})
    .filter(([, summary]) => summary.invalid > 0)
    .sort(([, left], [, right]) => right.invalid - left.invalid);
  const issueCount = issues.reduce((total, [, summary]) => total + summary.invalid, 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Needs Attention</CardTitle>
        <span className="font-mono text-[9px] font-semibold text-danger">{formatNumber(issueCount)} reported</span>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-xs text-ink-dim">
            <ShieldCheck className="size-5 text-success" /> No invalid checks recorded.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {issues.slice(0, 5).map(([table, summary]) => (
              <div key={table} className="px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-danger" />
                    <span className="truncate font-mono text-[11px] font-semibold text-ink">{table}</span>
                  </div>
                  <Badge tone="danger">{formatNumber(summary.invalid)} invalid</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-dim">
                  <ShieldAlert className="size-3.5 shrink-0 text-danger" />
                  Server verification reported a mismatch for this table.
                </div>
                <div className="mt-1.5 text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                  {formatNumber(summary.total)} checks in table summary
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
