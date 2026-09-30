import { Clock3, LoaderCircle, ServerCog, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { DashboardOverview, VerificationRun } from "@/types/dashboard";

export function VerificationSnapshot({ data, run }: { data: DashboardOverview; run?: VerificationRun | null }) {
  const hasChecks = data.totalVerifications > 0;
  const runActive = run?.status === "QUEUED" || run?.status === "RUNNING";
  const runTone: "danger" | "success" | "info" = run?.status === "FAILED"
    ? "danger"
    : run?.status === "COMPLETED"
      ? "success"
      : "info";
  const metrics = [
    { label: "Valid", value: data.valid, tone: "text-success" },
    { label: "Needs attention", value: data.tampered, tone: "text-danger" },
    { label: "Pending", value: data.verificationPending ?? 0, tone: "text-warning" },
    { label: "Unavailable", value: data.verificationUnavailable ?? 0, tone: "text-warning" },
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader><CardTitle>Verification Summary</CardTitle><ShieldCheck className="size-4 text-success" /></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3.5">
        <div className="border border-line bg-ground px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[9px] uppercase text-ink-faint"><Clock3 className="size-3" /> Last verified</div>
          <div className="mt-1 font-mono text-xs font-semibold text-ink">{data.lastScan}</div>
        </div>
        <div className="border border-line bg-ground px-3 py-2.5">
          <div className="text-[9px] uppercase text-ink-faint">Verification checks recorded</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink">{hasChecks ? formatNumber(data.totalVerifications) : "N/A"}</div>
        </div>
        <div className="space-y-1.5">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-ink-dim">{metric.label}</span>
              <span className={`font-mono font-semibold ${hasChecks ? metric.tone : "text-ink-faint"}`}>{hasChecks ? formatNumber(metric.value) : "N/A"}</span>
            </div>
          ))}
        </div>
        {run && (
          <div className="mt-auto border border-line bg-elevated px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink">
                <ServerCog className="size-3 text-info" />
                <span className="truncate">Server verification</span>
              </span>
              {run && (
                <Badge tone={runTone}>
                  {runActive && <LoaderCircle className="size-3 animate-spin" />}
                  {run.status.toLowerCase()}
                </Badge>
              )}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-label="Server verification progress">
              <div
                className="h-full rounded-full bg-info transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, run.progressPercent))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between gap-2 text-[9px] text-ink-faint">
              <span>{formatNumber(run.processedItems)} / {formatNumber(run.totalItems)} logs</span>
              <span>{Math.round(run.progressPercent)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
