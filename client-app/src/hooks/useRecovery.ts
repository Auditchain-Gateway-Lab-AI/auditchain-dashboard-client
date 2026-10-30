import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api/client";
import { recoveryService } from "@/services/recovery";
import type { ClientRecoveryEventQuery, ClientTamperQuery } from "@/types/recovery";

const activeRequestStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const recoveryPollMs = 4_000;
const retryRecoveryQuery = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export const recoveryKeys = {
  all: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace"] as const,
  incidents: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "incidents"] as const,
  requests: (workspaceId?: string) => ["recovery", workspaceId || "no-workspace", "requests"] as const,
  history: (workspaceId?: string, page = 1) => ["recovery", workspaceId || "no-workspace", "history", page] as const,
};

export function useRecoveryData(historyPage = 1) {
  const { session } = useAuth();
  const token = session?.token;
  const workspaceId = session?.user.workspace.id;
  const requests = useQuery({
    queryKey: recoveryKeys.requests(workspaceId),
    queryFn: () => recoveryService.getRequests(token),
    enabled: Boolean(token),
    retry: retryRecoveryQuery,
    refetchInterval: (query) => query.state.data?.some((request) =>
      activeRequestStatuses.has(String(request.status).toUpperCase()),
    ) ? recoveryPollMs : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: (query) => !query.state.error,
    refetchOnReconnect: (query) => !query.state.error,
  });
  const incidents = useQuery({
    queryKey: recoveryKeys.incidents(workspaceId),
    queryFn: () => recoveryService.getIncidents(token),
    enabled: Boolean(token),
    retry: retryRecoveryQuery,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      return requests.data?.some((request) =>
        activeRequestStatuses.has(String(request.status).toUpperCase()),
      ) ? recoveryPollMs : 30_000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: (query) => !query.state.error,
    refetchOnReconnect: (query) => !query.state.error,
  });
  const history = useQuery({
    queryKey: recoveryKeys.history(workspaceId, historyPage),
    queryFn: () => recoveryService.getHistory(token, historyPage),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(token),
    retry: retryRecoveryQuery,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      return requests.data?.some((request) =>
        activeRequestStatuses.has(String(request.status).toUpperCase()),
      ) ? recoveryPollMs : 30_000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: (query) => !query.state.error,
    refetchOnReconnect: (query) => !query.state.error,
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


export function useClientTamperRecords(query?: ClientTamperQuery) {
  const { session } = useAuth();
  const token = session?.token;
  const workspaceId = session?.user.workspace.id;

  return useQuery({
    queryKey: ["recovery", workspaceId, "client-tampering", query],
    queryFn: () => recoveryService.getClientTamperRecords?.(token, query),
    enabled: Boolean(token),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: retryRecoveryQuery,
  });
}

export function useRecoverClientTamper() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const workspaceId = session?.user.workspace.id;

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      recoveryService.recoverClientTamperRecord!(session?.token, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recoveryKeys.all(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ["recovery", workspaceId, "client-tampering"] }),
        queryClient.invalidateQueries({ queryKey: ["recovery", workspaceId, "client-recovery-events"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}

export function useDismissClientTamper() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const workspaceId = session?.user.workspace.id;

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      recoveryService.dismissClientTamperRecord!(session?.token, id, notes),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recoveryKeys.all(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ["recovery", workspaceId, "client-tampering"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}


export function useClientRecoveryEvents(query?: ClientRecoveryEventQuery) {
  const { session } = useAuth();
  const token = session?.token;
  const workspaceId = session?.user.workspace.id;

  return useQuery({
    queryKey: ["recovery", workspaceId, "client-recovery-events", query],
    queryFn: () => recoveryService.getClientRecoveryEvents?.(token, query),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
}
