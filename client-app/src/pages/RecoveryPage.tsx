import { AlertTriangle, CheckCircle2, Database, History, RotateCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientRecoveryHistoryTable } from "@/components/recovery/ClientRecoveryHistoryTable";
import { ClientTamperDrawer } from "@/components/recovery/ClientTamperDrawer";
import { ClientTamperTable } from "@/components/recovery/ClientTamperTable";
import {
  useClientRecoveryEvents,
  useClientTamperRecords,
  useDismissClientTamper,
  useRecoverClientTamper,
} from "@/hooks/useRecovery";
import type { ClientDataTamperRecord } from "@/types/recovery";

type RecoveryTab = "incidents" | "history";

export function RecoveryPage() {
  const [tab, setTab] = useState<RecoveryTab>("incidents");

  // Tab 1 (Incidents) filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  // Tab 2 (Recovery History) filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyTableFilter, setHistoryTableFilter] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ClientDataTamperRecord | null>(null);

  // External Audit Client Tampering Data (Tab 1)
  const tamperQuery = useMemo(() => ({
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

  // Client Recovery Events Data (Tab 2)
  const historyQuery = useMemo(() => ({
    status: historyStatusFilter === "ALL" ? undefined : historyStatusFilter,
    table_name: historyTableFilter || undefined,
    search: historySearchQuery || undefined,
    page: 1,
    page_size: 100,
  }), [historyStatusFilter, historyTableFilter, historySearchQuery]);

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useClientRecoveryEvents(historyQuery);

  const records = tamperData?.records ?? [];
  const summary = tamperData?.summary;
  const openCount = summary?.open_count ?? records.filter((r) => r.status === "OPEN").length;
  const recoveredCount = summary?.recovered_count ?? records.filter((r) => r.status === "RECOVERED").length;
  const dismissedCount = summary?.dismissed_count ?? records.filter((r) => r.status === "DISMISSED").length;

  const handleRefresh = async () => {
    await Promise.all([refetchTamper(), refetchHistory()]);
  };

  const handleRecover = async (id: string) => {
    setFeedback(null);
    try {
      const res = await recoverMutation.mutateAsync({ id });
      setFeedback({
        type: "success",
        message: (res as any)?.message || "Baris data berhasil dipulihkan pada database operasional klien.",
      });
      if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord(null);
      }
      refetchHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Gagal memulihkan data klien";
      setFeedback({
        type: "error",
        message: msg,
      });
    }
  };

  const handleDismiss = async (id: string, notes?: string) => {
    setFeedback(null);
    try {
      await dismissMutation.mutateAsync({ id, notes });
      setFeedback({
        type: "success",
        message: "Insiden manipulasi data berhasil diabaikan.",
      });
      if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Gagal mengabaikan insiden";
      setFeedback({
        type: "error",
        message: msg,
      });
    }
  };

  if (isTamperLoading && !tamperData && isHistoryLoading && !historyData) {
    return <RecoverySkeleton />;
  }

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isTamperLoading || isHistoryLoading}
        >
          <RotateCw className={`size-3.5 ${(isTamperLoading || isHistoryLoading) ? "animate-spin" : ""}`} /> Segarkan
        </Button>
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
            setTab("history");
            setHistoryStatusFilter("SUCCESS");
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

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-xs transition-all ${feedback.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
            }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="cursor-pointer ml-2 p-0.5 opacity-70 hover:opacity-100"
            title="Tutup pemberitahuan"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

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
          <History className="size-3.5" /> Riwayat Pemulihan Data Klien
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
        <ClientRecoveryHistoryTable
          events={historyData?.events ?? []}
          summary={historyData?.summary}
          total={historyData?.total ?? 0}
          statusFilter={historyStatusFilter}
          onStatusChange={setHistoryStatusFilter}
          searchQuery={historySearchQuery}
          onSearchChange={setHistorySearchQuery}
          tableFilter={historyTableFilter}
          onTableChange={setHistoryTableFilter}
          isLoading={isHistoryLoading}
          onRefresh={handleRefresh}
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
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  detail: string;
  tone: "danger" | "success" | "info";
  onClick?: () => void;
}) {
  const toneClasses = {
    danger: "text-danger border-danger/20 hover:border-danger/40",
    success: "text-success border-success/20 hover:border-success/40",
    info: "text-brand-bright border-brand-bright/20 hover:border-brand-bright/40",
  }[tone];

  return (
    <Card
      className={`p-3.5 transition-all cursor-pointer hover:shadow-xs ${toneClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-dim">{label}</span>
        <Icon className="size-4 opacity-80" />
      </div>
      <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-faint truncate">{detail}</p>
    </Card>
  );
}

function RecoverySkeleton() {
  return (
    <main className="space-y-4 px-3 pb-8 pt-5 lg:px-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-2 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
