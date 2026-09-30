import { CheckCircle2, Clock3, LoaderCircle, ServerCog, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { VerificationRun } from "@/types/dashboard";

export function VerificationRunPanel({ data }: { data: VerificationRun | null }) {
  const status = data?.status ?? "QUEUED";
  const isActive = status === "QUEUED" || status === "RUNNING";
  const statusTone = status === "FAILED" ? "danger" : status === "COMPLETED" ? "success" : "info";

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-wrap items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info">
            <ServerCog className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>Server Verification</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">Background results for this workspace</p>
          </div>
        </div>
        <Badge tone={statusTone}>
          {isActive && <LoaderCircle className="size-3 animate-spin" />}
          {!isActive && status === "COMPLETED" && <CheckCircle2 className="size-3" />}
          {status.toLowerCase()}
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5">
        {!data ? (
          <div className="flex items-center gap-2 border border-line bg-ground px-3 py-3 text-[11px] text-ink-dim">
            <Clock3 className="size-4 text-info" />
            <span>No background verification has been recorded yet.</span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Latest checked range</div>
                <div className="mt-1 font-mono text-xs font-semibold text-ink">{formatRange(data.from, data.to)}</div>
              </div>
              <div className="text-right text-[10px] text-ink-dim">
                {formatNumber(data.processedItems)} / {formatNumber(data.totalItems)} logs processed
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-label="Verification progress">
              <div
                className="h-full rounded-full bg-info transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, data.progressPercent))}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              <Metric label="Checked" value={data.totalItems} icon={<ShieldCheck className="size-3 text-info" />} />
              <Metric label="Valid" value={data.totalValid} icon={<ShieldCheck className="size-3 text-success" />} />
              <Metric label="Invalid" value={data.totalInvalid} icon={<ShieldAlert className="size-3 text-danger" />} />
              <Metric label="Pending" value={data.totalPending} icon={<Clock3 className="size-3 text-warning" />} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-dim">
              <span>Verified now: <strong className="font-mono text-ink">{formatNumber(data.verifiedNow)}</strong></span>
              <span>Already verified: <strong className="font-mono text-ink">{formatNumber(data.alreadyVerified)}</strong></span>
            </div>

            {data.errorMessage && (
              <div className="mt-3 flex items-start gap-2 border border-danger/25 bg-danger/10 px-3 py-2 text-[10px] text-danger" role="alert">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{data.errorMessage}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="min-w-0 bg-panel px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 font-mono text-lg font-semibold text-ink">{formatNumber(value)}</div>
    </div>
  );
}

function formatRange(from: string, to: string) {
  const start = formatDate(from);
  const end = formatDate(to);
  return start && end ? `${start} - ${end}` : "Range unavailable";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
