import { Clock3, ServerCog, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { LatestAuditScan as LatestAuditScanData } from "@/types/dashboard";

export function LatestAuditScan({ data }: { data: LatestAuditScanData }) {
  const statuses = [
    { label: "Valid", value: data.valid, className: "text-success" },
    { label: "Needs Attention", value: data.needsAttention, className: "text-danger" },
    { label: "Verification Pending", value: data.pending, className: "text-warning" },
    { label: "Verification Unavailable", value: data.unavailable, className: "text-warning" },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Latest Audit Scan</CardTitle>
        <ShieldCheck className="size-4 text-success" />
      </CardHeader>
      <CardContent className="p-3.5">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Last Verified" value={data.lastVerified} icon={<Clock3 className="size-3 text-success" />} />
          <Metric label="Next Scan" value={data.nextScan} icon={<Clock3 className="size-3 text-info" />} />
        </div>
        <div className="mt-2 rounded-lg border border-line bg-ground px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-[0.11em] text-ink-faint">Logs Checked</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink">{formatNumber(data.logsChecked)}</div>
        </div>
        <div className="mt-3 space-y-1.5">
          {statuses.map((status) => (
            <div key={status.label} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-ink-dim">{status.label}</span>
              <span className={`font-mono font-semibold ${status.className}`}>{formatNumber(status.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-elevated px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-ink"><ServerCog className="size-3.5 text-brand-bright" /> Server-side verification</span>
            <span className="font-mono text-[9px] font-semibold text-brand-bright">{data.schedule}</span>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">{data.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-ground px-3 py-2.5">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}{icon}</div>
      <div className="mt-1 font-mono text-base font-semibold text-ink">{value}</div>
    </div>
  );
}
