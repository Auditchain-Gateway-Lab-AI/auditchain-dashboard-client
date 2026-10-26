import { AlertTriangle, LoaderCircle, Play, RotateCw, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useRefreshVerificationStatus, useStartVerificationRun } from "@/hooks/useDashboard";
import { ApiError } from "@/services/api/client";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VerificationRun } from "@/types/dashboard";

export function AgentAuditPanel({ run, runStatusStale = false }: { run: VerificationRun | null; runStatusStale?: boolean }) {
  const start = useStartVerificationRun();
  const refreshStatus = useRefreshVerificationStatus();
  const [to, setTo] = useState(() => toWibInput(new Date()));
  const [from, setFrom] = useState(() => toWibInput(new Date(Date.now() - 60 * 60 * 1000)));
  const [validationError, setValidationError] = useState<string | null>(null);
  const active = run?.status === "QUEUED" || run?.status === "RUNNING";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const fromDate = parseWibInput(from);
    const toDate = parseWibInput(to);
    if (!from || !to || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setValidationError("Pilih waktu mulai dan akhir yang valid.");
      return;
    }
    if (toDate <= fromDate || toDate > new Date()) {
      setValidationError("Waktu akhir harus setelah waktu mulai dan tidak di masa depan.");
      return;
    }
    try {
      await start.mutateAsync({ from: fromDate.toISOString(), to: toDate.toISOString() });
    } catch {
      // The Gateway error is rendered below.
    }
  }

  const error = validationError || (start.error instanceof ApiError && start.error.status === 404
    ? "Gateway yang dipakai belum menyediakan job verifikasi. Perbarui Gateway lalu coba lagi."
    : start.error instanceof Error ? start.error.message : null);

  return <Card className="overflow-hidden">
    <CardHeader className="flex-wrap items-start">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info"><ShieldCheck className="size-4" /></div>
        <div className="min-w-0">
          <CardTitle>Pemeriksaan manual</CardTitle>
          <p className="mt-1 max-w-2xl text-[10px] text-ink-faint">Pemeriksaan ini memverifikasi bukti log Gateway dan Fabric untuk rentang yang dipilih. Hasilnya tercatat di histori sebagai pemeriksaan bukti; pemeriksaan data sumber ditampilkan terpisah di status otomatis.</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-3.5">
      <form className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void handleSubmit(event)}>
        <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">From (WIB)</span><input className="field-control h-9" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} disabled={start.isPending || active} /></label>
        <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">To (WIB)</span><input className="field-control h-9" type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} disabled={start.isPending || active} /></label>
        <Button type="submit" className="h-9 md:min-w-40" disabled={start.isPending || active}>
          {start.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          {start.isPending ? "Starting..." : active ? "Verification running" : "Verify now"}
        </Button>
      </form>
      {error && <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[11px] text-danger" role="alert"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>{error}</span></div>}
      {runStatusStale && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[11px] text-warning" role="status"><span>Status run terakhir gagal dimuat. Data sebelumnya tetap ditampilkan jika tersedia.</span><button type="button" onClick={() => void refreshStatus()} className="shrink-0 underline underline-offset-2">Coba lagi</button></div>}
      {run && <div className="mt-4 border-t border-line pt-3 text-[11px] text-ink-dim">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-ink">Latest proof verification: {run.status.toLowerCase().replaceAll("_", " ")}</span>
          <span className="flex items-center gap-2">
            {runStatusStale && <span className="text-warning">Status lama</span>}
            <button type="button" onClick={() => void refreshStatus()} className="text-ink-faint hover:text-ink" aria-label="Refresh verification status" title="Refresh verification status"><RotateCw className="size-3" /></button>
            <span className="font-mono">{formatNumber(run.processedItems)} / {formatNumber(run.totalItems)} logs</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ground"><div className="h-full bg-brand-bright" style={{ width: `${Math.min(100, Math.max(0, run.progressPercent))}%` }} /></div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>Valid {formatNumber(run.totalValid)}</span><span>Tampered {formatNumber(run.totalInvalid)}</span><span>Pending {formatNumber(run.totalPending)}</span></div>
        {run.errorMessage && <p className="mt-2 text-danger" role="alert">{run.errorMessage}</p>}
      </div>}
    </CardContent>
  </Card>;
}

function toWibInput(date: Date) {
  const wibDate = new Date(date.getTime() + 7 * 60 * 60_000);
  return wibDate.toISOString().slice(0, 16);
}

function parseWibInput(value: string) {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+07:00`);
}
