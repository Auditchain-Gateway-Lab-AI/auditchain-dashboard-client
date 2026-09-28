import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn } from "@/lib/utils";
import type { RecoveryJob, RecoveryJobStatus } from "@/types/recovery";

const statusTone: Record<RecoveryJobStatus, "success" | "info" | "neutral" | "danger"> = {
  COMPLETED: "success",
  "IN PROGRESS": "info",
  QUEUED: "neutral",
  FAILED: "danger",
};

export function RecoveryHistory({ data }: { data: RecoveryJob[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader><CardTitle>Recovery History</CardTitle><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">Read only</span></CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? <EmptyState message="No recovery jobs recorded." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                  <Head className="text-left">Job</Head><Head className="text-left">Resources</Head><Head className="text-left">Scope</Head><Head className="text-left">Requested by</Head><Head className="text-left">When</Head><Head className="text-right">Restored</Head><Head className="text-right">Status</Head>
                </tr>
              </thead>
              <tbody>
                {data.map((job) => (
                  <tr key={job.id} className="border-t border-line">
                    <Cell className="font-mono font-semibold text-ink">{job.id}</Cell>
                    <Cell className="font-mono text-ink-dim">{job.resources.join(", ")}</Cell>
                    <Cell className="text-ink-dim">{job.scope}</Cell>
                    <Cell className="font-mono text-ink-dim">{job.requestedBy}</Cell>
                    <Cell className="font-mono text-ink-faint">{job.requestedAt}</Cell>
                    <Cell className="text-right font-mono text-ink">{job.restored}/{job.total}</Cell>
                    <Cell className="text-right"><Badge tone={statusTone[job.status]}>{job.status}</Badge></Cell>
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

function Head({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th className={cn("px-3.5 py-2.5 text-right font-semibold", className)}>{children}</th>;
}

function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("px-3.5 py-3", className)}>{children}</td>;
}
