import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api/client";
import { recoveryService } from "@/services/recovery";
import type { RecoveryIncidentQuery } from "@/services/recovery/recovery.service";
import type { RecoveryIncidentPage } from "@/types/recovery";

const activeRequestStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const recoveryPollMs = 30_000;
const retryRecoveryQuery = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export const recoveryKeys = {
  all: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace"] as const,
  incidents: (workspaceId?: string, query?: RecoveryIncidentQuery) => [
    "recovery", workspaceId || "no-workspace", "incidents",
    query?.page ?? 1, query?.status ?? "OPEN", query?.scope ?? "ALL",
    query?.search ?? "", query?.sort ?? "newest",
  ] as const,
  requests: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "requests"] as const,
  history: (workspaceId?: string, page = 1) => ["recovery", workspaceId || "no-workspace", "history", page] as const,
};

export function useCheckRecoveryResource() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resource: string) => recoveryService.checkResource(session?.token, resource),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: recoveryKeys.all(session?.user.workspace.id) });
    },
  });
}

export function useRecoveryData(
  historyPage = 1,
  historyEnabled = true,
  incidentQuery: RecoveryIncidentQuery = {
    page: 1, status: "OPEN", scope: "ALL", search: "", sort: "newest",
  },
) {
  const { session } = useAuth();
  const token = session?.token;
  const workspaceId = session?.user.workspace.id;
  const queryClient = useQueryClient();
  const defaultIncidentQuery: RecoveryIncidentQuery = {
    page: 1, status: "OPEN", scope: incidentQuery.scope, search: "", sort: "newest",
  };
  const incidentCache = queryClient.getQueriesData<RecoveryIncidentPage>({
    queryKey: ["recovery", workspaceId || "no-workspace", "incidents"],
  });
  const hasPagedIncidentCache = incidentCache.some(([, data]) => data?.server_paged === true);
  const hasLegacyIncidentCache = !hasPagedIncidentCache && incidentCache.some(([, data]) => data?.server_paged === false);
  // Older Gateways return one unpaged array. Reuse that cached dataset and keep
  // filtering/paging in the browser until the paged response is deployed.
  const effectiveIncidentQuery = hasLegacyIncidentCache
    ? defaultIncidentQuery
    : incidentQuery;
  const requests = useQuery({
    queryKey: recoveryKeys.requests(workspaceId),
    queryFn: () => recoveryService.getRequests(token),
    enabled: Boolean(token),
    retry: retryRecoveryQuery,
    staleTime: 10_000,
    refetchInterval: recoveryPollMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const incidents = useQuery({
    queryKey: recoveryKeys.incidents(workspaceId, effectiveIncidentQuery),
    queryFn: () => recoveryService.getIncidents(token, effectiveIncidentQuery),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(token),
    retry: retryRecoveryQuery,
    staleTime: 120_000,
    // Poll one server page; older unpaged Gateways are refreshed after actions.
    refetchInterval: (query) => query.state.data?.server_paged ? recoveryPollMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const history = useQuery({
    queryKey: recoveryKeys.history(workspaceId, historyPage),
    queryFn: () => recoveryService.getHistory(token, historyPage),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(token) && historyEnabled,
    retry: retryRecoveryQuery,
    staleTime: 60_000,
    refetchInterval: requests.data?.some((request) => activeRequestStatuses.has(request.status)) ? recoveryPollMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const requestStatusesRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requests.data) return;
    const signature = requests.data.map((request) => `${request.id}:${request.status}`).sort().join("|");
    const previous = requestStatusesRef.current;
    requestStatusesRef.current = signature;
    if (previous === null || previous === signature) return;
    void queryClient.invalidateQueries({ queryKey: ["recovery", workspaceId || "no-workspace", "incidents"] });
    if (historyEnabled) void queryClient.invalidateQueries({ queryKey: ["recovery", workspaceId || "no-workspace", "history"] });
  }, [historyEnabled, queryClient, requests.data, workspaceId]);

  return {
    incidents,
    requests,
    history,
    token,
    workspaceId,
    isInitialLoading: incidents.isPending || requests.isPending,
    hasCoreError: incidents.isError || requests.isError,
    error: incidents.error || requests.error || (historyEnabled ? history.error : null),
  };
}

export function useRecoveryRefresh() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: recoveryKeys.all(session?.user.workspace.id) }),
    [queryClient, session?.user.workspace.id],
  );
}
