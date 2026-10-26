import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  LoaderCircle,
  Play,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useClientRefresh, useRunAgentAudit } from "@/hooks/useDashboard";
import { formatNumber } from "@/lib/utils";
import type { AgentAuditRunReport } from "@/types/dashboard";

interface VerifyRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function VerifyRangeModal({ isOpen, onClose }: VerifyRangeModalProps) {
  const { session } = useAuth();
  const token = session?.token;
  const refresh = useClientRefresh();

  // Default to 24 hours
  const [toInput, setToInput] = useState(() => toLocalInput(new Date()));
  const [fromInput, setFromInput] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return toLocalInput(d);
  });

  const [activePreset, setActivePreset] = useState<string>("24h");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<AgentAuditRunReport | null>(null);

  const { mutateAsync: runAudit, isPending: isRunning } = useRunAgentAudit();

  if (!isOpen) return null;

  const handlePreset = (hours: number, label: string) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setToInput(toLocalInput(end));
    setFromInput(toLocalInput(start));
    setActivePreset(label);
    setErrorMessage(null);
  };

  const handleRunVerification = async () => {
    setErrorMessage(null);
    setAuditReport(null);

    const fromDate = new Date(fromInput);
    const toDate = new Date(toInput);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      setErrorMessage("Format tanggal/waktu tidak valid.");
      return;
    }

    if (toDate <= fromDate) {
      setErrorMessage("Waktu 'Sampai' harus lebih besar dari waktu 'Dari'.");
      return;
    }

    try {
      const report = await runAudit({
        token,
        range: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      });

      setAuditReport(report);
      // Refresh dashboard data so metrics like audit count & score update
      await refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal menjalankan audit verifikasi rentang waktu.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Uji Verifikasi Data & Blockchain
                <Badge tone="info" className="text-[10px]">
                  External Audit
                </Badge>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit baris data operasional client (DB) terhadap log offchain & rekonstruksi Merkle Root ke Blockchain.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Range */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pilihan Cepat Rentang Waktu
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "1 Jam", hours: 1, key: "1h" },
              { label: "6 Jam", hours: 6, key: "6h" },
              { label: "24 Jam", hours: 24, key: "24h" },
              { label: "7 Hari", hours: 168, key: "7d" },
              { label: "30 Hari", hours: 720, key: "30d" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePreset(p.hours, p.key)}
                className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all text-center ${
                  activePreset === p.key
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Dari (Waktu Lokal)
            </label>
            <input
              type="datetime-local"
              value={fromInput}
              onChange={(e) => {
                setFromInput(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Sampai (Waktu Lokal)
            </label>
            <input
              type="datetime-local"
              value={toInput}
              onChange={(e) => {
                setToInput(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* What This Test Does (Workflow Explainer) */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Alur Pengujian Verifikasi Terpadu:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1">
            <div className="flex items-start gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <Database className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">1. Query DB Klien</span>
                <p className="text-slate-400 mt-0.5">Membaca baris data riil di DB klien via Agent.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">2. Bandingkan Hash</span>
                <p className="text-slate-400 mt-0.5">Mencocokkan hash data klien dengan log offchain terbaru.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
              <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">3. Bukti Blockchain</span>
                <p className="text-slate-400 mt-0.5">Rekonstruksi Merkle Root & bandingkan ke Besu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Pengujian Gagal</p>
              <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Live Result Report */}
        {auditReport && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(auditReport.data_tampered ?? 0) > 0 ? (
                  <Badge tone="danger" className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Terdeteksi Tampered ({auditReport.data_tampered} log)
                  </Badge>
                ) : (
                  <Badge tone="success" className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Integritas Terverifikasi Aman
                  </Badge>
                )}
                {auditReport.duration && (
                  <span className="text-[11px] text-slate-400">
                    Durasi: {auditReport.duration}
                  </span>
                )}
              </div>

              {(auditReport.data_tampered ?? 0) > 0 && (
                <Link
                  to="/recovery"
                  onClick={onClose}
                  className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 underline underline-offset-2"
                >
                  Lihat di Tampered Incidents
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Metric Grids */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Log Rentang</span>
                <span className="text-base font-bold text-slate-100">
                  {formatNumber(auditReport.total_logs ?? 0)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {auditReport.historical_skipped ?? 0} log riwayat diskip
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Log Unik Diaudit</span>
                <span className="text-base font-bold text-sky-400">
                  {formatNumber(auditReport.audited_logs ?? 0)}
                </span>
                <span className="text-[10px] text-slate-500 block">Record terbaru</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Kesesuaian DB Klien</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-bold text-emerald-400">
                    {formatNumber(auditReport.data_valid ?? 0)} OK
                  </span>
                  {(auditReport.data_tampered ?? 0) > 0 && (
                    <span className="text-sm font-bold text-rose-400">
                      / {auditReport.data_tampered} Tamper
                    </span>
                  )}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Bukti Blockchain</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-bold text-emerald-400">
                    {formatNumber(auditReport.blockchain_valid ?? 0)} Valid
                  </span>
                  {(auditReport.blockchain_tampered ?? 0) > 0 && (
                    <span className="text-sm font-bold text-rose-400">
                      / {auditReport.blockchain_tampered} Tamper
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isRunning}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs"
          >
            Tutup
          </Button>

          <Button
            type="button"
            onClick={handleRunVerification}
            disabled={isRunning}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 flex items-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            {isRunning ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Mengaudit Data Klien & Blockchain...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Jalankan Pengujian Verifikasi
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
