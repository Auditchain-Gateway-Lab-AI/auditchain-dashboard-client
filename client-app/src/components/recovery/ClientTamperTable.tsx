import { Eye, Filter, LoaderCircle, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn, formatDate } from "@/lib/utils";
import type { ClientDataTamperRecord, ClientTamperSummaryCounts } from "@/types/recovery";

interface ClientTamperTableProps {
  records: ClientDataTamperRecord[];
  summary?: ClientTamperSummaryCounts;
  total: number;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableFilter: string;
  onTableChange: (tbl: string) => void;
  onInspect: (record: ClientDataTamperRecord) => void;
  onRecover: (record: ClientDataTamperRecord) => void;
  recoveringId: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function shortHash(hash?: string) {
  if (!hash) return "—";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function ClientTamperTable({
  records,
  summary,
  total,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  tableFilter,
  onTableChange,
  onInspect,
  onRecover,
  recoveringId,
  isLoading,
  onRefresh,
}: ClientTamperTableProps) {
  // Extract unique table names
  const availableTables = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.table_name) set.add(r.table_name.toUpperCase());
    }
    return Array.from(set).sort();
  }, [records]);

  const openCount = summary?.open_count ?? records.filter((r) => r.status === "OPEN").length;
  const recoveredCount = summary?.recovered_count ?? records.filter((r) => r.status === "RECOVERED").length;
  const dismissedCount = summary?.dismissed_count ?? records.filter((r) => r.status === "DISMISSED").length;
  const totalCount = summary?.total_count ?? total;

  return (
    <div className="space-y-3">
      {/* Search & Filter Controls */}
      <section className="space-y-3 rounded-lg border border-line bg-panel p-3" aria-label="Incident filters">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3">
            <Search className="size-4 text-ink-faint" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari resource (misal: RUANGAN:1811), nama tabel, atau record ID..."
              className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
              aria-label="Cari rekaman tamper"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-line bg-ground px-2.5 text-[10px] text-ink-faint">
            <Filter className="size-3.5" />
            <span>Tabel:</span>
            <select
              value={tableFilter}
              onChange={(e) => onTableChange(e.target.value)}
              className="h-9 bg-transparent text-xs text-ink outline-none"
            >
              <option value="">Semua Tabel</option>
              {availableTables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>
          </label>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            Segarkan
          </Button>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "ALL", label: "Semua Status", count: totalCount },
            { id: "OPEN", label: "Terdeteksi (Open)", count: openCount, tone: "text-danger" },
            { id: "RECOVERED", label: "Sudah Dipulihkan", count: recoveredCount, tone: "text-success" },
            { id: "DISMISSED", label: "Diabaikan", count: dismissedCount, tone: "text-ink-dim" },
          ].map(({ id, label, count, tone }) => (
            <button
              key={id}
              type="button"
              aria-pressed={statusFilter === id}
              onClick={() => onStatusChange(id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors",
                statusFilter === id ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/40" : "text-ink-dim hover:bg-elevated"
              )}
            >
              <span className={tone}>{label}</span>
              <span className="ml-1.5 font-mono text-ink-faint">({count})</span>
            </button>
          ))}

          {(searchQuery || tableFilter || statusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onTableChange("");
                onStatusChange("ALL");
              }}
            >
              <X className="size-3" /> Reset Filter
            </Button>
          )}
        </div>
      </section>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Insiden Manipulasi Database Klien (External Audit)</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">
              Daftar anomali data aktual database klien vs log offchain & blockchain. Pemulihan langsung menulis ulang baris sah ke database klien melalui Agent.
            </p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
            {records.length} ditampilkan • {total} total
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <EmptyState
              message={
                isLoading
                  ? "Memuat data insiden manipulasi..."
                  : totalCount === 0
                  ? "Bagus sekali! Tidak ada manipulasi data klien yang terdeteksi saat ini."
                  : "Tidak ada insiden yang cocok dengan filter yang dipilih."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-ground/50 text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <th className="px-3.5 py-2.5 text-left font-semibold">Resource / Tabel</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Perbedaan Nilai (Diff)</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Hash Offchain vs Klien</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Waktu Deteksi</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold">Status</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((record) => {
                    const isRowRecovering = recoveringId === record.id;
                    const isOpen = record.status === "OPEN";

                    // Discrepancy brief
                    let discCount = 0;
                    if (Array.isArray(record.discrepancies)) discCount = record.discrepancies.length;
                    else if (typeof record.discrepancies === "string") {
                      try {
                        const parsed = JSON.parse(record.discrepancies);
                        if (Array.isArray(parsed)) discCount = parsed.length;
                      } catch {}
                    }

                    return (
                      <tr key={record.id} className="hover:bg-elevated/40 transition-colors">
                        {/* Resource / Table */}
                        <td className="px-3.5 py-3">
                          <code className="font-mono font-semibold text-brand-bright">{record.resource}</code>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-dim">
                            <span className="font-semibold text-ink">{record.table_name}</span>
                            <span>•</span>
                            <span>ID: {record.record_id}</span>
                            {record.action && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-ink-faint">{record.action}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Diff Summary */}
                        <td className="px-3.5 py-3">
                          {discCount > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <Badge tone="danger">{discCount} kolom berbeda</Badge>
                              <span className="text-[10px] text-ink-dim">(lihat detail)</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-ink-dim">Hash baris data berbeda</span>
                          )}
                          {record.recovery_error && (
                            <small className="mt-1 block max-w-48 text-[10px] text-warning truncate" title={record.recovery_error}>
                              Error: {record.recovery_error}
                            </small>
                          )}
                        </td>

                        {/* Hash Comparison */}
                        <td className="px-3.5 py-3">
                          <div className="space-y-0.5 font-mono text-[10px]">
                            <div className="flex items-center gap-1 text-success">
                              <span className="w-10 uppercase text-ink-faint">Offchain:</span>
                              <code>{shortHash(record.expected_hash)}</code>
                            </div>
                            <div className="flex items-center gap-1 text-danger">
                              <span className="w-10 uppercase text-ink-faint">Klien:</span>
                              <code>{shortHash(record.actual_hash)}</code>
                            </div>
                          </div>
                        </td>

                        {/* Detected At */}
                        <td className="px-3.5 py-3 text-ink-dim text-[11px]">
                          <div>{formatDate(record.detected_at)}</div>
                          {record.last_confirmed_at && (
                            <small className="block text-[9px] text-ink-faint">
                              Scan: {formatDate(record.last_confirmed_at)}
                            </small>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3">
                          <Badge
                            tone={
                              record.status === "OPEN"
                                ? "danger"
                                : record.status === "RECOVERED"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {record.status}
                          </Badge>
                          {record.auto_recovered && (
                            <small className="mt-0.5 block text-[9px] text-success">Auto-recovered</small>
                          )}
                          {record.resolved_by && (
                            <small className="mt-0.5 block text-[9px] text-ink-faint">
                              by {record.resolved_by}
                            </small>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onInspect(record)}
                              title="Lihat Detail Perbedaan"
                            >
                              <Eye className="size-3.5" /> Detail
                            </Button>

                            {isOpen && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onRecover(record)}
                                disabled={isRowRecovering}
                                className="bg-brand hover:bg-brand-bright"
                              >
                                {isRowRecovering ? (
                                  <>
                                    <LoaderCircle className="size-3.5 animate-spin" /> Memulihkan...
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="size-3.5" /> Pulihkan
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
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
