import { AlertTriangle, ArrowRight, Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { recoveryService } from "@/services/recovery";
import type { RecoveryPreview, RecoveryResult } from "@/types/recovery";

type Stage = "review" | "confirm" | "running" | "done";

export function RecoveryDrawer({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("review");
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setStage("review");
    setResult(null);
    closeButtonRef.current?.focus();
    void recoveryService.prepareRecovery(ids).then((data) => {
      if (active) setPreview(data);
    });
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ids, onClose]);

  async function confirmRecovery() {
    setStage("running");
    const recoveryResult = await recoveryService.executeRecovery(ids);
    setResult(recoveryResult);
    setStage("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="recovery-drawer-title">
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-label="Close recovery review" />
      <section className="relative flex h-full w-full max-w-[460px] flex-col border-l border-line-strong bg-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">{stage === "done" ? "Recovery Complete" : "Recovery Review"}</div>
            <h2 id="recovery-drawer-title" className="mt-0.5 text-[15px] font-semibold text-ink">{ids.length} record{ids.length !== 1 ? "s" : ""} · {preview?.affectedTables.join(", ") ?? "Preparing…"}</h2>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </header>

        {preview && <div className="grid grid-cols-2 gap-px border-b border-line bg-line"><Meta label="Selected" value={`${preview.rows.length} records`} /><Meta label="Affected tables" value={preview.affectedTables.join(", ")} /><Meta label="Detected" value={preview.detectedAt} /><Meta label="Trusted snapshot" value={`${preview.available} / ${preview.rows.length} available`} good={preview.available === preview.rows.length} /></div>}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!preview ? <LoadingPreview /> : stage === "running" ? <RunningState /> : stage === "done" ? <DoneState result={result} /> : (
            <>
              {preview.available < preview.rows.length && <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2.5 text-xs text-warning"><AlertTriangle className="mt-px size-4 shrink-0" /><span>{preview.rows.length - preview.available} record(s) have no trusted snapshot and will be skipped. Only {preview.available} record(s) can be restored.</span></div>}
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">{stage === "confirm" ? "Expected result" : "Diff preview"}</div>
              <div className="overflow-hidden rounded-lg border border-line">
                {preview.rows.map((row, index) => <div key={row.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 text-xs ${index > 0 ? "border-t border-line" : ""}`}><span className="font-mono text-ink">{row.id}</span>{row.snapshot === "AVAILABLE" ? <span className="flex items-center gap-2 text-[10px]"><span className="text-danger">current</span><span className="text-ink-faint">≠</span><span className="text-success">snapshot</span></span> : <Badge tone="neutral">no snapshot</Badge>}</div>)}
              </div>
              <div className="mt-5 rounded-lg border border-line bg-ground px-3.5 py-3"><div className="text-[10px] uppercase tracking-[0.12em] text-ink-dim">Recovery will restore</div><div className="mt-1 flex items-baseline gap-2"><span className="font-mono text-[26px] font-semibold text-brand-bright">{preview.available}</span><span className="text-xs text-ink-dim">records to their last trusted state</span></div>{stage === "confirm" && <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">This is a deterministic mock workflow. No backend write or blockchain operation is performed.</p>}</div>
            </>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-4">
          {!preview ? <Button variant="outline" disabled className="w-full">Preparing preview…</Button> : stage === "review" ? <><Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button><Button variant="default" onClick={() => setStage("confirm")} disabled={preview.available === 0} className="flex-1">Continue <ArrowRight className="size-3.5" /></Button></> : stage === "confirm" ? <><Button variant="outline" onClick={() => setStage("review")} className="flex-1">Back</Button><Button variant="default" onClick={() => void confirmRecovery()} className="flex-1"><ShieldCheck className="size-3.5" /> Confirm Recovery</Button></> : stage === "done" ? <Button variant="default" onClick={onClose} className="w-full"><Check className="size-3.5" /> Done</Button> : <Button variant="outline" disabled className="w-full">Restoring…</Button>}
        </footer>
      </section>
    </div>
  );
}

function Meta({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="bg-panel px-4 py-3"><div className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</div><div className={`mt-0.5 text-xs font-semibold ${good === undefined ? "text-ink" : good ? "text-success" : "text-warning"}`}>{value}</div></div>;
}

function LoadingPreview() {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-xs text-ink-dim"><LoaderCircle className="size-6 animate-spin text-brand-bright" />Preparing read-only recovery preview…</div>;
}

function RunningState() {
  return <div className="flex min-h-64 flex-col items-center justify-center py-16 text-center"><LoaderCircle className="size-10 animate-spin text-brand-bright" /><div className="mt-4 text-sm text-ink">Simulating trusted snapshot restore…</div><div className="mt-1 text-[11px] text-ink-faint">No external write is performed</div></div>;
}

function DoneState({ result }: { result: RecoveryResult | null }) {
  return <div className="flex min-h-64 flex-col items-center justify-center py-16 text-center"><div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success"><Check className="size-6" /></div><div className="mt-4 text-base font-semibold text-ink">{result?.restored ?? 0} records restored</div><div className="mt-1 max-w-[270px] text-xs text-ink-dim">Mock job {result?.jobId} completed. {result?.skipped ? `${result.skipped} record(s) were skipped.` : "All selected records were eligible."}</div></div>;
}
