import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { recoveryService } from "@/services/recovery";

const activeRequestStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const recoveryPollMs = 4_000;

export const recoveryKeys = {
  all: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace"] as const,
  incidents: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "incidents"] as const,
  requests: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "requests"] as const,
  history: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "history"] as const,
};

export function useRecoveryData() {
  const { session } = useAuth();
  const token = session?.token;
  const workspaceId = session?.user.workspace.id;
  const requests = useQuery({
    queryKey: recoveryKeys.requests(workspaceId),
    queryFn: () => recoveryService.getRequests(token),
    enabled: Boolean(token),
    refetchInterval: (query) => query.state.data?.some((request) =>
      activeRequestStatuses.has(String(request.status).toUpperCase()),
    ) ? recoveryPollMs : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const incidents = useQuery({
    queryKey: recoveryKeys.incidents(workspaceId),
    queryFn: () => recoveryService.getIncidents(token),
    enabled: Boolean(token),
    refetchInterval: requests.data?.some((request) =>
      activeRequestStatuses.has(String(request.status).toUpperCase()),
    ) ? recoveryPollMs : 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const history = useQuery({
    queryKey: recoveryKeys.history(workspaceId),
    queryFn: () => recoveryService.getHistory(token),
    enabled: Boolean(token),
    refetchInterval: requests.data?.some((request) =>
      activeRequestStatuses.has(String(request.status).toUpperCase()),
    ) ? recoveryPollMs : 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const queries = [incidents, requests, history];
  return {
    incidents,
    requests,
    history,
    token,
    workspaceId,
    isInitialLoading: queries.some((query) => query.isPending),
    hasCoreError: incidents.isError || requests.isError,
    error: incidents.error || requests.error || history.error,
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
