import { Clock3, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { DashboardOverview } from "@/types/dashboard";

export function VerificationSnapshot({ data }: { data: DashboardOverview }) {
  const hasChecks = data.totalVerifications > 0;
  const metrics = [
    { label: "Valid", value: data.valid, tone: "text-success" },
    { label: "Needs attention", value: data.tampered, tone: "text-danger" },
    { label: "Pending", value: data.verificationPending ?? 0, tone: "text-warning" },
    { label: "Unavailable", value: data.verificationUnavailable ?? 0, tone: "text-warning" },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader><CardTitle>Verification Summary</CardTitle><ShieldCheck className="size-4 text-success" /></CardHeader>
      <CardContent className="space-y-3 p-3.5">
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
      </CardContent>
    </Card>
  );
}
