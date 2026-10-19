import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
  Database,
  FileClock,
  History,
  LifeBuoy,
  RotateCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_STORAGE_KEY,
  demoEvidence,
  demoRequests,
  initialDemoState,
  type DemoHistoryEntry,
  type DemoPayload,
  type DemoPersistedState,
} from "@/mocks/recovery.mock";
import type { RecoveryIncident } from "@/types/recovery";

type IncidentFilter = "ALL" | "OPEN" | "RESOLVED";
type ScopeFilter = "ALL" | "CLIENT_SOURCE" | "GATEWAY_INTEGRITY";
type HistoryFilter = "ALL" | "SUCCEEDED" | "FAILED_VERIFICATION";
type Tab = "incidents" | "history";

const activeRequestStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const dialogTransitionMs = 300;
const formatStatus = (value?: string) => (value || "Unknown").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const shortHash = (value?: string) => value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "Unavailable";

function useAnimatedDialog(onExited: () => void) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const close = useCallback((afterExit?: () => void) => {
    if (timer.current !== null) return;
    setVisible(false);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onExitedRef.current();
      afterExit?.();
    }, dialogTransitionMs);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return { visible, close };
}

function readDemoState(): DemoPersistedState {
  if (typeof window === "undefined") return initialDemoState;
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!saved) return initialDemoState;
    const parsed = JSON.parse(saved) as Partial<DemoPersistedState>;
    if (!Array.isArray(parsed.incidents) || !Array.isArray(parsed.history)) return initialDemoState;
    return { incidents: parsed.incidents, history: parsed.history } as DemoPersistedState;
  } catch {
    return initialDemoState;
  }
}

function latestRequestFor(incidentId: string) {
  return demoRequests.filter((request) => request.incident_id === incidentId)
    .sort((a, b) => (b.requested_at || "").localeCompare(a.requested_at || ""))[0];
}

function canSelectIncident(incident: RecoveryIncident) {
  const request = latestRequestFor(incident.id);
  return incident.incident_scope === "CLIENT_SOURCE"
    && incident.status === "OPEN"
    && !activeRequestStatuses.has(String(request?.status || "").toUpperCase());
}

function isReadyForRecovery(incident: RecoveryIncident) {
  const evidence = demoEvidence[incident.id];
  return canSelectIncident(incident)
    && incident.source_status !== "UNREACHABLE"
    && Boolean(evidence?.snapshot && evidence?.anchor);
}

function requestStatus(incidentId: string) {
  return latestRequestFor(incidentId)?.status;
}

export function RecoveryDemo() {
  const [demo, setDemo] = useState<DemoPersistedState>(readDemoState);
  const [tab, setTab] = useState<Tab>("incidents");
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>("ALL");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<string[]>([]);
  const [detailIncident, setDetailIncident] = useState<RecoveryIncident | null>(null);
  const [previewIds, setPreviewIds] = useState<string[] | null>(null);
  const [includedPreviewIds, setIncludedPreviewIds] = useState<string[]>([]);
  const [focusedPreviewId, setFocusedPreviewId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [historyQuery, setHistoryQuery] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [compareHistoryIds, setCompareHistoryIds] = useState<string[] | null>(null);
  const [focusedHistoryId, setFocusedHistoryId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  useEffect(() => {
    try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo)); } catch { /* Browser storage may be disabled. */ }
  }, [demo]);

  const incidents = demo.incidents;
  const history = demo.history;
  const filteredIncidents = useMemo(() => incidents.filter((incident) => {
    const searchText = `${incident.id} ${incident.log_id} ${incident.reference_log_id || ""} ${incident.resource} ${incident.incident_type} ${incident.source_status || ""}`.toLowerCase();
    return (incidentFilter === "ALL" || incident.status === incidentFilter)
      && (scopeFilter === "ALL" || incident.incident_scope === scopeFilter)
      && searchText.includes(query.trim().toLowerCase());
  }).sort((a, b) => sort === "resource"
    ? a.resource.localeCompare(b.resource)
    : sort === "oldest"
      ? a.detected_at.localeCompare(b.detected_at)
      : b.detected_at.localeCompare(a.detected_at)), [incidents, incidentFilter, scopeFilter, sort, query]);

  const visibleSelectableIds = filteredIncidents.filter(canSelectIncident).map((incident) => incident.id);
  const allVisibleIncidentsSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedIncidentIds.includes(id));
  const previewItems = previewIds?.map((id) => incidents.find((incident) => incident.id === id)).filter((incident): incident is RecoveryIncident => Boolean(incident)) || [];
  const includedPreviewItems = previewItems.filter((incident) => includedPreviewIds.includes(incident.id));
  const readyPreviewItems = includedPreviewItems.filter(isReadyForRecovery);
  const manualReviewItems = includedPreviewItems.filter((incident) => !isReadyForRecovery(incident));
  const focusedPreview = previewItems.find((incident) => incident.id === focusedPreviewId) || previewItems[0] || null;

  const filteredHistory = useMemo(() => history.filter((entry) => {
    const text = `${entry.id} ${entry.incidentId} ${entry.logId} ${entry.resource} ${entry.operation} ${entry.result}`.toLowerCase();
    return (historyFilter === "ALL" || entry.result === historyFilter) && text.includes(historyQuery.trim().toLowerCase());
  }).sort((a, b) => b.executedAt.localeCompare(a.executedAt)), [history, historyFilter, historyQuery]);
  const visibleHistoryIds = filteredHistory.map((entry) => entry.id);
  const allVisibleHistorySelected = visibleHistoryIds.length > 0 && visibleHistoryIds.every((id) => selectedHistoryIds.includes(id));
  const compareItems = compareHistoryIds?.map((id) => history.find((entry) => entry.id === id)).filter((entry): entry is DemoHistoryEntry => Boolean(entry)) || [];
  const focusedHistory = compareItems.find((entry) => entry.id === focusedHistoryId) || compareItems[0] || null;

  function openPreview(ids: string[]) {
    const eligibleIds = ids.filter((id) => incidents.some((incident) => incident.id === id && canSelectIncident(incident)));
    setDetailIncident(null);
    setPreviewIds(eligibleIds);
    setIncludedPreviewIds(eligibleIds);
    setFocusedPreviewId(eligibleIds[0] || null);
    setConfirmed(false);
  }

  function toggleIncident(id: string) {
    setSelectedIncidentIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleVisibleIncidents() {
    setSelectedIncidentIds((current) => allVisibleIncidentsSelected
      ? current.filter((id) => !visibleSelectableIds.includes(id))
      : [...new Set([...current, ...visibleSelectableIds])]);
  }

  function toggleHistoryEntry(id: string) {
    setSelectedHistoryIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleVisibleHistory() {
    setSelectedHistoryIds((current) => allVisibleHistorySelected
      ? current.filter((id) => !visibleHistoryIds.includes(id))
      : [...new Set([...current, ...visibleHistoryIds])]);
  }

  function simulateRecovery() {
    if (!readyPreviewItems.length) return;
    const now = new Date().toISOString();
    const recoveredIds = readyPreviewItems.map((incident) => incident.id);
    const newEntries: DemoHistoryEntry[] = readyPreviewItems.map((incident, index) => {
      const evidence = demoEvidence[incident.id]!;
      return {
        id: `DEMO-EVT-${Date.now()}-${index}`,
        incidentId: incident.id,
        logId: incident.log_id,
        resource: incident.resource,
        operation: evidence.operation,
        result: "SUCCEEDED",
        integrity: "VALID",
        cdc: "CONFIRMED",
        executedAt: now,
        beforeHash: incident.detected_state_hash || incident.detected_hash,
        afterHash: incident.expected_hash,
        beforeData: evidence.currentData,
        afterData: evidence.trustedData,
      };
    });

    setDemo((current) => ({
      incidents: current.incidents.map((incident) => recoveredIds.includes(incident.id)
        ? { ...incident, status: "RESOLVED", source_status: "MATCHED", resolved_at: now }
        : incident),
      history: [...newEntries, ...current.history],
    }));
    setSelectedIncidentIds((current) => current.filter((id) => !recoveredIds.includes(id)));
    setSelectedHistoryIds([]);
    setTab("history");
    setNotice(`${newEntries.length} demo recovery result${newEntries.length === 1 ? "" : "s"} added to history. Manual review cases stayed open.`);
  }

  function resetDemo() {
    if (!window.confirm("Reset this browser's Recovery demo incidents and history to the sample data?")) return;
    setDemo(initialDemoState);
    setSelectedIncidentIds([]);
    setSelectedHistoryIds([]);
    setNotice("Demo data reset to its original sample state.");
  }

  function openHistoryCompare(ids: string[]) {
    setCompareHistoryIds(ids);
    setFocusedHistoryId(ids[0] || null);
  }

  const openCount = incidents.filter((incident) => incident.status === "OPEN" && incident.incident_scope === "CLIENT_SOURCE").length;
  const readyCount = incidents.filter(isReadyForRecovery).length;
  const recoveredCount = incidents.filter((incident) => incident.status === "RESOLVED").length;

  return (
    <main className="mx-auto max-w-[1600px] space-y-4 px-3 pb-24 pt-5 lg:px-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-bright">Client recovery</span><Badge tone="info">UI demo</Badge></div>
          <h1 className="text-[27px] font-semibold tracking-tight text-ink">Recovery Workspace</h1>
          <p className="mt-1 text-xs text-ink-dim">Review tampered client records, compare trusted data, and inspect recovery history.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-ink-faint sm:inline">Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
          <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}><RotateCw className="size-3.5" /> Refresh view</Button>
          <Button variant="ghost" size="sm" onClick={resetDemo}>Reset demo</Button>
        </div>
      </header>

      <div className="rounded-lg border border-info/25 bg-info/[0.07] px-3.5 py-2.5 text-[11px] text-ink-dim"><strong className="text-info">Prototype with synthetic sample data.</strong> Recovery actions are simulated in this browser and saved in local browser storage. No gateway or client database request is sent.</div>
      {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-success/25 bg-success/[0.08] px-3.5 py-2.5 text-[11px] text-success"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X className="size-3.5" /></button></div>}

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-4" aria-label="Recovery summary">
        <Metric icon={AlertTriangle} label="Open to recover" value={openCount} detail="Need review or action" tone="danger" onClick={() => { setTab("incidents"); setIncidentFilter("OPEN"); }} />
        <Metric icon={LifeBuoy} label="Ready to recover" value={readyCount} detail="Snapshot and anchor available" tone="success" onClick={() => { setTab("incidents"); setIncidentFilter("OPEN"); setScopeFilter("CLIENT_SOURCE"); }} />
        <Metric icon={CheckCircle2} label="Recovered cases" value={recoveredCount} detail="Closed after demo recovery" tone="info" onClick={() => { setTab("incidents"); setIncidentFilter("RESOLVED"); }} />
        <Metric icon={History} label="History records" value={history.length} detail="Before/after evidence retained" tone="neutral" onClick={() => setTab("history")} />
      </section>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1" role="tablist" aria-label="Recovery sections">
        <TabButton active={tab === "incidents"} onClick={() => setTab("incidents")} icon={Database} label="Incidents" count={incidents.length} />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={FileClock} label="Recovery history" count={history.length} />
      </div>

      {tab === "incidents" ? (
        <IncidentWorkspace
          incidents={filteredIncidents}
          allIncidents={incidents}
          filter={incidentFilter}
          onFilter={setIncidentFilter}
          scope={scopeFilter}
          onScope={setScopeFilter}
          sort={sort}
          onSort={setSort}
          query={query}
          onQuery={setQuery}
          selected={selectedIncidentIds}
          selectableIds={visibleSelectableIds}
          allSelected={allVisibleIncidentsSelected}
          onToggleAll={toggleVisibleIncidents}
          onToggle={toggleIncident}
          onDetails={setDetailIncident}
          onClear={() => { setSelectedIncidentIds([]); setQuery(""); setScopeFilter("ALL"); setIncidentFilter("ALL"); setSort("newest"); }}
          onPrepare={() => openPreview(selectedIncidentIds)}
        />
      ) : (
        <HistoryWorkspace
          entries={filteredHistory}
          total={history.length}
          filter={historyFilter}
          onFilter={setHistoryFilter}
          query={historyQuery}
          onQuery={setHistoryQuery}
          selected={selectedHistoryIds}
          allSelected={allVisibleHistorySelected}
          onToggleAll={toggleVisibleHistory}
          onToggle={toggleHistoryEntry}
          onCompare={() => openHistoryCompare(selectedHistoryIds)}
          onOpen={(id) => openHistoryCompare([id])}
          onClear={() => { setSelectedHistoryIds([]); setHistoryFilter("ALL"); setHistoryQuery(""); }}
        />
      )}

      {detailIncident && <IncidentDetail incident={detailIncident} onClose={() => setDetailIncident(null)} onPreview={() => openPreview([detailIncident.id])} />}
      {previewIds && (
        <RecoveryPreview
          items={previewItems}
          includedIds={includedPreviewIds}
          focused={focusedPreview}
          readyItems={readyPreviewItems}
          manualReviewItems={manualReviewItems}
          confirmed={confirmed}
          onToggleIncluded={(id) => setIncludedPreviewIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
          onFocus={setFocusedPreviewId}
          onIncludeAll={() => setIncludedPreviewIds(previewItems.map((item) => item.id))}
          onExcludeAll={() => setIncludedPreviewIds([])}
          onConfirm={setConfirmed}
          onClose={() => setPreviewIds(null)}
          onExecute={simulateRecovery}
        />
      )}
      {compareHistoryIds && (
        <HistoryCompare
          entries={compareItems}
          focused={focusedHistory}
          onFocus={setFocusedHistoryId}
          onClose={() => setCompareHistoryIds(null)}
        />
      )}
    </main>
  );
}

function IncidentWorkspace({
  incidents, allIncidents, filter, onFilter, scope, onScope, sort, onSort, query, onQuery,
  selected, selectableIds, allSelected, onToggleAll, onToggle, onDetails, onClear, onPrepare,
}: {
  incidents: RecoveryIncident[];
  allIncidents: RecoveryIncident[];
  filter: IncidentFilter;
  onFilter: (value: IncidentFilter) => void;
  scope: ScopeFilter;
  onScope: (value: ScopeFilter) => void;
  sort: string;
  onSort: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
  selected: string[];
  selectableIds: string[];
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onDetails: (incident: RecoveryIncident) => void;
  onClear: () => void;
  onPrepare: () => void;
}) {
  const openCount = allIncidents.filter((incident) => incident.status === "OPEN").length;
  const resolvedCount = allIncidents.filter((incident) => incident.status === "RESOLVED" && incident.incident_scope === "CLIENT_SOURCE").length;
  const statusItems: Array<{ value: IncidentFilter; label: string; count: number }> = [
    { value: "ALL", label: "All incidents", count: allIncidents.length },
    { value: "OPEN", label: "Open to recover", count: openCount },
    { value: "RESOLVED", label: "Recovered / closed", count: resolvedCount },
  ];
  return (
    <div className="space-y-3">
      <section className="space-y-3 rounded-xl border border-line bg-panel p-3.5">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search incident, log, resource, issue…" className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Search incidents" /></label>
          <Dropdown label="Scope" value={scope} onChange={(value) => onScope(value as ScopeFilter)} options={[["ALL", "All scopes"], ["CLIENT_SOURCE", "Client source"], ["GATEWAY_INTEGRITY", "Gateway integrity"]]} />
          <Dropdown label="Sort" value={sort} onChange={onSort} options={[["newest", "Newest first"], ["oldest", "Oldest first"], ["resource", "Resource A–Z"]]} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {statusItems.map((item) => <button key={item.value} onClick={() => { onFilter(item.value); onScope(item.value === "ALL" ? "ALL" : "CLIENT_SOURCE"); }} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${filter === item.value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{item.label}<span className="ml-1.5 font-mono text-[10px] text-ink-faint">{item.count}</span></button>)}
          {(query || scope !== "ALL" || filter !== "ALL") && <Button variant="ghost" size="sm" onClick={onClear}><X className="size-3" /> Clear filters</Button>}
          <span className="ml-auto hidden text-[10px] text-ink-faint sm:inline">{openCount} open · {resolvedCount} recovered</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3"><div><h2 className="text-sm font-semibold text-ink">Client recovery incidents</h2><p className="mt-0.5 text-[10px] text-ink-faint">Click a row to inspect it. Select checkboxes to review several together. Gateway integrity cases stay read only.</p></div><Badge tone="neutral">{incidents.length} shown · {selectableIds.length} selectable</Badge></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-ground/60 text-[9px] uppercase tracking-wider text-ink-faint"><tr><th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} disabled={!selectableIds.length} aria-label="Select all eligible incidents shown" className="accent-brand" /></th><th className="px-3 py-3">Target log / resource</th><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Client state</th><th className="px-3 py-3">Trusted evidence</th><th className="px-3 py-3">Case status</th></tr></thead><tbody>
          {incidents.map((incident) => {
            const evidence = demoEvidence[incident.id];
            const canSelect = canSelectIncident(incident);
            const latestRequest = requestStatus(incident.id);
            const caseLabel = incident.status === "RESOLVED" ? "Recovered" : activeRequestStatuses.has(String(latestRequest || "")) ? "Recovery in progress" : isReadyForRecovery(incident) ? "Ready to recover" : incident.incident_scope !== "CLIENT_SOURCE" ? "Read only" : "Manual review";
            const caseTone = incident.status === "RESOLVED" ? "success" : activeRequestStatuses.has(String(latestRequest || "")) ? "info" : isReadyForRecovery(incident) ? "success" : "warning";
            return <tr key={incident.id} tabIndex={0} title="Click to inspect this incident" onClick={() => onDetails(incident)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onDetails(incident); } }} className={`cursor-pointer border-t border-line outline-none focus-visible:bg-elevated/70 ${selected.includes(incident.id) ? "bg-info/[0.08]" : "hover:bg-elevated/40"}`}>
              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.includes(incident.id)} onChange={() => onToggle(incident.id)} disabled={!canSelect} aria-label={`Select ${incident.log_id}`} className="accent-brand" /></td>
              <td className="px-3 py-3"><span className="font-mono font-semibold text-ink">{incident.reference_log_id || incident.log_id}</span><div className="mt-1 text-[10px] text-ink-faint">{incident.resource}</div></td>
              <td className="px-3 py-3"><div className="flex items-center gap-1.5"><Badge tone={incident.incident_scope === "CLIENT_SOURCE" ? "danger" : "warning"}>{formatStatus(incident.incident_type)}</Badge></div><small className="mt-1 block text-[10px] text-ink-faint">{formatStatus(incident.incident_scope)}</small></td>
              <td className="px-3 py-3"><Badge tone={incident.source_status === "MATCHED" ? "success" : incident.source_status === "UNREACHABLE" ? "warning" : "danger"}>{formatStatus(incident.source_status)}</Badge><small className="mt-1 block font-mono text-[10px] text-ink-faint">{shortHash(incident.detected_state_hash || incident.detected_hash)}</small></td>
              <td className="px-3 py-3"><Badge tone={evidence?.snapshot && evidence?.anchor ? "success" : "warning"}>{evidence?.snapshot && evidence?.anchor ? "Snapshot + anchor" : "Incomplete"}</Badge><small className="mt-1 block text-[10px] text-ink-faint">{evidence?.source || "Evidence unavailable"}</small></td>
              <td className="px-3 py-3"><Badge tone={caseTone}>{caseLabel}</Badge></td>
            </tr>;
          })}
        </tbody></table>
          {!incidents.length && <div className="px-4 py-16 text-center text-xs text-ink-dim">No incidents match these filters. Clear filters to see the sample queue.</div>}
        </div>
      </section>

      {selected.length > 0 && <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/40 bg-elevated px-4 py-3 shadow-2xl"><div><strong className="text-xs text-ink">{selected.length} incidents selected</strong><p className="text-[10px] text-ink-faint">Review the red and green data comparison before simulating recovery.</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => onToggleAll()}>{allSelected ? "Deselect visible" : "Select visible"}</Button><Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button><Button size="sm" onClick={onPrepare}><LifeBuoy className="size-3.5" /> Review recovery ({selected.length})</Button></div></div>}
    </div>
  );
}

function RecoveryPreview({
  items, includedIds, focused, readyItems, manualReviewItems, confirmed,
  onToggleIncluded, onFocus, onIncludeAll, onExcludeAll, onConfirm, onClose, onExecute,
}: {
  items: RecoveryIncident[];
  includedIds: string[];
  focused: RecoveryIncident | null;
  readyItems: RecoveryIncident[];
  manualReviewItems: RecoveryIncident[];
  confirmed: boolean;
  onToggleIncluded: (id: string) => void;
  onFocus: (id: string) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onConfirm: (value: boolean) => void;
  onClose: () => void;
  onExecute: () => void;
}) {
  const motion = useAnimatedDialog(onClose);
  const recovered = items.filter((item) => item.status === "RESOLVED").length;
  const notActionable = includedIds.length - readyItems.length;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:p-5 ${motion.visible ? "opacity-100" : "opacity-0"}`} onMouseDown={() => motion.close()}>
      <section role="dialog" aria-modal="true" aria-labelledby="recovery-preview-title" className={`flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${motion.visible ? "translate-x-0 scale-100 opacity-100" : "translate-x-8 scale-[0.99] opacity-0"}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-line px-4 py-3.5 sm:px-6">
          <div><div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-bright"><ShieldCheck className="size-3.5" /> Demo preflight preview</div><h2 id="recovery-preview-title" className="mt-1 text-lg font-semibold text-ink sm:text-xl">Review recovery data</h2><p className="mt-1 font-mono text-[11px] text-ink-dim">{items.length} incidents · <span className="text-success">{readyItems.length} ready</span> · {recovered} recovered · {notActionable} not actionable</p></div>
          <Button variant="ghost" size="icon" onClick={() => motion.close()} aria-label="Close preview"><X className="size-4" /></Button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="flex max-h-44 flex-col border-b border-line md:max-h-none md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-line px-3 py-2"><span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint">Selected incidents ({includedIds.length}/{items.length})</span><div className="flex gap-2"><button className="text-[10px] font-semibold text-brand-bright hover:text-ink" onClick={onIncludeAll}>Include all</button><button className="text-[10px] font-semibold text-ink-dim hover:text-ink" onClick={onExcludeAll}>Exclude all</button></div></div>
            <div className="min-h-0 flex-1 overflow-y-auto">{items.map((item) => {
              const included = includedIds.includes(item.id);
              const ready = isReadyForRecovery(item);
              return <div key={item.id} className={`flex items-start gap-2 border-b border-line px-3 py-3 ${focused?.id === item.id ? "border-l-[3px] border-l-navy-bright bg-navy-bright/15" : ""}`}>
                <input type="checkbox" checked={included} onChange={() => onToggleIncluded(item.id)} aria-label={`Include ${item.log_id} in recovery`} className="mt-0.5 accent-brand" />
                <button className="min-w-0 flex-1 text-left" onClick={() => onFocus(item.id)}><span className="block truncate font-mono text-[11px] font-semibold text-ink">{item.resource.split("/").pop()?.trim() || item.log_id}</span><span className="mt-1 block text-[9px] uppercase tracking-wider text-ink-faint">{formatStatus(item.incident_type)}</span></button>
                <Badge tone={ready ? "success" : "warning"}>{ready ? "Ready" : "Review"}</Badge>
              </div>;
            })}</div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
            {focused ? <PreviewIncident incident={focused} included={includedIds.includes(focused.id)} /> : <div className="p-12 text-center text-xs text-ink-faint">Include a row and select it to review evidence.</div>}
          </div>
        </div>

        <footer className="space-y-3 border-t border-line px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-start gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />Preflight in this prototype reads synthetic sample data only. Recovery completes in a future backend flow after CDC and evidence verification.</p><div className="flex gap-2"><Button variant="outline" onClick={() => motion.close()}>Close</Button><Button disabled={!confirmed || readyItems.length === 0} onClick={() => { onExecute(); motion.close(); }}><LifeBuoy className="size-3.5" /> Execute recovery ({readyItems.length})</Button></div></div>
          <label className="flex items-center gap-2 text-[10px] text-ink-dim"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} className="accent-brand" />I reviewed the differences. Only ready records will be marked recovered in the demo.</label>
          {manualReviewItems.length > 0 && <p className="text-[10px] text-warning">{manualReviewItems.length} included case{manualReviewItems.length === 1 ? "" : "s"} will stay open for manual review.</p>}
        </footer>
      </section>
    </div>
  );
}

function PreviewIncident({ incident, included }: { incident: RecoveryIncident; included: boolean }) {
  const evidence = demoEvidence[incident.id];
  const ready = isReadyForRecovery(incident);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-ink">{incident.resource}</h3><p className="mt-1 font-mono text-[10px] text-ink-faint">{incident.reference_log_id || incident.log_id} · {formatStatus(incident.incident_type)}</p></div><Badge tone={ready ? "success" : "warning"}>{ready ? "Ready to restore" : "Manual review required"}</Badge></div>
      <div className="grid gap-2 sm:grid-cols-4"><Meta label="Action" value={evidence?.operation || "Unavailable"} /><Meta label="Source system" value={evidence?.source || "Unavailable"} /><Meta label="Snapshot" value={evidence?.snapshot ? "Available" : "Unavailable"} good={Boolean(evidence?.snapshot)} /><Meta label="Evidence anchor" value={evidence?.anchor ? "Verified in sample" : "Unavailable"} good={Boolean(evidence?.anchor)} /></div>
      <div className="grid gap-2 sm:grid-cols-2"><HashCard label="Tampered client state hash" value={incident.detected_state_hash || incident.detected_hash} tone="danger" /><HashCard label="Original trusted state hash" value={incident.expected_hash} tone="success" /></div>
      {evidence ? <PayloadComparison before={evidence.currentData} after={evidence.trustedData} beforeTitle="Tampered client data" afterTitle="Original trusted data" /> : <div className="rounded-lg border border-warning/30 bg-warning/[0.06] p-4 text-xs text-warning">Trusted reference data is unavailable for this incident.</div>}
      {!included && <p className="rounded-md border border-line bg-ground px-3 py-2 text-[10px] text-ink-faint">Excluded from the current recovery batch. Select the checkbox to include it.</p>}
      {!ready && included && <div className="rounded-lg border border-warning/30 bg-warning/[0.06] p-3 text-[11px] text-warning">{incident.incident_scope !== "CLIENT_SOURCE" ? "Gateway integrity incidents are read only in this client recovery flow." : incident.source_status === "UNREACHABLE" ? "The client source is unreachable. Recovery cannot be safely preflighted." : !evidence?.snapshot ? "No trusted snapshot is available. This case needs manual review." : "The trusted evidence anchor is not available. This case needs manual review."}</div>}
      <p className="text-[9px] text-ink-faint">Synthetic example values for UI review. They are not read from a real client record.</p>
    </div>
  );
}

function HistoryWorkspace({
  entries, total, filter, onFilter, query, onQuery, selected, allSelected,
  onToggleAll, onToggle, onCompare, onOpen, onClear,
}: {
  entries: DemoHistoryEntry[];
  total: number;
  filter: HistoryFilter;
  onFilter: (value: HistoryFilter) => void;
  query: string;
  onQuery: (value: string) => void;
  selected: string[];
  allSelected: boolean;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onCompare: () => void;
  onOpen: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <section className="space-y-3 rounded-xl border border-line bg-panel p-3.5"><div className="flex flex-wrap gap-2"><label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search event, log, resource…" className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Search recovery history" /></label><div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ground p-1">{(["ALL", "SUCCEEDED", "FAILED_VERIFICATION"] as HistoryFilter[]).map((value) => <button key={value} onClick={() => onFilter(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{value === "ALL" ? "All results" : value === "SUCCEEDED" ? "Recovered" : "Needs review"}</button>)}</div>{(query || filter !== "ALL") && <Button variant="ghost" size="sm" onClick={onClear}><X className="size-3" /> Clear filters</Button>}</div><p className="text-[10px] text-ink-faint">{entries.length} shown · {total} retained in this browser · select rows to compare multiple before/after records.</p></section>

      <section className="overflow-hidden rounded-xl border border-line bg-panel"><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="text-sm font-semibold text-ink">Recovery history</h2><p className="mt-0.5 text-[10px] text-ink-faint">Each result retains the client state before and after the demo action.</p></div><Badge tone="neutral">{total} records</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-ground/60 text-[9px] uppercase tracking-wider text-ink-faint"><tr><th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} disabled={!entries.length} aria-label="Select all history results shown" className="accent-brand" /></th><th className="px-3 py-3">Log / resource</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Integrity / CDC</th><th className="px-3 py-3">Executed</th><th className="px-4 py-3 text-right">Before / after</th></tr></thead><tbody>
          {entries.map((entry) => <tr key={entry.id} className={`border-t border-line ${selected.includes(entry.id) ? "bg-info/[0.08]" : "hover:bg-elevated/40"}`}><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => onToggle(entry.id)} aria-label={`Select history event ${entry.id}`} className="accent-brand" /></td><td className="px-3 py-3"><strong className="font-mono text-ink">{entry.logId}</strong><span className="mt-1 block text-[10px] text-ink-faint">{entry.resource} · {entry.id}</span></td><td className="px-3 py-3 text-ink-dim">{entry.operation}</td><td className="px-3 py-3"><Badge tone={entry.result === "SUCCEEDED" ? "success" : "danger"}>{entry.result === "SUCCEEDED" ? "Recovered" : "Failed · unchanged"}</Badge>{entry.reason && <small className="mt-1 block max-w-48 text-[9px] text-ink-faint">{entry.reason}</small>}</td><td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><Badge tone={entry.integrity === "VALID" ? "success" : "warning"}>{formatStatus(entry.integrity)}</Badge><Badge tone={entry.cdc === "CONFIRMED" ? "success" : "neutral"}>CDC {formatStatus(entry.cdc)}</Badge></div></td><td className="px-3 py-3 text-[10px] text-ink-dim">{formatDate(entry.executedAt)}</td><td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => onOpen(entry.id)}><ArrowDownUp className="size-3" /> Compare</Button></td></tr>)}
        </tbody></table>{!entries.length && <div className="px-4 py-16 text-center text-xs text-ink-dim">No history entries match these filters.</div>}</div></section>
      {selected.length > 0 && <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/40 bg-elevated px-4 py-3 shadow-2xl"><div><strong className="text-xs text-ink">{selected.length} history records selected</strong><p className="text-[10px] text-ink-faint">Compare before and after values for every selected log.</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button><Button size="sm" onClick={onCompare}><ArrowDownUp className="size-3.5" /> Compare selected ({selected.length})</Button></div></div>}
    </div>
  );
}

function HistoryCompare({ entries, focused, onFocus, onClose }: { entries: DemoHistoryEntry[]; focused: DemoHistoryEntry | null; onFocus: (id: string) => void; onClose: () => void }) {
  const motion = useAnimatedDialog(onClose);
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:p-5 ${motion.visible ? "opacity-100" : "opacity-0"}`} onMouseDown={() => motion.close()}><section role="dialog" aria-modal="true" aria-label="History before and after comparison" className={`flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${motion.visible ? "translate-x-0 scale-100 opacity-100" : "translate-x-8 scale-[0.99] opacity-0"}`} onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b border-line px-4 py-3.5 sm:px-6"><div><div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-bright"><History className="size-3.5" /> Recovery evidence</div><h2 className="mt-1 text-lg font-semibold text-ink">Before / after comparison</h2><p className="mt-1 font-mono text-[11px] text-ink-dim">{entries.length} selected log{entries.length === 1 ? "" : "s"} · before/after data retained in demo history</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close comparison"><X className="size-4" /></Button></header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[270px_minmax(0,1fr)]"><aside className="max-h-36 overflow-y-auto border-b border-line md:max-h-none md:border-b-0 md:border-r">{entries.map((entry) => <button key={entry.id} onClick={() => onFocus(entry.id)} className={`flex w-full items-start justify-between gap-2 border-b border-line px-3 py-3 text-left ${focused?.id === entry.id ? "border-l-[3px] border-l-navy-bright bg-navy-bright/15" : "hover:bg-elevated/60"}`}><span className="min-w-0"><strong className="block truncate font-mono text-[11px] text-ink">{entry.logId}</strong><small className="mt-1 block truncate text-[9px] text-ink-faint">{entry.resource}</small></span><Badge tone={entry.result === "SUCCEEDED" ? "success" : "danger"}>{entry.result === "SUCCEEDED" ? "OK" : "Failed"}</Badge></button>)}</aside><div className="min-h-0 overflow-y-auto p-3 sm:p-5">{focused ? <HistoryEntryComparison entry={focused} /> : <div className="p-12 text-center text-xs text-ink-faint">No history entries selected.</div>}</div></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6"><p className="text-[10px] text-ink-faint">Red marks the recorded client state before execution. Green marks the trusted result after recovery.</p><Button variant="outline" onClick={() => motion.close()}>Close</Button></footer>
    </section></div>
  );
}

function HistoryEntryComparison({ entry }: { entry: DemoHistoryEntry }) {
  return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-ink">{entry.resource}</h3><p className="mt-1 font-mono text-[10px] text-ink-faint">{entry.logId} · {entry.id} · {formatDate(entry.executedAt)}</p></div><Badge tone={entry.result === "SUCCEEDED" ? "success" : "danger"}>{entry.result === "SUCCEEDED" ? "Recovery succeeded" : "Recovery failed · client unchanged"}</Badge></div><div className="grid gap-2 sm:grid-cols-4"><Meta label="Action" value={entry.operation} /><Meta label="Integrity" value={entry.integrity} good={entry.integrity === "VALID"} /><Meta label="CDC confirmation" value={entry.cdc} good={entry.cdc === "CONFIRMED"} /><Meta label="Incident" value={entry.incidentId} /></div><div className="grid gap-2 sm:grid-cols-2"><HashCard label="Before hash" value={entry.beforeHash} tone="danger" /><HashCard label="After hash" value={entry.afterHash} tone={entry.result === "SUCCEEDED" ? "success" : "danger"} /></div><PayloadComparison before={entry.beforeData} after={entry.afterData} beforeTitle="Before · client data" afterTitle={entry.result === "SUCCEEDED" ? "After · trusted result" : "After · unchanged client data"} afterTone={entry.result === "SUCCEEDED" ? "success" : "danger"} />{entry.reason && <div className="rounded-lg border border-danger/25 bg-danger/[0.06] p-3 text-[11px] text-danger">{entry.reason}</div>}</div>;
}

function IncidentDetail({ incident, onClose, onPreview }: { incident: RecoveryIncident; onClose: () => void; onPreview: () => void }) {
  const motion = useAnimatedDialog(onClose);
  const evidence = demoEvidence[incident.id];
  const ready = isReadyForRecovery(incident);
  return (
    <div className={`fixed inset-0 z-40 flex justify-end bg-black/65 transition-opacity duration-300 ease-out motion-reduce:transition-none ${motion.visible ? "opacity-100" : "opacity-0"}`} onMouseDown={() => motion.close()}><aside role="dialog" aria-modal="true" aria-label="Incident detail" className={`flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line-strong bg-panel shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${motion.visible ? "translate-x-0" : "translate-x-full"}`} onMouseDown={(event) => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex justify-between border-b border-line bg-panel px-5 py-4"><div><span className="font-mono text-[10px] uppercase tracking-widest text-brand-bright">Incident detail · demo</span><h2 className="mt-1 text-lg font-semibold text-ink">{incident.resource}</h2><p className="mt-1 font-mono text-[11px] text-ink-faint">{incident.id} · {incident.log_id}</p></div><Button variant="ghost" size="icon" onClick={() => motion.close()} aria-label="Close details"><X className="size-4" /></Button></div>
      <div className="space-y-4 p-5"><div className="flex flex-wrap gap-2"><Badge tone={incident.status === "RESOLVED" ? "success" : "danger"}>{incident.status === "RESOLVED" ? "Recovered" : "Open incident"}</Badge><Badge tone={ready ? "success" : "warning"}>{ready ? "Ready to recover" : "Manual review / read only"}</Badge><Badge tone="neutral">{formatStatus(incident.source_status)}</Badge></div><p className="text-xs leading-relaxed text-ink-dim">{incident.incident_scope === "CLIENT_SOURCE" ? "Review the current client state against the trusted reference. The recovery preview checks sample snapshot and anchor availability." : "Gateway integrity incidents can be inspected, but are not selectable for client data recovery."}</p><div className="grid gap-2 sm:grid-cols-2"><Meta label="Issue" value={formatStatus(incident.incident_type)} /><Meta label="Detected at" value={formatDate(incident.detected_at)} /><Meta label="Current state hash" value={shortHash(incident.detected_state_hash || incident.detected_hash)} /><Meta label="Trusted state hash" value={shortHash(incident.expected_hash)} /></div>{evidence && <><div className="grid gap-2 sm:grid-cols-3"><Meta label="Operation" value={evidence.operation} /><Meta label="Snapshot" value={evidence.snapshot ? "Available" : "Missing"} good={evidence.snapshot} /><Meta label="Anchor" value={evidence.anchor ? "Verified in sample" : "Unavailable"} good={evidence.anchor} /></div><PayloadComparison before={evidence.currentData} after={evidence.trustedData} beforeTitle="Tampered client data" afterTitle="Original trusted data" /></>}</div>
      <div className="sticky bottom-0 mt-auto flex justify-end gap-2 border-t border-line bg-panel px-5 py-4"><Button variant="outline" onClick={() => motion.close()}>Close</Button><Button disabled={!canSelectIncident(incident)} onClick={() => motion.close(onPreview)}><LifeBuoy className="size-3.5" /> Review recovery</Button></div>
    </aside></div>
  );
}

function PayloadComparison({ before, after, beforeTitle, afterTitle, afterTone = "success" }: { before: DemoPayload | null; after: DemoPayload | null; beforeTitle: string; afterTitle: string; afterTone?: "danger" | "success" }) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  const changed = (key: string) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null);
  const changedCount = keys.filter(changed).length;
  return <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint">Field comparison</span><Badge tone={changedCount ? "warning" : "success"}>{changedCount ? `${changedCount} field${changedCount === 1 ? "" : "s"} differ` : "No field differences"}</Badge></div><div className="grid gap-3 xl:grid-cols-2"><PayloadCard title={beforeTitle} payload={before} keys={keys} isChanged={changed} tone="danger" /><PayloadCard title={afterTitle} payload={after} keys={keys} isChanged={changed} tone={afterTone} /></div></div>;
}

function PayloadCard({ title, payload, keys, isChanged, tone }: { title: string; payload: DemoPayload | null; keys: string[]; isChanged: (key: string) => boolean; tone: "danger" | "success" }) {
  const palette = tone === "danger"
    ? { text: "text-danger", border: "border-danger/35", background: "bg-danger/[0.05]", changed: "bg-danger/[0.13]", label: "Tampered" }
    : { text: "text-success", border: "border-success/35", background: "bg-success/[0.05]", changed: "bg-success/[0.13]", label: "Trusted" };
  return <section className={`min-w-0 rounded-lg border ${palette.border} ${palette.background} p-3`}><div className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider ${palette.text}`}><span>{title}</span><span>{palette.label}</span></div>{payload === null ? <div className="rounded-md border border-dashed border-line-strong bg-ground/50 px-3 py-5 text-center text-[11px] text-ink-faint">No client record</div> : <div className="space-y-1">{keys.map((key) => { const differs = isChanged(key); const present = Object.hasOwn(payload, key); return <div key={key} className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded px-2 py-1.5 text-[10px] ${differs ? palette.changed : ""}`}><span className="truncate font-mono text-ink-faint">{key}</span><span className={`break-all text-right font-mono ${differs ? palette.text : "text-ink-dim"}`}>{present ? stringify(payload[key] ?? null) : <span className="italic text-ink-faint">not present</span>}</span></div>; })}</div>}</section>;
}

function HashCard({ label, value, tone }: { label: string; value?: string; tone: "danger" | "success" }) {
  const palette = tone === "danger" ? "border-danger/30 bg-danger/[0.06] text-danger" : "border-success/30 bg-success/[0.06] text-success";
  return <div className={`min-w-0 rounded-lg border px-3 py-2.5 ${palette}`}><p className="text-[9px] font-semibold uppercase tracking-wider">{label}</p><p className="mt-1 break-all font-mono text-[10px] text-ink-dim">{value || "Unavailable"}</p></div>;
}

function Meta({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="min-w-0 rounded-lg border border-line bg-ground px-3 py-2.5"><p className="text-[9px] uppercase tracking-wider text-ink-faint">{label}</p><p className={`mt-1 break-words text-[11px] font-semibold ${good === undefined ? "text-ink" : good ? "text-success" : "text-warning"}`}>{value}</p></div>;
}

function Metric({ icon: Icon, label, value, detail, tone, onClick }: { icon: LucideIcon; label: string; value: number; detail: string; tone: "danger" | "success" | "info" | "neutral"; onClick?: () => void }) {
  const color = { danger: "text-danger bg-danger/10", success: "text-success bg-success/10", info: "text-info bg-info/10", neutral: "text-ink-dim bg-elevated" }[tone];
  const Tag = onClick ? "button" : "div";
  return <Tag onClick={onClick} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3 text-left transition-colors enabled:hover:bg-panel-2"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="size-4" /></span><span className="min-w-0"><strong className="block font-mono text-xl leading-none text-ink">{value}</strong><span className="mt-1 block truncate text-[10px] font-semibold text-ink-dim">{label}</span><span className="block truncate text-[9px] text-ink-faint">{detail}</span></span></Tag>;
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; count: number }) {
  return <button role="tab" aria-selected={active} onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${active ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}><Icon className="size-3.5" />{label}<span className="rounded-full bg-elevated px-1.5 font-mono text-[10px] text-ink-dim">{count}</span></button>;
}

function Dropdown({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-ground px-2.5 text-[10px] text-ink-faint"><span className="uppercase tracking-wider">{label}</span><span className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 max-w-36 appearance-none bg-transparent pr-5 text-xs text-ink outline-none">{options.map(([key, text]) => <option key={key} value={key} className="bg-panel">{text}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2" /></span></label>;
}

function stringify(value: DemoPayload[string]) {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return String(value);
}
