import { useQuery, useQueryClient } from "@tanstack/react-query";

import { recoveryService } from "@/services/recovery";

export const recoveryKeys = {
  all: ["recovery"] as const,
  incidents: ["recovery", "incidents"] as const,
  history: ["recovery", "history"] as const,
  snapshots: ["recovery", "snapshots"] as const,
};

export function useRecoveryData() {
  const incidents = useQuery({ queryKey: recoveryKeys.incidents, queryFn: () => recoveryService.getIncidents() });
  const history = useQuery({ queryKey: recoveryKeys.history, queryFn: () => recoveryService.getHistory() });
  const snapshots = useQuery({ queryKey: recoveryKeys.snapshots, queryFn: () => recoveryService.getSnapshots() });
  const queries = [incidents, history, snapshots];

  return {
    incidents,
    history,
    snapshots,
    isInitialLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
  };
}

export function useRecoveryRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: recoveryKeys.all });
}
