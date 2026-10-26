import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import type { RecoveryIncident } from "@/types/recovery";

interface LiveNeedsAttentionProps {
  incidents: RecoveryIncident[];
  total: number;
  pending: boolean;
  error: boolean;
}

export function LiveNeedsAttention({ incidents, total, pending, error }: LiveNeedsAttentionProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Perlu diperiksa</CardTitle>
        <span className="font-mono text-[9px] font-semibold text-danger">{formatNumber(total)} aktif</span>
      </CardHeader>
      <CardContent>
        {pending ? (
          <div className="space-y-2 py-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : error ? (
          <div className="space-y-3 py-3 text-center">
            <p className="text-xs text-ink-dim">Daftar masalah belum dapat dimuat.</p>
            <p className="text-xs text-ink-faint">Muat ulang halaman untuk mencoba lagi.</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-xs text-ink-dim">
            <ShieldCheck className="size-5 text-success" /> Tidak ada temuan yang perlu diperiksa.
          </div>
        ) : (
          <>
            <div className="divide-y divide-line">
              {incidents.slice(0, 5).map((incident) => {
                const gatewayLogIssue = String(incident.incident_scope).toUpperCase() === "GATEWAY_INTEGRITY";
                const uncertainSource = ["UNREACHABLE", "NOT_COMPARABLE", "PENDING"].includes(String(incident.source_status || "").toUpperCase());
                const { label, description } = describeIncident(incident, gatewayLogIssue);
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <AlertTriangle className={`size-3.5 shrink-0 ${gatewayLogIssue ? "text-warning" : "text-danger"}`} />
                        <span className="truncate text-[11px] font-semibold text-ink">{label}</span>
                      </div>
                      <Badge tone={gatewayLogIssue || uncertainSource ? "warning" : "danger"}>Perlu ditinjau</Badge>
                    </div>
                    <p className="mt-1 pl-[22px] text-[10px] leading-snug text-ink-dim">{description}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 pl-[22px] text-[9px] text-ink-faint">
                      <span className="truncate font-mono">{incident.resource || "Bagian tidak diketahui"} · {incident.reference_log_id || incident.log_id}</span>
                      <span className="shrink-0">{formatDate(incident.detected_at)}</span>
                    </div>
                    {gatewayLogIssue ? (
                      <div className="mt-2 space-y-1 pl-[22px] text-[10px] text-ink-dim">
                        <p>Referensi audit perlu diperiksa sebelum dipakai untuk memulihkan data client.</p>
                        <p className="break-all font-mono text-[9px] text-warning">{incident.incident_type}</p>
                        <p className="break-all font-mono text-[9px] text-ink-faint">Log: {incident.log_id}</p>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-end gap-1 text-[9px] font-semibold text-info">
                        Periksa di pemulihan <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    )}
                  </>
                );
                return gatewayLogIssue ? (
                  <div key={incident.id} className="px-3.5 py-3">{content}</div>
                ) : (
                  <Link key={incident.id} to={`/recovery?incident=${encodeURIComponent(incident.id)}`} className="group block px-3.5 py-3 transition-colors hover:bg-elevated/60">{content}</Link>
                );
              })}
            </div>
            {total > Math.min(incidents.length, 5) && <p className="mt-2 text-center text-[9px] text-ink-faint">Menampilkan 5 temuan terbaru. Total {formatNumber(total)} temuan aktif.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function describeIncident(incident: RecoveryIncident, gatewayLogIssue: boolean) {
  if (gatewayLogIssue) {
    return {
      label: "Log audit internal bermasalah",
      description: "Isi log audit tidak sesuai dengan catatan aslinya. Ini belum memastikan data client ikut berubah.",
    };
  }

  switch (String(incident.source_status || "").toUpperCase()) {
    case "MISSING":
      return { label: "Data client tidak ditemukan", description: "Data yang seharusnya ada tidak ditemukan pada sumber client." };
    case "UNEXPECTED_PRESENT":
      return { label: "Data client masih ada", description: "Catatan terakhir menunjukkan data ini seharusnya sudah dihapus." };
    case "MISMATCH":
      return { label: "Perubahan pada data client", description: "Isi data saat ini berbeda dari catatan client terakhir." };
    case "UNREACHABLE":
      return { label: "Data client belum dapat diperiksa", description: "Pemeriksaan belum dapat memastikan kondisi data client." };
    default:
      return { label: "Kondisi data belum dapat dipastikan", description: "Catatan pembanding belum tersedia untuk memastikan kondisi data." };
  }
}

function formatDate(value?: string) {
  if (!value) return "Waktu tidak tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
