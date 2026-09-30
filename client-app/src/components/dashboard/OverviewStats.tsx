import { Activity, Clock3, Database, FileStack, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardOverview } from "@/types/dashboard";

interface Kpi {
  label: string;
  value: string;
  subvalue?: string;
  icon: typeof Database;
  tone?: "success" | "danger" | "warning";
}

export function OverviewStats({ data }: { data: DashboardOverview }) {
  const stats: Kpi[] = [
    { label: "Total Logs", value: formatNumber(data.totalLogs), icon: Database },
    { label: "Anchored Logs", value: formatNumber(data.anchoredLogs), subvalue: `${data.anchorPercentage.toFixed(2)}%`, icon: ShieldCheck, tone: "success" },
    { label: "Pending Logs", value: formatNumber(data.pendingLogs), icon: Clock3, tone: "warning" },
    { label: "Integrity Score", value: formatScore(data.integrityScore), subvalue: data.totalVerifications ? `${formatNumber(data.totalVerifications)} checks` : undefined, icon: ShieldCheck, tone: "success" },
    { label: "Valid Checks", value: formatNumber(data.valid), subvalue: `${data.validPercentage.toFixed(2)}%`, icon: ShieldCheck, tone: "success" },
    { label: "Tampered Checks", value: formatNumber(data.tampered), subvalue: `${data.tamperedPercentage.toFixed(2)}%`, icon: ShieldAlert, tone: "danger" },
    { label: "Logs Today", value: formatNumber(data.logsToday), icon: Activity },
    { label: "Tables Audited", value: data.monitoredTables === null ? "N/A" : String(data.monitoredTables), icon: FileStack },
    { label: "Last Verified", value: data.lastScan, icon: Clock3 },
  ];

  return (
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "relative min-w-0 bg-panel px-3.5 py-3.5",
              stat.tone === "success" && "bg-success/[0.055]",
              stat.tone === "danger" && "bg-danger/[0.055]",
              stat.tone === "warning" && "bg-warning/[0.055]",
            )}
          >
            <Icon
              className={cn(
                "absolute right-3 top-3 size-4 text-ink-faint",
                stat.tone === "success" && "text-success/70",
                stat.tone === "danger" && "text-danger/70",
                stat.tone === "warning" && "text-warning/70",
              )}
            />
            <div
              className={cn(
                "pr-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint",
                stat.tone === "success" && "text-success",
                stat.tone === "danger" && "text-danger",
                stat.tone === "warning" && "text-warning",
              )}
            >
              {stat.label}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  "font-mono text-xl font-semibold leading-none text-ink",
                  stat.tone === "success" && "text-[22px] text-success",
                  stat.tone === "danger" && "text-[22px] text-danger",
                  stat.tone === "warning" && "text-[22px] text-warning",
                )}
              >
                {stat.value}
              </span>
              {stat.subvalue && <span className={cn("font-mono text-[11px] font-semibold", stat.tone === "success" ? "text-success" : "text-danger")}>{stat.subvalue}</span>}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function formatScore(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
}
