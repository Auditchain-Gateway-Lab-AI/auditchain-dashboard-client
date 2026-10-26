import { AlertTriangle, ArrowRight, Check, LoaderCircle, RotateCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { latestRequestByIncident } from "@/components/recovery/ActiveIncidents";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";
import { recoveryService } from "@/services/recovery";
import { recoveryChangedFields } from "@/services/recovery/state-comparison";
import type {
  RecoveryCandidate,
  RecoveryEvent,
  RecoveryExecutionItem,
  RecoveryIncident,
  RecoveryIncidentDetail,
  RecoveryPreviewItem,
  RecoveryRequest,
} from "@/types/recovery";

type Stage = "review" | "confirm" | "working" | "results";
const activeRequestStatuses = new Set(["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"]);
const terminalRequestStatuses = new Set(["SUCCEEDED", "APPLIED_CDC_TIMEOUT", "FAILED_VERIFICATION", "FAILED_EXECUTION", "REJECTED"]);
const requestPollMs = 10_000;

interface RecoveryDrawerProps {
  ids: string[];
  incidents: RecoveryIncident[];
  requests: RecoveryRequest[];
  token?: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function RecoveryDrawer({ ids, incidents, requests, token, onClose, onUpdated }: RecoveryDrawerProps) {
  const [stage, setStage] = useState<Stage>("review");
  const [preview, setPreview] = useState<RecoveryPreviewItem[]>([]);
  const [results, setResults] = useState<RecoveryExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingMessage, setWorkingMessage] = useState("Menyiapkan pemulihan…");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pollingRef = useRef(false);
  const idempotencyKeysRef = useRef(new Map<string, string>());
  const incidentById = useMemo(() => new Map(incidents.map((incident) => [incident.id, incident])), [incidents]);
  const requestByIncident = useMemo(() => latestRequestByIncident(requests), [requests]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    const next: RecoveryPreviewItem[] = [];
    for (let offset = 0; offset < ids.length; offset += 5) {
      const batch = await Promise.all(ids.slice(offset, offset + 5).map(async (id): Promise<RecoveryPreviewItem> => {
      const listedIncident = incidentById.get(id);
      const request = requestByIncident.get(id);
      let incident: RecoveryIncidentDetail;
      try {
        incident = await recoveryService.getIncident(token, id);
      } catch (incidentError) {
        return {
          incident: listedIncident || { id, client_id: "", log_id: "", resource: "Unknown resource", incident_type: "", status: "OPEN", incident_scope: "", detected_at: "" },
          request,
          ready: false,
          error: `Detail temuan belum dapat dipastikan: ${recoveryErrorMessage(incidentError)}`,
        };
      }

      const incidentScope = String(incident.incident_scope).toUpperCase();
      if (incidentScope === "GATEWAY_INTEGRITY") {
        return {
          incident,
          request,
          ready: false,
          readOnly: true,
          error: "Masalah ditemukan pada log audit internal. Portal ini hanya dapat meninjau temuan tersebut; data client tidak diubah.",
        };
      }
      if (incidentScope !== "CLIENT_SOURCE") {
        return { incident, request, ready: false, error: "Jenis temuan ini belum didukung." };
      }
      if (incident.status !== "OPEN") {
        return { incident, request, ready: false, error: "Temuan ini sudah ditutup. Lihat hasilnya di riwayat pemulihan." };
      }
      if (request && activeRequestStatuses.has(String(request.status).toUpperCase()) && request.status !== "PENDING_EXECUTION") {
        return { incident, request, ready: false, error: "Pemulihan untuk temuan ini sedang berlangsung." };
      }
      if (request && (request.status === "SUCCEEDED" || request.status === "APPLIED_CDC_TIMEOUT")) {
        return { incident, request, ready: false, error: request.status === "SUCCEEDED" ? "Temuan ini sudah berhasil dipulihkan." : "Percobaan sebelumnya belum mendapat konfirmasi akhir. Periksa riwayat sebelum mencoba lagi." };
      }

      let candidate: RecoveryCandidate | undefined;
      try {
        const candidates = await recoveryService.getCandidates(token, id);
        const candidateLogIds = new Set([incident.reference_log_id, incident.log_id].filter(Boolean));
        candidate = candidates.find((item) => candidateLogIds.has(item.log_id));
        if (!candidate?.eligible) {
          return { incident, candidate, request, ready: false, error: friendlyReason(candidate?.reason || "Referensi tepercaya untuk temuan ini belum tersedia.") };
        }
        const preflight = await recoveryService.runPreflight(token, id);
        const needsAgentWrite = String(incident.incident_scope).toUpperCase() === "CLIENT_SOURCE";
        const ready = preflight.status === "VALID" && preflight.recoverable && (!needsAgentWrite || preflight.execution_ready === true);
        return {
          incident,
          candidate,
          preflight,
          request,
          ready: Boolean(ready),
          error: ready ? undefined : preflight.status === "NO_RECOVERY_REQUIRED"
            ? "Data saat ini sudah sesuai dengan catatan tepercaya. Tidak ada yang perlu dipulihkan."
            : needsAgentWrite && preflight.execution_ready === undefined
            ? "Kesiapan layanan pemulihan belum dapat dipastikan. Hubungi pengelola sebelum melanjutkan."
            : preflight.execution_ready === false
            ? recoveryErrorMessage(preflight.execution_blocker || "Pemulihan belum dapat dilakukan untuk bagian ini.")
            : preflight.status === "NO_RECOVERY_REQUIRED" ? "Data saat ini sudah sesuai dengan catatan tepercaya." : "Pemeriksaan belum mengizinkan pemulihan.",
        };
      } catch (previewError) {
        return { incident, candidate, request, ready: false, error: recoveryErrorMessage(previewError) };
      }
      }));
      next.push(...batch);
    }
    setPreview(next);
    setLoading(false);
  }, [ids, incidentById, requestByIncident, token]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !working) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, working]);

  const pendingResults = results.filter((item) => item.request && activeRequestStatuses.has(String(item.request.status).toUpperCase()));

  useEffect(() => {
    if (stage !== "results" || pendingResults.length === 0 || !token) return undefined;
    let active = true;
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const updates = await Promise.all(pendingResults.map(async (item) => {
          const requestId = item.request?.id;
          if (!requestId) return item;
          try {
            const request = await recoveryService.getRequest(token, requestId);
            let event: RecoveryEvent | undefined;
            const requestStatus = String(request.status).toUpperCase();
            if (request.recovery_event_id && terminalRequestStatuses.has(requestStatus)) {
              try { event = await recoveryService.getEvent(token, request.recovery_event_id); } catch { /* Event detail may lag request persistence. */ }
            }
            return { ...item, request, event };
          } catch {
            return item;
          }
        }));
        if (!active) return;
        setResults((current) => current.map((item) => updates.find((next) => next.request?.id === item.request?.id) || item));
        if (updates.some((item) => item.request && terminalRequestStatuses.has(String(item.request.status).toUpperCase()))) {
          onUpdated();
        }
      } finally {
        pollingRef.current = false;
      }
    };
    const pollWhenVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const timer = window.setInterval(pollWhenVisible, requestPollMs);
    pollWhenVisible();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [stage, pendingResults.map((item) => `${item.request?.id}:${item.request?.status}`).join("|"), token, onUpdated]);

  async function confirmRecovery() {
    if (working) return;
    setWorking(true);
    setStage("working");
    setError("");
    const nextResults: RecoveryExecutionItem[] = [];
    const readyItems = preview.filter((candidate) => candidate.ready);
    let stopBatchReason = "";

    let latestRequests: RecoveryRequest[];
    try {
      latestRequests = await recoveryService.getRequests(token);
    } catch (requestError) {
      const message = `${recoveryErrorMessage(requestError)} Permintaan belum dikirim karena status pemulihan lain belum dapat diperiksa.`;
      nextResults.push(...readyItems.map((item) => ({ incident: item.incident, error: message })));
      setResults([...nextResults, ...preview.filter((item) => !item.ready).map((item) => ({ incident: item.incident, request: item.request, error: item.error || "Pemulihan belum dapat dilakukan." }))]);
      setStage("results");
      setWorking(false);
      return;
    }
    const latestByIncident = latestRequestByIncident(latestRequests);
    const activeByResource = new Map<string, RecoveryRequest>();
    for (const request of latestRequests) {
      const resourceKey = String(request.resource || "").toLowerCase();
      const current = activeByResource.get(resourceKey);
      if (resourceKey && activeRequestStatuses.has(String(request.status).toUpperCase())
        && (!current || new Date(request.requested_at || 0).getTime() > new Date(current.requested_at || 0).getTime())) {
        activeByResource.set(resourceKey, request);
      }
    }

    // Execute serially. The backend permits only one active recovery for a
    // tenant/resource. Wait for the active request to finish, including CDC
    // confirmation when it restores a client row.
    for (let index = 0; index < readyItems.length; index += 1) {
      const item = readyItems[index];
      if (!item) continue;
      const resourceKey = String(item.incident.resource || "").toLowerCase();
      let blocker = resourceKey ? activeByResource.get(resourceKey) : undefined;
      if (blocker && blocker.incident_id !== item.incident.id) {
        if (String(blocker.status).toUpperCase() === "PENDING_EXECUTION") {
          stopBatchReason = `Pemulihan untuk ${item.incident.resource} masih menunggu. Periksa statusnya sebelum melanjutkan.`;
        }
        const blockerDeadline = blocker?.cdc_deadline_at
          ? new Date(blocker.cdc_deadline_at).getTime()
          : Date.now() + 120_000;
        while (!stopBatchReason && blocker && activeRequestStatuses.has(String(blocker.status).toUpperCase())) {
          if (Date.now() >= blockerDeadline) {
            stopBatchReason = `Pemulihan untuk ${item.incident.resource} belum selesai. Bagian berikutnya belum diproses.`;
            break;
          }
          setWorkingMessage(`Menunggu pemulihan ${item.incident.resource} selesai sebelum melanjutkan…`);
          await wait(Math.min(requestPollMs, Math.max(0, blockerDeadline - Date.now())));
          try {
            blocker = await recoveryService.getRequest(token, blocker.id);
            if (String(blocker.status).toUpperCase() === "PENDING_EXECUTION") {
              stopBatchReason = `Pemulihan untuk ${item.incident.resource} masih menunggu. Periksa statusnya sebelum melanjutkan.`;
            }
            if (resourceKey && activeRequestStatuses.has(String(blocker.status).toUpperCase())) activeByResource.set(resourceKey, blocker);
            else if (resourceKey) activeByResource.delete(resourceKey);
          } catch {
            stopBatchReason = `Status pemulihan ${item.incident.resource} belum dapat dipastikan. Bagian berikutnya belum diproses.`;
          }
        }
      }
      if (stopBatchReason) {
        nextResults.push(...readyItems.slice(index).map((remaining) => ({ incident: remaining.incident, error: stopBatchReason })));
        break;
      }

      let request = latestByIncident.get(item.incident.id) || item.request;
      if (request && ["EXECUTING", "APPLIED_AWAITING_CDC"].includes(String(request.status).toUpperCase())) {
        if (resourceKey) activeByResource.set(resourceKey, request);
        nextResults.push({ incident: item.incident, request });
        setResults([...nextResults]);
        continue;
      }
      setWorkingMessage(`Memulihkan ${item.incident.resource}…`);
      try {
        if (!request || !["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"].includes(String(request.status).toUpperCase())) {
          let idempotencyKey = idempotencyKeysRef.current.get(item.incident.id);
          if (!idempotencyKey) {
            idempotencyKey = makeIdempotencyKey();
            idempotencyKeysRef.current.set(item.incident.id, idempotencyKey);
          }
          try {
            request = await recoveryService.createRequest(token, {
              incident_id: item.incident.id,
              selected_log_id: item.candidate?.log_id || item.incident.reference_log_id || item.incident.log_id,
              reason: reason.trim(),
              idempotency_key: idempotencyKey,
            });
          } catch (createError) {
            // A timed out HTTP response can hide a request that the Gateway
            // already persisted. Re-read before deciding whether to retry.
            const refreshedRequests = await recoveryService.getRequests(token);
            const persistedRequest = latestRequestByIncident(refreshedRequests).get(item.incident.id);
            if (!persistedRequest || !activeRequestStatuses.has(String(persistedRequest.status).toUpperCase())) {
              throw createError;
            }
            request = persistedRequest;
          }
        }
        if (String(request.status).toUpperCase() === "PENDING_EXECUTION") {
          request = await recoveryService.executeRequest(token, request.id);
        }
        let event: RecoveryEvent | undefined;
        if (request.recovery_event_id) {
          try { event = await recoveryService.getEvent(token, request.recovery_event_id); } catch { /* Event row may be recorded after execute returns. */ }
        }
        if (resourceKey && activeRequestStatuses.has(String(request.status).toUpperCase())) activeByResource.set(resourceKey, request);
        else if (resourceKey) activeByResource.delete(resourceKey);
        nextResults.push({ incident: item.incident, request, event });
      } catch (executionError) {
        let latestRequest = request;
        if (latestRequest?.id) {
          try { latestRequest = await recoveryService.getRequest(token, latestRequest.id); } catch { /* Keep the known request ID for later polling. */ }
        } else {
          try { latestRequest = latestRequestByIncident(await recoveryService.getRequests(token)).get(item.incident.id); } catch { /* Gateway state could not be reloaded. */ }
        }
        const latestStatus = String(latestRequest?.status || "").toUpperCase();
        const message = latestStatus === "EXECUTING"
          ? "Permintaan sudah diterima dan masih diproses. Jangan kirim ulang; muat ulang untuk melihat status terbaru."
          : latestStatus === "APPLIED_AWAITING_CDC"
            ? "Perubahan sudah diterapkan. Sistem sedang memastikan hasilnya; jangan kirim permintaan baru untuk bagian ini."
            : latestStatus === "SUCCEEDED"
              ? "Pemulihan berhasil. Muat ulang untuk melihat hasil terbaru."
              : latestRequest?.failure_reason
                ? recoveryErrorMessage(latestRequest.failure_reason)
                : `${recoveryErrorMessage(executionError)} Muat ulang sebelum mencoba lagi.`;
        if (resourceKey && latestRequest && activeRequestStatuses.has(String(latestRequest.status).toUpperCase())) activeByResource.set(resourceKey, latestRequest);
        nextResults.push({ incident: item.incident, request: latestRequest, error: message });
      }
      setResults([...nextResults]);
    }

    const skipped = preview.filter((item) => !item.ready).map((item) => ({ incident: item.incident, request: item.request, error: item.error || "Pemulihan belum dapat dilakukan." }));
    setResults([...nextResults, ...skipped]);
    setStage("results");
    setWorking(false);
    onUpdated();
  }

  const readyCount = preview.filter((item) => item.ready).length;
  const investigationOnly = preview.length > 0 && preview.every((item) => item.readOnly);
  const panelTitle = investigationOnly
    ? "Pemeriksaan log audit"
    : stage === "results" ? "Hasil pemulihan" : stage === "confirm" ? "Konfirmasi pemulihan" : "Periksa pemulihan";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onClick={() => !working && stage !== "results" && onClose()}>
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={() => !working && onClose()} aria-label="Tutup pemeriksaan pemulihan" />
      <section className="relative flex h-full w-full max-w-[620px] flex-col border-l border-line-strong bg-panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recovery-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">{panelTitle}</div>
            <h2 id="recovery-drawer-title" className="mt-0.5 text-[15px] font-semibold text-ink">{ids.length} temuan · {investigationOnly ? "pemeriksaan saja" : "tinjauan pemulihan"}</h2>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={() => !working && onClose()} disabled={working} aria-label="Tutup"><X className="size-4" /></Button>
        </header>

        <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3">
          <Meta label="Dipilih" value={`${ids.length} temuan`} />
          <Meta label="Bisa dipulihkan" value={loading ? "Memeriksa…" : `${readyCount} dari ${preview.length}`} good={readyCount > 0} />
          <Meta label="Tindakan" value={investigationOnly ? "Data client tidak diubah" : "Periksa lalu konfirmasi"} />
        </div>

        {error && <div className="mx-4 mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">{error}</div>}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading ? <LoadingPreview /> : stage === "working" ? <RunningState message={workingMessage} /> : stage === "results" ? (
            results.map((item) => <ResultCard key={`${item.incident.id}-${item.request?.id || item.error}`} item={item} />)
          ) : (
            <>
              {stage === "confirm" && <>
                <div className="flex items-start gap-2 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2.5 text-xs text-warning"><AlertTriangle className="mt-px size-4 shrink-0" /><span>Data client hanya diubah setelah pemeriksaan tepercaya mengizinkan dan kamu mengonfirmasi. Temuan pada log internal tidak mengubah data client.</span></div>
                <label className="block rounded-lg border border-line bg-ground p-3.5">
                  <span className="text-xs font-semibold text-ink">Alasan pemulihan</span>
                  <span className="mt-1 block text-[10px] text-ink-faint">Alasan ini dicatat bersama permintaan pemulihan.</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required minLength={5} aria-label="Alasan pemulihan" aria-invalid={reason.trim().length > 0 && reason.trim().length < 5} placeholder="Jelaskan alasan data ini perlu dipulihkan…" className="mt-2 w-full resize-y rounded-md border border-line-strong bg-panel px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-brand-bright" />
                  <span className="mt-1 block text-[10px] text-ink-faint">Masukkan minimal 5 karakter.</span>
                </label>
              </>}
              {preview.map((item) => <PreviewCard key={item.incident.id} item={item} />)}
              {stage === "confirm" && <div className="rounded-lg border border-line bg-ground px-3.5 py-3 text-xs text-ink-dim">{readyCount} data client telah lolos pemeriksaan dan akan diproses satu per satu.</div>}
            </>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          {loading ? <Button variant="outline" disabled className="w-full"><LoaderCircle className="size-3.5 animate-spin" /> Memeriksa…</Button> : stage === "review" ? <><Button variant="outline" onClick={onClose} className="flex-1">Tutup</Button><Button variant="outline" onClick={() => void loadPreview()} className="flex-1"><RotateCw className="size-3.5" /> Periksa ulang</Button>{!investigationOnly && <Button variant="default" onClick={() => setStage("confirm")} disabled={readyCount === 0} className="flex-1">Tinjau tindakan <ArrowRight className="size-3.5" /></Button>}</> : stage === "confirm" ? <><Button variant="outline" onClick={() => setStage("review")} className="flex-1">Kembali</Button><Button variant="default" onClick={() => void confirmRecovery()} disabled={working || readyCount === 0 || reason.trim().length < 5} className="flex-1"><ShieldCheck className="size-3.5" /> Pulihkan {readyCount}</Button></> : stage === "results" ? <Button variant="default" onClick={onClose} className="w-full"><Check className="size-3.5" /> Selesai</Button> : <Button variant="outline" disabled className="w-full"><LoaderCircle className="size-3.5 animate-spin" /> Menyiapkan pemulihan…</Button>}
        </footer>
      </section>
    </div>
  );
}

function PreviewCard({ item }: { item: RecoveryPreviewItem }) {
  const { incident, candidate, preflight } = item;
  if (item.readOnly) return <GatewayInvestigationCard item={item} />;
  const trustedState = preflight?.trusted_state_preview
    ?? preflight?.trusted_reference_preview?.metadata
    ?? preflight?.snapshot_preview?.metadata;
  const currentState = preflight?.current_state_preview;
  const matched = preflight?.status === "NO_RECOVERY_REQUIRED" || preflight?.source_status === "MATCHED";
  const changedFields = recoveryChangedFields(preflight, incident.discrepancy_summary, trustedState, currentState);
  const currentStateAvailable = preflight?.source_found === false || currentState !== undefined;
  return (
    <article className="rounded-lg border border-line bg-ground p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-[11px] font-semibold text-ink">{incident.resource || candidate?.resource || "Data client"}</p><code className="mt-1 block break-all font-mono text-[9px] text-ink-faint">Catatan {candidate?.log_id || incident.reference_log_id || incident.log_id}</code></div>
        <Badge tone={matched || item.ready ? "success" : "warning"}>{matched ? "Sudah sesuai" : item.ready ? "Bisa dipulihkan" : "Belum dapat dipulihkan"}</Badge>
      </div>
      <p className="mt-2 text-[10px] text-ink-dim">{matched ? "Pemeriksaan terbaru menunjukkan data client sudah sesuai dengan catatan tepercaya. Temuan sebelumnya tetap tersimpan untuk ditinjau." : "Temuan sebelumnya mencatat perbedaan data client. Pemeriksaan di bawah menentukan kondisi saat ini dan kelayakan pemulihan."}</p>
      {changedFields.length > 0 ? (
        <div className="mt-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Bagian yang berubah</p><div className="mt-1 flex flex-wrap gap-1">{changedFields.map((field) => <Badge key={field} tone="warning">{field}</Badge>)}</div></div>
      ) : (
        <p className="mt-3 text-[10px] text-ink-faint">{matched ? "Tidak ada bagian yang perlu dipulihkan." : "Nama bagian yang berubah belum tersedia."}</p>
      )}
      {!matched && preflight?.operation === "DELETE" && <p className="mt-3 rounded border border-warning/25 bg-warning/10 px-2.5 py-2 text-[10px] text-warning">Catatan terakhir menunjukkan data ini sudah dihapus. Pemulihan akan menghapus data yang masih muncul.</p>}
      {(trustedState !== undefined || currentStateAvailable) && <details className="mt-3 rounded-md border border-line bg-panel px-3 py-2">
        <summary className="cursor-pointer text-[10px] font-semibold text-ink-dim">Lihat perbandingan data</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <StatePanel title="Data pada catatan terakhir" value={trustedState} tone="trusted" unavailable={trustedState === undefined} unavailableMessage="Data pembanding tidak tersedia." />
          <StatePanel title="Data client saat ini" value={currentState} tone="current" unavailable={!currentStateAvailable} missing={preflight?.source_found === false} unavailableMessage="Data terkini belum tersedia." />
        </div>
        <p className="mt-2 text-[9px] text-ink-faint">Nilai sensitif disamarkan sebelum ditampilkan.</p>
      </details>}
      {!item.ready && <p className={`mt-3 text-[10px] ${matched ? "text-success" : "text-warning"}`}>{item.error || "Pemeriksaan belum mengizinkan pemulihan."}</p>}
    </article>
  );
}

function GatewayInvestigationCard({ item }: { item: RecoveryPreviewItem }) {
  const { incident } = item;
  return (
    <article className="rounded-lg border border-warning/25 bg-ground p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-[11px] font-semibold text-ink">{incident.resource || "Log audit internal"}</p><code className="mt-1 block break-all font-mono text-[9px] text-ink-faint">Log {incident.reference_log_id || incident.log_id}</code></div>
        <Badge tone="warning">Log perlu ditinjau</Badge>
      </div>
      <div className="mt-3 rounded-md border border-warning/20 bg-warning/[0.06] px-3 py-2.5">
        <p className="text-xs font-semibold text-warning">Log audit internal tidak valid</p>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-dim">Isi log audit tidak sesuai dengan catatan aslinya. Ini belum memastikan data client ikut berubah.</p>
      </div>
      <p className="mt-3 text-[10px] text-ink-faint">Portal ini hanya meninjau log internal. Pemulihan log belum tersedia di sini dan data client tidak diubah.</p>
    </article>
  );
}

function StatePanel({ title, value, tone, unavailable = false, missing = false, unavailableMessage }: {
  title: string;
  value: unknown;
  tone: "trusted" | "current";
  unavailable?: boolean;
  missing?: boolean;
  unavailableMessage?: string;
}) {
  const border = tone === "trusted" ? "border-success/20" : "border-warning/25";
  const label = tone === "trusted" ? "text-success" : "text-warning";
  const content = missing
    ? "Data ini tidak ditemukan di sumber client saat ini."
    : unavailable || value === undefined
      ? unavailableMessage || "Data pembanding belum tersedia."
      : formatJson(value);
  return <section className={`min-w-0 overflow-hidden rounded-md border ${border} bg-panel`}>
    <h3 className={`border-b border-line px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] ${label}`}>{title}</h3>
    <pre className="max-h-64 min-h-20 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-[10px] leading-relaxed text-ink-dim">{content}</pre>
  </section>;
}
function ResultCard({ item }: { item: RecoveryExecutionItem }) {
  const status = String(item.request?.status || (item.error ? "STATUS_UNKNOWN" : "PENDING_EXECUTION")).toUpperCase();
  const tone = status === "SUCCEEDED" ? "success" : activeRequestStatuses.has(status) ? "info" : status.startsWith("FAILED") || status === "APPLIED_CDC_TIMEOUT" ? "danger" : "warning";
  return (
    <article className="rounded-lg border border-line bg-ground p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-[11px] font-semibold text-ink">{item.incident.resource || "Data client"}</p><p className="mt-1 text-[10px] text-ink-faint">{item.incident.incident_scope === "GATEWAY_INTEGRITY" ? "Log audit internal" : "Data client"}</p></div><Badge tone={tone}>{requestStatusLabel(status)}</Badge></div>
      <p className="mt-3 text-xs text-ink-dim">{item.error || statusMessage(status)}</p>
      {item.event?.recovered_metadata !== undefined && <details className="mt-3 rounded border border-line bg-panel px-3 py-2"><summary className="cursor-pointer text-[10px] font-semibold text-ink-dim">Lihat data hasil pemulihan</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-ink-faint">{formatJson(item.event.recovered_metadata)}</pre></details>}
    </article>
  );
}

function Meta({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="bg-panel px-4 py-3"><div className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</div><div className={`mt-0.5 text-xs font-semibold ${good === undefined ? "text-ink" : good ? "text-success" : "text-warning"}`}>{value}</div></div>;
}

function LoadingPreview() {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-xs text-ink-dim"><LoaderCircle className="size-6 animate-spin text-brand-bright" />Memeriksa bagian yang terdampak dan kelayakan pemulihan…</div>;
}

function RunningState({ message }: { message: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center py-16 text-center"><LoaderCircle className="size-10 animate-spin text-brand-bright" /><div className="mt-4 text-sm text-ink">{message}</div><div className="mt-1 text-[11px] text-ink-faint">Setiap bagian diproses secara terpisah.</div></div>;
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `client-recovery-${crypto.randomUUID()}`;
  return `client-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requestStatusLabel(value: string) {
  const status = String(value || "UNKNOWN").toUpperCase();
  if (status === "SUCCEEDED") return "Berhasil dipulihkan";
  if (status === "PENDING_EXECUTION") return "Menunggu diproses";
  if (status === "EXECUTING" || status === "APPLIED_AWAITING_CDC") return "Sedang diproses";
  if (status === "APPLIED_CDC_TIMEOUT" || status.startsWith("FAILED") || status === "REJECTED") return "Perlu ditinjau";
  return "Belum selesai";
}

function friendlyReason(value: string) {
  const messages: Record<string, string> = {
    recovery_not_required: "Data client sudah sesuai dengan catatan pembanding. Tidak ada yang perlu dipulihkan.",
    reference_not_latest_client_event: "Catatan data sudah berubah sejak pemeriksaan. Muat ulang temuan sebelum melanjutkan.",
    client_source_unreachable: "Data client belum dapat diperiksa. Tidak ada perubahan yang dilakukan.",
    gateway_integrity_read_only: "Masalah ini ditemukan pada log audit internal. Data client tidak diubah.",
    audit_trail_record_not_found: "Catatan pembanding untuk data ini belum tersedia. Data client tidak diubah.",
    audit_trail_reference_missing: "Catatan pembanding untuk data ini belum tersedia. Data client tidak diubah.",
    reference_merkle_proof_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan dan data client tidak diubah.",
    reference_fabric_root_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan dan data client tidak diubah.",
    reference_anchor_missing: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan dan data client tidak diubah.",
  };
  const code = value.trim().toLowerCase().split(":", 1)[0] || "";
  return messages[code] || "Pemeriksaan belum dapat diselesaikan. Data client tidak diubah. Coba periksa ulang atau hubungi pengelola.";
}

function statusMessage(status: string) {
  if (status === "SUCCEEDED") return "Data client berhasil dipulihkan dan hasilnya sudah dipastikan.";
  if (status === "PENDING_EXECUTION") return "Pemulihan menunggu untuk diproses.";
  if (status === "EXECUTING") return "Pemulihan sedang diproses.";
  if (status === "APPLIED_AWAITING_CDC") return "Perubahan sudah diterapkan. Sistem sedang memastikan hasilnya.";
  if (status === "APPLIED_CDC_TIMEOUT") return "Perubahan sudah diterapkan, tetapi hasil akhirnya belum dapat dipastikan. Temuan perlu ditinjau sebelum mencoba lagi.";
  if (status === "FAILED_VERIFICATION") return "Catatan pembanding atau data saat ini belum dapat dipastikan. Pemulihan ditahan.";
  if (status === "FAILED_EXECUTION") return "Pemulihan belum berhasil dijalankan.";
  return "Permintaan pemulihan sudah diterima.";
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}
