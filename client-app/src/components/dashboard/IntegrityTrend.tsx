import { Activity, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrityTrend } from "@/hooks/useDashboard";
import { cn, formatNumber } from "@/lib/utils";
import { dashboardMockEnabled } from "@/services/dashboard";
import type { TrendRange, TrendTab } from "@/types/dashboard";

const ranges: TrendRange[] = ["8H", "24H", "7D", "30D"];
const tabs: Array<{ id: TrendTab; icon: typeof ShieldCheck }> = [
  { id: "INTEGRITY", icon: ShieldCheck },
  { id: "ACTIVITY", icon: Activity },
];

export function IntegrityTrend() {
  const [range, setRange] = useState<TrendRange>("8H");
  const [tab, setTab] = useState<TrendTab>("INTEGRITY");
  const trend = useIntegrityTrend(range);
  const sampleSize = trend.data?.[0]?.sampleSize ?? 0;
  const totalItems = trend.data?.[0]?.totalItems ?? 0;
  const sourceLabel = dashboardMockEnabled
    ? `Mock service - ${range}`
    : `Live audit sample ${formatNumber(sampleSize)}${totalItems > sampleSize ? `/${formatNumber(totalItems)}` : ""} - ${range}`;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex-wrap py-2">
        <div className="flex items-center gap-4">
          <CardTitle>Integrity Trend</CardTitle>
          <div className="flex items-center rounded-md border border-line bg-ground p-0.5" role="tablist" aria-label="Trend metric">
            {tabs.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-[8px] font-semibold tracking-[0.08em] transition-colors",
                  tab === id ? "bg-elevated text-ink" : "text-ink-faint hover:text-ink-dim",
                )}
              >
                <Icon className="size-2.5" /> {id}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={cn(
                "rounded px-2 py-1 font-mono text-[9px] font-semibold transition-colors",
                range === item ? "bg-navy-bright/20 text-info" : "text-ink-faint hover:bg-elevated hover:text-ink-dim",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-3">
        {trend.isPending ? (
          <Skeleton className="h-[246px] w-full" />
        ) : trend.isError || !trend.data?.length ? (
          <EmptyState message={trend.isError ? "Integrity trend is currently unavailable." : "No trend data for this range."} />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[9px] text-ink-faint">
                {tab === "INTEGRITY" ? (
                  <>
                    <Legend color="bg-success" label="Valid Logs" />
                    <Legend color="bg-danger" label="Tampered" />
                  </>
                ) : (
                  <>
                    <Legend color="bg-success" label="Insert" />
                    <Legend color="bg-info" label="Update" />
                    <Legend color="bg-danger" label="Delete" />
                  </>
                )}
              </div>
              <span className="text-[8px] uppercase tracking-[0.1em] text-ink-faint">{sourceLabel}</span>
            </div>
            <div className="min-h-[224px] min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend.data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="validFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c47c" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#22c47c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.055)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#61748c" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontFamily: "JetBrains Mono" }} />
                  <YAxis stroke="#61748c" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontFamily: "JetBrains Mono" }} />
                  <Tooltip contentStyle={{ background: "#101e30", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, fontSize: 10 }} labelStyle={{ color: "#9fb0c4" }} />
                  {tab === "INTEGRITY" ? (
                    <>
                      <Area type="monotone" dataKey="valid" name="Valid Logs" stroke="#22c47c" strokeWidth={2} fill="url(#validFill)" />
                      <Line type="monotone" dataKey="tampered" name="Tampered" stroke="#f0555c" strokeWidth={2} dot={{ r: 2, fill: "#f0555c" }} yAxisId={0} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="insert" name="Insert" fill="#22c47c" opacity={0.82} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="update" name="Update" fill="#4a92ec" opacity={0.82} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="delete" name="Delete" fill="#f0555c" opacity={0.82} radius={[2, 2, 0, 0]} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", color)} /> {label}
    </span>
  );
}
