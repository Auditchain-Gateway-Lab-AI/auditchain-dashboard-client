import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn } from "@/lib/utils";
import type { AuditAction, AuditActivity } from "@/types/dashboard";

const actionClass: Record<AuditAction, string> = {
  INSERT: "text-success",
  UPDATE: "text-info",
  DELETE: "text-danger",
  OTHER: "text-ink-dim",
};

const statusTone = {
  VALID: "success",
  TAMPERED: "danger",
  PENDING: "warning",
  UNAVAILABLE: "warning",
  NOT_CHECKED: "neutral",
} as const;

export function RecentAuditActivity({ data }: { data: AuditActivity[] }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Recent Audit Activity</CardTitle>
        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">Max 10 · read only</span>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No recent activity." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[610px] border-collapse text-[10px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                  <Head>Time</Head><Head>Table</Head><Head>Action</Head><Head>Record</Head><Head>Actor</Head><Head className="text-right">Status</Head>
                </tr>
              </thead>
              <tbody>
                {data.map((event) => (
                  <tr key={event.id} className={cn("border-t border-line", event.status === "TAMPERED" && "bg-danger/[0.055]") }>
                    <Cell className="font-mono text-ink-faint">{event.time}</Cell>
                    <Cell className="font-mono font-semibold text-ink">{event.table}</Cell>
                    <Cell className={cn("font-mono text-[9px] font-semibold", actionClass[event.action])}>{event.action}</Cell>
                    <Cell className="font-mono text-ink-dim">{event.record}</Cell>
                    <Cell className="font-mono text-ink-faint">{event.actor}</Cell>
                    <Cell className="text-right"><Badge tone={statusTone[event.status]}>{event.status}</Badge></Cell>
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

function Head({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-3 py-2 text-left font-semibold", className)}>{children}</th>;
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("px-3 py-[7px]", className)}>{children}</td>;
}
