import { useState } from "react";
import { X, ShieldCheck, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { Btn, Pill } from "./ui";
import { INCIDENTS, type Incident } from "../lib/data";

type Stage = "review" | "confirm" | "running" | "done";

export default function RecoveryDrawer({
  ids,
  onClose,
}: {
  ids: string[];
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("review");
  const records: Incident[] = ids
    .map((id) => INCIDENTS.find((i) => i.id === id))
    .filter((x): x is Incident => Boolean(x));

  // any selected ids that are plain records (not incidents) still show generically
  const rows = ids.map((id) => {
    const inc = records.find((r) => r.id === id);
    return {
      id,
      table: inc?.table ?? id.split(":")[0],
      snapshot: inc?.snapshot ?? "AVAILABLE",
      status: inc?.status ?? "TAMPERED",
    };
  });
  const available = rows.filter((r) => r.snapshot === "AVAILABLE").length;
  const tables = Array.from(new Set(rows.map((r) => r.table)));
  const allRecoverable = available === rows.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[var(--color-hairline-strong)] bg-[var(--color-panel)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-green-bright)]">
              {stage === "done" ? "Recovery Complete" : "Recovery Review"}
            </div>
            <div className="mt-0.5 text-[15px] font-semibold text-[var(--color-ink)]">
              {rows.length} record{rows.length !== 1 ? "s" : ""} · {tables.join(", ")}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--color-ink-dim)] hover:bg-[var(--color-elevated)]">
            <X size={18} />
          </button>
        </header>

        {/* Preflight summary */}
        <div className="grid grid-cols-2 gap-px border-b border-[var(--color-hairline)] bg-[var(--color-hairline)]">
          <Meta label="Selected" value={`${rows.length} records`} />
          <Meta label="Affected tables" value={tables.join(", ")} />
          <Meta label="Detected" value="26 Sep · 08:00 scan" />
          <Meta
            label="Trusted snapshot"
            value={`${available} / ${rows.length} available`}
            good={allRecoverable}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {stage === "running" ? (
            <RunningState />
          ) : stage === "done" ? (
            <DoneState count={available} />
          ) : (
            <>
              {!allRecoverable && (
                <div className="mb-4 flex items-start gap-2.5 rounded-[8px] border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2.5 text-[12px] text-[var(--color-warn)]">
                  <AlertTriangle size={15} className="mt-px shrink-0" />
                  <span>
                    {rows.length - available} record(s) have no trusted snapshot and will be skipped. Only{" "}
                    {available} record(s) can be restored.
                  </span>
                </div>
              )}

              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-dim)]">
                {stage === "confirm" ? "Expected result" : "Diff preview"}
              </div>
              <div className="overflow-hidden rounded-[8px] border border-[var(--color-hairline)]">
                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-3 py-2.5 text-[12px] ${
                      i > 0 ? "border-t border-[var(--color-hairline)]" : ""
                    }`}
                  >
                    <span className="tnum text-[var(--color-ink)]">{r.id}</span>
                    {r.snapshot === "AVAILABLE" ? (
                      <span className="flex items-center gap-2 text-[var(--color-ink-dim)]">
                        <span className="text-[var(--color-down)]">current</span>
                        <span className="text-[var(--color-ink-faint)]">≠</span>
                        <span className="text-[var(--color-up)]">snapshot</span>
                      </span>
                    ) : (
                      <Pill color="var(--color-ink-faint)">no snapshot</Pill>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-ground)] px-3.5 py-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-dim)]">
                  Recovery will restore
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="tnum text-[26px] font-semibold text-[var(--color-brand-green-bright)]">
                    {available}
                  </span>
                  <span className="text-[12px] text-[var(--color-ink-dim)]">
                    records to their last trusted state
                  </span>
                </div>
                {stage === "confirm" && (
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                    This action is logged and anchored. Current values are archived before overwrite and can be
                    rolled forward if needed.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-[var(--color-hairline)] px-5 py-4">
          {stage === "review" && (
            <>
              <Btn variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => setStage("confirm")}
                disabled={available === 0}
                className="flex-1"
              >
                Continue <ArrowRight size={14} />
              </Btn>
            </>
          )}
          {stage === "confirm" && (
            <>
              <Btn variant="outline" onClick={() => setStage("review")} className="flex-1">
                Back
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setStage("running");
                  setTimeout(() => setStage("done"), 1600);
                }}
                className="flex-1"
              >
                <ShieldCheck size={14} /> Confirm Recovery
              </Btn>
            </>
          )}
          {stage === "done" && (
            <Btn variant="primary" onClick={onClose} className="flex-1">
              <Check size={14} /> Done
            </Btn>
          )}
          {stage === "running" && (
            <Btn variant="outline" disabled className="flex-1">
              Restoring…
            </Btn>
          )}
        </footer>
      </div>
    </div>
  );
}

function Meta({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-[var(--color-panel)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">{label}</div>
      <div
        className="mt-0.5 text-[12px] font-semibold"
        style={{ color: good === undefined ? "var(--color-ink)" : good ? "var(--color-up)" : "var(--color-warn)" }}
      >
        {value}
      </div>
    </div>
  );
}

function RunningState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-hairline-strong)] border-t-[var(--color-brand-green-bright)]" />
      <div className="mt-4 text-[13px] text-[var(--color-ink)]">Restoring trusted snapshots…</div>
      <div className="mt-1 text-[11px] text-[var(--color-ink-faint)]">Writing recovery evidence to the chain</div>
    </div>
  );
}

function DoneState({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-green)]/15 text-[var(--color-brand-green-bright)]">
        <Check size={26} />
      </div>
      <div className="mt-4 text-[15px] font-semibold text-[var(--color-ink)]">{count} records restored</div>
      <div className="mt-1 max-w-[260px] text-[12px] text-[var(--color-ink-dim)]">
        Recovery job anchored as evidence. You can review it under Recovery → History.
      </div>
    </div>
  );
}
