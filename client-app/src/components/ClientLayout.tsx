import { useIsFetching, useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { dashboardKeys, useClientRefresh } from "@/hooks/useDashboard";
import { dashboardService } from "@/services/dashboard";

export function ClientLayout() {
  const { session } = useAuth();
  const workspace = session?.user.workspace;
  const overview = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.getOverview(session?.token, workspace),
    enabled: Boolean(session?.token),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const refresh = useClientRefresh();
  const fetching = useIsFetching({ queryKey: ["dashboard"] }) + useIsFetching({ queryKey: ["recovery"] });

  return (
    <div className="min-h-screen bg-ground">
      <DashboardHeader
        tenant={workspace?.name ?? overview.data?.tenant ?? "Client workspace"}
        organization={workspace?.organization ?? overview.data?.organization ?? "Your organization"}
        updatedAt={overview.dataUpdatedAt || Date.now()}
        isRefreshing={fetching > 0}
        onRefresh={() => void refresh()}
      />
      <Outlet />
    </div>
  );
}
