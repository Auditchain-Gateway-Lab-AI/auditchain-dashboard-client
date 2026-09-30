import { LifeBuoy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecoveryIncident } from "@/types/recovery";

export function ActiveIncidents({ data, onPrepare }: { data: RecoveryIncident[]; onPrepare: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = data.length > 0 && selected.size === data.length;
  const selectedRecoverable = useMemo(
    () => data.filter((incident) => selected.has(incident.id) && incident.snapshot === "AVAILABLE").length,
    [data, selected],
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(data.map((incident) => incident.id)));
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
      {selected.size > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-elevated px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            <span className="font-semibold text-ink">{selected.size} selected</span>
            <span className="mx-2 text-ink-faint">|</span>
            <span className="text-ink-dim">Ready to recover: <span className="font-semibold text-success">{selectedRecoverable}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear selection</Button>
            <Button variant="default" size="sm" onClick={() => onPrepare([...selected])} disabled={selectedRecoverable === 0}>
              <LifeBuoy className="size-3.5" /> Prepare Recovery ({selectedRecoverable})
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Active Incidents</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-ink-faint">No active incidents.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                    <th className="w-10 px-3.5 py-2.5 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all incidents" className="accent-brand" />
                    </th>
                    <Head className="text-left">Resource</Head>
                    <Head className="text-left">Issue</Head>
                    <Head className="text-left">Snapshot</Head>
                    <Head className="text-left">Recovery</Head>
                    <Head className="text-right">Action</Head>
                  </tr>
                </thead>
                <tbody>
                  {data.map((incident) => {
                    const canRecover = incident.snapshot === "AVAILABLE";
                    const isSelected = selected.has(incident.id);
                    return (
                      <tr key={incident.id} className={cn("border-t border-line", isSelected && "bg-info/[0.08]")}>
                        <td className="px-3.5 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(incident.id)} aria-label={`Select ${incident.id}`} className="accent-brand" />
                        </td>
                        <td className="px-3.5 py-3 font-mono font-semibold text-ink">{incident.id}</td>
                        <td className="px-3.5 py-3"><Badge tone={incident.status === "TAMPERED" ? "danger" : "warning"}>{incident.status}</Badge></td>
                        <td className="px-3.5 py-3">{canRecover ? <span className="text-success">Available</span> : <span className="text-ink-faint">—</span>}</td>
                        <td className="px-3.5 py-3">{canRecover ? <span className="text-brand-bright">Ready</span> : <span className="text-ink-faint">Not available</span>}</td>
                        <td className="px-3.5 py-3 text-right">
                          <Button variant={canRecover ? "default" : "outline"} size="sm" disabled={!canRecover} onClick={() => onPrepare([incident.id])}>
                            <LifeBuoy className="size-3.5" /> Prepare
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
    </div>
  );
}

function Head({ className, children }: { className?: string; children: ReactNode }) {
  return <th className={cn("px-3.5 py-2.5 font-semibold", className)}>{children}</th>;
}
