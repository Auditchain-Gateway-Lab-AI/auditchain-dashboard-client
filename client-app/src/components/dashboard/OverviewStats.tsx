import { Activity, Clock3, Database, FileStack, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardOverview } from "@/types/dashboard";

interface Kpi {
  label: string;
  value: string;
  subvalue?: string;
  icon: typeof Database;
  tone?: "success" | "danger";
}

export function OverviewStats({ data }: { data: DashboardOverview }) {
  const stats: Kpi[] = [
    { label: "Total Logs", value: formatNumber(data.totalLogs), icon: Database },
    { label: "Valid", value: formatNumber(data.valid), subvalue: `${data.validPercentage.toFixed(2)}%`, icon: ShieldCheck, tone: "success" },
    { label: "Tampered", value: formatNumber(data.tampered), subvalue: `${data.tamperedPercentage.toFixed(2)}%`, icon: ShieldAlert, tone: "danger" },
    { label: "Logs Today", value: formatNumber(data.logsToday), icon: Activity },
    { label: "Monitored Tables", value: String(data.monitoredTables), icon: FileStack },
    { label: "Last Scan", value: data.lastScan, icon: Clock3 },
  ];

  return (
    <Card className="grid grid-cols-2 overflow-hidden sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "relative min-w-0 border-line px-3.5 py-3.5",
              index % 2 !== 0 && "border-l",
              index >= 2 && "border-t sm:border-t-0",
              index % 3 !== 0 && "sm:border-l",
              index >= 3 && "sm:border-t",
              "xl:border-t-0",
              index !== 0 && "xl:border-l",
              stat.tone === "success" && "bg-success/[0.055]",
              stat.tone === "danger" && "bg-danger/[0.055]",
            )}
          >
            <Icon
              className={cn(
                "absolute right-3 top-3 size-4 text-ink-faint",
                stat.tone === "success" && "text-success/70",
                stat.tone === "danger" && "text-danger/70",
              )}
            />
            <div
              className={cn(
                "pr-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint",
                stat.tone === "success" && "text-success",
                stat.tone === "danger" && "text-danger",
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
