import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardMockEnabled, dashboardService } from "@/services/dashboard";
import { useAuth } from "@/hooks/useAuth";
import type { TrendRange, VerificationRangeInput } from "@/types/dashboard";

const activeVerificationPollMs = 3_000;
const idleVerificationPollMs = 5_000;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
  tables: ["dashboard", "tables"] as const,
  inventory: ["dashboard", "inventory"] as const,
  latestScan: ["dashboard", "latest-scan"] as const,
  verificationRun: ["dashboard", "verification-run"] as const,
  insights: ["dashboard", "insights"] as const,
  activity: ["dashboard", "recent-activity"] as const,
  issues: ["dashboard", "issues"] as const,
  trend: (range: TrendRange) => ["dashboard", "trend", range] as const,
};

export function useDashboardData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session?.token);

  const overview = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.getOverview(session?.token, session?.user.workspace),
    enabled: hasSession,
    refetchInterval: 60_000,
  });
  const tables = useQuery({ queryKey: dashboardKeys.tables, queryFn: () => dashboardService.getTables(), enabled: dashboardMockEnabled && hasSession });
  const inventory = useQuery({ queryKey: dashboardKeys.inventory, queryFn: () => dashboardService.getInventory(session?.token), enabled: !dashboardMockEnabled && hasSession });
  const latestScan = useQuery({ queryKey: dashboardKeys.latestScan, queryFn: () => dashboardService.getLatestScan(), enabled: dashboardMockEnabled && hasSession });
  const verificationRun = useQuery({
    queryKey: dashboardKeys.verificationRun,
    queryFn: () => dashboardService.getLatestVerificationRun(session?.token),
    enabled: hasSession,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? activeVerificationPollMs : idleVerificationPollMs;
    },
  });
  const insights = useQuery({ queryKey: dashboardKeys.insights, queryFn: () => dashboardService.getTableInsights(), enabled: dashboardMockEnabled && hasSession });
  const activity = useQuery({
    queryKey: dashboardKeys.activity,
    queryFn: () => dashboardService.getRecentActivity(session?.token, 10),
    enabled: hasSession,
  });
  const issues = useQuery({ queryKey: dashboardKeys.issues, queryFn: () => dashboardService.getIssues(), enabled: dashboardMockEnabled && hasSession });

  const observedRunRef = useRef<string | null>(null);
  useEffect(() => {
    const run = verificationRun.data;
    if (!run) return;

    const runSignature = `${run.id}:${run.status}:${run.updatedAt}`;
    const previousSignature = observedRunRef.current;
    observedRunRef.current = runSignature;

    if (!previousSignature || previousSignature === runSignature) return;
    if (run.status !== "COMPLETED" && run.status !== "FAILED") return;

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inventory }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "trend"] }),
    ]);
  }, [queryClient, verificationRun.data]);

  const queries = dashboardMockEnabled
    ? [overview, tables, latestScan, insights, activity, issues]
    : [overview, activity, inventory, verificationRun];
  return {
    overview,
    tables,
    inventory,
    latestScan,
    verificationRun,
    insights,
    activity,
    issues,
    isInitialLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    isFetching: queries.some((query) => query.isFetching),
  };
}

export function useIntegrityTrend(range: TrendRange) {
  const { session } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.trend(range),
    queryFn: () => dashboardService.getIntegrityTrend(range, session?.token),
    enabled: dashboardMockEnabled || Boolean(session?.token),
    refetchInterval: dashboardMockEnabled ? false : 60_000,
  });
}

export function useVerifyRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, range }: { token?: string; range: VerificationRangeInput }) =>
      dashboardService.verifyRange(token, range),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
    },
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
