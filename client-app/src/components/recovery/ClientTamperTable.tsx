import { Check, ChevronDown, Eye, Filter, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { parseClientDiscrepancies, formatRecoveryDate } from "@/components/recovery/client-tamper-utils";
import { cn } from "@/lib/utils";
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
}

export function ClientTamperTable({ records, summary, total, statusFilter, onStatusChange, searchQuery, onSearchChange, tableFilter, onTableChange, onInspect, onRecover, recoveringId, isLoading }: ClientTamperTableProps) {
  const availableTables = useMemo(() => {
    const tables = new Set(records.map((record) => record.table_name?.toUpperCase()).filter(Boolean) as string[]);
    if (tableFilter) tables.add(tableFilter.toUpperCase());
    return Array.from(tables).sort();
  }, [records, tableFilter]);

  const openCount = summary?.open_count ?? records.filter((record) => record.status === "OPEN").length;
  const recoveredCount = summary?.recovered_count ?? records.filter((record) => record.status === "RECOVERED").length;
  const dismissedCount = summary?.dismissed_count ?? records.filter((record) => record.status === "DISMISSED").length;
  const totalCount = summary?.total_count ?? total;
  const hasFilters = Boolean(searchQuery || tableFilter || statusFilter !== "ALL");

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-line bg-panel p-4" aria-label="Incident filters">
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-60 flex-1 items-center gap-2.5 rounded-lg border border-line-strong bg-ground px-3.5 focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="size-4 shrink-0 text-ink-dim" />
            <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search resource, table, or record ID…" className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" aria-label="Search tamper incidents" />
          </label>
          <TableSelect value={tableFilter} options={availableTables} onChange={onTableChange} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {[
            { id: "ALL", label: "All statuses", count: totalCount },
            { id: "OPEN", label: "Open", count: openCount, tone: "text-danger" },
            { id: "RECOVERED", label: "Recovered", count: recoveredCount, tone: "text-success" },
            { id: "DISMISSED", label: "Dismissed", count: dismissedCount, tone: "text-ink-dim" },
          ].map(({ id, label, count, tone }) => <button key={id} type="button" aria-pressed={statusFilter === id} onClick={() => onStatusChange(id)} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70", statusFilter === id ? "bg-navy-bright/25 text-ink ring-1 ring-brand-bright/35" : "text-ink-dim hover:bg-elevated hover:text-ink")}>
            <span className={tone}>{label}</span><span className="ml-2 font-mono text-xs text-ink-dim">{count}</span>
          </button>)}
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => { onSearchChange(""); onTableChange(""); onStatusChange("ALL"); }}><X className="size-4" /> Clear filters</Button>}
        </div>
      </section>

      <Card className="overflow-hidden rounded-xl">
        <CardHeader className="flex flex-col items-start justify-between gap-2 p-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-sm font-semibold normal-case tracking-normal text-ink">Client data integrity incidents</CardTitle>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-dim">Review differences between client database rows and verified off-chain records. Select an incident to inspect its evidence.</p>
          </div>
          <span className="shrink-0 font-mono text-xs text-ink-dim">{records.length} shown · {total} total</span>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? <EmptyState message={isLoading ? "Loading client integrity incidents…" : totalCount === 0 ? "No client data integrity incidents have been detected." : "No incidents match the selected filters."} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead><tr className="border-b border-line bg-ground/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  <th scope="col" className="px-4 py-3">Resource / table</th><th scope="col" className="px-4 py-3">Changed columns</th><th scope="col" className="px-4 py-3">Reference / client hash</th><th scope="col" className="px-4 py-3">Detected</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {records.map((record) => {
                    const isRowRecovering = recoveringId === record.id;
                    const isOpen = record.status === "OPEN";
                    const { discrepancies } = parseClientDiscrepancies(record);

                    return <tr key={record.id} role="button" tabIndex={0} aria-label={`${record.resource}, ${record.table_name}, record ${record.record_id}. Open incident details.`} onClick={() => onInspect(record)} onKeyDown={(event) => handleRowKeyDown(event, () => onInspect(record))} className="cursor-pointer transition-colors hover:bg-elevated/65 focus-visible:bg-elevated/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70">
                      <td className="px-4 py-4 align-top">
                        <code className="font-mono text-sm font-semibold text-brand-bright">{record.resource}</code>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-dim"><span className="font-medium text-ink">{record.table_name}</span><span aria-hidden="true">·</span><span>Record ID: <code className="font-mono">{record.record_id}</code></span>{record.action && <><span aria-hidden="true">·</span><span className="font-mono">{record.action}</span></>}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {discrepancies.length > 0 ? <><Badge tone="danger" className="text-[10px]">{discrepancies.length} changed {discrepancies.length === 1 ? "column" : "columns"}</Badge><p className="mt-1.5 text-xs text-ink-dim">{discrepancies.slice(0, 2).map((diff) => diff.field).join(", ")}{discrepancies.length > 2 ? ` +${discrepancies.length - 2} more` : ""}</p></> : <span className="text-xs text-ink-dim">Row hash mismatch</span>}
                        {record.recovery_error && <small className="mt-1 block max-w-52 truncate text-xs text-warning" title={record.recovery_error}>Recovery note: {record.recovery_error}</small>}
                      </td>
                      <td className="px-4 py-4 align-top"><div className="space-y-1.5 font-mono text-xs"><HashLine label="Ref" value={record.expected_hash} tone="text-success" /><HashLine label="Client" value={record.actual_hash} tone="text-danger" /></div></td>
                      <td className="px-4 py-4 align-top text-sm text-ink-dim"><div>{formatRecoveryDate(record.detected_at)}</div>{record.last_confirmed_at && <small className="mt-1 block text-xs text-ink-faint">Last scan: {formatRecoveryDate(record.last_confirmed_at)}</small>}</td>
                      <td className="px-4 py-4 align-top"><Badge tone={record.status === "OPEN" ? "danger" : record.status === "RECOVERED" ? "success" : "neutral"} className="text-[10px]">{formatStatus(record.status)}</Badge>{record.auto_recovered && <small className="mt-1.5 block text-xs text-success">Automatically recovered</small>}{record.resolved_by && <small className="mt-1 block text-xs text-ink-dim">by {record.resolved_by}</small>}</td>
                      <td className="px-4 py-4 text-right align-top"><div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); onInspect(record); }} onKeyDown={(event) => event.stopPropagation()} title="View incident details"><Eye className="size-4" /><span className="hidden lg:inline">Details</span></Button>
                        {isOpen && <Button size="sm" onClick={(event) => { event.stopPropagation(); onRecover(record); }} onKeyDown={(event) => event.stopPropagation()} disabled={isRowRecovering} className="bg-brand hover:bg-brand-bright">{isRowRecovering ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}<span className="hidden lg:inline">{isRowRecovering ? "Recovering…" : "Recover"}</span></Button>}
                      </div></td>
                    </tr>;
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

function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, open: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
}

function HashLine({ label, value, tone }: { label: string; value?: string; tone: string }) {
  const preview = value ? value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value : "Unavailable";
  return <div className={`flex items-start gap-2 ${tone}`} title={value || undefined}><span className="w-11 shrink-0 text-ink-faint">{label}:</span><code className="break-all">{preview}</code></div>;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function TableSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [knownTables, setKnownTables] = useState<string[]>([]);
  const selectedValue = value.toUpperCase();
  const menuOptions = ["ALL TABLES", ...knownTables];
  const selectedIndex = value ? menuOptions.findIndex((option) => option === selectedValue) : 0;

  useEffect(() => {
    setKnownTables((current) => Array.from(new Set([...current, ...options, ...(value ? [selectedValue] : [])])).sort());
  }, [options, selectedValue, value]);

  useEffect(() => {
    if (!open) return;
    const selected = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(selected);
    optionRefs.current[selected]?.focus();
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const openMenu = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    let next = activeIndex;
    if (event.key === "ArrowDown") next = (activeIndex + 1) % menuOptions.length;
    else if (event.key === "ArrowUp") next = (activeIndex - 1 + menuOptions.length) % menuOptions.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = menuOptions.length - 1;
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(activeIndex === 0 ? "" : menuOptions[activeIndex] ?? ""); return; }
    else if (event.key === "Tab") { setOpen(false); return; }
    else return;
    event.preventDefault();
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const currentIndex = selectedIndex;

  return <div ref={rootRef} className="relative shrink-0">
    <button ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") { event.preventDefault(); openMenu(); }
    }} className="flex h-11 items-center gap-2.5 rounded-lg border border-line-strong bg-ground px-3.5 text-sm text-ink transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
      <Filter className="size-4 text-ink-dim" /><span className="text-ink-dim">Table</span><span className="max-w-36 truncate font-medium">{value ? selectedValue : "All tables"}</span><ChevronDown className={`size-4 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" aria-label="Filter by table" aria-activedescendant={`table-option-${activeIndex}`} onKeyDown={handleMenuKeyDown} className="absolute right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 w-60 overflow-y-auto rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl">
      {menuOptions.map((option, index) => <button key={option} ref={(element) => { optionRefs.current[index] = element; }} id={`table-option-${index}`} type="button" role="option" aria-selected={currentIndex === index} tabIndex={-1} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(index === 0 ? "" : option)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:bg-elevated focus-visible:outline-none", currentIndex === index ? "bg-navy-bright/20 text-ink" : "text-ink-dim hover:bg-elevated hover:text-ink")}>
        <span>{index === 0 ? "All tables" : option}</span>{currentIndex === index && <Check className="size-4 text-brand-bright" />}
      </button>)}
    </div>}
  </div>;
}
