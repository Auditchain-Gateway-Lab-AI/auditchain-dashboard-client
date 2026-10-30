import { Copy, Check, Database, History, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ClientRecoveryEvent } from "@/types/recovery";

interface ClientRecoveryDrawerProps {
  event: ClientRecoveryEvent;
  onClose: () => void;
}

export function ClientRecoveryDrawer({ event, onClose }: ClientRecoveryDrawerProps) {
  const [copied, setCopied] = useState(false);

  const columns = useMemo<string[]>(() => {
    if (!event.recovered_columns) return [];
    if (Array.isArray(event.recovered_columns)) return event.recovered_columns;
    if (typeof event.recovered_columns === "string") {
      try {
        const parsed = JSON.parse(event.recovered_columns);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [event.recovered_columns];
      }
    }
    return [];
  }, [event.recovered_columns]);

  const prettyData = useMemo<string>(() => {
    if (!event.recovered_data) return "{}";
    if (typeof event.recovered_data === "object") {
      return JSON.stringify(event.recovered_data, null, 2);
    }
    try {
      const parsed = JSON.parse(event.recovered_data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(event.recovered_data);
    }
  }, [event.recovered_data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prettyData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = event.status === "SUCCESS";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-panel shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                Log Event Pemulihan Klien
              </span>
              <Badge tone={isSuccess ? "success" : "danger"}>
                {isSuccess ? "Berhasil Dipulihkan" : "Gagal Dipulihkan"}
              </Badge>
            </div>
            <h2 className="mt-1 text-lg font-bold text-ink">{event.resource}</h2>
            <p className="font-mono text-[11px] text-ink-dim">
              Tabel: <span className="font-semibold text-ink">{event.table_name}</span> &bull; Record ID:{" "}
              <span className="font-semibold text-ink">{event.record_id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors hover:bg-elevated hover:text-ink"
            title="Tutup Panel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Failure Alert Banner */}
          {!isSuccess && event.error_message && (
            <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Penyebab Kegagalan Pemulihan:</p>
                <p className="mt-0.5 font-mono text-[11px] break-all">{event.error_message}</p>
              </div>
            </div>
          )}

          {/* Execution Metadata Card */}
          <Card className="space-y-3 p-3.5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <History className="size-3.5 text-brand-bright" /> Informasi Eksekusi Pemulihan
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-ink-faint uppercase font-mono">Operasi Database</span>
                <p className="mt-0.5 font-semibold text-ink">{event.operation || "UPDATE"}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-faint uppercase font-mono">Eksekutor</span>
                <p className="mt-0.5 font-mono text-ink font-medium">{event.recovered_by || "morbis1"}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-faint uppercase font-mono">Waktu Eksekusi</span>
                <p className="mt-0.5 text-ink">{formatDate(event.executed_at)}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-faint uppercase font-mono">ID Event</span>
                <p className="mt-0.5 font-mono text-[10px] text-ink-dim truncate" title={event.id}>
                  {event.id}
                </p>
              </div>
              {event.tamper_record_id && (
                <div className="col-span-2">
                  <span className="text-[10px] text-ink-faint uppercase font-mono">ID Rekaman Tamper Terkait</span>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-dim truncate" title={event.tamper_record_id}>
                    {event.tamper_record_id}
                  </p>
                </div>
              )}
              {event.log_id && (
                <div className="col-span-2">
                  <span className="text-[10px] text-ink-faint uppercase font-mono">ID Log Acuan (Offchain)</span>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-dim truncate" title={event.log_id}>
                    {event.log_id}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Recovered Columns */}
          {columns.length > 0 && (
            <Card className="space-y-2 p-3.5">
              <h3 className="text-xs font-semibold text-ink">
                Kolom yang Berhasil Dipulihkan ({columns.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => (
                  <Badge key={col} tone="neutral" className="font-mono text-[11px] px-2 py-0.5">
                    {col}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Clean Data Payload Card */}
          <Card className="space-y-2 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Database className="size-3.5 text-brand-bright" /> Payload Data Sah yang Diterapkan
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 gap-1 px-2 text-[10px] text-ink-dim"
              >
                {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copied ? "Disalin!" : "Salin JSON"}
              </Button>
            </div>
            <pre className="max-h-72 overflow-x-auto rounded-md bg-ground/80 p-3 font-mono text-[11px] leading-relaxed text-ink-bright border border-line">
              {prettyData}
            </pre>
          </Card>
        </div>

        {/* Drawer Footer */}
        <div className="flex justify-end border-t border-line bg-panel p-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
