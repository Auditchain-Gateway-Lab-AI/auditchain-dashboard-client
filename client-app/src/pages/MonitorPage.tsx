import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifyRangeModal } from "@/components/dashboard/VerifyRangeModal";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { IntegrityTrend } from "@/components/dashboard/IntegrityTrend";
import { LatestAuditScan } from "@/components/dashboard/LatestAuditScan";
import { LiveNeedsAttention } from "@/components/dashboard/LiveNeedsAttention";
import { LiveTableInsights } from "@/components/dashboard/LiveTableInsights";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { TableInsights } from "@/components/dashboard/TableInsights";
import { TableInventory } from "@/components/dashboard/TableInventory";
import { TableWatchlist } from "@/components/dashboard/TableWatchlist";
import { VerificationSnapshot } from "@/components/dashboard/VerificationSnapshot";
import { ErrorState } from "@/components/ui/panel-state";
import { useDashboardData, useDashboardRefresh } from "@/hooks/useDashboard";
import { formatTime } from "@/lib/utils";
import { dashboardMockEnabled } from "@/services/dashboard";

export function MonitorPage() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const dashboard = useDashboardData();
  const refresh = useDashboardRefresh();

  if (dashboard.isInitialLoading) return <DashboardSkeleton />;

  const { overview, tables, inventory, latestScan, insights, issues, verificationRun } = dashboard;
  const hasMissingData = !overview.data || (dashboardMockEnabled
    ? (!tables.data || !latestScan.data || !insights.data || !issues.data)
    : !inventory.data || verificationRun.data === undefined);

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
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px]">Tenant-scoped server snapshot</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerifyModal(true)}
              className="h-7 gap-1.5 border-brand-bright/40 bg-brand/10 text-[11px] font-semibold text-brand-bright hover:bg-brand/20 transition-colors"
            >
              <Play className="size-3 fill-brand-bright/30" /> Uji Verifikasi Range
            </Button>
          </div>
        </div>
      )}
      <OverviewStats data={overview.data} />
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
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-5"><TableInventory data={inventory.data ?? []} overview={overview.data} /></div>
            <div className="xl:col-span-4"><IntegrityTrend /></div>
            <div className="xl:col-span-3"><VerificationSnapshot data={overview.data} run={verificationRun.data ?? null} onOpenVerifyModal={() => setShowVerifyModal(true)} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-5"><LiveTableInsights inventory={inventory.data ?? []} overview={overview.data} /></div>
            <div className="xl:col-span-7"><LiveNeedsAttention overview={overview.data} /></div>
          </div>
        </>
      )}
      <VerifyRangeModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} />
    </main>
  );
}
