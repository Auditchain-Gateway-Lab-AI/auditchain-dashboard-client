import { ChevronLeft, ChevronRight, Eye, LifeBuoy, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn } from "@/lib/utils";
import type { RecoveryIncident, RecoveryRequest } from "@/types/recovery";

interface ActiveIncidentsProps {
  data: RecoveryIncident[];
  requests: RecoveryRequest[];
  serverPaged: boolean;
  searchInput: string;
  search: string;
  sort: "newest" | "oldest" | "resource";
  page: number;
  totalItems: number;
  totalPages: number;
  openCount: number;
  activeCount: number;
  filter: "OPEN" | "ACTIVE_RECOVERY";
  onSearchInputChange: (value: string) => void;
  onSortChange: (value: "newest" | "oldest" | "resource") => void;
  onPageChange: (page: number) => void;
  onFilterChange: (value: ActiveIncidentsProps["filter"]) => void;
  onPrepare: (ids: string[]) => void;
  onViewRequest: (request: RecoveryRequest) => void;
}

const activeStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const inProgressStatuses = new Set(["EXECUTING", "APPLIED_AWAITING_CDC"]);
const pageSize = 50;

export function ActiveIncidents({ data, requests, serverPaged, searchInput, search, sort, page, totalItems, totalPages, openCount, activeCount, filter, onSearchInputChange, onSortChange, onPageChange, onFilterChange, onPrepare, onViewRequest }: ActiveIncidentsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fallbackPage, setFallbackPage] = useState(1);
  const requestByIncident = useMemo(() => latestRequestByIncident(requests), [requests]);
  const counts = useMemo(() => ({
    open: serverPaged ? openCount : data.filter((incident) => incident.status === "OPEN").length,
    active: serverPaged ? activeCount : data.filter((incident) => activeStatuses.has(String(requestByIncident.get(incident.id)?.status || "").toUpperCase())).length,
  }), [serverPaged, openCount, activeCount, data, requestByIncident]);
  const filteredData = useMemo(() => data.filter((incident) => {
    const status = String(incident.status).toUpperCase();
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    const statusMatches = filter === "OPEN"
      ? status === "OPEN"
      : activeStatuses.has(requestStatus);
    const searchText = `${incident.id} ${incident.log_id} ${incident.reference_log_id || ""} ${incident.resource} ${incident.incident_type} ${incident.source_status || ""}`.toLowerCase();
    return statusMatches && searchText.includes(search.trim().toLowerCase());
  }).sort((a, b) => sort === "resource"
    ? a.resource.localeCompare(b.resource)
    : sort === "oldest"
      ? a.detected_at.localeCompare(b.detected_at)
      : b.detected_at.localeCompare(a.detected_at)), [data, filter, search, sort, requestByIncident]);
  const displayPage = serverPaged ? page : fallbackPage;
  const pageCount = Math.max(1, serverPaged ? totalPages : Math.ceil(filteredData.length / pageSize));
  const visibleData = serverPaged ? filteredData : filteredData.slice((displayPage - 1) * pageSize, displayPage * pageSize);
  const matchedCount = serverPaged ? totalItems : filteredData.length;
  const shownStart = matchedCount === 0 ? 0 : (displayPage - 1) * pageSize + 1;
  const shownEnd = serverPaged ? Math.min((displayPage - 1) * pageSize + visibleData.length, matchedCount) : Math.min(displayPage * pageSize, matchedCount);
  useEffect(() => { setFallbackPage(1); }, [filter, search, sort]);
  useEffect(() => setSelected(new Set()), [filter, search, sort, displayPage]);
  const selectable = visibleData.filter((incident) => {
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    return isActionableScope(incident) && incident.status === "OPEN" && !inProgressStatuses.has(requestStatus);
  });
  const allSelected = selectable.length > 0 && selectable.every((incident) => selected.has(incident.id));
  const selectedIds = data.filter((incident) => {
    const requestStatus = String(requestByIncident.get(incident.id)?.status || "").toUpperCase();
    return selected.has(incident.id) && isActionableScope(incident) && incident.status === "OPEN" && !inProgressStatuses.has(requestStatus);
  }).map((incident) => incident.id);

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      for (const incident of selectable) {
        if (allSelected) next.delete(incident.id);
        else next.add(incident.id);
      }
      return next;
    });
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
      <section className="space-y-3 rounded-lg border border-line bg-panel p-3" aria-label="Filter temuan">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={searchInput} onChange={(event) => onSearchInputChange(event.target.value)} placeholder="Cari bagian, data, atau log..." className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Cari temuan pemulihan" /></label>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-ground px-2.5 text-[10px] text-ink-faint"><span>Urutkan</span><select value={sort} onChange={(event) => onSortChange(event.target.value as typeof sort)} className="h-9 bg-transparent text-xs text-ink outline-none"><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="resource">Bagian A-Z</option></select></label>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {([ ["OPEN", "Temuan terbuka", counts.open], ["ACTIVE_RECOVERY", "Pemulihan berlangsung", counts.active] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{label}<span className="ml-1.5 font-mono text-ink-faint">{count}</span></button>)}
          {(searchInput || filter !== "OPEN" || sort !== "newest") && <Button variant="ghost" size="sm" onClick={() => { onSearchInputChange(""); onSortChange("newest"); onFilterChange("OPEN"); }}><X className="size-3" /> Hapus filter</Button>}
        </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-elevated px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            <span className="font-semibold text-ink">{selectedIds.length} temuan dipilih untuk diperiksa</span>
            <span className="mx-2 text-ink-faint">|</span>
            <span className="text-ink-dim">Kelayakan pemulihan akan diperiksa sebelum ada perubahan.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Batal pilih</Button>
            <Button variant="default" size="sm" onClick={() => onPrepare(selectedIds)}>
              <LifeBuoy className="size-3.5" /> Periksa ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Temuan yang perlu ditinjau</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">Pilih temuan untuk melihat bagian yang terdampak dan memeriksa apakah pemulihan dapat dilakukan.</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{shownStart}â€“{shownEnd} ditampilkan Â· {matchedCount} temuan</span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? <EmptyState message={serverPaged ? (totalItems === 0 ? "Tidak ada temuan aktif." : "Tidak ada temuan yang cocok dengan pencarian ini.") : (data.length === 0 ? "Tidak ada temuan aktif." : "Tidak ada temuan yang cocok dengan pencarian ini.")} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <th className="w-10 px-3.5 py-2.5 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua temuan data yang bisa ditinjau" className="accent-brand" disabled={!selectable.length} />
                    </th>
                    <Head className="text-left">Bagian terdampak</Head>
                    <Head className="text-left">Masalah</Head>
                    <Head className="text-left">Keterangan</Head>
                    <Head className="text-left">Ditemukan</Head>
                    <Head className="text-left">Pemulihan</Head>
                    <Head className="text-right">Tindakan</Head>
                  </tr>
                </thead>
                <tbody>
                  {visibleData.map((incident) => {
                    const canSelect = isActionableScope(incident) && incident.status === "OPEN";
                    const request = requestByIncident.get(incident.id);
                    const requestStatus = String(request?.status || "").toUpperCase();
                    const isBusy = inProgressStatuses.has(requestStatus);
                    const isGatewayIntegrity = String(incident.incident_scope).toUpperCase() === "GATEWAY_INTEGRITY";
                    const uncertainSource = ["UNREACHABLE", "NOT_COMPARABLE", "PENDING"].includes(String(incident.source_status || "").toUpperCase());
                    const canInvestigate = isGatewayIntegrity && incident.status === "OPEN";
                    return (
                      <tr key={incident.id} className={cn("border-t border-line", selected.has(incident.id) && "bg-info/[0.08]")}>
                        <td className="px-3.5 py-3">
                          <input type="checkbox" checked={selected.has(incident.id)} onChange={() => toggleOne(incident.id)} aria-label={`Pilih ${incident.resource || "data client"}`} disabled={!canSelect || isBusy} className="accent-brand" />
                        </td>
                        <td className="px-3.5 py-3">
                          <code className="font-mono font-semibold text-ink">{incident.resource || "Bagian tidak diketahui"}</code>
                          <small className="mt-1 block font-mono text-ink-faint">Log {incident.reference_log_id || incident.log_id}</small>
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge tone={isGatewayIntegrity || uncertainSource ? "warning" : "danger"}>{incidentLabel(incident)}</Badge>
                        </td>
                        <td className="px-3.5 py-3">
                          {isGatewayIntegrity ? (
                            <small className="text-ink-dim">Log internal tidak valid. Perubahan pada data client belum terkonfirmasi.</small>
                          ) : (
                            <small className="text-ink-dim">{sourceDescription(incident.source_status)}</small>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-ink-dim">{formatDate(incident.detected_at)}</td>
                        <td className="px-3.5 py-3">
                          {request ? <Badge tone={requestTone(requestStatus)}>{requestLabel(requestStatus)}</Badge> : <Badge tone={incident.status === "OPEN" ? "warning" : "neutral"}>{incidentStatusLabel(incident.status)}</Badge>}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {isBusy && request
                            ? <Button variant="outline" size="sm" onClick={() => onViewRequest(request)}><Eye className="size-3" /> Lihat status</Button>
                            : <Button variant={canSelect ? "default" : "outline"} size="sm" disabled={!canSelect && !canInvestigate} onClick={() => onPrepare([incident.id])}>{canSelect ? "Periksa pemulihan" : canInvestigate ? "Lihat detail" : "Tidak tersedia"}</Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {pageCount > 1 && <div className="flex items-center justify-between border-t border-line px-3.5 py-2.5">
          <span className="text-[10px] text-ink-faint">Halaman {displayPage} dari {pageCount} Â· 50 temuan per halaman</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={displayPage <= 1} onClick={() => serverPaged ? onPageChange(Math.max(1, displayPage - 1)) : setFallbackPage((current) => Math.max(1, current - 1))}><ChevronLeft className="size-3.5" /> Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={displayPage >= pageCount} onClick={() => serverPaged ? onPageChange(Math.min(pageCount, displayPage + 1)) : setFallbackPage((current) => Math.min(pageCount, current + 1))}>Berikutnya <ChevronRight className="size-3.5" /></Button>
          </div>
        </div>}
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

function requestTone(status: string) {
  if (status === "SUCCEEDED") return "success" as const;
  if (activeStatuses.has(status)) return "info" as const;
  if (status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT") return "danger" as const;
  return "warning" as const;
}

function incidentLabel(incident: RecoveryIncident) {
  if (String(incident.incident_scope).toUpperCase() === "GATEWAY_INTEGRITY") return "Log audit bermasalah";
  switch (String(incident.source_status || "").toUpperCase()) {
    case "MISSING": return "Data tidak ditemukan";
    case "UNEXPECTED_PRESENT": return "Data masih ada";
    case "MISMATCH": return "Perubahan pada data client";
    case "UNREACHABLE": return "Data belum dapat diperiksa";
    default: return "Kondisi data belum dapat dipastikan";
  }
}

function sourceDescription(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "MISSING": return "Data yang seharusnya ada tidak ditemukan.";
    case "UNEXPECTED_PRESENT": return "Data masih ada meski catatan terakhir menunjukkan penghapusan.";
    case "MISMATCH": return "Saat temuan dicatat, data berbeda dari acuannya. Kondisi terbaru perlu diperiksa ulang.";
    case "UNREACHABLE": return "Pemeriksaan belum dapat memastikan kondisi data client.";
    case "NOT_COMPARABLE": return "Catatan pembanding belum tersedia untuk memastikan kondisi data.";
    default: return "Kondisi data client belum dapat dipastikan.";
  }
}

function requestLabel(status: string) {
  if (status === "SUCCEEDED") return "Berhasil";
  if (status === "PENDING_EXECUTION") return "Menunggu";
  if (activeStatuses.has(status)) return "Berlangsung";
  if (status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT") return "Perlu ditinjau";
  return "Belum selesai";
}

function incidentStatusLabel(value: string) {
  if (String(value).toUpperCase() === "SUPERSEDED") return "Acuan tergantikan";
  if (String(value).toUpperCase() === "OPEN") return "Belum diperiksa";
  return "Selesai";
}

function formatDate(value?: string) {
  if (!value) return "â€”";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Head({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-3.5 py-2.5 font-semibold", className)}>{children}</th>;
}

