import { useMemo, useState, type ReactNode } from "react";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { Button } from "@/components/ui/button";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";
import type { RecoveryEvent, RecoveryEventPage } from "@/types/recovery";

type HistoryFilter = "ALL" | "SUCCEEDED" | "NEEDS_REVIEW";

export function RecoveryHistory({ data, filter, onFilterChange, onPageChange, isFetching }: {
  data: RecoveryEventPage;
  filter: HistoryFilter;
  onFilterChange: (value: HistoryFilter) => void;
  onPageChange: (page: number) => void;
  isFetching: boolean;
}) {
  const [selected, setSelected] = useState<RecoveryEvent | null>(null);
  const [query, setQuery] = useState("");
  const events = data.data || [];
  const filteredEvents = useMemo(() => events.filter((event) => {
    const isFailed = event.result_status.startsWith("FAILED") || event.result_status === "APPLIED_CDC_TIMEOUT";
    const statusMatches = filter === "ALL" || (filter === "SUCCEEDED" && event.result_status === "SUCCEEDED") || (filter === "NEEDS_REVIEW" && isFailed);
    const text = `${event.resource} ${event.operation || ""} ${event.result_status}`.toLowerCase();
    return statusMatches && text.includes(query.trim().toLowerCase());
  }), [events, filter, query]);
  const failedCount = events.filter((event) => event.result_status.startsWith("FAILED") || event.result_status === "APPLIED_CDC_TIMEOUT").length;
  const successfulCount = events.filter((event) => event.result_status === "SUCCEEDED").length;

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap gap-2 rounded-lg border border-line bg-panel p-3" aria-label="Filter riwayat pemulihan">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bagian data atau tindakan..." className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Cari riwayat pemulihan" /></label>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ground p-1">
          {([ ["ALL", "Semua", events.length], ["SUCCEEDED", "Berhasil", successfulCount], ["NEEDS_REVIEW", "Perlu ditinjau", failedCount] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{label}<span className="ml-1.5 font-mono text-ink-faint">{count}</span></button>)}
        </div>
        {(query || filter !== "ALL") && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); onFilterChange("ALL"); }}><X className="size-3" /> Hapus filter</Button>}
      </section>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Riwayat pemulihan</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">Lihat bagian data yang dipulihkan dan hasilnya.</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{filteredEvents.length} ditampilkan Â· {data.total_items} total</span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? <EmptyState message={events.length === 0 ? "Belum ada riwayat pemulihan." : "Tidak ada riwayat yang cocok dengan filter ini."} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead><tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint"><Head>Bagian data</Head><Head>Tindakan</Head><Head>Hasil</Head><Head>Waktu</Head></tr></thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="cursor-pointer border-t border-line hover:bg-elevated/70" onClick={() => setSelected(event)} onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") setSelected(event); }} tabIndex={0}>
                      <Cell><code className="font-mono font-semibold text-ink">{event.resource || "Data client"}</code></Cell>
                      <Cell>{operationLabel(event.operation)}</Cell>
                      <Cell><Badge tone={resultTone(event.result_status)}>{resultLabel(event.result_status)}</Badge>{event.failure_reason && <small className="mt-1 block max-w-52 text-ink-faint">{recoveryErrorMessage(event.failure_reason)}</small>}</Cell>
                      <Cell>{formatDate(event.executed_at)}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-faint">
        <p>Pencarian dan filter berlaku untuk halaman ini. {data.page_size} hasil ditampilkan per halaman.</p>
        <div className="flex items-center gap-2" aria-label="Halaman riwayat pemulihan">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, data.page - 1))} disabled={isFetching || data.page <= 1} aria-label="Halaman sebelumnya"><ChevronLeft className="size-3.5" /> Sebelumnya</Button>
          <span aria-live="polite">Halaman {data.page} dari {Math.max(data.total_pages, 1)}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(data.page + 1)} disabled={isFetching || data.page >= data.total_pages} aria-label="Halaman berikutnya">Berikutnya <ChevronRight className="size-3.5" /></Button>
        </div>
      </div>
      {selected && <EventDetails event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EventDetails({ event, onClose }: { event: RecoveryEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <section className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-line-strong bg-panel p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="recovery-event-title" onClick={(eventClick) => eventClick.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">Rincian pemulihan</p><h2 id="recovery-event-title" className="mt-1 text-sm font-semibold text-ink">{event.resource || "Data client"}</h2></div>
          <button type="button" className="rounded border border-line px-2 py-1 text-xs text-ink-dim hover:bg-elevated" onClick={onClose}>Tutup</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Fact label="Hasil" value={resultLabel(event.result_status)} />
          <Fact label="Tindakan" value={operationLabel(event.operation)} />
          <Fact label="Waktu" value={formatDate(event.executed_at)} />
          {event.executed_by && <Fact label="Dilakukan oleh" value={event.executed_by} />}
          {event.failure_reason && <Fact label="Keterangan" value={recoveryErrorMessage(event.failure_reason)} />}
        </div>
        {event.recovered_metadata !== undefined && event.recovered_metadata !== null && (
          <div className="mt-4 rounded-lg border border-line bg-ground p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Data hasil pemulihan</p>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-ink-dim">{formatJson(event.recovered_metadata)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md border border-line bg-ground px-3 py-2"><p className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</p><p className="mt-1 break-words text-[11px] text-ink-dim">{value}</p></div>;
}

function Head({ children }: { children: ReactNode }) {
  return <th className="px-3.5 py-2.5 text-left font-semibold">{children}</th>;
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="px-3.5 py-3 align-top text-ink-dim">{children}</td>;
}

function resultTone(status: string) {
  if (status === "SUCCEEDED") return "success" as const;
  if (status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT") return "danger" as const;
  if (status === "APPLIED_AWAITING_CDC" || status === "EXECUTING") return "info" as const;
  return "warning" as const;
}

function resultLabel(value: string) {
  const status = String(value || "UNKNOWN").toUpperCase();
  if (status === "SUCCEEDED") return "Berhasil dipulihkan";
  if (status === "PENDING_EXECUTION") return "Menunggu diproses";
  if (status === "EXECUTING" || status === "APPLIED_AWAITING_CDC") return "Sedang diproses";
  if (status === "APPLIED_CDC_TIMEOUT" || status.startsWith("FAILED") || status === "REJECTED") return "Perlu ditinjau";
  return "Belum selesai";
}

function operationLabel(value?: string) {
  switch (String(value || "").toUpperCase()) {
    case "INSERT": return "Memulihkan data";
    case "UPDATE": return "Mengembalikan perubahan";
    case "DELETE": return "Menghapus data yang seharusnya terhapus";
    default: return "Pemulihan data";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}
