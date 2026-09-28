import { useState } from "react";
import { LifeBuoy, Database, History, Camera } from "lucide-react";
import { Panel, Pill, Btn, colorMix } from "./ui";
import RecoveryDrawer from "./RecoveryDrawer";
import { INCIDENTS, RECOVERY_HISTORY, SNAPSHOTS, fmt } from "../lib/data";

type Tab = "incidents" | "history" | "snapshots";
const TABS: { key: Tab; label: string; icon: typeof Database }[] = [
  { key: "incidents", label: "Active Incidents", icon: Database },
  { key: "history", label: "Recovery History", icon: History },
  { key: "snapshots", label: "Snapshots", icon: Camera },
];

export default function Recovery() {
  const [tab, setTab] = useState<Tab>("incidents");
  const [recoverIds, setRecoverIds] = useState<string[] | null>(null);

  return (
    <div className="px-3 py-3 lg:px-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[24px] text-[var(--color-ink)]">Recovery Workspace</h1>
          <p className="text-[12px] text-[var(--color-ink-dim)]">
            Restore tampered or missing records to their last trusted, anchored state.
          </p>
        </div>
        <div className="flex gap-1 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-panel)] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-semibold transition-colors"
              style={
                tab === t.key
                  ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.22), color: "var(--color-ink)" }
                  : { color: "var(--color-ink-dim)" }
              }
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "incidents" && <Incidents onRecover={(ids) => setRecoverIds(ids)} />}
      {tab === "history" && <HistoryTable />}
      {tab === "snapshots" && <Snapshots />}

      {recoverIds && <RecoveryDrawer ids={recoverIds} onClose={() => setRecoverIds(null)} />}
    </div>
  );
}

function Incidents({ onRecover }: { onRecover: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const executableIds = INCIDENTS.filter((i) => i.snapshot === "AVAILABLE").map((i) => i.id);
  const allPicked = picked.size > 0 && picked.size === INCIDENTS.length;

  function toggleAll() {
    if (allPicked) {
      setPicked(new Set());
    } else {
      setPicked(new Set(INCIDENTS.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedExecutable = [...picked].filter((id) => executableIds.includes(id)).length;

  return (
    <div className="flex flex-col gap-3">
      {picked.size > 0 && (
        <div className="flex items-center justify-between rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-elevated)] px-4 py-2.5">
          <div className="text-[12px]">
            <span className="font-semibold text-[var(--color-ink)]">{picked.size} selected</span>
            <span className="mx-2 text-[var(--color-ink-faint)]">|</span>
            <span className="text-[var(--color-ink-dim)]">Ready to recover: <span className="font-semibold text-[var(--color-up)]">{selectedExecutable}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setPicked(new Set())}>Clear selection</Btn>
            <Btn 
              variant="primary" 
              size="sm" 
              onClick={() => onRecover([...picked])} 
              disabled={selectedExecutable === 0}
            >
              <LifeBuoy size={13} /> Prepare Recovery ({selectedExecutable})
            </Btn>
          </div>
        </div>
      )}
      
      <Panel title="Active Incidents">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
                <th className="px-3.5 py-2.5 text-left w-10">
                  <input 
                    type="checkbox" 
                    checked={allPicked}
                    onChange={toggleAll}
                    className="accent-[var(--color-brand-green)]" 
                  />
                </th>
                <Th className="text-left">Resource</Th>
                <Th className="text-left">Issue</Th>
                <Th className="text-left">Snapshot</Th>
                <Th className="text-left">Recovery</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {INCIDENTS.map((inc) => {
                const canRecover = inc.snapshot === "AVAILABLE";
                const isPicked = picked.has(inc.id);
                return (
                  <tr key={inc.id} className="border-t border-[var(--color-hairline)]" style={isPicked ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.1) } : {}}>
                    <td className="px-3.5 py-3">
                      <input 
                        type="checkbox" 
                        checked={isPicked}
                        onChange={() => toggleOne(inc.id)}
                        className="accent-[var(--color-brand-green)]" 
                      />
                    </td>
                    <td className="tnum px-3.5 py-3 font-semibold text-[var(--color-ink)]">{inc.id}</td>
                    <td className="px-3.5 py-3">
                      <Pill color={inc.status === "TAMPERED" ? "var(--color-down)" : "var(--color-warn)"}>
                        {inc.status}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-3">
                      {canRecover ? (
                        <span className="text-[var(--color-up)]">Available</span>
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      {canRecover ? (
                        <span className="text-[var(--color-brand-green-bright)]">Ready</span>
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">Not available</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Btn variant={canRecover ? "primary" : "outline"} size="sm" disabled={!canRecover} onClick={() => onRecover([inc.id])}>
                        <LifeBuoy size={13} /> Prepare
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function HistoryTable() {
  const statusColor: Record<string, string> = {
    COMPLETED: "var(--color-up)",
    "IN PROGRESS": "var(--color-navy-bright)",
    QUEUED: "var(--color-ink-dim)",
    FAILED: "var(--color-down)",
  };
  return (
    <Panel title="Recovery History">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
              <Th className="text-left">Job</Th>
              <Th className="text-left">Resources</Th>
              <Th className="text-left">Scope</Th>
              <Th className="text-left">Requested by</Th>
              <Th className="text-left">When</Th>
              <Th className="text-right">Restored</Th>
              <Th className="text-right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {RECOVERY_HISTORY.map((j) => (
              <tr key={j.id} className="border-t border-[var(--color-hairline)]">
                <td className="tnum px-3.5 py-3 font-semibold text-[var(--color-ink)]">{j.id}</td>
                <td className="tnum px-3.5 py-3 text-[var(--color-ink-dim)]">{j.resources.join(", ")}</td>
                <td className="px-3.5 py-3 text-[var(--color-ink-dim)]">{j.scope}</td>
                <td className="tnum px-3.5 py-3 text-[var(--color-ink-dim)]">{j.requestedBy}</td>
                <td className="tnum px-3.5 py-3 text-[var(--color-ink-faint)]">{j.requestedAt}</td>
                <td className="tnum px-3.5 py-3 text-right text-[var(--color-ink)]">
                  {j.restored}/{j.total}
                </td>
                <td className="px-3.5 py-3 text-right">
                  <Pill color={statusColor[j.status]}>{j.status}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Snapshots() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {SNAPSHOTS.map((s) => (
        <Panel key={s.resource} className="p-0">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="tnum text-[14px] font-semibold text-[var(--color-ink)]">{s.resource}</span>
              <Pill color={s.status === "AVAILABLE" ? "var(--color-up)" : "var(--color-ink-faint)"}>
                {s.status === "AVAILABLE" ? "Trusted" : "None"}
              </Pill>
            </div>
            <dl className="mt-3 space-y-2 text-[12px]">
              <Line k="Table" v={s.table} />
              <Line k="Captured" v={s.capturedAt} />
              <Line k="Evidence anchor" v={s.anchor} mono />
            </dl>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Line({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[var(--color-ink-faint)]">{k}</dt>
      <dd className={`text-[var(--color-ink-dim)] ${mono ? "tnum" : ""}`}>{v}</dd>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3.5 py-2.5 font-semibold ${className}`}>{children}</th>;
}
