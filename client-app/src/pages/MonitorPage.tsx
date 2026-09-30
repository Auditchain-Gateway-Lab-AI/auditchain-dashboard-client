import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { IntegrityTrend } from "@/components/dashboard/IntegrityTrend";
import { LatestAuditScan } from "@/components/dashboard/LatestAuditScan";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { RecentAuditActivity } from "@/components/dashboard/RecentAuditActivity";
import { TableInsights } from "@/components/dashboard/TableInsights";
import { TableInventory } from "@/components/dashboard/TableInventory";
import { TableWatchlist } from "@/components/dashboard/TableWatchlist";
import { VerificationRangePanel } from "@/components/dashboard/VerificationRangePanel";
import { VerificationSnapshot } from "@/components/dashboard/VerificationSnapshot";
import { ErrorState } from "@/components/ui/panel-state";
import { useDashboardData, useDashboardRefresh } from "@/hooks/useDashboard";
import { dashboardMockEnabled } from "@/services/dashboard";

export function MonitorPage() {
  const dashboard = useDashboardData();
  const refresh = useDashboardRefresh();

  if (dashboard.isInitialLoading) return <DashboardSkeleton />;

  const { overview, tables, inventory, latestScan, insights, activity, issues } = dashboard;
  const hasMissingData = !overview.data || !activity.data || (dashboardMockEnabled
    ? (!tables.data || !latestScan.data || !insights.data || !issues.data)
    : !inventory.data);

  if (dashboard.isError || hasMissingData) {
    return <ErrorState onRetry={() => void refresh()} />;
  }

  return (
    <main className="space-y-3 px-3 pb-8 pt-3 lg:px-4">
      <OverviewStats data={overview.data} />
      {!dashboardMockEnabled && <VerificationRangePanel />}
      {dashboardMockEnabled ? (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-5"><TableWatchlist data={tables.data ?? []} /></div>
            <div className="xl:col-span-4"><IntegrityTrend /></div>
            <div className="xl:col-span-3"><LatestAuditScan data={latestScan.data!} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-3"><TableInsights data={insights.data ?? { mostActive: [], mostTampered: [], mostDeletes: [] }} /></div>
            <div className="xl:col-span-6"><RecentAuditActivity data={activity.data} /></div>
            <div className="xl:col-span-3"><NeedsAttention data={issues.data ?? []} /></div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-8"><TableInventory data={inventory.data ?? []} overview={overview.data} /></div>
            <div className="xl:col-span-4"><VerificationSnapshot data={overview.data} /></div>
          </div>
          <RecentAuditActivity data={activity.data} />
        </>
      )}
    </main>
  );
}
