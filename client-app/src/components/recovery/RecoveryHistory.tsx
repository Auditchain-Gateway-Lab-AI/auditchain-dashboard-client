import { useMemo, useState, type ReactNode } from "react";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { Button } from "@/components/ui/button";
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
    const text = `${event.id} ${event.incident_id || ""} ${event.target_log_id || ""} ${event.selected_log_id || ""} ${event.resource} ${event.operation || ""} ${event.result_status}`.toLowerCase();
    return statusMatches && text.includes(query.trim().toLowerCase());
  }), [events, filter, query]);
  const failedCount = events.filter((event) => event.result_status.startsWith("FAILED") || event.result_status === "APPLIED_CDC_TIMEOUT").length;

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap gap-2 rounded-lg border border-line bg-panel p-3" aria-label="Recovery history filters">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong bg-ground px-3"><Search className="size-4 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, log, resource, operation..." className="h-9 w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint" aria-label="Search recovery history" /></label>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ground p-1">
          {([ ["ALL", "All results", events.length], ["SUCCEEDED", "Recovered", events.filter((event) => event.result_status === "SUCCEEDED").length], ["NEEDS_REVIEW", "Needs review", failedCount] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === value ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated"}`}>{label}<span className="ml-1.5 font-mono text-ink-faint">{count}</span></button>)}
        </div>
        {(query || filter !== "ALL") && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); onFilterChange("ALL"); }}><X className="size-3" /> Clear filters</Button>}
      </section>
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Recovery history</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">Execution evidence is recorded in the recovery event ledger.</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">{filteredEvents.length} shown · {data.total_items} events total</span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? <EmptyState message={events.length === 0 ? "No recovery events have been recorded for this workspace." : "No recovery events match these filters."} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <Head>Event / target</Head><Head>Operation</Head><Head>Result</Head><Head>Integrity</Head><Head>CDC</Head><Head>Executed</Head>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="cursor-pointer border-t border-line hover:bg-elevated/70" onClick={() => setSelected(event)} onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") setSelected(event); }} tabIndex={0}>
                      <Cell><code className="font-mono font-semibold text-ink">{event.target_log_id || event.selected_log_id || "Unknown target"}</code><small className="mt-1 block text-ink-faint">{event.resource} · {event.id}</small></Cell>
                      <Cell>{event.operation || "—"}</Cell>
                      <Cell><Badge tone={resultTone(event.result_status)}>{formatStatus(event.result_status)}</Badge>{event.failure_reason && <small className="mt-1 block max-w-52 text-ink-faint">{event.failure_reason}</small>}</Cell>
                      <Cell><Badge tone={integrityTone(event.integrity_status)}>{formatStatus(event.integrity_status || "NOT_CHECKED")}</Badge></Cell>
                      <Cell><Badge tone={event.cdc_status === "CONFIRMED" || event.cdc_status === "NOT_REQUIRED" ? "success" : event.cdc_status === "TIMEOUT" || event.cdc_status === "CONFLICT" ? "danger" : "warning"}>{formatStatus(event.cdc_status || "UNKNOWN")}</Badge></Cell>
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
        <p>Search and status filters apply to this page. {data.page_size} events are requested per page.</p>
        <div className="flex items-center gap-2" aria-label="Recovery history pages">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, data.page - 1))} disabled={isFetching || data.page <= 1} aria-label="Previous recovery history page">
            <ChevronLeft className="size-3.5" /> Previous
          </Button>
          <span aria-live="polite">Page {data.page} of {Math.max(data.total_pages, 1)}</span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(data.page + 1)} disabled={isFetching || data.page >= data.total_pages} aria-label="Next recovery history page">
            Next <ChevronRight className="size-3.5" />
          </Button>
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
          <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">Recovery event</p><h2 id="recovery-event-title" className="mt-1 text-sm font-semibold text-ink">{event.resource} · {event.target_log_id || event.selected_log_id}</h2></div>
          <button type="button" className="rounded border border-line px-2 py-1 text-xs text-ink-dim hover:bg-elevated" onClick={onClose}>Close</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Fact label="Result" value={formatStatus(event.result_status)} />
          <Fact label="Integrity" value={formatStatus(event.integrity_status || "NOT_CHECKED")} />
          <Fact label="Operation" value={event.operation || "—"} />
          <Fact label="CDC" value={formatStatus(event.cdc_status || "UNKNOWN")} />
          <Fact label="Executed by" value={event.executed_by || "—"} />
          <Fact label="Executed at" value={formatDate(event.executed_at)} />
          <Fact label="Before state hash" value={event.client_before_hash || event.before_hash || "—"} mono />
          <Fact label="After state hash" value={event.client_after_hash || event.after_hash || "—"} mono />
          {event.failure_reason && <Fact label="Failure" value={event.failure_reason} />}
        </div>
        {event.recovered_metadata !== undefined && event.recovered_metadata !== null && (
          <div className="mt-4 rounded-lg border border-line bg-ground p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Recovered reference state · redacted by gateway</p>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-ink-dim">{formatJson(event.recovered_metadata)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 rounded-md border border-line bg-ground px-3 py-2"><p className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</p><p className={`mt-1 break-words text-[11px] text-ink-dim ${mono ? "font-mono" : ""}`}>{value}</p></div>;
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

function formatDate(value?: string) {
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
