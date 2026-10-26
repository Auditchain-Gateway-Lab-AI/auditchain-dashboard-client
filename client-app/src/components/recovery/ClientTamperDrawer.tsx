import { AlertTriangle, LoaderCircle, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ClientDataTamperRecord } from "@/types/recovery";

interface ClientTamperDrawerProps {
  record: ClientDataTamperRecord;
  onClose: () => void;
  onRecover: (id: string) => Promise<void>;
  onDismiss: (id: string, notes?: string) => Promise<void>;
  isRecovering: boolean;
  isDismissing: boolean;
}

interface ParsedDiscrepancy {
  field: string;
  in_log: string;
  in_agent: string;
}

export function ClientTamperDrawer({
  record,
  onClose,
  onRecover,
  onDismiss,
  isRecovering,
  isDismissing,
}: ClientTamperDrawerProps) {
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [dismissNotes, setDismissNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const discrepancies = useMemo<ParsedDiscrepancy[]>(() => {
    if (!record.discrepancies) return [];
    if (Array.isArray(record.discrepancies)) {
      return (record.discrepancies as unknown[]).map((d: any) => ({
        field: d.field || d.column || "unknown",
        in_log: String(d.in_log ?? d.expected ?? d.offchain_value ?? "—"),
        in_agent: String(d.in_agent ?? d.actual ?? d.client_value ?? "—"),
      }));
    }
    if (typeof record.discrepancies === "string") {
      try {
        const parsed = JSON.parse(record.discrepancies);
        if (Array.isArray(parsed)) {
          return parsed.map((d: any) => ({
            field: d.field || d.column || "unknown",
            in_log: String(d.in_log ?? d.expected ?? d.offchain_value ?? "—"),
            in_agent: String(d.in_agent ?? d.actual ?? d.client_value ?? "—"),
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  }, [record.discrepancies]);

  const handleRecover = async () => {
    setErrorMsg("");
    try {
      await onRecover(record.id);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menjalankan pemulihan data");
    }
  };

  const handleDismiss = async () => {
    setErrorMsg("");
    try {
      await onDismiss(record.id, dismissNotes);
      setShowDismissInput(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengabaikan insiden");
    }
  };

  const isActionable = record.status === "OPEN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 p-0 backdrop-blur-sm sm:p-4">
      <div
        className="flex h-full w-full max-w-2xl flex-col border border-line bg-panel shadow-2xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tamper-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h2 id="tamper-drawer-title" className="text-base font-semibold text-ink">
                Detail Insiden Manipulasi Data Klien
              </h2>
              <div className="flex items-center gap-2 text-xs text-ink-dim">
                <code className="font-mono text-brand-bright">{record.resource}</code>
                <span>•</span>
                <span>Tabel: {record.table_name}</span>
                <span>•</span>
                <span>Record ID: {record.record_id}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup">
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-danger">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {record.recovery_error && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
              <AlertTriangle className="size-4 shrink-0" />
              <div>
                <strong>Catatan Recovery Terakhir:</strong>
                <p className="mt-0.5">{record.recovery_error}</p>
              </div>
            </div>
          )}

          {/* Status & Overview */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-ground p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">Status</span>
              <div className="mt-1">
                <Badge
                  tone={
                    record.status === "OPEN"
                      ? "danger"
                      : record.status === "RECOVERED"
                      ? "success"
                      : "neutral"
                  }
                >
                  {record.status}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-ground p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">Aksi Log</span>
              <div className="mt-1 font-mono font-semibold text-ink">{record.action || "UPDATE"}</div>
            </div>
            <div className="rounded-lg border border-line bg-ground p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">Waktu Deteksi</span>
              <div className="mt-1 font-mono text-[11px] text-ink">{formatDate(record.detected_at)}</div>
            </div>
            <div className="rounded-lg border border-line bg-ground p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">Pemulihan Otomatis</span>
              <div className="mt-1">
                <Badge tone={record.auto_recovered ? "success" : "neutral"}>
                  {record.auto_recovered ? "Ya (Auto)" : "Manual"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Discrepancy Diff */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-elevated/50 px-4 py-2.5 font-semibold text-ink">
              Perbedaan Nilai Kolom (Audit Log Offchain vs Database Klien)
            </div>
            {discrepancies.length === 0 ? (
              <div className="p-4 text-center text-ink-dim">
                Tidak ada rincian kolom (perbedaan pada nilai hash keseluruhan baris data).
              </div>
            ) : (
              <div className="divide-y divide-line">
                <div className="grid grid-cols-3 bg-ground px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  <div>Nama Kolom</div>
                  <div>Nilai Sah (Offchain)</div>
                  <div>Nilai Tampered (Client DB)</div>
                </div>
                {discrepancies.map((d, idx) => (
                  <div key={idx} className="grid grid-cols-3 items-center px-4 py-2.5 font-mono text-[11px]">
                    <div className="font-semibold text-ink">{d.field}</div>
                    <div className="text-success break-all bg-success/5 p-1 rounded border border-success/20">
                      {d.in_log}
                    </div>
                    <div className="text-danger break-all bg-danger/5 p-1 rounded border border-danger/20">
                      {d.in_agent}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hash Comparison */}
          <Card className="p-4 space-y-3">
            <div className="font-semibold text-ink">Perbandingan Hash Integritas</div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-success">
                  <ShieldCheck className="size-3.5" /> Expected Offchain Hash (Log Bersih / Sah)
                </div>
                <code className="mt-1 block break-all rounded bg-ground p-2 font-mono text-[11px] text-ink">
                  {record.expected_hash}
                </code>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-danger">
                  <ShieldAlert className="size-3.5" /> Actual Client Hash (Database Klien Saat Ini)
                </div>
                <code className="mt-1 block break-all rounded bg-ground p-2 font-mono text-[11px] text-ink">
                  {record.actual_hash}
                </code>
              </div>
            </div>
            {record.blockchain_tx_id && (
              <div className="pt-2 text-[11px] text-ink-dim">
                <span className="font-semibold text-ink">Blockchain TxID:</span>{" "}
                <code className="font-mono text-brand-bright">{record.blockchain_tx_id}</code>
              </div>
            )}
          </Card>

          {/* Resolved info if any */}
          {record.status !== "OPEN" && (
            <div className="rounded-lg border border-line bg-ground p-3 text-ink-dim">
              <div className="font-semibold text-ink">Informasi Penyelesaian:</div>
              <div className="mt-1 space-y-1 text-[11px]">
                {record.resolved_by && <div>Diselesaikan oleh: <span className="font-mono text-ink">{record.resolved_by}</span></div>}
                {record.resolved_at && <div>Waktu penyelesaian: {formatDate(record.resolved_at)}</div>}
                {record.resolution_notes && <div>Catatan: <span className="italic">{record.resolution_notes}</span></div>}
              </div>
            </div>
          )}

          {/* Dismiss note input */}
          {showDismissInput && isActionable && (
            <div className="space-y-2 rounded-lg border border-line bg-elevated p-3">
              <div className="font-semibold text-ink">Alasan Pengabaian Insiden</div>
              <textarea
                value={dismissNotes}
                onChange={(e) => setDismissNotes(e.target.value)}
                placeholder="Masukkan catatan mengapa insiden ini diabaikan (opsional)..."
                className="w-full rounded border border-line bg-ground p-2 text-xs text-ink outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDismissInput(false)}>
                  Batal
                </Button>
                <Button variant="outline" size="sm" onClick={handleDismiss} disabled={isDismissing}>
                  {isDismissing ? <LoaderCircle className="size-3.5 animate-spin" /> : null} Konfirmasi Abaikan
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line bg-ground px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>

          {isActionable && (
            <div className="flex items-center gap-2">
              {!showDismissInput && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDismissInput(true)}
                  disabled={isRecovering || isDismissing}
                >
                  Abaikan Insiden
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleRecover}
                disabled={isRecovering || isDismissing}
              >
                {isRecovering ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" /> Memulihkan ke Database Klien...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3.5" /> Pulihkan Data ke Database Klien
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
