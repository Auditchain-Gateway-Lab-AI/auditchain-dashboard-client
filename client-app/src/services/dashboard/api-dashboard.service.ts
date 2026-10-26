import { apiClient, agentClient } from "@/services/api/client";
import type { ClientWorkspace } from "@/types/auth";
import type {
  AuditAction,
  DashboardOverview,
  ExternalAuditStatsResponse,
  TableInventoryItem,
  TableVerificationSummary,
  TrendPoint,
  TrendRange,
  VerificationRangeEstimate,
  VerificationRangeInput,
  VerificationRangeResult,
  VerificationRun,
  VerificationRunStatus,
  AgentAuditRunReport,
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
  external_audit?: {
    total_audited?: number;
    total_valid?: number;
    total_tampered?: number;
    total_pending?: number;
    integrity_score?: number | string | null;
    last_audited_at?: string | null;
    table_verify_results?: Record<string, Record<string, unknown>> | null;
  };
  external_total_audited?: number;
  external_total_valid?: number;
  external_total_tampered?: number;
  external_total_pending?: number;
  external_integrity_score?: number | string | null;
  external_last_audited_at?: string | null;
  external_table_results?: Record<string, Record<string, unknown>> | null;
  open_tamper_incidents?: number;
  total_recoveries?: number;
  trend?: {
    range?: TrendRange;
    points?: Array<{
      bucket_start?: string;
      total_logs?: number;
      valid?: number;
      tampered?: number;
      pending?: number;
      unavailable?: number;
      not_checked?: number;
      insert?: number;
      update?: number;
      delete?: number;
    }>;
  };
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
    ? { day: "2-digit", month: "short" }
    : { hour: "2-digit", minute: "2-digit", hour12: false };
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

    // Prioritaskan metrik Audit External (Client Database vs Offchain Logs & Blockchain)
    const valid = asNumber(data.external_total_valid ?? data.external_audit?.total_valid ?? data.total_valid);
    const tampered = asNumber(data.external_total_tampered ?? data.external_audit?.total_tampered ?? data.total_tampered);
    const totalVerifications = asNumber(
      data.external_total_audited ?? data.external_audit?.total_audited ?? data.total_verifications ?? (valid + tampered),
    );
    const verificationDenominator = totalVerifications || valid + tampered;

    const rawIntegrityScore = data.external_integrity_score ?? data.external_audit?.integrity_score ?? data.integrity_score;
    const integrityScore = verificationDenominator > 0 || (rawIntegrityScore !== undefined && rawIntegrityScore !== null)
      ? asOptionalNumber(rawIntegrityScore)
      : null;

    const lastScan = formatDateTime(
      data.external_last_audited_at ?? data.external_audit?.last_audited_at ?? data.last_verified_at,
    );

    const tableResults = data.external_table_results ?? data.external_audit?.table_verify_results ?? data.table_verify_results;

    const verificationPending = asNumber(
      data.external_total_pending ?? data.external_audit?.total_pending ?? data.total_verify_pending,
    );

    return {
      tenant: workspace?.name || data.client_id || "Client workspace",
      organization: workspace?.organization || "Your organization",
      totalLogs,
      anchoredLogs,
      pendingLogs,
      anchorPercentage: asNumber(data.anchor_percentage),
      integrityScore,
      totalVerifications,
      valid,
      validPercentage: verificationDenominator > 0 ? (valid / verificationDenominator) * 100 : 0,
      tampered,
      tamperedPercentage: verificationDenominator > 0 ? (tampered / verificationDenominator) * 100 : 0,
      logsToday: asNumber(data.logs_today),
      monitoredTables: asOptionalNumber(data.total_tables_audited),
      lastScan,
      verificationPending,
      verificationUnavailable: asNumber(data.total_agent_error) + asNumber(data.total_fabric_error),
      rowsVerified: asNumber(data.total_rows_verified ?? totalVerifications),
      tableVerification: mapTableVerification(tableResults),
      latestIntegrityCheck: {
        source: data.integrity_check?.source?.trim() || null,
        checkedAt: data.integrity_check?.checked_at ? formatDateTime(data.integrity_check.checked_at) : null,
        checkedLogs: asNumber(data.integrity_check?.checked_logs),
        runId: data.integrity_check?.run_id || undefined,
      },
      openTamperIncidents: asOptionalNumber(data.open_tamper_incidents),
      totalRecoveries: asOptionalNumber(data.total_recoveries),
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
      pending: asNumber(point.pending),
      unavailable: asNumber(point.unavailable),
      notChecked: asNumber(point.not_checked),
      insert: asNumber(point.insert),
      update: asNumber(point.update),
      delete: asNumber(point.delete),
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

    const response = await apiClient.get<BackendVerificationRunResponse>(
      "/dashboard/verification-runs/latest?run_type=EXTERNAL",
      token,
    );
    return response.data ? mapVerificationRun(response.data) : null;
  }

  async getExternalStats(token?: string): Promise<ExternalAuditStatsResponse | null> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.get<{ message?: string; data?: ExternalAuditStatsResponse }>(
      "/dashboard/stats/external",
      token,
    );
    return response.data ?? null;
  }

  async createVerificationRun(
    token: string | undefined,
    range: VerificationRangeInput,
    batchSize = 100,
  ): Promise<VerificationRun> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const response = await apiClient.post<{ message?: string; data: BackendVerificationRun }>(
      "/dashboard/verification-runs",
      {
        from: range.from,
        to: range.to,
        batch_size: batchSize,
      },
      token,
    );

    return mapVerificationRun(response.data);
  }

  async runAgentAudit(
    token: string | undefined,
    range: VerificationRangeInput,
  ): Promise<AgentAuditRunReport> {
    if (!token) throw new Error("Session client tidak tersedia.");

    // 1. Panggil langsung Pintu 2: auditchain-agent (POST /audit/run)
    const report = await agentClient.post<AgentAuditRunReport>(
      "/audit/run",
      {
        from: range.from,
        to: range.to,
        auto_recover: false,
      },
      token,
    );

    // 2. Pastikan hasil audit langsung tersimpan di Pintu 1: Gateway (/api/agent/audit-report)
    // agar tabel insiden (client_data_tamper_records) dan statistik dashboard segera ter-update
    try {
      await apiClient.post("/agent/audit-report", report, token);
    } catch (submitErr) {
      console.warn("Gagal submit audit report ke Gateway:", submitErr);
    }

    return report;
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
}

export const apiDashboardService = new ApiDashboardService();
