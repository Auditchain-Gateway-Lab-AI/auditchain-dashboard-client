import { LifeBuoy, Search, X } from "lucide-react";
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
  filter: "ALL" | "OPEN" | "RESOLVED" | "ACTIVE_RECOVERY";
  scope: "ALL" | "CLIENT_SOURCE" | "GATEWAY_INTEGRITY";
  onFilterChange: (value: ActiveIncidentsProps["filter"]) => void;
  onScopeChange: (value: ActiveIncidentsProps["scope"]) => void;
  onPrepare: (ids: string[]) => void;
}

const activeStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const inProgressStatuses = new Set(["EXECUTING", "APPLIED_AWAITING_CDC"]);

export function ActiveIncidents({ data, requests, filter, scope, onFilterChange, onScopeChange, onPrepare }: ActiveIncidentsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "resource">("newest");
  const requestByIncident = useMemo(() => latestRequestByIncident(requests), [requests]);
  const counts = useMemo(() => ({
    all: data.length,
    open: data.filter((incident) => incident.status === "OPEN").length,
    resolved: data.filter((incident) => ["RESOLVED", "RECOVERED"].includes(String(incident.status).toUpperCase())).length,
  }), [data]);
  const filteredData = useMemo(() => data.filter((incident) => {
    const status = String(incident.status).toUpperCase();
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    const statusMatches = filter === "ALL"
      || (filter === "OPEN" && status === "OPEN")
      || (filter === "RESOLVED" && ["RESOLVED", "RECOVERED"].includes(status))
      || (filter === "ACTIVE_RECOVERY" && activeStatuses.has(requestStatus));
    const scopeMatches = scope === "ALL" || String(incident.incident_scope).toUpperCase() === scope;
    const searchText = `${incident.id} ${incident.log_id} ${incident.reference_log_id || ""} ${incident.resource} ${incident.incident_type} ${incident.source_status || ""}`.toLowerCase();
    return statusMatches && scopeMatches && searchText.includes(query.trim().toLowerCase());
  }).sort((a, b) => sort === "resource"
    ? a.resource.localeCompare(b.resource)
    : sort === "oldest"
      ? a.detected_at.localeCompare(b.detected_at)
      : b.detected_at.localeCompare(a.detected_at)), [data, filter, scope, query, sort, requestByIncident]);
  const selectable = filteredData.filter((incident) => {
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    return isActionableScope(incident) && incident.status === "OPEN" && !inProgressStatuses.has(requestStatus);
  });
  const allSelected = selectable.length > 0 && selectable.every((incident) => selected.has(incident.id));
  const selectedIds = data.filter((incident) => {
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    return selected.has(incident.id) && isActionableScope(incident) && incident.status === "OPEN" && !inProgressStatuses.has(requestStatus);
  }).map((incident) => incident.id);

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
      <section className="space-y-3 rounded-lg border border-line bg-panel p-3" aria-label="Incident filters">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incident, log, resource, issue..." className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Search recovery incidents" /></label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-ground px-2.5 text-[10px] text-ink-faint"><span>Scope</span><select value={scope} onChange={(event) => onScopeChange(event.target.value as ActiveIncidentsProps["scope"])} className="h-9 bg-transparent text-xs text-ink outline-none"><option value="ALL">All scopes</option><option value="CLIENT_SOURCE">Client source</option><option value="GATEWAY_INTEGRITY">Gateway integrity</option></select></label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-ground px-2.5 text-[10px] text-ink-faint"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-9 bg-transparent text-xs text-ink outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="resource">Resource A–Z</option></select></label>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {([ ["ALL", "All incidents", counts.all], ["OPEN", "Open", counts.open], ["RESOLVED", "Recovered", counts.resolved], ["ACTIVE_RECOVERY", "Recovery in progress", requests.filter((request) => activeStatuses.has(String(request.status).toUpperCase())).length] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{label}<span className="ml-1.5 font-mono text-ink-faint">{count}</span></button>)}
          {(query || filter !== "ALL" || scope !== "ALL" || sort !== "newest") && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setSort("newest"); onFilterChange("ALL"); onScopeChange("ALL"); }}><X className="size-3" /> Clear filters</Button>}
        </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-elevated px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            <span className="font-semibold text-ink">{selectedIds.length} recovery incident{selectedIds.length === 1 ? "" : "s"} selected</span>
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
            <p className="mt-1 text-[10px] text-ink-faint">Open client source incidents restore a client row. Gateway integrity incidents restore verified audit metadata.</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{filteredData.length} shown · {data.length} total</span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? <EmptyState message={data.length === 0 ? "No recovery incidents were returned for this workspace." : "No incidents match these filters."} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <th className="w-10 px-3.5 py-2.5 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all open recoverable incidents" className="accent-brand" disabled={!selectable.length} />
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
                  {filteredData.map((incident) => {
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
  return ["CLIENT_SOURCE", "GATEWAY_INTEGRITY"].includes(String(incident.incident_scope || "").toUpperCase());
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
