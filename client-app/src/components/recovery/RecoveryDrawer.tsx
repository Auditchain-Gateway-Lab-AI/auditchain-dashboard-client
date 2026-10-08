import { AlertTriangle, ArrowRight, Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { latestRequestByIncident } from "@/components/recovery/ActiveIncidents";
import { useRecoveryRefresh } from "@/hooks/useRecovery";
import { recoveryErrorMessage } from "@/services/recovery/api-recovery.service";
import { recoveryService } from "@/services/recovery";
import type {
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
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pollingRef = useRef(false);
  const refreshRecovery = useRecoveryRefresh();
  const incidentById = useMemo(() => new Map(incidents.map((incident) => [incident.id, incident])), [incidents]);
  const requestByIncident = useMemo(() => latestRequestByIncident(requests), [requests]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    const next = await Promise.all(ids.map(async (id): Promise<RecoveryPreviewItem> => {
      const listedIncident = incidentById.get(id);
      const request = requestByIncident.get(id);
      let incident: RecoveryIncidentDetail;
      try {
        incident = await recoveryService.getIncident(token, id);
      } catch (incidentError) {
        if (!listedIncident) {
          return { incident: { id, client_id: "", log_id: "", resource: "Unknown resource", incident_type: "", status: "OPEN", incident_scope: "", detected_at: "" }, ready: false, error: recoveryErrorMessage(incidentError) };
        }
        incident = listedIncident;
      }

      if (String(incident.incident_scope).toUpperCase() !== "CLIENT_SOURCE") {
        return { incident, request, ready: false, error: "Gateway integrity incidents are read only in this recovery workflow." };
      }
      if (incident.status !== "OPEN") {
        return { incident, request, ready: false, error: "This incident is already closed. Review its recovery event in history." };
      }
      if (request && activeRequestStatuses.has(String(request.status).toUpperCase()) && request.status !== "PENDING_EXECUTION") {
        return { incident, request, ready: false, error: "A recovery request for this incident is already in progress." };
      }
      if (request && (request.status === "SUCCEEDED" || request.status === "APPLIED_CDC_TIMEOUT")) {
        return { incident, request, ready: false, error: request.status === "SUCCEEDED" ? "This incident already has a successful recovery." : "The previous attempt timed out while awaiting CDC confirmation. Check history before retrying." };
      }

      try {
        const candidates = await recoveryService.getCandidates(token, id);
        const targetLogId = incident.reference_log_id || incident.log_id;
        const candidate = candidates.find((item) => item.log_id === targetLogId) || candidates[0];
        if (!candidate?.eligible) {
          return { incident, candidate, request, ready: false, error: friendlyReason(candidate?.reason || "No eligible trusted reference was returned.") };
        }
        const preflight = await recoveryService.runPreflight(token, id);
        const ready = preflight.status === "VALID" && preflight.recoverable;
        return {
          incident,
          candidate,
          preflight,
          request,
          ready: Boolean(ready),
          error: ready ? undefined : preflight.status === "NO_RECOVERY_REQUIRED" ? "The client row already matches the trusted reference." : `Preflight did not allow recovery (${preflight.status}).`,
        };
      } catch (previewError) {
        return { incident, request, ready: false, error: friendlyReason(recoveryErrorMessage(previewError)) };
      }
    }));
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
            if (request.recovery_event_id) {
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
          void refreshRecovery();
        }
      } finally {
        pollingRef.current = false;
      }
    };
    const timer = window.setInterval(() => void poll(), 4_000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [stage, pendingResults.map((item) => `${item.request?.id}:${item.request?.status}`).join("|"), token, onUpdated, refreshRecovery]);

  async function confirmRecovery() {
    if (working) return;
    setWorking(true);
    setStage("working");
    setError("");
    const nextResults: RecoveryExecutionItem[] = [];

    // Execute serially. The backend permits only one active recovery for a
    // tenant/resource, so selected items sharing a resource must not race.
    for (const item of preview.filter((candidate) => candidate.ready)) {
      try {
        let request = item.request;
        if (!request || !["PENDING_EXECUTION", "EXECUTING", "APPLIED_AWAITING_CDC"].includes(String(request.status).toUpperCase())) {
          request = await recoveryService.createRequest(token, {
            incident_id: item.incident.id,
            selected_log_id: item.candidate?.log_id || item.incident.reference_log_id || item.incident.log_id,
            reason: "Recovery initiated from the client portal recovery workspace.",
            idempotency_key: makeIdempotencyKey(),
          });
        }
        if (String(request.status).toUpperCase() === "PENDING_EXECUTION") {
          request = await recoveryService.executeRequest(token, request.id);
        }
        let event: RecoveryEvent | undefined;
        if (request.recovery_event_id) {
          try { event = await recoveryService.getEvent(token, request.recovery_event_id); } catch { /* Event row may be recorded after execute returns. */ }
        }
        nextResults.push({ incident: item.incident, request, event });
      } catch (executionError) {
        nextResults.push({ incident: item.incident, error: recoveryErrorMessage(executionError) });
      }
      setResults([...nextResults]);
    }

    const skipped = preview.filter((item) => !item.ready).map((item) => ({ incident: item.incident, request: item.request, error: item.error || "Recovery is not eligible." }));
    setResults([...nextResults, ...skipped]);
    setStage("results");
    setWorking(false);
    onUpdated();
    void refreshRecovery();
  }

  const readyCount = preview.filter((item) => item.ready).length;
  const panelTitle = stage === "results" ? "Recovery results" : stage === "confirm" ? "Confirm recovery" : "Recovery preview";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation" onClick={() => !working && stage !== "results" && onClose()}>
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={() => !working && onClose()} aria-label="Close recovery review" />
      <section className="relative flex h-full w-full max-w-[620px] flex-col border-l border-line-strong bg-panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recovery-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">{panelTitle}</div>
            <h2 id="recovery-drawer-title" className="mt-0.5 text-[15px] font-semibold text-ink">{ids.length} incident{ids.length === 1 ? "" : "s"} · client record recovery</h2>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </header>

        <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3">
          <Meta label="Selected" value={`${ids.length} incidents`} />
          <Meta label="Preflight eligible" value={loading ? "Checking…" : `${readyCount} of ${preview.length}`} good={readyCount > 0} />
          <Meta label="Recovery source" value="Verified client event" />
        </div>

        {error && <div className="mx-4 mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">{error}</div>}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading ? <LoadingPreview /> : stage === "working" ? <RunningState /> : stage === "results" ? (
            results.map((item) => <ResultCard key={`${item.incident.id}-${item.request?.id || item.error}`} item={item} />)
          ) : (
            <>
              {stage === "confirm" && <div className="flex items-start gap-2 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2.5 text-xs text-warning"><AlertTriangle className="mt-px size-4 shrink-0" /><span>Gateway will write the selected client row through its Agent. Each item completes only after CDC and recovery evidence verification.</span></div>}
              {preview.map((item) => <PreviewCard key={item.incident.id} item={item} />)}
              {stage === "confirm" && <div className="rounded-lg border border-line bg-ground px-3.5 py-3 text-xs text-ink-dim">{readyCount} item{readyCount === 1 ? "" : "s"} passed the latest preflight and will be processed one at a time. Other selected incidents are shown as read only.</div>}
            </>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          {loading ? <Button variant="outline" disabled className="w-full"><LoaderCircle className="size-3.5 animate-spin" /> Preparing preview…</Button> : stage === "review" ? <><Button variant="outline" onClick={onClose} className="flex-1">Close</Button><Button variant="default" onClick={() => setStage("confirm")} disabled={readyCount === 0} className="flex-1">Review action <ArrowRight className="size-3.5" /></Button></> : stage === "confirm" ? <><Button variant="outline" onClick={() => setStage("review")} className="flex-1">Back</Button><Button variant="default" onClick={() => void confirmRecovery()} disabled={working || readyCount === 0} className="flex-1"><ShieldCheck className="size-3.5" /> Execute {readyCount}</Button></> : stage === "results" ? <Button variant="default" onClick={onClose} className="w-full"><Check className="size-3.5" /> Done</Button> : <Button variant="outline" disabled className="w-full"><LoaderCircle className="size-3.5 animate-spin" /> Starting recovery…</Button>}
        </footer>
      </section>
    </div>
  );
}

function PreviewCard({ item }: { item: RecoveryPreviewItem }) {
  const { incident, candidate, preflight } = item;
  const discrepancyFields = getDiscrepancyFields(incident.discrepancy_summary);
  const trustedMetadata = preflight?.snapshot_preview?.metadata;
  return (
    <article className="rounded-lg border border-line bg-ground p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><code className="break-all font-mono text-[11px] font-semibold text-ink">{candidate?.log_id || incident.reference_log_id || incident.log_id}</code><p className="mt-1 text-[10px] text-ink-faint">{incident.resource} · {incident.incident_type}</p></div>
        <Badge tone={item.ready ? "success" : incident.incident_scope === "CLIENT_SOURCE" ? "warning" : "neutral"}>{item.ready ? "Preflight valid" : formatStatus(item.error ? "BLOCKED" : incident.status)}</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Fact label="Scope / source" value={`${formatStatus(incident.incident_scope)} · ${formatStatus(preflight?.source_status || incident.source_status || "UNKNOWN")}`} />
        <Fact label="Operation" value={preflight?.operation || candidate?.operation || "Unknown"} />
        <Fact label="Live client state hash" value={preflight?.client_state_hash || preflight?.current_hash || incident.detected_state_hash || "Unavailable"} mono />
        <Fact label="Trusted desired state hash" value={preflight?.desired_state_hash || preflight?.reference_log_hash || candidate?.reference_log_hash || "Unavailable"} mono />
        <Fact label="Merkle root / anchor" value={`${shortHash(preflight?.merkle_root || candidate?.reference_merkle_root)} · ${preflight?.anchor_id || candidate?.reference_anchor_id || "No anchor"}`} mono />
      </div>
      {discrepancyFields.length > 0 && <div className="mt-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Changed fields reported by gateway</p><div className="mt-1 flex flex-wrap gap-1">{discrepancyFields.map((field) => <Badge key={field} tone="warning">{field}</Badge>)}</div></div>}
      {preflight?.operation === "DELETE" && <p className="mt-3 rounded border border-warning/25 bg-warning/10 px-2.5 py-2 text-[10px] text-warning">This operation will remove the unexpected client row. It will not insert an empty record.</p>}
      {trustedMetadata !== undefined && <details className="mt-3 rounded border border-line bg-panel px-3 py-2"><summary className="cursor-pointer text-[10px] font-semibold text-ink-dim">Verified trusted reference data (redacted)</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-ink-faint">{formatJson(trustedMetadata)}</pre></details>}
      {!item.ready && <p className="mt-3 text-[10px] text-warning">{item.error || "Preflight has not approved this recovery."}</p>}
      <p className="mt-3 text-[9px] text-ink-faint">Live client values are not returned by the recovery API. This preview shows hashes and field names; it does not invent a before value.</p>
    </article>
  );
}

function ResultCard({ item }: { item: RecoveryExecutionItem }) {
  const status = String(item.request?.status || (item.error ? "FAILED_EXECUTION" : "PENDING_EXECUTION")).toUpperCase();
  const tone = status === "SUCCEEDED" ? "success" : activeRequestStatuses.has(status) ? "info" : "danger";
  return (
    <article className="rounded-lg border border-line bg-ground p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><code className="break-all font-mono text-[11px] font-semibold text-ink">{item.incident.reference_log_id || item.incident.log_id}</code><p className="mt-1 text-[10px] text-ink-faint">{item.incident.resource}</p></div><Badge tone={tone}>{formatStatus(status)}</Badge></div>
      <p className="mt-3 text-xs text-ink-dim">{item.error || statusMessage(status, item.request?.cdc_status)}</p>
      {item.request?.id && <Fact label="Request ID" value={item.request.id} mono />}
      {item.request?.failure_reason && <p className="mt-2 text-[10px] text-danger">{item.request.failure_reason}</p>}
      {item.event?.recovered_metadata !== undefined && <details className="mt-3 rounded border border-line bg-panel px-3 py-2"><summary className="cursor-pointer text-[10px] font-semibold text-ink-dim">Recorded recovery result (redacted)</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-ink-faint">{formatJson(item.event.recovered_metadata)}</pre></details>}
    </article>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 rounded-md border border-line bg-panel px-2.5 py-2"><p className="text-[8px] uppercase tracking-[0.1em] text-ink-faint">{label}</p><p className={`mt-1 break-all text-[10px] text-ink-dim ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}

function Meta({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="bg-panel px-4 py-3"><div className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</div><div className={`mt-0.5 text-xs font-semibold ${good === undefined ? "text-ink" : good ? "text-success" : "text-warning"}`}>{value}</div></div>;
}

function LoadingPreview() {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-xs text-ink-dim"><LoaderCircle className="size-6 animate-spin text-brand-bright" />Running read only preflight checks…</div>;
}

function RunningState() {
  return <div className="flex min-h-64 flex-col items-center justify-center py-16 text-center"><LoaderCircle className="size-10 animate-spin text-brand-bright" /><div className="mt-4 text-sm text-ink">Starting recovery requests…</div><div className="mt-1 text-[11px] text-ink-faint">Each selected incident is processed separately.</div></div>;
}

function getDiscrepancyFields(value?: string | Array<{ field?: string; changed?: boolean }>) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item.changed !== false && item.field).map((item) => item.field as string);
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.field === "string" && item.changed !== false).map((item) => item.field as string) : [];
  } catch { return []; }
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `client-recovery-${crypto.randomUUID()}`;
  return `client-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shortHash(value?: string) {
  if (!value) return "No Merkle root";
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function formatStatus(value: string) {
  return String(value || "UNKNOWN").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function friendlyReason(value: string) {
  const messages: Record<string, string> = {
    legacy_recovery_out_of_scope: "This record is outside the recovery scope configured by the gateway.",
    client_source_incident_required: "This incident is not a client source mismatch and cannot write to the client database.",
    reference_not_latest_client_event: "A newer client event exists for this resource. Refresh incidents before recovery.",
    client_source_unreachable: "The client Agent is unreachable. No recovery write was performed.",
    recovery_not_required: "The current client row already matches the trusted reference.",
  };
  return messages[value] || value;
}

function statusMessage(status: string, cdcStatus?: string) {
  if (status === "SUCCEEDED") return "CDC, recovery event integrity, and Fabric anchoring are verified.";
  if (status === "PENDING_EXECUTION") return "Recovery is queued and can be resumed from this workspace.";
  if (status === "EXECUTING") return "The gateway is processing this recovery request.";
  if (status === "APPLIED_AWAITING_CDC") return `The Agent applied the client write. Waiting for CDC and event verification${cdcStatus ? ` (${formatStatus(cdcStatus)})` : ""}.`;
  if (status === "APPLIED_CDC_TIMEOUT") return "Agent write was applied, but CDC confirmation timed out. Check the recorded event before attempting another recovery.";
  if (status === "FAILED_VERIFICATION") return "The gateway could not verify the recovery reference or current client state.";
  if (status === "FAILED_EXECUTION") return "The gateway or Agent could not complete the recovery write.";
  return "Recovery request submitted.";
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}
