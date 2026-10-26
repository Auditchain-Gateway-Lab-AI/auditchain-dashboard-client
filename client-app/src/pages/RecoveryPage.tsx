import { AlertTriangle, CheckCircle2, Clock3, Database, History, LifeBuoy, RotateCw, ShieldCheck, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ActiveIncidents } from "@/components/recovery/ActiveIncidents";
import { ClientResourceCheck } from "@/components/recovery/ClientResourceCheck";
import { RecoveryDrawer } from "@/components/recovery/RecoveryDrawer";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecoveryData, useRecoveryRefresh } from "@/hooks/useRecovery";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";
import { recoveryService } from "@/services/recovery";
import type { RecoveryEvent, RecoveryEventPage, RecoveryIncidentPage, RecoveryRequest } from "@/types/recovery";

type RecoveryTab = "incidents" | "history";
const tabs: Array<{ id: RecoveryTab; label: string; icon: typeof Database }> = [
  { id: "incidents", label: "Temuan", icon: Database },
  { id: "history", label: "Riwayat pemulihan", icon: History },
];
const EMPTY_HISTORY: RecoveryEventPage = { data: [], page: 1, page_size: 100, total_items: 0, total_pages: 0 };
const EMPTY_INCIDENTS: RecoveryIncidentPage = { data: [], page: 1, page_size: 50, total_items: 0, total_pages: 0, open_count: 0, active_count: 0 };
const ACTIVE_STATUSES = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
type IncidentFilter = "OPEN" | "ACTIVE_RECOVERY";
type HistoryFilter = "ALL" | "SUCCEEDED" | "NEEDS_REVIEW";

export function RecoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIncidentId = searchParams.get("incident");
  const [tab, setTab] = useState<RecoveryTab>("incidents");
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>("OPEN");
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentSearchInput, setIncidentSearchInput] = useState("");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentSort, setIncidentSort] = useState<"newest" | "oldest" | "resource">("newest");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [drawerIds, setDrawerIds] = useState<string[] | null>(null);
  const [viewRequest, setViewRequest] = useState<RecoveryRequest | null>(null);
  const recovery = useRecoveryData(historyPage, tab === "history", {
    page: incidentPage, status: incidentFilter, scope: "CLIENT_SOURCE", search: incidentSearch, sort: incidentSort,
  });
  const refresh = useRecoveryRefresh();
  const onRecoveryUpdated = useCallback(() => { void refresh(); }, [refresh]);
  const incidentPageData = recovery.incidents.data ?? EMPTY_INCIDENTS;
  const incidents = incidentPageData.data;
  const requests = recovery.requests.data ?? [];
  const history = recovery.history.data ?? EMPTY_HISTORY;
  const openIncidents = incidentPageData.server_paged ? incidentPageData.open_count : incidents.filter((item) => item.incident_scope === "CLIENT_SOURCE" && item.status === "OPEN").length;
  const inProgress = incidentPageData.server_paged ? incidentPageData.active_count : requests.filter((request) => incidents.some((incident) => incident.id === request.incident_id) && ACTIVE_STATUSES.has(String(request.status).toUpperCase())).length;
  const successful = history.data.filter((event) => event.result_status === "SUCCEEDED").length;
  const error = useMemo(() => recovery.error ? recoveryErrorMessage(recovery.error) : "", [recovery.error]);

  useEffect(() => {
    const lastPage = Math.max(history.total_pages, 1);
    if (historyPage > lastPage) setHistoryPage(lastPage);
  }, [history.total_pages, historyPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIncidentSearch(incidentSearchInput.trim());
      setIncidentPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [incidentSearchInput]);

  useEffect(() => {
    const lastPage = Math.max(incidentPageData.total_pages, 1);
    if (incidentPage > lastPage) setIncidentPage(lastPage);
  }, [incidentPageData.total_pages, incidentPage]);

  useEffect(() => {
    if (!selectedIncidentId) return;
    setTab("incidents");
    setIncidentFilter("OPEN");
    setIncidentPage(1);
    setIncidentSearchInput("");
    setIncidentSearch("");
    setDrawerIds([selectedIncidentId]);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("incident");
      return next;
    }, { replace: true });
  }, [selectedIncidentId, setSearchParams]);

  if (recovery.isInitialLoading) return <RecoverySkeleton />;
  if (recovery.incidents.isError || recovery.requests.isError) {
    const coreError = recovery.incidents.error || recovery.requests.error;
    return <RecoveryUnavailable message={coreError ? recoveryErrorMessage(coreError) : "Data pemulihan belum dapat dimuat."} onRetry={() => void refresh()} />;
  }

  return (
    <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-bright" /><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-brand-bright">Pemulihan data</span><Badge tone="success">Terhubung</Badge></div>
          <h1 className="mt-1 text-[27px] font-semibold tracking-tight text-ink">Pemulihan data client</h1>
          <p className="mt-1 max-w-2xl text-xs text-ink-dim">Tinjau data client yang berbeda dari catatan terbaru yang telah diverifikasi. Periksa perbedaannya sebelum memulihkan.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={recovery.incidents.isFetching || recovery.requests.isFetching || recovery.history.isFetching}>
          <RotateCw className={`size-3.5 ${(recovery.incidents.isFetching || recovery.requests.isFetching || recovery.history.isFetching) ? "animate-spin" : ""}`} /> Muat ulang
        </Button>
      </div>

      {error && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning" role="alert"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void refresh()}>Coba lagi</Button></div>}

      <ClientResourceCheck onPrepare={setDrawerIds} />

      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryCard icon={LifeBuoy} label="Temuan terbuka" value={openIncidents} detail="Perbedaan pada data client" tone="danger" onClick={() => { setTab("incidents"); setIncidentFilter("OPEN"); setIncidentPage(1); }} />
        <SummaryCard icon={RotateCw} label="Pemulihan berlangsung" value={inProgress} detail="Menunggu hasil pemeriksaan" tone="info" onClick={() => { setTab("incidents"); setIncidentFilter("ACTIVE_RECOVERY"); setIncidentPage(1); }} />
        <SummaryCard icon={CheckCircle2} label="Pemulihan berhasil" value={recovery.history.data ? successful : "—"} detail={recovery.history.data ? `Halaman ${history.page} dari ${Math.max(history.total_pages, 1)} · ${history.total_items} total` : "Buka riwayat pemulihan untuk melihat hasil"} tone="success" onClick={() => { setTab("history"); setHistoryFilter("SUCCEEDED"); setHistoryPage(1); }} />
      </div>

      <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1 sm:w-auto" role="tablist" aria-label="Bagian pemulihan">
        {tabs.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" size="sm" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 ${tab === id ? "bg-navy-bright/25 text-ink" : ""}`}><Icon className="size-3.5" /> {label}</Button>)}
      </div>

      {tab === "incidents" && <ActiveIncidents
        data={incidents} requests={requests} serverPaged={Boolean(incidentPageData.server_paged)}
        searchInput={incidentSearchInput} search={incidentSearch} sort={incidentSort} page={incidentPage}
        totalItems={incidentPageData.total_items} totalPages={incidentPageData.total_pages}
        openCount={incidentPageData.open_count} activeCount={incidentPageData.active_count}
        filter={incidentFilter}
        onSearchInputChange={setIncidentSearchInput}
        onSortChange={(sort) => { setIncidentSort(sort); setIncidentPage(1); }}
        onPageChange={setIncidentPage}
        onFilterChange={(filter) => { setIncidentFilter(filter); setIncidentPage(1); }}
        onPrepare={setDrawerIds} onViewRequest={setViewRequest}
      />}
      {tab === "history" && recovery.history.isPending ? <div className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-xs text-ink-dim">Memuat riwayat pemulihan…</div> : tab === "history" && recovery.history.isError ? <RecoveryUnavailable message={recoveryErrorMessage(recovery.history.error)} onRetry={() => void refresh()} /> : tab === "history" ? <RecoveryHistory data={history} filter={historyFilter} onFilterChange={setHistoryFilter} onPageChange={setHistoryPage} isFetching={recovery.history.isFetching} /> : null}
      {drawerIds && <RecoveryDrawer ids={drawerIds} incidents={incidents} requests={requests} token={recovery.token} onClose={() => setDrawerIds(null)} onUpdated={onRecoveryUpdated} />}
      {viewRequest && <RecoveryRequestDetails request={requests.find((item) => item.id === viewRequest.id) || viewRequest} token={recovery.token} onClose={() => setViewRequest(null)} onRefresh={() => void refresh()} />}
    </main>
  );
}

function RecoveryRequestDetails({ request, token, onClose, onRefresh }: {
  request: RecoveryRequest;
  token?: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const status = String(request.status || "UNKNOWN").toUpperCase();
  const eventQuery = useQuery<RecoveryEvent>({
    queryKey: ["recovery", "event", request.recovery_event_id],
    queryFn: () => recoveryService.getEvent(token, request.recovery_event_id as string),
    enabled: Boolean(token && request.recovery_event_id),
    retry: false,
    refetchInterval: ACTIVE_STATUSES.has(status) ? 30_000 : false,
  });
  const event = eventQuery.data;
  return <div className="fixed inset-0 z-[55] flex justify-end" role="presentation" onClick={onClose}>
    <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-label="Tutup status pemulihan" />
    <section className="relative flex h-full w-full max-w-[520px] flex-col border-l border-line-strong bg-panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recovery-request-title" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-bright">Status pemulihan</div><h2 id="recovery-request-title" className="mt-0.5 text-[15px] font-semibold text-ink">{request.resource || "Data client"}</h2></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup"><X className="size-4" /></Button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ground px-3 py-3"><span className="text-xs text-ink-dim">Status saat ini</span><Badge tone={status === "SUCCEEDED" ? "success" : status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT" ? "danger" : "info"}>{requestStatusLabel(status)}</Badge></div>
        {(status === "EXECUTING" || status === "APPLIED_AWAITING_CDC") && <div className="flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2.5 text-xs text-info"><Clock3 className="mt-px size-4 shrink-0" /><span>{status === "EXECUTING" ? "Pemulihan sedang diproses. Status akan diperbarui otomatis." : "Perubahan sudah diterapkan. Sistem sedang memastikan hasilnya."}</span></div>}
        {request.failure_reason && <div className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"><AlertTriangle className="mt-px size-4 shrink-0" /><span>{recoveryErrorMessage(request.failure_reason)}</span></div>}
        <div className="grid gap-2 sm:grid-cols-2">
          <RequestFact label="Bagian data" value={request.resource || "Tidak diketahui"} />
          <RequestFact label="Diminta" value={formatDate(request.requested_at)} />
          {request.execution_started_at && <RequestFact label="Mulai diproses" value={formatDate(request.execution_started_at)} />}
          {request.executed_at && <RequestFact label="Selesai" value={formatDate(request.executed_at)} />}
        </div>
        {request.reason && <div className="rounded-md border border-line bg-ground px-3 py-2.5"><p className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">Alasan pemulihan</p><p className="mt-1 whitespace-pre-wrap text-xs text-ink-dim">{request.reason}</p></div>}
        {event && <div className="space-y-2 rounded-md border border-line bg-ground p-3"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Hasil pemulihan</p><Badge tone={event.result_status === "SUCCEEDED" ? "success" : event.result_status.startsWith("FAILED") ? "danger" : "neutral"}>{requestStatusLabel(event.result_status)}</Badge></div>{event.failure_reason && <p className="text-xs text-danger">{recoveryErrorMessage(event.failure_reason)}</p>}{event.recovered_metadata !== undefined && <details><summary className="cursor-pointer text-[10px] text-ink-dim">Lihat data hasil pemulihan</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-ink-faint">{formatJson(event.recovered_metadata)}</pre></details>}</div>}
        {eventQuery.isError && <p className="text-[10px] text-ink-faint">Rincian hasil belum tersedia. Status pemulihan tetap dapat dilihat di atas.</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-line px-4 py-3"><Button variant="outline" onClick={onRefresh}><RotateCw className="size-3.5" /> Muat ulang status</Button><Button variant="default" onClick={onClose}>Tutup</Button></footer>
    </section>
  </div>;
}

function RequestFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border border-line bg-ground px-2.5 py-2"><p className="text-[8px] uppercase tracking-[0.1em] text-ink-faint">{label}</p><p className="mt-1 break-words text-[10px] text-ink-dim">{value}</p></div>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}

function requestStatusLabel(value: string) {
  const requestStatus = String(value || "UNKNOWN").toUpperCase();
  if (requestStatus === "SUCCEEDED") return "Berhasil dipulihkan";
  if (requestStatus === "PENDING_EXECUTION") return "Menunggu diproses";
  if (requestStatus === "EXECUTING" || requestStatus === "APPLIED_AWAITING_CDC") return "Sedang diproses";
  if (requestStatus === "APPLIED_CDC_TIMEOUT" || requestStatus.startsWith("FAILED") || requestStatus === "REJECTED") return "Perlu ditinjau";
  return "Belum selesai";
}

function SummaryCard({ icon: Icon, label, value, detail, tone, onClick }: { icon: LucideIcon; label: string; value: number | string; detail: string; tone: "success" | "danger" | "info"; onClick: () => void }) {
  const iconClass = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-danger/10 text-danger" : "bg-info/10 text-info";
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-baseline gap-2"><strong className="font-mono text-xl text-ink">{value}</strong><span className="truncate text-[10px] font-semibold text-ink-dim">{label}</span></span><span className="block truncate text-[9px] text-ink-faint">{detail}</span></span></button>;
}

function RecoverySkeleton() {
  return <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4"><div className="flex items-end justify-between gap-3"><div><Skeleton className="h-8 w-56" /><Skeleton className="mt-2 h-3 w-80" /></div><Skeleton className="h-9 w-24" /></div><div className="grid gap-2 sm:grid-cols-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div><Skeleton className="h-[330px] w-full" /></main>;
}

function RecoveryUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center"><div className="flex size-11 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning"><ShieldCheck className="size-5" /></div><div><h1 className="text-sm font-semibold text-ink">Pemulihan belum tersedia</h1><p className="mt-1 max-w-md text-xs text-ink-dim">{message}</p></div><Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="size-3.5" /> Coba lagi</Button></main>;
}
