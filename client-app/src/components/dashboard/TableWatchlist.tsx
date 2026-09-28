import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn, formatNumber } from "@/lib/utils";
import type { ActivityLevel, WatchlistItem } from "@/types/dashboard";

const levelTone: Record<ActivityLevel, string> = {
  "VERY HIGH": "text-success",
  HIGH: "text-brand-bright",
  NORMAL: "text-info",
  LOW: "text-ink-dim",
  IDLE: "text-ink-faint",
};

export function TableWatchlist({ data }: { data: WatchlistItem[] }) {
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
            <table className="w-full min-w-[570px] border-collapse text-[11px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                  <TableHead className="text-left">Table</TableHead>
                  <TableHead>Logs</TableHead>
                  <TableHead>Integrity</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Checked</TableHead>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.table} className={cn("border-t border-line transition-colors hover:bg-elevated/55", item.issues > 0 && "bg-danger/[0.025]") }>
                    <td className="px-3 py-[9px]">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-5 w-[3px] rounded-full", item.issues > 0 ? "bg-danger" : "bg-success")} />
                        <span className="font-mono font-semibold text-ink">{item.table}</span>
                      </div>
                    </td>
                    <td className="px-3 py-[9px] text-right font-mono text-ink">{formatNumber(item.logs)}</td>
                    <td className={cn("px-3 py-[9px] text-right font-mono font-semibold", item.issues > 0 ? "text-danger" : "text-success")}>{item.integrity.toFixed(2)}%</td>
                    <td className="px-3 py-[9px] text-center">
                      {item.issues ? <Badge tone="danger">{item.issues} issues</Badge> : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className={cn("px-3 py-[9px] text-right text-[9px] font-semibold uppercase tracking-[0.07em]", levelTone[item.level])}>{item.level}</td>
                    <td className="px-3 py-[9px] text-right font-mono text-[10px] text-ink-faint">{item.checked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TableHead({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th className={cn("px-3 py-2 text-right font-semibold", className)}>{children}</th>;
}
