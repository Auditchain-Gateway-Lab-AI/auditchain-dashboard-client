import { useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardService } from "@/services/dashboard";
import type { TrendRange } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
  tables: ["dashboard", "tables"] as const,
  latestScan: ["dashboard", "latest-scan"] as const,
  insights: ["dashboard", "insights"] as const,
  activity: ["dashboard", "recent-activity"] as const,
  issues: ["dashboard", "issues"] as const,
  trend: (range: TrendRange) => ["dashboard", "trend", range] as const,
};

export function useDashboardData() {
  const overview = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.getOverview(),
    refetchInterval: 60_000,
  });
  const tables = useQuery({ queryKey: dashboardKeys.tables, queryFn: () => dashboardService.getTables() });
  const latestScan = useQuery({ queryKey: dashboardKeys.latestScan, queryFn: () => dashboardService.getLatestScan() });
  const insights = useQuery({ queryKey: dashboardKeys.insights, queryFn: () => dashboardService.getTableInsights() });
  const activity = useQuery({ queryKey: dashboardKeys.activity, queryFn: () => dashboardService.getRecentActivity(10) });
  const issues = useQuery({ queryKey: dashboardKeys.issues, queryFn: () => dashboardService.getIssues() });

  const queries = [overview, tables, latestScan, insights, activity, issues];
  return {
    overview,
    tables,
    latestScan,
    insights,
    activity,
    issues,
    isInitialLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    isFetching: queries.some((query) => query.isFetching),
  };
}

export function useIntegrityTrend(range: TrendRange) {
  return useQuery({
    queryKey: dashboardKeys.trend(range),
    queryFn: () => dashboardService.getIntegrityTrend(range),
  });
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useClientRefresh() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["recovery"] }),
  ]);
}
