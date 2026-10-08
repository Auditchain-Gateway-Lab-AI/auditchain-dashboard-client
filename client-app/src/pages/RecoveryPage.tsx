import { Database, History, RotateCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { ActiveIncidents } from "@/components/recovery/ActiveIncidents";
import { RecoveryDrawer } from "@/components/recovery/RecoveryDrawer";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecoveryData, useRecoveryRefresh } from "@/hooks/useRecovery";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";
import type { RecoveryEventPage } from "@/types/recovery";

type RecoveryTab = "incidents" | "history";
const tabs: Array<{ id: RecoveryTab; label: string; icon: typeof Database }> = [
  { id: "incidents", label: "Incidents", icon: Database },
  { id: "history", label: "Recovery history", icon: History },
];
const EMPTY_HISTORY: RecoveryEventPage = { data: [], page: 1, page_size: 100, total_items: 0, total_pages: 0 };
const ACTIVE_STATUSES = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);

export function RecoveryPage() {
  const [tab, setTab] = useState<RecoveryTab>("incidents");
  const [drawerIds, setDrawerIds] = useState<string[] | null>(null);
  const recovery = useRecoveryData();
  const refresh = useRecoveryRefresh();
  const incidents = recovery.incidents.data ?? [];
  const requests = recovery.requests.data ?? [];
  const history = recovery.history.data ?? EMPTY_HISTORY;
  const openClientIncidents = incidents.filter((item) => item.incident_scope === "CLIENT_SOURCE" && item.status === "OPEN").length;
  const inProgress = requests.filter((request) => ACTIVE_STATUSES.has(String(request.status).toUpperCase())).length;
  const successful = history.data.filter((event) => event.result_status === "SUCCEEDED").length;
  const error = useMemo(() => recovery.error ? recoveryErrorMessage(recovery.error) : "", [recovery.error]);

  if (recovery.isInitialLoading) return <RecoverySkeleton />;
  if (!recovery.incidents.data && recovery.incidents.isError) {
    return <RecoveryUnavailable message={error || "Recovery incidents could not be loaded."} onRetry={() => void refresh()} />;
  }

  return (
    <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-bright" /><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-brand-bright">Client recovery</span><Badge tone="info">Agent direct</Badge></div>
          <h1 className="mt-1 text-[27px] font-semibold tracking-tight text-ink">Recovery Workspace</h1>
          <p className="mt-1 max-w-2xl text-xs text-ink-dim">Review client source incidents and restore eligible rows from verified AuditChain events. Completion waits for CDC and recovery evidence verification.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={recovery.incidents.isFetching || recovery.requests.isFetching || recovery.history.isFetching}>
          <RotateCw className={`size-3.5 ${(recovery.incidents.isFetching || recovery.requests.isFetching || recovery.history.isFetching) ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning" role="alert"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}

      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryCard label="Open client incidents" value={openClientIncidents} detail="Recovery candidates require preflight" tone="danger" />
        <SummaryCard label="Recovery in progress" value={inProgress} detail="Includes CDC confirmation wait" tone="info" />
        <SummaryCard label="Successful events loaded" value={successful} detail={`From ${history.total_items} recovery events`} tone="success" />
      </div>

      <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1 sm:w-auto" role="tablist" aria-label="Recovery sections">
        {tabs.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" size="sm" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 ${tab === id ? "bg-navy-bright/25 text-ink" : ""}`}><Icon className="size-3.5" /> {label}</Button>)}
      </div>

      {tab === "incidents" && <ActiveIncidents data={incidents} requests={requests} onPrepare={setDrawerIds} />}
      {tab === "history" && recovery.history.isError ? <RecoveryUnavailable message={recoveryErrorMessage(recovery.history.error)} onRetry={() => void refresh()} /> : tab === "history" ? <RecoveryHistory data={history} /> : null}
      {drawerIds && <RecoveryDrawer ids={drawerIds} incidents={incidents} requests={requests} token={recovery.token} onClose={() => setDrawerIds(null)} onUpdated={() => void refresh()} />}
    </main>
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "success" | "danger" | "info" }) {
  const iconClass = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-danger/10 text-danger" : "bg-info/10 text-info";
  return <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-3.5 py-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><ShieldCheck className="size-4" /></span><div className="min-w-0"><div className="flex items-baseline gap-2"><strong className="font-mono text-xl text-ink">{value}</strong><span className="truncate text-[10px] font-semibold text-ink-dim">{label}</span></div><p className="truncate text-[9px] text-ink-faint">{detail}</p></div></div>;
}

function RecoverySkeleton() {
  return <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4"><div className="flex items-end justify-between gap-3"><div><Skeleton className="h-8 w-56" /><Skeleton className="mt-2 h-3 w-80" /></div><Skeleton className="h-9 w-24" /></div><div className="grid gap-2 sm:grid-cols-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div><Skeleton className="h-[330px] w-full" /></main>;
}

function RecoveryUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center"><div className="flex size-11 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning"><ShieldCheck className="size-5" /></div><div><h1 className="text-sm font-semibold text-ink">Recovery is unavailable</h1><p className="mt-1 max-w-md text-xs text-ink-dim">{message}</p></div><Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="size-3.5" /> Retry</Button></main>;
}
