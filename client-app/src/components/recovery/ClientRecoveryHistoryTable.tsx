import { Eye, Filter, History, RefreshCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { ClientRecoveryDrawer } from "@/components/recovery/ClientRecoveryDrawer";
import { cn, formatDate } from "@/lib/utils";
import type { ClientRecoveryEvent, ClientRecoveryEventSummaryCounts } from "@/types/recovery";

interface ClientRecoveryHistoryTableProps {
  events: ClientRecoveryEvent[];
  summary?: ClientRecoveryEventSummaryCounts;
  total: number;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tableFilter: string;
  onTableChange: (tbl: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export function ClientRecoveryHistoryTable({
  events,
  summary,
  total,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  tableFilter,
  onTableChange,
  isLoading,
  onRefresh,
}: ClientRecoveryHistoryTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<ClientRecoveryEvent | null>(null);

  // Extract unique table names
  const availableTables = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.table_name) set.add(ev.table_name.toUpperCase());
    }
    return Array.from(set).sort();
  }, [events]);

  const successCount = summary?.success_count ?? events.filter((e) => e.status === "SUCCESS").length;
  const failedCount = summary?.failed_count ?? events.filter((e) => e.status === "FAILED").length;
  const totalCount = summary?.total_count ?? total;

  // Client-side filtering when events are passed as array
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== "ALL" && ev.status !== statusFilter) return false;
      if (tableFilter && ev.table_name.toUpperCase() !== tableFilter.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const str = `${ev.id} ${ev.resource} ${ev.table_name} ${ev.record_id} ${ev.recovered_by || ""} ${ev.operation || ""}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [events, statusFilter, tableFilter, searchQuery]);

  const parseColumns = (cols?: string | string[]): string[] => {
    if (!cols) return [];
    if (Array.isArray(cols)) return cols;
    try {
      const parsed = JSON.parse(cols);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [cols];
    }
    return [];
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Controls */}
      <section className="space-y-3 rounded-lg border border-line bg-panel p-3" aria-label="Recovery event filters">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3">
            <Search className="size-4 text-ink-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari resource (RUANGAN:1812), tabel, ID record, eksekutor..."
              className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
            />
          </label>

          {/* Table filter dropdown */}
          {availableTables.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-ground px-2 py-1">
              <Filter className="size-3.5 text-ink-faint" />
              <select
                value={tableFilter}
                onChange={(e) => onTableChange(e.target.value)}
                className="bg-transparent text-xs text-ink outline-none cursor-pointer"
              >
                <option value="">Semua Tabel ({availableTables.length})</option>
                {availableTables.map((tbl) => (
                  <option key={tbl} value={tbl}>
                    Tabel: {tbl}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading} className="h-9">
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            Segarkan
          </Button>

          {(searchQuery || statusFilter !== "ALL" || tableFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onStatusChange("ALL");
                onTableChange("");
              }}
              className="h-9"
            >
              <X className="size-3.5" /> Reset Filter
            </Button>
          )}
        </div>

        {/* Status Filter Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line/60">
          {[
            { id: "ALL", label: "Semua Riwayat", count: totalCount },
            { id: "SUCCESS", label: "Berhasil Dipulihkan", count: successCount },
            { id: "FAILED", label: "Gagal", count: failedCount },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => onStatusChange(pill.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                statusFilter === pill.id
                  ? "bg-navy-bright/30 text-ink ring-1 ring-brand-bright/40 shadow-xs"
                  : "bg-ground text-ink-dim hover:bg-elevated hover:text-ink",
              )}
            >
              <span>{pill.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  statusFilter === pill.id ? "bg-brand-bright/20 text-ink" : "bg-elevated text-ink-faint",
                )}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-line px-4 py-3">
          <div>
            <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
              <History className="size-4 text-brand-bright" /> Riwayat Eksekusi Pemulihan Database Klien
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Daftar immutable bukti eksekusi perbaikan baris data yang dikirimkan ke database operasional klien.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            {filteredEvents.length} ditampilkan &bull; {totalCount} total event
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                message={
                  totalCount === 0
                    ? "Belum ada riwayat pemulihan database klien yang dieksekusi."
                    : "Tidak ada event pemulihan yang cocok dengan filter yang dipilih."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-ground/50 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    <th className="px-4 py-3">Target / Resource</th>
                    <th className="px-4 py-3">Tabel</th>
                    <th className="px-4 py-3">Operasi</th>
                    <th className="px-4 py-3">Kolom Dipulihkan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Eksekutor</th>
                    <th className="px-4 py-3">Waktu Eksekusi</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredEvents.map((ev) => {
                    const isSuccess = ev.status === "SUCCESS";
                    const cols = parseColumns(ev.recovered_columns);

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="cursor-pointer transition-colors hover:bg-elevated/60"
                      >
                        {/* Resource */}
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-ink">{ev.resource}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                            ID: {ev.record_id}
                          </span>
                        </td>

                        {/* Table */}
                        <td className="px-4 py-3">
                          <Badge tone="neutral" className="font-mono text-[10px]">
                            {ev.table_name}
                          </Badge>
                        </td>

                        {/* Operation */}
                        <td className="px-4 py-3">
                          <Badge tone="neutral" className="font-mono text-[10px]">
                            {ev.operation || "UPDATE"}
                          </Badge>
                        </td>

                        {/* Recovered Columns */}
                        <td className="px-4 py-3">
                          {cols.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {cols.slice(0, 3).map((c) => (
                                <Badge key={c} tone="neutral" className="font-mono text-[9px] px-1.5 py-0">
                                  {c}
                                </Badge>
                              ))}
                              {cols.length > 3 && (
                                <span className="font-mono text-[9px] text-ink-faint">
                                  +{cols.length - 3} lainnya
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-faint">&mdash;</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge tone={isSuccess ? "success" : "danger"} className="font-medium">
                            {isSuccess ? "Berhasil" : "Gagal"}
                          </Badge>
                          {!isSuccess && ev.error_message && (
                            <span
                              className="mt-0.5 block max-w-xs truncate text-[10px] text-danger"
                              title={ev.error_message}
                            >
                              {ev.error_message}
                            </span>
                          )}
                        </td>

                        {/* Executor */}
                        <td className="px-4 py-3 font-mono text-ink-dim">
                          {ev.recovered_by || "morbis1"}
                        </td>

                        {/* Executed At */}
                        <td className="px-4 py-3 text-ink-dim text-[11px] whitespace-nowrap">
                          {formatDate(ev.executed_at)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(ev)}
                            className="h-7 gap-1 px-2 text-xs text-ink-dim hover:text-ink"
                            title="Lihat detail & data sah yang dipulihkan"
                          >
                            <Eye className="size-3.5" />
                            Detail
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

      {/* Detail Drawer */}
      {selectedEvent && (
        <ClientRecoveryDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
