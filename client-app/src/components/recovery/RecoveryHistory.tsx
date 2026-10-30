import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, History, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { RecoverySlideOver } from "@/components/recovery/RecoverySlideOver";
import { formatRecoveryDate } from "@/components/recovery/client-tamper-utils";
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
    const failed = event.result_status.startsWith("FAILED") || event.result_status === "APPLIED_CDC_TIMEOUT";
    const statusMatches = filter === "ALL" || (filter === "SUCCEEDED" && event.result_status === "SUCCEEDED") || (filter === "NEEDS_REVIEW" && failed);
    const searchText = `${event.id} ${event.incident_id || ""} ${event.target_log_id || ""} ${event.selected_log_id || ""} ${event.resource} ${event.operation || ""} ${event.result_status}`.toLowerCase();
    return statusMatches && searchText.includes(query.trim().toLowerCase());
  }), [events, filter, query]);
  const failedCount = events.filter((event) => event.result_status.startsWith("FAILED") || event.result_status === "APPLIED_CDC_TIMEOUT").length;
  const recoveredCount = events.filter((event) => event.result_status === "SUCCEEDED").length;

  return <div className="space-y-4">
    <section className="flex flex-wrap gap-3 rounded-xl border border-line bg-panel p-4" aria-label="Recovery history filters">
      <label className="flex min-w-60 flex-1 items-center gap-2.5 rounded-lg border border-line-strong bg-ground px-3.5 focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/20">
        <Search className="size-4 shrink-0 text-ink-dim" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, log, resource, or operation…" className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" aria-label="Search recovery history" />
      </label>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ground p-1">
        {([ ["ALL", "All results", events.length], ["SUCCEEDED", "Recovered", recoveredCount], ["NEEDS_REVIEW", "Needs review", failedCount] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated hover:text-ink"}`}>{label}<span className="ml-2 font-mono text-xs text-ink-dim">{count}</span></button>)}
      </div>
      {(query || filter !== "ALL") && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); onFilterChange("ALL"); }}><X className="size-4" /> Clear filters</Button>}
    </section>

    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="flex flex-col items-start justify-between gap-2 p-4 sm:flex-row sm:items-center">
        <div><CardTitle className="text-sm font-semibold normal-case tracking-normal text-ink">Recovery history</CardTitle><p className="mt-1 text-sm text-ink-dim">Execution evidence recorded in the recovery event ledger.</p></div>
        <span className="shrink-0 font-mono text-xs text-ink-dim">{filteredEvents.length} shown · {data.total_items} events total</span>
      </CardHeader>
      <CardContent className="p-0">
        {filteredEvents.length === 0 ? <EmptyState message={events.length === 0 ? "No recovery events have been recorded for this workspace." : "No recovery events match these filters."} /> : <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead><tr className="bg-ground/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-dim"><Head>Event / target</Head><Head>Operation</Head><Head>Result</Head><Head>Integrity</Head><Head>CDC</Head><Head>Executed</Head></tr></thead>
            <tbody className="divide-y divide-line">
              {filteredEvents.map((event) => <tr key={event.id} className="cursor-pointer transition-colors hover:bg-elevated/60 focus-visible:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70" onClick={() => setSelected(event)} onKeyDown={(keyEvent) => { if (keyEvent.target === keyEvent.currentTarget && (keyEvent.key === "Enter" || keyEvent.key === " ")) { keyEvent.preventDefault(); setSelected(event); } }} tabIndex={0}>
                <Cell><code className="font-mono font-semibold text-ink">{event.target_log_id || event.selected_log_id || "Unknown target"}</code><small className="mt-1 block text-xs text-ink-dim">{event.resource} · {event.id}</small></Cell>
                <Cell>{event.operation || "—"}</Cell>
                <Cell><Badge tone={resultTone(event.result_status)} className="text-[10px]">{formatStatus(event.result_status)}</Badge>{event.failure_reason && <small className="mt-1 block max-w-52 text-xs text-ink-dim">{event.failure_reason}</small>}</Cell>
                <Cell><Badge tone={integrityTone(event.integrity_status)} className="text-[10px]">{formatStatus(event.integrity_status || "NOT_CHECKED")}</Badge></Cell>
                <Cell><Badge tone={event.cdc_status === "CONFIRMED" || event.cdc_status === "NOT_REQUIRED" ? "success" : event.cdc_status === "TIMEOUT" || event.cdc_status === "CONFLICT" ? "danger" : "warning"} className="text-[10px]">{formatStatus(event.cdc_status || "UNKNOWN")}</Badge></Cell>
                <Cell>{formatRecoveryDate(event.executed_at)}</Cell>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </CardContent>
    </Card>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-dim">
      <p>Search and status filters apply to this page. {data.page_size} events are requested per page.</p>
      <div className="flex items-center gap-2" aria-label="Recovery history pages">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, data.page - 1))} disabled={isFetching || data.page <= 1} aria-label="Previous recovery history page"><ChevronLeft className="size-4" /> Previous</Button>
        <span aria-live="polite">Page {data.page} of {Math.max(data.total_pages, 1)}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(data.page + 1)} disabled={isFetching || data.page >= data.total_pages} aria-label="Next recovery history page">Next <ChevronRight className="size-4" /></Button>
      </div>
    </div>

    {selected && <EventDetails event={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function EventDetails({ event, onClose }: { event: RecoveryEvent; onClose: () => void }) {
  return <RecoverySlideOver title="Recovery event details" subtitle={<span><code className="font-mono text-brand-bright">{event.resource}</code> · {event.target_log_id || event.selected_log_id || "Unknown target"}</span>} icon={<History className="size-5" />} iconTone="info" onClose={onClose} footer={(close) => <Button variant="outline" onClick={close}>Close details</Button>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Fact label="Result" value={formatStatus(event.result_status)} />
      <Fact label="Integrity" value={formatStatus(event.integrity_status || "NOT_CHECKED")} />
      <Fact label="Operation" value={event.operation || "—"} />
      <Fact label="CDC" value={formatStatus(event.cdc_status || "UNKNOWN")} />
      <Fact label="Executed by" value={event.executed_by || "—"} />
      <Fact label="Executed at" value={formatRecoveryDate(event.executed_at)} />
      <Fact label="Before state hash" value={event.client_before_hash || event.before_hash || "—"} mono />
      <Fact label="After state hash" value={event.client_after_hash || event.after_hash || "—"} mono />
      {event.failure_reason && <Fact label="Failure" value={event.failure_reason} />}
    </div>
    {event.recovered_metadata !== undefined && event.recovered_metadata !== null && <div className="mt-5 rounded-xl border border-line bg-ground p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Recovered reference state · redacted by gateway</p>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink">{formatJson(event.recovered_metadata)}</pre>
    </div>}
  </RecoverySlideOver>;
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 rounded-lg border border-line bg-ground px-3.5 py-3"><p className="text-xs font-medium text-ink-dim">{label}</p><p className={`mt-1.5 break-words text-sm text-ink ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}

function Head({ children }: { children: ReactNode }) {
  return <th scope="col" className="px-4 py-3 text-left font-semibold">{children}</th>;
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top text-ink-dim">{children}</td>;
}

function resultTone(status: string) {
  if (status === "SUCCEEDED") return "success" as const;
  if (status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT") return "danger" as const;
  if (status === "APPLIED_AWAITING_CDC") return "info" as const;
  return "warning" as const;
}

function integrityTone(status?: string) {
  if (status === "VALID") return "success" as const;
  if (status === "TAMPERED") return "danger" as const;
  if (status === "UNREACHABLE") return "warning" as const;
  return "neutral" as const;
}

function formatStatus(value: string) {
  return String(value || "UNKNOWN").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2) ?? String(value);
}
