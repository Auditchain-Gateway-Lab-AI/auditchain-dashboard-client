import { LifeBuoy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn } from "@/lib/utils";
import type { RecoveryIncident, RecoveryRequest } from "@/types/recovery";

interface ActiveIncidentsProps {
  data: RecoveryIncident[];
  requests: RecoveryRequest[];
  onPrepare: (ids: string[]) => void;
}

const activeStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const inProgressStatuses = new Set(["EXECUTING", "APPLIED_AWAITING_CDC"]);

export function ActiveIncidents({ data, requests, onPrepare }: ActiveIncidentsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const requestByIncident = useMemo(() => latestRequestByIncident(requests), [requests]);
  const selectable = data.filter((incident) => isActionableScope(incident) && incident.status === "OPEN");
  const allSelected = selectable.length > 0 && selectable.every((incident) => selected.has(incident.id));
  const selectedIds = selectable.filter((incident) => selected.has(incident.id)).map((incident) => incident.id);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((incident) => incident.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-elevated px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            <span className="font-semibold text-ink">{selectedIds.length} client source incident{selectedIds.length === 1 ? "" : "s"} selected</span>
            <span className="mx-2 text-ink-faint">|</span>
            <span className="text-ink-dim">Eligibility is checked by the gateway during preview.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear selection</Button>
            <Button variant="default" size="sm" onClick={() => onPrepare(selectedIds)}>
              <LifeBuoy className="size-3.5" /> Preview ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Recovery incidents</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">Only open client source incidents can enter the recovery preview. Gateway integrity incidents stay read only.</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{data.length} records</span>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? <EmptyState message="No recovery incidents were returned for this workspace." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <th className="w-10 px-3.5 py-2.5 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all open client source incidents" className="accent-brand" disabled={!selectable.length} />
                    </th>
                    <Head className="text-left">Target log / resource</Head>
                    <Head className="text-left">Scope / issue</Head>
                    <Head className="text-left">Source state</Head>
                    <Head className="text-left">Detected</Head>
                    <Head className="text-left">Recovery</Head>
                    <Head className="text-right">Action</Head>
                  </tr>
                </thead>
                <tbody>
                  {data.map((incident) => {
                    const canSelect = isActionableScope(incident) && incident.status === "OPEN";
                    const request = requestByIncident.get(incident.id);
                    const requestStatus = String(request?.status || "").toUpperCase();
                    const isBusy = inProgressStatuses.has(requestStatus);
                    return (
                      <tr key={incident.id} className={cn("border-t border-line", selected.has(incident.id) && "bg-info/[0.08]")}>
                        <td className="px-3.5 py-3">
                          <input type="checkbox" checked={selected.has(incident.id)} onChange={() => toggleOne(incident.id)} aria-label={`Select ${incident.log_id}`} disabled={!canSelect || isBusy} className="accent-brand" />
                        </td>
                        <td className="px-3.5 py-3">
                          <code className="font-mono font-semibold text-ink">{incident.reference_log_id || incident.log_id}</code>
                          <small className="mt-1 block text-ink-faint">{incident.resource || "Unknown resource"}</small>
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge tone={incident.incident_scope === "CLIENT_SOURCE" ? "info" : "warning"}>{formatScope(incident.incident_scope)}</Badge>
                          <small className="mt-1 block text-ink-faint">{incident.incident_type || "Integrity mismatch"}</small>
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge tone={sourceTone(incident.source_status)}>{formatStatus(incident.source_status || "NOT_CHECKED")}</Badge>
                          <small className="mt-1 block font-mono text-ink-faint">{shortHash(incident.detected_state_hash || incident.detected_hash)}</small>
                        </td>
                        <td className="px-3.5 py-3 text-ink-dim">{formatDate(incident.detected_at)}</td>
                        <td className="px-3.5 py-3">
                          {request ? <Badge tone={requestTone(requestStatus)}>{formatStatus(requestStatus)}</Badge> : <Badge tone={incident.status === "OPEN" ? "warning" : "neutral"}>{formatStatus(incident.status)}</Badge>}
                          {request?.failure_reason && <small className="mt-1 block max-w-52 text-ink-faint">{request.failure_reason}</small>}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <Button variant={canSelect && !isBusy ? "default" : "outline"} size="sm" disabled={!canSelect || isBusy} onClick={() => onPrepare([incident.id])}>
                            {isBusy ? formatStatus(requestStatus) : canSelect ? "Preview" : "Read only"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function latestRequestByIncident(requests: RecoveryRequest[]) {
  const result = new Map<string, RecoveryRequest>();
  for (const request of requests) {
    const current = result.get(request.incident_id);
    if (!current || new Date(request.requested_at || 0).getTime() > new Date(current.requested_at || 0).getTime()) {
      result.set(request.incident_id, request);
    }
  }
  return result;
}

export function isActionableScope(incident: RecoveryIncident) {
  return String(incident.incident_scope || "").toUpperCase() === "CLIENT_SOURCE";
}

function sourceTone(status?: string) {
  if (status === "MATCHED") return "success" as const;
  if (status === "UNREACHABLE" || status === "NOT_COMPARABLE") return "warning" as const;
  if (status) return "danger" as const;
  return "neutral" as const;
}

function requestTone(status: string) {
  if (status === "SUCCEEDED") return "success" as const;
  if (activeStatuses.has(status)) return "info" as const;
  if (status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT") return "danger" as const;
  return "warning" as const;
}

function formatScope(value: string) {
  return value === "CLIENT_SOURCE" ? "Client source" : value === "GATEWAY_INTEGRITY" ? "Gateway integrity" : formatStatus(value || "UNKNOWN");
}

function formatStatus(value: string) {
  return String(value || "UNKNOWN").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function shortHash(value?: string) {
  if (!value) return "State hash unavailable";
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Head({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-3.5 py-2.5 font-semibold", className)}>{children}</th>;
}
