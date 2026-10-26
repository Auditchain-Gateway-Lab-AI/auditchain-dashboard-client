import { AlertTriangle, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useCheckRecoveryResource } from "@/hooks/useRecovery";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";

const confirmedProofStatuses = new Set(["VERIFIED", "VERIFIED_MERKLE_PROOF"]);
const changedSourceStatuses = new Set(["MISMATCH", "MISSING", "UNEXPECTED_PRESENT"]);

export function ClientResourceCheck({ onPrepare }: { onPrepare: (ids: string[]) => void }) {
  const [resource, setResource] = useState("");
  const check = useCheckRecoveryResource();
  const latest = check.data?.logs.find((log) => log.is_latest_client_event);
  const referenceVerified = confirmedProofStatuses.has(latest?.proof_status?.trim().toUpperCase() || "");
  const sourceStatus = latest?.source_status?.trim().toUpperCase() || "NOT_COMPARABLE";
  const clientIncidentId = referenceVerified
    && changedSourceStatuses.has(sourceStatus)
    && latest?.incident_scope === "CLIENT_SOURCE"
    ? latest.incident_id
    : undefined;

  const sourceMessages: Record<string, string> = {
    MATCHED: "Data client sesuai dengan catatan terakhir.",
    MISMATCH: "Perubahan data terdeteksi. Tinjau bagian yang berbeda sebelum memulihkan.",
    MISSING: "Data yang seharusnya ada tidak ditemukan.",
    UNEXPECTED_PRESENT: "Data masih ada meskipun catatan terakhir menunjukkan penghapusan.",
    UNREACHABLE: "Data client belum dapat diperiksa. Coba lagi setelah koneksi pulih.",
    NOT_COMPARABLE: "Data client belum dapat dipastikan karena catatan pembanding tidak lengkap.",
  };
  const dataMessage = !latest
    ? "Belum ada catatan terbaru untuk dibandingkan dengan data client."
    : !referenceVerified
      ? "Data client belum dapat dipastikan karena catatan pembanding belum bisa diverifikasi."
      : sourceMessages[sourceStatus] || "Hasil pemeriksaan data client belum dapat dipastikan.";
  const logProblem = check.data?.chain_status === "tampered";

  return <section className="space-y-3 rounded-lg border border-line bg-panel p-4" aria-labelledby="client-resource-check-title">
    <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-bright" /><h2 id="client-resource-check-title" className="text-sm font-semibold text-ink">Periksa data tertentu</h2></div>
    <p className="text-xs text-ink-dim">Masukkan nama tabel dan ID data untuk melihat apakah data client berubah atau ada log audit yang bermasalah.</p>
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); check.mutate(resource.trim()); }}>
      <label className="flex-1"><span className="sr-only">Resource TABLE:ID</span><input value={resource} disabled={check.isPending} onChange={(event) => { setResource(event.target.value); check.reset(); }} placeholder="TABLE:ID, misalnya RUANGAN:1046" autoComplete="off" required className="h-10 w-full rounded-md border border-line bg-ground px-3 font-mono text-xs text-ink outline-none focus:border-brand-bright" /></label>
      <Button type="submit" disabled={check.isPending || !resource.trim()}><Search className="size-3.5" />{check.isPending ? "Memeriksa…" : "Periksa"}</Button>
    </form>
    {check.isError && <p role="alert" className="text-xs text-danger">{recoveryErrorMessage(check.error)}</p>}
    {check.data && <div role="status" className="space-y-2 rounded-md border border-line bg-ground p-3">
      <p className="font-mono text-xs font-semibold text-ink">{check.data.resource}</p>
      <p className="text-xs text-ink-dim">{dataMessage}</p>
      {logProblem && <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-2.5 py-2 text-[10px] text-warning"><AlertTriangle className="mt-px size-3.5 shrink-0" /><span>Ada log audit internal yang tidak valid. Ini belum memastikan data client ikut berubah.</span></div>}
      {(check.data.chain_status === "pending" || check.data.chain_status === "unreachable") && !logProblem && <p className="text-[10px] text-ink-faint">Catatan audit belum dapat diperiksa sepenuhnya.</p>}
      <div className="flex flex-wrap gap-2">
        {clientIncidentId && <Button size="sm" onClick={() => onPrepare([clientIncidentId])}>Periksa pemulihan data</Button>}
        {logProblem && <Button asChild variant="outline" size="sm"><Link to="/monitor">Lihat peringatan di Monitor</Link></Button>}
      </div>
    </div>}
    <p className="text-[10px] text-ink-faint">Pemeriksaan ini hanya membaca data. Pemulihan baru dilakukan setelah bagian terdampak dan kelayakannya diperiksa.</p>
  </section>;
}
