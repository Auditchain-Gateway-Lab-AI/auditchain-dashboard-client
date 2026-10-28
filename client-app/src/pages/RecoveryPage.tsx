import { AlertCircle, CheckCircle2, Database, History, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientTamperDrawer } from "@/components/recovery/ClientTamperDrawer";
import { ClientTamperTable } from "@/components/recovery/ClientTamperTable";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import {
  useClientTamperRecords,
  useDismissClientTamper,
  useRecoverClientTamper,
  useRecoveryData,
} from "@/hooks/useRecovery";
import { formatRecoveryDate } from "@/components/recovery/client-tamper-utils";
import type { ClientDataTamperRecord, RecoveryEventPage } from "@/types/recovery";

type RecoveryTab = "incidents" | "history";
type HistoryFilter = "ALL" | "SUCCEEDED" | "NEEDS_REVIEW";

const EMPTY_HISTORY: RecoveryEventPage = { data: [], page: 1, page_size: 100, total_items: 0, total_pages: 0 };

export function RecoveryPage() {
  const [tab, setTab] = useState<RecoveryTab>("incidents");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ClientDataTamperRecord | null>(null);

  // External Audit Client Tampering Data (Primary)
  const tamperFilters = useMemo(() => ({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    table_name: tableFilter || undefined,
    search: searchQuery || undefined,
    page: 1,
    page_size: 100,
  }), [statusFilter, tableFilter, searchQuery]);

  const tamperQuery = useClientTamperRecords(tamperFilters);
  const { data: tamperData, isLoading: isTamperLoading, isFetching: isTamperFetching } = tamperQuery;
  const recoverMutation = useRecoverClientTamper();
  const dismissMutation = useDismissClientTamper();

  // Legacy/Internal recovery history query (Secondary)
  const recovery = useRecoveryData(historyPage);
  const history = recovery.history.data ?? EMPTY_HISTORY;

  const records = tamperData?.records ?? [];
  const summary = tamperData?.summary;
  const openCount = summary?.open_count ?? records.filter((r) => r.status === "OPEN").length;
  const recoveredCount = summary?.recovered_count ?? records.filter((r) => r.status === "RECOVERED").length;
  const dismissedCount = summary?.dismissed_count ?? records.filter((r) => r.status === "DISMISSED").length;

  const syncedAtValues = [tamperData ? tamperQuery.dataUpdatedAt : 0, recovery.incidents.dataUpdatedAt, recovery.history.dataUpdatedAt]
    .filter((timestamp) => timestamp > 0);
  const lastSyncedAt = syncedAtValues.length ? Math.min(...syncedAtValues) : 0;
  const syncError = tamperQuery.isError || recovery.incidents.isError || recovery.requests.isError || recovery.history.isError;
  const isSyncing = isTamperFetching || recovery.incidents.isFetching || recovery.history.isFetching;

  const handleRecover = async (id: string) => {
    const response = await recoverMutation.mutateAsync({ id });
    if (selectedRecord?.id === id && response?.record) setSelectedRecord(response.record);
  };

  const handleDismiss = async (id: string, notes?: string) => {
    const record = await dismissMutation.mutateAsync({ id, notes });
    if (selectedRecord?.id === id) setSelectedRecord(record);
  };

  if (isTamperLoading && !tamperData) return <RecoverySkeleton />;

  return (
    <main className="recovery-page space-y-4 px-3 pb-8 pt-6 lg:px-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-bright" />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-bright">
              External Audit & Recovery Operations
            </span>
            <Badge tone="success">External Audit Live</Badge>
          </div>
          <h1 className="mt-1 text-[27px] font-semibold tracking-tight text-ink">
            Client Data Recovery
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-dim">
            Monitor differences between client database rows and verified off-chain and blockchain records. Recovery asks the client agent to restore the authorized row data.
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs ${syncError ? "border-warning/30 bg-warning/10 text-warning" : "border-line bg-panel text-ink-dim"}`} role="status" aria-live="polite">
          {syncError ? <AlertCircle className="size-4 shrink-0" /> : isSyncing ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <CheckCircle2 className="size-4 shrink-0 text-success" />}
          <span className="leading-snug">{syncError ? "Sync delayed" : isSyncing ? "Syncing" : "Last synced"}<span className="ml-1.5 font-mono text-ink">{lastSyncedAt ? formatRecoveryDate(lastSyncedAt) : "Waiting for first sync"}</span></span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ShieldAlert}
          label="Open incidents"
          value={openCount}
          detail="Client rows with integrity mismatches"
          tone="danger"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("OPEN");
          }}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Recovered"
          value={recoveredCount}
          detail="Rows restored from verified records"
          tone="success"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("RECOVERED");
          }}
        />
        <SummaryCard
          icon={History}
          label="Dismissed"
          value={dismissedCount}
          detail="Incidents marked as reviewed"
          tone="info"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("DISMISSED");
          }}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1.5 sm:w-auto" role="tablist" aria-label="Recovery sections">
        <Button
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={tab === "incidents"}
          onClick={() => setTab("incidents")}
          className={`shrink-0 ${tab === "incidents" ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/30" : ""}`}
        >
          <Database className="size-4" /> Client integrity incidents
        </Button>
        <Button
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={`shrink-0 ${tab === "history" ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/30" : ""}`}
        >
          <History className="size-4" /> Recovery history
        </Button>
      </div>

      {/* Tab Panels */}
      {tab === "incidents" && (
        <ClientTamperTable
          records={records}
          summary={summary}
          total={tamperData?.total ?? records.length}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tableFilter={tableFilter}
          onTableChange={setTableFilter}
          onInspect={setSelectedRecord}
          onRecover={(rec) => handleRecover(rec.id)}
          recoveringId={recoverMutation.isPending && recoverMutation.variables ? (recoverMutation.variables as any).id : null}
          isLoading={isTamperLoading}
        />
      )}

      {tab === "history" && (
        <RecoveryHistory
          data={history}
          filter={historyFilter}
          onFilterChange={setHistoryFilter}
          onPageChange={setHistoryPage}
          isFetching={recovery.history.isFetching}
        />
      )}

      {/* Detail & Recovery Slide-over Drawer */}
      {selectedRecord && (
        <ClientTamperDrawer
          record={records.find((record) => record.id === selectedRecord.id) ?? selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onRecover={handleRecover}
          onDismiss={handleDismiss}
          isRecovering={recoverMutation.isPending}
          isDismissing={dismissMutation.isPending}
        />
      )}
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  icon: any;
  label: string;
  value: number;
  detail: string;
  tone: "success" | "danger" | "info";
  onClick: () => void;
}) {
  const iconClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "danger"
      ? "bg-danger/10 text-danger"
      : "bg-info/10 text-info";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <strong className="font-mono text-2xl text-ink">{value}</strong>
          <span className="truncate text-sm font-semibold text-ink-dim">{label}</span>
        </span>
        <span className="block truncate text-xs text-ink-dim">{detail}</span>
      </span>
    </button>
  );
}

function RecoverySkeleton() {
  return (
    <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-3 w-80" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-[330px] w-full" />
    </main>
  );
}
