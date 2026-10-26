import { CheckCircle2, Database, History, RotateCw, ShieldAlert, ShieldCheck } from "lucide-react";
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
  useRecoveryRefresh,
} from "@/hooks/useRecovery";
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
  const tamperQuery = useMemo(() => ({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    table_name: tableFilter || undefined,
    search: searchQuery || undefined,
    page: 1,
    page_size: 100,
  }), [statusFilter, tableFilter, searchQuery]);

  const { data: tamperData, isLoading: isTamperLoading, refetch: refetchTamper } = useClientTamperRecords(tamperQuery);
  const recoverMutation = useRecoverClientTamper();
  const dismissMutation = useDismissClientTamper();

  // Legacy/Internal recovery history query (Secondary)
  const recovery = useRecoveryData(historyPage);
  const refreshAll = useRecoveryRefresh();
  const history = recovery.history.data ?? EMPTY_HISTORY;

  const records = tamperData?.records ?? [];
  const summary = tamperData?.summary;
  const openCount = summary?.open_count ?? records.filter((r) => r.status === "OPEN").length;
  const recoveredCount = summary?.recovered_count ?? records.filter((r) => r.status === "RECOVERED").length;
  const dismissedCount = summary?.dismissed_count ?? records.filter((r) => r.status === "DISMISSED").length;

  const handleRefresh = async () => {
    await Promise.all([refetchTamper(), refreshAll()]);
  };

  const handleRecover = async (id: string) => {
    await recoverMutation.mutateAsync({ id });
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
    }
  };

  const handleDismiss = async (id: string, notes?: string) => {
    await dismissMutation.mutateAsync({ id, notes });
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
    }
  };

  if (isTamperLoading && !tamperData) return <RecoverySkeleton />;

  return (
    <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-bright" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-brand-bright">
              Audit Eksternal & Operasi Pemulihan
            </span>
            <Badge tone="success">External Audit Live</Badge>
          </div>
          <h1 className="mt-1 text-[27px] font-semibold tracking-tight text-ink">
            Pemulihan Data Klien (Client Data Recovery)
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-ink-dim">
            Pantau dan pulihkan perbedaan antara data aktual di database klien vs log offchain & blockchain. Tindakan pemulihan akan mengirim instruksi ke Agent untuk memperbarui baris data di database klien ke nilai sah.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isTamperLoading}>
          <RotateCw className={`size-3.5 ${isTamperLoading ? "animate-spin" : ""}`} /> Segarkan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryCard
          icon={ShieldAlert}
          label="Insiden Terdeteksi (Open)"
          value={openCount}
          detail="Manipulasi data aktual di database klien"
          tone="danger"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("OPEN");
          }}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Data Berhasil Dipulihkan"
          value={recoveredCount}
          detail="Telah direstore kembali ke database klien"
          tone="success"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("RECOVERED");
          }}
        />
        <SummaryCard
          icon={History}
          label="Insiden Diabaikan"
          value={dismissedCount}
          detail="Ditandai diabaikan / verifikasi selesai"
          tone="info"
          onClick={() => {
            setTab("incidents");
            setStatusFilter("DISMISSED");
          }}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1 sm:w-auto" role="tablist">
        <Button
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={tab === "incidents"}
          onClick={() => setTab("incidents")}
          className={`shrink-0 ${tab === "incidents" ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/30" : ""}`}
        >
          <Database className="size-3.5" /> Insiden Manipulasi Database Klien
        </Button>
        <Button
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={`shrink-0 ${tab === "history" ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/30" : ""}`}
        >
          <History className="size-3.5" /> Riwayat Event Recovery
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
          onRefresh={handleRefresh}
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
          record={selectedRecord}
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
          <strong className="font-mono text-xl text-ink">{value}</strong>
          <span className="truncate text-[10px] font-semibold text-ink-dim">{label}</span>
        </span>
        <span className="block truncate text-[9px] text-ink-faint">{detail}</span>
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
        <Skeleton className="h-9 w-24" />
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
