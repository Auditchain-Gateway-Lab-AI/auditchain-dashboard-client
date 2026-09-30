import { apiClient } from "@/services/api/client";
import type { ClientWorkspace } from "@/types/auth";
import type {
  AuditAction,
  AuditActivity,
  AuditStatus,
  DashboardOverview,
  TableInventoryItem,
  TableVerificationSummary,
  VerificationRangeEstimate,
  VerificationRangeInput,
  VerificationRangeResult,
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
  table_verify_results?: Record<string, Record<string, unknown>> | null;
}

interface DashboardStatsResponse {
  total_logs?: number;
  anchored_logs?: number;
  pending_logs?: number;
  data?: DashboardStatsData;
}

interface BackendAuditLog {
  log_id?: string;
  resource?: string;
  action?: string;
  actor?: string;
  timestamp?: string;
  source_record_id?: string;
  integrity_status?: string;
}

interface RecentLogsResponse {
  data?: BackendAuditLog[];
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

function normalizeStatus(value: unknown): AuditStatus {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "valid":
      return "VALID";
    case "tampered":
      return "TAMPERED";
    case "unreachable":
      return "UNAVAILABLE";
    case "pending":
      return "PENDING";
    case "not_checked":
    default:
      return "NOT_CHECKED";
  }
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
    const valid = asNumber(data.total_valid);
    const tampered = asNumber(data.total_tampered);
    const totalVerifications = asNumber(data.total_verifications);
    const verificationDenominator = totalVerifications || valid + tampered;

    return {
      tenant: workspace?.name || data.client_id || "Client workspace",
      organization: workspace?.organization || "Your organization",
      totalLogs,
      anchoredLogs,
      pendingLogs,
      anchorPercentage: asNumber(data.anchor_percentage),
      integrityScore: verificationDenominator > 0 ? asOptionalNumber(data.integrity_score) : null,
      totalVerifications,
      valid,
      validPercentage: verificationDenominator > 0 ? (valid / verificationDenominator) * 100 : 0,
      tampered,
      tamperedPercentage: verificationDenominator > 0 ? (tampered / verificationDenominator) * 100 : 0,
      logsToday: asNumber(data.logs_today),
      monitoredTables: asOptionalNumber(data.total_tables_audited),
      lastScan: formatDateTime(data.last_verified_at),
      verificationPending: asNumber(data.total_verify_pending),
      verificationUnavailable: asNumber(data.total_agent_error) + asNumber(data.total_fabric_error),
      rowsVerified: asNumber(data.total_rows_verified),
      tableVerification: mapTableVerification(data.table_verify_results),
    };
  }

  async getRecentActivity(token?: string, limit = 10): Promise<AuditActivity[]> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const safeLimit = Math.max(1, Math.min(limit, 100));
    const params = new URLSearchParams({ page: "1", page_size: String(safeLimit), sort_order: "desc" });
    const response = await apiClient.get<RecentLogsResponse>(`/dashboard/logs?${params.toString()}`, token);
    const rows = Array.isArray(response.data) ? response.data : [];

    return rows.slice(0, safeLimit).map((row) => ({
      id: row.log_id || `${row.resource || "resource"}-${row.timestamp || "event"}`,
      time: formatActivityTime(row.timestamp),
      table: row.resource || "Unknown resource",
      action: normalizeAction(row.action),
      record: row.source_record_id || row.log_id || "Unknown record",
      actor: row.actor || "System",
      status: normalizeStatus(row.integrity_status),
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
