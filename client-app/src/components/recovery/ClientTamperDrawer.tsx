import { AlertTriangle, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecoverySlideOver } from "@/components/recovery/RecoverySlideOver";
import { formatDiffValue, formatRecoveryDate, parseClientDiscrepancies } from "@/components/recovery/client-tamper-utils";
import type { ClientDataTamperRecord } from "@/types/recovery";

interface ClientTamperDrawerProps {
  record: ClientDataTamperRecord;
  onClose: () => void;
  onRecover: (id: string) => Promise<void>;
  onDismiss: (id: string, notes?: string) => Promise<void>;
  isRecovering: boolean;
  isDismissing: boolean;
}

export function ClientTamperDrawer({ record, onClose, onRecover, onDismiss, isRecovering, isDismissing }: ClientTamperDrawerProps) {
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [dismissNotes, setDismissNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { discrepancies, invalid } = parseClientDiscrepancies(record);
  const isActionable = record.status === "OPEN";

  const handleRecover = async () => {
    setErrorMsg("");
    try {
      await onRecover(record.id);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not recover this client row.");
    }
  };

  const handleDismiss = async () => {
    setErrorMsg("");
    try {
      await onDismiss(record.id, dismissNotes);
      setShowDismissInput(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not dismiss this incident.");
    }
  };

  return (
    <RecoverySlideOver
      title="Client data integrity incident"
      subtitle={<span className="flex flex-wrap items-center gap-x-2 gap-y-1"><code className="font-mono font-semibold text-brand-bright">{record.resource}</code><span aria-hidden="true">·</span><span>Table: {record.table_name}</span><span aria-hidden="true">·</span><span>Record ID: <code className="font-mono">{record.record_id}</code></span></span>}
      icon={<ShieldAlert className="size-5" />}
      onClose={onClose}
      footer={(close) => <>
        <Button variant="outline" onClick={close}>Close</Button>
        {isActionable && <div className="flex flex-wrap justify-end gap-2">
          {!showDismissInput && <Button variant="outline" onClick={() => setShowDismissInput(true)} disabled={isRecovering || isDismissing}>Dismiss incident</Button>}
          <Button onClick={handleRecover} disabled={isRecovering || isDismissing}>
            {isRecovering ? <><LoaderCircle className="size-4 animate-spin" /> Recovering row…</> : <><ShieldCheck className="size-4" /> Recover client row</>}
          </Button>
        </div>}
      </>}
    >
      <div className="space-y-5">
        {errorMsg && <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{errorMsg}</span></div>}
        {record.recovery_error && <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><strong>Last recovery note</strong><p className="mt-1 break-words">{record.recovery_error}</p></div></div>}

        <section aria-label="Incident summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Summary label="Status"><Badge tone={record.status === "OPEN" ? "danger" : record.status === "RECOVERED" ? "success" : "neutral"}>{formatStatus(record.status)}</Badge></Summary>
          <Summary label="Log action"><span className="font-mono font-semibold text-ink">{record.action || "Unknown"}</span></Summary>
          <Summary label="Detected"><span className="text-sm text-ink">{formatRecoveryDate(record.detected_at)}</span></Summary>
          <Summary label="Recovery mode"><Badge tone={record.auto_recovered ? "success" : "neutral"}>{record.auto_recovered ? "Automatic" : "Manual"}</Badge></Summary>
        </section>

        <section className="overflow-hidden rounded-xl border border-line" aria-labelledby="diff-heading">
          <div className="border-b border-line bg-elevated/60 px-4 py-3">
            <h3 id="diff-heading" className="font-semibold text-ink">Changed columns <span className="ml-1 font-mono text-ink-dim">({discrepancies.length})</span></h3>
            <p className="mt-1 text-xs text-ink-dim">Reference and client values captured when this incident was detected.</p>
          </div>
          {discrepancies.length === 0 ? (
            <p className="p-4 text-sm text-ink-dim">{invalid ? "Column differences could not be read from the incident record." : "Column-level differences were not included. The row hashes still show an integrity mismatch."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead><tr className="bg-ground/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-dim"><th scope="col" className="w-36 px-4 py-3">Column</th><th scope="col" className="px-4 py-3">Reference value</th><th scope="col" className="px-4 py-3">Detected client value</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {discrepancies.map((diff, index) => <tr key={`${diff.field}-${index}`}>
                    <th scope="row" className="px-4 py-3 text-left align-top font-mono font-semibold text-ink">{diff.field}</th>
                    <td className="max-w-[320px] px-4 py-3 align-top"><pre className="whitespace-pre-wrap break-words rounded-lg border border-success/20 bg-success/[0.06] p-2.5 font-mono text-xs leading-relaxed text-success">{formatDiffValue(diff.expected)}</pre></td>
                    <td className="max-w-[320px] px-4 py-3 align-top"><pre className="whitespace-pre-wrap break-words rounded-lg border border-danger/20 bg-danger/[0.06] p-2.5 font-mono text-xs leading-relaxed text-danger">{formatDiffValue(diff.actual)}</pre></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-line p-4" aria-labelledby="hash-heading">
          <h3 id="hash-heading" className="font-semibold text-ink">Row integrity hashes</h3>
          <HashValue label="Reference off-chain hash" value={record.expected_hash} tone="success" />
          <HashValue label="Client hash at detection" value={record.actual_hash} tone="danger" />
          {record.blockchain_tx_id && <p className="break-all text-sm text-ink-dim"><span className="font-semibold text-ink">Blockchain transaction:</span> <code className="font-mono text-brand-bright">{record.blockchain_tx_id}</code></p>}
        </section>

        {record.status !== "OPEN" && <section className="rounded-xl border border-line bg-ground p-4">
          <h3 className="font-semibold text-ink">Resolution</h3>
          <dl className="mt-3 space-y-2 text-sm text-ink-dim">
            {record.resolved_by && <div><dt className="inline">Resolved by: </dt><dd className="inline font-mono text-ink">{record.resolved_by}</dd></div>}
            {record.resolved_at && <div><dt className="inline">Resolved at: </dt><dd className="inline">{formatRecoveryDate(record.resolved_at)}</dd></div>}
            {record.resolution_notes && <div><dt className="inline">Notes: </dt><dd className="inline">{record.resolution_notes}</dd></div>}
          </dl>
        </section>}

        {showDismissInput && isActionable && <section className="space-y-3 rounded-xl border border-line bg-elevated p-4">
          <label htmlFor="dismiss-notes" className="block font-semibold text-ink">Dismissal note <span className="font-normal text-ink-dim">(optional)</span></label>
          <textarea id="dismiss-notes" value={dismissNotes} onChange={(event) => setDismissNotes(event.target.value)} placeholder="Add context for dismissing this incident…" className="field-control min-h-24 resize-y text-sm" />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowDismissInput(false)}>Cancel</Button><Button variant="outline" onClick={handleDismiss} disabled={isDismissing}>{isDismissing && <LoaderCircle className="size-4 animate-spin" />}Confirm dismissal</Button></div>
        </section>}
      </div>
    </RecoverySlideOver>
  );
}

function Summary({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-line bg-ground p-3"><div className="mb-2 text-xs font-medium text-ink-dim">{label}</div>{children}</div>;
}

function HashValue({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" }) {
  return <div><p className={`mb-1.5 text-xs font-semibold ${tone === "success" ? "text-success" : "text-danger"}`}>{label}</p><code className="block break-all rounded-lg bg-ground px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">{value || "Unavailable"}</code></div>;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
