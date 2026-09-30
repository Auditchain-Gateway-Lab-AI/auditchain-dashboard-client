import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardOverview, TableInventoryItem } from "@/types/dashboard";

export function TableInventory({ data, overview }: { data: TableInventoryItem[]; overview: DashboardOverview }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Table Watchlist</CardTitle>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{data.length} tracked</span>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No monitored tables." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-[10px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                  <Head className="text-left">Table</Head>
                  <Head>Rows tracked</Head>
                  <Head>Checked</Head>
                  <Head>Integrity</Head>
                  <Head>Issues</Head>
                  <Head>Updated</Head>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const verification = overview.tableVerification?.[item.table.toUpperCase()];
                  const checked = verification ? verification.valid + verification.invalid + verification.pending + verification.unavailable : 0;
                  const integrity = checked > 0 ? (verification!.valid / checked) * 100 : null;
                  return (
                    <tr key={item.table} className="border-t border-line">
                      <Cell className="font-mono font-semibold text-ink">{item.table}</Cell>
                      <Cell className="text-right font-mono text-ink">{formatNumber(item.rows)}</Cell>
                      <Cell className="text-right font-mono text-ink-dim">{verification ? formatNumber(checked) : "N/A"}</Cell>
                      <Cell className={cn("text-right font-mono font-semibold", integrity !== null && (verification?.invalid ?? 0) > 0 ? "text-danger" : "text-ink-dim")}>{integrity === null ? "N/A" : `${integrity.toFixed(2)}%`}</Cell>
                      <Cell className="text-right">{verification ? verification.invalid > 0 ? <Badge tone="danger">{verification.invalid}</Badge> : "0" : "N/A"}</Cell>
                      <Cell className="text-right font-mono text-[9px] text-ink-faint">{item.updatedAt}</Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Head({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-2.5 py-2 text-right font-semibold", className)}>{children}</th>;
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("px-2.5 py-2", className)}>{children}</td>;
}
