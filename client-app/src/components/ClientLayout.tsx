import { useIsFetching, useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { dashboardKeys, useClientRefresh } from "@/hooks/useDashboard";
import { dashboardService } from "@/services/dashboard";

export function ClientLayout() {
  const overview = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.getOverview(),
    refetchInterval: 60_000,
  });
  const refresh = useClientRefresh();
  const fetching = useIsFetching({ queryKey: ["dashboard"] }) + useIsFetching({ queryKey: ["recovery"] });

  return (
    <div className="min-h-screen bg-ground">
      <DashboardHeader
        tenant={overview.data?.tenant ?? "SIMRS Morbis 1"}
        organization={overview.data?.organization ?? "RSUD Morbis — POLINEMA"}
        updatedAt={overview.dataUpdatedAt || Date.now()}
        isRefreshing={fetching > 0}
        onRefresh={() => void refresh()}
      />
      <Outlet />
    </div>
  );
}
