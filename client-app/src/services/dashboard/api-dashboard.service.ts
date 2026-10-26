import { apiClient } from "@/services/api/client";
import type { ClientWorkspace } from "@/types/auth";
import type {
  AuditAction,
  BackgroundWorkerStatus,
  DashboardOverview,
  IntegrityDimension,
  IntegrityHistory,
  TableInventoryItem,
  TableVerificationSummary,
  TrendPoint,
  TrendRange,
  VerificationRangeEstimate,
  VerificationRangeInput,
  VerificationRangeResult,
  VerificationRun,
  VerificationRunStatus,
} from "@/types/dashboard";

interface DashboardStatsData {
  client_id?: string;
  total_logs?: number;
  logs_today?: number;
  total_tables_audited?: number;
  total_anchored?: number;
  anchored_logs?: number;
  total_pending?: number;
  pending_logs?: number;
  anchor_percentage?: number;
  total_verifications?: number;
  total_rows_verified?: number;
  total_valid?: number;
  total_tampered?: number;
  total_verify_pending?: number;
  total_agent_error?: number;
  total_fabric_error?: number;
  integrity_score?: number | string | null;
  last_verified_at?: string | null;
  integrity_check?: {
    source?: string | null;
    checked_at?: string | null;
    run_id?: string | null;
    checked_logs?: number;
  };
  table_verify_results?: Record<string, Record<string, unknown>> | null;
  integrity_totals?: {
    total?: number;
    valid?: number;
    tampered?: number;
    pending?: number;
    unavailable?: number;
    not_checked?: number;
    checked_at?: string | null;
    checks_90d?: number;
  };
  trend?: {
    range?: TrendRange;
    points?: Array<{
      bucket_start?: string;
      total_logs?: number;
      valid?: number;
      tampered?: number;
      source_tampered?: number;
      pending?: number;
      unavailable?: number;
      not_checked?: number;
      insert?: number;
      update?: number;
      delete?: number;
    }>;
  };
}

interface BackendIntegrityHistory {
  range?: TrendRange;
  dimension?: IntegrityDimension;
  available_from?: string | null;
  generated_at?: string;
  points?: Array<{
    bucket_start?: string;
    checked?: number;
    valid?: number;
    tampered?: number;
    pending?: number;
    unavailable?: number;
    limited?: number;
    not_comparable?: number;
  }>;
}

interface BackendWorkerStatusResponse {
  workers?: Array<{
    worker?: string;
    enabled?: boolean;
    healthy?: boolean;
    last_heartbeat_at?: string | null;
    last_check_at?: string | null;
    last_checked_items?: number;
    queued_items?: number;
    scope?: string;
    last_error?: string;
  }>;
}

interface DashboardStatsResponse {
  total_logs?: number;
  anchored_logs?: number;
  pending_logs?: number;
  data?: DashboardStatsData;
}

interface BackendInventoryItem {
  table_name?: string;
  resource?: string;
  row_count?: number | string;
  last_action?: string;
  last_actor?: string;
  last_updated_at?: string | null;
}

interface BackendVerifyRangeEstimate {
  estimated_items?: number;
  sync_limit?: number;
  can_verify_sync?: boolean;
}

interface BackendVerifyRangeResponse {
  range?: {
    from?: string;
    to?: string;
  };
  summary?: {
    total?: number;
    valid?: number;
    invalid?: number;
    pending?: number;
    already_verified?: number;
    verified_now?: number;
  };
}

interface BackendVerificationRun {
  id?: string;
  client_id?: string;
  from?: string;
  to?: string;
  status?: string;
  batch_size?: number;
  total_items?: number;
  processed_items?: number;
  progress_percent?: number;
  total_valid?: number;
  total_invalid?: number;
  total_pending?: number;
  already_verified?: number;
  verified_now?: number;
  error_message?: string;
  requested_by?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendVerificationRunResponse {
  data?: BackendVerificationRun | null;
}

export class VerifyRangeLimitError extends Error {
  constructor(
    public readonly estimatedItems: number,
    public readonly syncLimit: number,
  ) {
    super(`Range terlalu besar untuk verifikasi sinkron. Persempit date range atau pilih rentang yang lebih kecil.`);
    this.name = "VerifyRangeLimitError";
  }
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapTableVerification(value: DashboardStatsData["table_verify_results"]): Record<string, TableVerificationSummary> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(Object.entries(value).flatMap(([name, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const invalid = asNumber(raw.invalid ?? raw.tampered ?? (asNumber(raw.tampered_onchain) + asNumber(raw.tampered_offchain)));
    const unavailable = asNumber(raw.agent_error) + asNumber(raw.fabric_error);
    const valid = asNumber(raw.valid);
    const pending = asNumber(raw.pending);
    const total = asNumber(raw.total) || valid + invalid + pending + unavailable;
    return [[name.toUpperCase(), { total, valid, invalid, pending, unavailable }]];
  }));
}

function formatDateTime(value: unknown) {
  if (!value) return "Not verified";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatActivityTime(value: unknown) {
  if (!value) return "Unknown time";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatTrendLabel(value: string, range: TrendRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = range === "7D" || range === "30D"
    ? { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }
    : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function rangeQuery(range: VerificationRangeInput) {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return params.toString();
}

function normalizeAction(value: unknown): AuditAction {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "INSERT":
      return "INSERT";
    case "UPDATE":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "OTHER";
  }
}

function normalizeVerificationRunStatus(value: unknown): VerificationRunStatus {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "QUEUED":
      return "QUEUED";
    case "RUNNING":
      return "RUNNING";
    case "FAILED":
      return "FAILED";
    case "COMPLETED":
    default:
      return "COMPLETED";
  }
}

function mapVerificationRun(value: BackendVerificationRun): VerificationRun {
  return {
    id: value.id || "",
    clientId: value.client_id || "",
    from: value.from || "",
    to: value.to || "",
    status: normalizeVerificationRunStatus(value.status),
    batchSize: asNumber(value.batch_size),
    totalItems: asNumber(value.total_items),
    processedItems: asNumber(value.processed_items),
    progressPercent: asNumber(value.progress_percent),
    totalValid: asNumber(value.total_valid),
    totalInvalid: asNumber(value.total_invalid),
    totalPending: asNumber(value.total_pending),
    alreadyVerified: asNumber(value.already_verified),
    verifiedNow: asNumber(value.verified_now),
    errorMessage: value.error_message,
    requestedBy: value.requested_by,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    createdAt: value.created_at || "",
    updatedAt: value.updated_at || "",
  };
}

export class ApiDashboardService {
  async getOverview(
    token?: string,
    workspace?: Pick<ClientWorkspace, "name" | "organization">,
  ): Promise<DashboardOverview> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.get<DashboardStatsResponse>("/dashboard/stats", token);
    const data = response.data;
    if (!data) throw new Error("Response statistik dashboard tidak memiliki data.");

    const totalLogs = asNumber(data.total_logs ?? response.total_logs);
    const anchoredLogs = asNumber(data.anchored_logs ?? data.total_anchored ?? response.anchored_logs);
    const pendingLogs = asNumber(data.pending_logs ?? data.total_pending ?? response.pending_logs);
    const valid = asNumber(data.integrity_totals?.valid ?? data.total_valid);
    const tampered = asNumber(data.integrity_totals?.tampered ?? data.total_tampered);
    const totalVerifications = asNumber(data.integrity_totals?.checks_90d ?? data.total_verifications);
    const verificationPending = asNumber(data.integrity_totals?.pending ?? data.total_verify_pending);
    const verificationUnavailable = asNumber(data.integrity_totals?.unavailable ?? (asNumber(data.total_agent_error) + asNumber(data.total_fabric_error)));
    const verificationDenominator = valid + tampered + verificationPending + verificationUnavailable;

    return {
      tenant: workspace?.name || data.client_id || "Client workspace",
      organization: workspace?.organization || "Your organization",
      totalLogs,
      anchoredLogs,
      pendingLogs,
      anchorPercentage: asNumber(data.anchor_percentage),
      integrityScore: verificationDenominator > 0 ? (valid / verificationDenominator) * 100 : null,
      totalVerifications,
      totalVerificationsIsLegacy: data.integrity_totals?.checks_90d === undefined,
      valid,
      validPercentage: verificationDenominator > 0 ? (valid / verificationDenominator) * 100 : 0,
      tampered,
      tamperedPercentage: verificationDenominator > 0 ? (tampered / verificationDenominator) * 100 : 0,
      logsToday: asNumber(data.logs_today),
      monitoredTables: asOptionalNumber(data.total_tables_audited),
      lastScan: formatDateTime(data.integrity_totals?.checked_at || data.last_verified_at),
      verificationPending,
      verificationUnavailable,
      rowsVerified: asNumber(data.total_rows_verified),
      tableVerification: mapTableVerification(data.table_verify_results),
      latestIntegrityCheck: {
        source: data.integrity_check?.source?.trim() || null,
        checkedAt: data.integrity_check?.checked_at ? formatDateTime(data.integrity_check.checked_at) : null,
        checkedLogs: asNumber(data.integrity_check?.checked_logs),
        runId: data.integrity_check?.run_id || undefined,
      },
      currentIntegrity: {
        total: asNumber(data.integrity_totals?.total ?? totalLogs),
        valid,
        tampered,
        pending: verificationPending,
        unavailable: verificationUnavailable,
        notChecked: asNumber(data.integrity_totals?.not_checked),
        checkedAt: data.integrity_totals?.checked_at || null,
      },
    };
  }

  async getIntegrityTrend(range: TrendRange, token?: string): Promise<TrendPoint[]> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const params = new URLSearchParams({ trend_range: range });
    const response = await apiClient.get<DashboardStatsResponse>(`/dashboard/stats?${params.toString()}`, token);
    const points = response.data?.trend?.points ?? [];
    return points.map((point) => ({
      label: formatTrendLabel(point.bucket_start || "", range),
      totalLogs: asNumber(point.total_logs),
      valid: asNumber(point.valid),
      tampered: asNumber(point.tampered),
      sourceTampered: asNumber(point.source_tampered),
      pending: asNumber(point.pending),
      unavailable: asNumber(point.unavailable),
      notChecked: asNumber(point.not_checked),
      insert: asNumber(point.insert),
      update: asNumber(point.update),
      delete: asNumber(point.delete),
    }));
  }

  async getIntegrityHistory(range: TrendRange, dimension: IntegrityDimension, token?: string): Promise<IntegrityHistory> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const params = new URLSearchParams({ range, dimension });
    const response = await apiClient.get<BackendIntegrityHistory>(`/dashboard/integrity-history?${params.toString()}`, token);
    return {
      range: response.range || range,
      dimension: response.dimension || dimension,
      availableFrom: response.available_from || null,
      generatedAt: response.generated_at || new Date().toISOString(),
      points: (response.points || []).map((point) => ({
        label: formatTrendLabel(point.bucket_start || "", range),
        checked: asNumber(point.checked),
        valid: asNumber(point.valid),
        tampered: asNumber(point.tampered),
        pending: asNumber(point.pending),
        unavailable: asNumber(point.unavailable),
        limited: asNumber(point.limited),
        notComparable: asNumber(point.not_comparable),
      })),
    };
  }

  async getWorkerStatus(token?: string): Promise<BackgroundWorkerStatus[]> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<BackendWorkerStatusResponse>("/dashboard/worker-status", token);
    return (response.workers || []).map((worker) => ({
      worker: worker.worker || "UNKNOWN",
      enabled: worker.enabled === true,
      healthy: worker.healthy === true,
      lastHeartbeatAt: worker.last_heartbeat_at || null,
      lastCheckAt: worker.last_check_at || null,
      lastCheckedItems: asNumber(worker.last_checked_items),
      queuedItems: asNumber(worker.queued_items),
      scope: worker.scope || "",
      lastError: worker.last_error,
    }));
  }

  async getInventory(token?: string): Promise<TableInventoryItem[]> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.get<BackendInventoryItem[]>("/dashboard/inventory", token);
    if (!Array.isArray(response)) return [];

    return response
      .map((row) => ({
        table: row.table_name || row.resource || "Unknown table",
        rows: asNumber(row.row_count),
        lastAction: normalizeAction(row.last_action),
        lastActor: row.last_actor || "System",
        updatedAt: formatActivityTime(row.last_updated_at),
      }))
      .filter((item) => item.table !== "Unknown table");
  }

  async getLatestVerificationRun(token?: string): Promise<VerificationRun | null> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.get<BackendVerificationRunResponse>("/dashboard/verification-runs/latest", token);
    return response.data ? mapVerificationRun(response.data) : null;
  }

  async estimateVerifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeEstimate> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.get<BackendVerifyRangeEstimate>(
      `/dashboard/verify-range/estimate?${rangeQuery(range)}`,
      token,
    );

    return {
      estimatedItems: asNumber(response.estimated_items),
      syncLimit: asNumber(response.sync_limit) || 100,
      canVerifySync: response.can_verify_sync === true,
    };
  }

  async verifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeResult> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const estimate = await this.estimateVerifyRange(token, range);
    if (!estimate.canVerifySync) {
      throw new VerifyRangeLimitError(estimate.estimatedItems, estimate.syncLimit);
    }

    const response = await apiClient.get<BackendVerifyRangeResponse>(
      `/dashboard/verify-range/client?${rangeQuery(range)}`,
      token,
    );
    const summary = response.summary ?? {};

    return {
      range: {
        from: response.range?.from || range.from,
        to: response.range?.to || range.to,
      },
      summary: {
        total: asNumber(summary.total),
        valid: asNumber(summary.valid),
        invalid: asNumber(summary.invalid),
        pending: asNumber(summary.pending),
        alreadyVerified: asNumber(summary.already_verified),
        verifiedNow: asNumber(summary.verified_now),
      },
    };
  }

  async startVerificationRun(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRun> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.post<BackendVerificationRunResponse>("/dashboard/verification-runs", range, token);
    if (!response.data?.id) throw new Error("Gateway tidak mengembalikan ID verifikasi.");
    return mapVerificationRun(response.data);
  }
}

export const apiDashboardService = new ApiDashboardService();
