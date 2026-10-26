import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardMockEnabled, dashboardService } from "@/services/dashboard";
import { useAuth } from "@/hooks/useAuth";
import type { IntegrityDimension, TrendRange, VerificationRangeInput } from "@/types/dashboard";

const activeVerificationPollMs = 3_000;
const idleVerificationPollMs = 30_000;
export const liveDashboardRefreshMs = 30_000;
const integrityTrendRefreshMs = liveDashboardRefreshMs;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: ["dashboard", "overview"] as const,
  tables: ["dashboard", "tables"] as const,
  inventory: ["dashboard", "inventory"] as const,
  latestScan: ["dashboard", "latest-scan"] as const,
  verificationRun: ["dashboard", "verification-run"] as const,
  insights: ["dashboard", "insights"] as const,
  issues: ["dashboard", "issues"] as const,
  trend: (range: TrendRange) => ["dashboard", "trend", range] as const,
  integrityHistory: (range: TrendRange, dimension: IntegrityDimension) => ["dashboard", "integrity-history", range, dimension] as const,
  workerStatus: ["dashboard", "worker-status"] as const,
};

export function useDashboardData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const hasSession = Boolean(session?.token);

  const overview = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.getOverview(session?.token, session?.user.workspace),
    enabled: hasSession,
    refetchInterval: liveDashboardRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const tables = useQuery({ queryKey: dashboardKeys.tables, queryFn: () => dashboardService.getTables(), enabled: dashboardMockEnabled && hasSession });
  const inventory = useQuery({
    queryKey: dashboardKeys.inventory,
    queryFn: () => dashboardService.getInventory(session?.token),
    enabled: !dashboardMockEnabled && hasSession,
    refetchInterval: liveDashboardRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const latestScan = useQuery({ queryKey: dashboardKeys.latestScan, queryFn: () => dashboardService.getLatestScan(), enabled: dashboardMockEnabled && hasSession });
  const verificationRun = useQuery({
    queryKey: dashboardKeys.verificationRun,
    queryFn: () => dashboardService.getLatestVerificationRun(session?.token),
    enabled: hasSession,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? activeVerificationPollMs : idleVerificationPollMs;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const insights = useQuery({ queryKey: dashboardKeys.insights, queryFn: () => dashboardService.getTableInsights(), enabled: dashboardMockEnabled && hasSession });
  const issues = useQuery({ queryKey: dashboardKeys.issues, queryFn: () => dashboardService.getIssues(), enabled: dashboardMockEnabled && hasSession });
  const workerStatus = useQuery({
    queryKey: dashboardKeys.workerStatus,
    queryFn: () => dashboardService.getWorkerStatus(session?.token),
    enabled: hasSession,
    refetchInterval: dashboardMockEnabled ? false : liveDashboardRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

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
      queryClient.invalidateQueries({ queryKey: ["dashboard", "trend"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "integrity-history"] }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.workerStatus }),
      queryClient.invalidateQueries({ queryKey: ["recovery"] }),
    ]);
  }, [queryClient, verificationRun.data]);

  const queries = dashboardMockEnabled
    ? [overview, tables, latestScan, insights, issues]
    : [overview, inventory];
  return {
    overview,
    tables,
    inventory,
    latestScan,
    verificationRun,
    workerStatus,
    insights,
    issues,
    isInitialLoading: queries.some((query) => query.isPending),
    isError: dashboardMockEnabled ? queries.some((query) => query.isError) : overview.isError || inventory.isError,
    isFetching: queries.some((query) => query.isFetching),
  };
}

export function useIntegrityTrend(range: TrendRange) {
  const { session } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.trend(range),
    queryFn: () => dashboardService.getIntegrityTrend(range, session?.token),
    enabled: dashboardMockEnabled || Boolean(session?.token),
    refetchInterval: dashboardMockEnabled ? false : integrityTrendRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useIntegrityHistory(range: TrendRange, dimension: IntegrityDimension) {
  const { session } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.integrityHistory(range, dimension),
    queryFn: () => dashboardService.getIntegrityHistory(range, dimension, session?.token),
    enabled: dashboardMockEnabled || Boolean(session?.token),
    refetchInterval: dashboardMockEnabled ? false : integrityTrendRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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

export function useStartVerificationRun() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (range: VerificationRangeInput) => dashboardService.startVerificationRun(session?.token, range),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.verificationRun });
    },
  });
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useRefreshVerificationStatus() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.verificationRun }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.workerStatus }),
  ]);
}
