import { Clock3, LoaderCircle, RotateCw, ScanLine, ServerCog, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { useRefreshVerificationStatus } from "@/hooks/useDashboard";
import type { BackgroundWorkerStatus, DashboardOverview, VerificationRun } from "@/types/dashboard";

export function VerificationSnapshot({
  data,
  run,
  workers = [],
  workerStatusPending = false,
  workerStatusStale = false,
}: {
  data: DashboardOverview;
  run?: VerificationRun | null;
  workers?: BackgroundWorkerStatus[];
  workerStatusPending?: boolean;
  workerStatusStale?: boolean;
}) {
  const refreshStatus = useRefreshVerificationStatus();
  const current = data.currentIntegrity;
  const hasChecks = current
    ? current.valid + current.tampered + current.pending + current.unavailable > 0
    : data.totalVerifications > 0;
  const runActive = run?.status === "QUEUED" || run?.status === "RUNNING";
  const runTone: "danger" | "success" | "info" = run?.status === "FAILED"
    ? "danger"
    : run?.status === "COMPLETED"
      ? "success"
      : "info";
  const unavailable = data.verificationUnavailable ?? 0;
  const latestCheck = data.latestIntegrityCheck;
  const metrics = [
    { label: "Valid logs", value: current?.valid ?? data.valid, tone: "text-success" },
    { label: "Tampered logs", value: current?.tampered ?? data.tampered, tone: "text-danger" },
    { label: "Pending logs", value: current?.pending ?? data.verificationPending ?? 0, tone: "text-warning" },
    { label: "Unavailable logs", value: current?.unavailable ?? unavailable, tone: "text-warning", alwaysShow: true },
    { label: "Not checked", value: current?.notChecked ?? 0, tone: "text-ink-faint", alwaysShow: true },
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader><CardTitle>Verification Summary</CardTitle><ShieldCheck className="size-4 text-success" /></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3.5">
        <div className="border border-line bg-ground px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[9px] uppercase text-ink-faint"><Clock3 className="size-3" /> Last verified</div>
          <div className="mt-1 font-mono text-xs font-semibold text-ink">{data.lastScan}</div>
        </div>
        <div className="border border-line bg-ground px-3 py-2.5">
          <div className="text-[9px] uppercase text-ink-faint">Unique audit logs</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink">{formatNumber(current?.total ?? 0)}</div>
        </div>
        <div className="border border-line bg-ground px-3 py-2.5">
          <div className="text-[9px] uppercase text-ink-faint">{data.totalVerificationsIsLegacy ? "Cumulative check attempts (legacy)" : "Check results · last 90 days"}</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink">{data.totalVerifications > 0 ? formatNumber(data.totalVerifications) : "N/A"}</div>
        </div>
        <div className="space-y-1.5">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-ink-dim">{metric.label}</span>
              <span className={`font-mono font-semibold ${hasChecks || metric.alwaysShow ? metric.tone : "text-ink-faint"}`}>
                {hasChecks || metric.alwaysShow ? formatNumber(metric.value) : "N/A"}
              </span>
            </div>
          ))}
        </div>
        {latestCheck && (
          <div className="border border-line bg-ground px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[9px] uppercase text-ink-faint">
              <ScanLine className="size-3 text-info" /> Latest integrity check
            </div>
            <div className="mt-1 text-[11px] font-semibold text-ink">
              {integritySourceLabel(latestCheck.source)}
            </div>
            <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[9px] text-ink-faint">
              <span>{latestCheck.checkedAt || "Source tracking starts after the backend update"}</span>
              {latestCheck.checkedLogs > 0 && <span>{formatNumber(latestCheck.checkedLogs)} logs</span>}
            </div>
          </div>
        )}
        {run && (
          <div className="mt-auto border border-line bg-elevated px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink">
                <ServerCog className="size-3 text-info" />
                <span className="truncate">Server verification</span>
              </span>
              {run && (
                <Badge tone={runTone}>
                  {runActive && <LoaderCircle className="size-3 animate-spin" />}
                  {run.status.toLowerCase()}
                </Badge>
              )}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-label="Server verification progress">
              <div
                className="h-full rounded-full bg-info transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, run.progressPercent))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between gap-2 text-[9px] text-ink-faint">
              <span>{formatNumber(run.processedItems)} / {formatNumber(run.totalItems)} logs</span>
              <span>{Math.round(run.progressPercent)}%</span>
            </div>
          </div>
        )}
        <div className="mt-auto border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Automatic checks</span>
            <div className="flex items-center gap-2">
              {workerStatusStale && <span className="text-[8px] text-warning">Status belum diperbarui</span>}
              <button type="button" onClick={() => void refreshStatus()} className="text-ink-faint hover:text-ink" aria-label="Refresh worker status" title="Refresh worker status">
                <RotateCw className="size-3" />
              </button>
            </div>
          </div>
          {workers.length === 0 ? (
            <p className="text-[9px] text-ink-faint">{workerStatusPending ? "Memuat status worker..." : "Status worker belum tersedia."}</p>
          ) : (
            <div className="space-y-2">
              {workers.filter((worker) => worker.worker !== "INTEGRITY_RETENTION").map((worker) => (
                <WorkerStatusRow key={worker.worker} worker={worker} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerStatusRow({ worker }: { worker: BackgroundWorkerStatus }) {
  const delayed = worker.enabled && worker.queuedItems > 0
    && (worker.worker === "PROOF_SCANNER" || worker.worker === "SOURCE_SWEEP")
    && (!worker.lastCheckAt || Date.now() - new Date(worker.lastCheckAt).getTime() > 5 * 60_000);
  const tone = !worker.enabled || !worker.healthy ? "danger" : delayed ? "warning" : "success";
  const state = !worker.enabled ? "disabled" : !worker.healthy ? "stale" : delayed ? "delayed" : "healthy";

  return <div className="flex items-start justify-between gap-2 text-[9px]">
    <div className="min-w-0">
      <div className="font-semibold text-ink">{workerLabel(worker.worker)}</div>
      <div className="text-ink-faint">
        {worker.lastCheckAt ? `${worker.worker === "RANGE_SCHEDULER" ? "Last enqueue" : "Last check"} ${formatWorkerTime(worker.lastCheckAt)}${worker.worker === "RANGE_SCHEDULER" ? "" : ` · ${formatNumber(worker.lastCheckedItems)} logs`}` : "Belum ada scan tercatat"}
        {worker.lastHeartbeatAt ? ` · heartbeat ${formatWorkerTime(worker.lastHeartbeatAt)}` : ""}
        {worker.queuedItems > 0 ? ` · ${formatNumber(worker.queuedItems)} queued` : ""}
        {delayed ? <span className="text-warning"> · target 5 menit terlewati</span> : null}
        {worker.scope ? <span className="block">Cakupan: {worker.scope}</span> : null}
      </div>
      {worker.lastError && <div className="mt-0.5 text-danger">{worker.lastError}</div>}
    </div>
    <Badge tone={tone}>{state}</Badge>
  </div>;
}

function integritySourceLabel(source: string | null) {
  switch (source) {
    case "TAMPER_SCANNER":
      return "Automatic tamper scanner";
    case "SOURCE_SWEEP":
      return "Automatic client source sweep";
    case "MANUAL_VERIFY_RANGE":
      return "Manual Verify Range";
    case "BACKGROUND_VERIFY_RUN":
      return "Background verification";
    case "SCHEDULED_VERIFY_RUN":
      return "Backend scheduler";
    case "MANUAL_SINGLE_LOG":
      return "Manual single-log check";
    case "RECOVERY":
      return "Recovery integrity check";
    default:
      return "No provenance recorded yet";
  }
}

function workerLabel(worker: string) {
  switch (worker) {
    case "PROOF_SCANNER": return "Gateway proof scanner";
    case "SOURCE_SWEEP": return "Client source sweep";
    case "RANGE_SCHEDULER": return "Range catch-up scheduler";
    case "RANGE_WORKER": return "Background range worker";
    default: return worker.replaceAll("_", " ").toLowerCase();
  }
}

function formatWorkerTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleTimeString();
}
