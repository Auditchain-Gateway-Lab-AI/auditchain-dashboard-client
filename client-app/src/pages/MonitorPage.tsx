import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { AgentAuditPanel } from "@/components/dashboard/AgentAuditPanel";
import { IntegrityTrend } from "@/components/dashboard/IntegrityTrend";
import { LatestAuditScan } from "@/components/dashboard/LatestAuditScan";
import { LiveNeedsAttention } from "@/components/dashboard/LiveNeedsAttention";
import { LiveTableInsights } from "@/components/dashboard/LiveTableInsights";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { TableInsights } from "@/components/dashboard/TableInsights";
import { TableInventory } from "@/components/dashboard/TableInventory";
import { TableWatchlist } from "@/components/dashboard/TableWatchlist";
import { ErrorState } from "@/components/ui/panel-state";
import { useDashboardData, useDashboardRefresh } from "@/hooks/useDashboard";
import { useRecoveryData } from "@/hooks/useRecovery";
import { formatTime } from "@/lib/utils";
import { dashboardMockEnabled } from "@/services/dashboard";

export function MonitorPage() {
  const dashboard = useDashboardData();
  const refresh = useDashboardRefresh();
  const recovery = useRecoveryData(1, false);

  if (dashboard.isInitialLoading) return <DashboardSkeleton />;

  const { overview, tables, inventory, latestScan, insights, issues } = dashboard;
  const recoveryIncidents = recovery.incidents.data;
  const hasMissingData = !overview.data || (dashboardMockEnabled
    ? (!tables.data || !latestScan.data || !insights.data || !issues.data)
    : !inventory.data);

  if (dashboard.isError || hasMissingData) {
    return <ErrorState onRetry={() => void refresh()} />;
  }

  return (
    <main className="space-y-3 px-3 pb-8 pt-3 lg:px-4">
      {!dashboardMockEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            Updated <span className="font-mono font-semibold text-ink-dim">{formatTime(overview.dataUpdatedAt || Date.now())}</span>
          </div>
          <span className="font-mono text-[9px]">Tenant-scoped server snapshot</span>
        </div>
      )}
      <OverviewStats data={overview.data} />
      {!dashboardMockEnabled && (
        <AgentAuditPanel
          run={dashboard.verificationRun.data ?? null}
          runStatusStale={dashboard.verificationRun.isError}
        />
      )}
      {dashboardMockEnabled ? (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-5"><TableWatchlist data={tables.data ?? []} /></div>
            <div className="xl:col-span-4"><IntegrityTrend /></div>
            <div className="xl:col-span-3"><LatestAuditScan data={latestScan.data!} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-6"><TableInsights data={insights.data ?? { mostActive: [], mostTampered: [], mostDeletes: [] }} /></div>
            <div className="xl:col-span-6"><NeedsAttention data={issues.data ?? []} /></div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-12">
          <div className="min-w-0 space-y-3 xl:col-span-5 xl:self-start">
            <TableInventory data={inventory.data ?? []} overview={overview.data} />
            <LiveTableInsights inventory={inventory.data ?? []} overview={overview.data} />
          </div>
          <div className="flex min-w-0 flex-col gap-3 xl:col-span-4">
            <IntegrityTrend />
          </div>
          <div className="min-w-0 xl:col-span-3">
            <LiveNeedsAttention
              incidents={recoveryIncidents?.data ?? []}
              total={recoveryIncidents?.total_items ?? 0}
              pending={recovery.incidents.isPending}
              error={recovery.incidents.isError}
            />
          </div>
        </div>
      )}
    </main>
  );
}
