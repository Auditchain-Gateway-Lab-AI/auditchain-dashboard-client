import { apiClient } from "@/services/api/client";
import type { ClientWorkspace } from "@/types/auth";
import type {
  AuditAction,
  AuditActivity,
  AuditStatus,
  DashboardOverview,
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
  metadata?: unknown;
  integrity_status?: string;
}

interface RecentLogsResponse {
  data?: BackendAuditLog[];
  pagination?: {
    total_items?: number;
  };
}

const TREND_SAMPLE_LIMIT = 100;
const TREND_EXACT_LIMIT = 2_000;
const TREND_PAGE_SIZE = 200;

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

function getTrendWindow(range: TrendRange) {
  const durations: Record<TrendRange, { durationMs: number; buckets: number }> = {
    "8H": { durationMs: 8 * 60 * 60 * 1000, buckets: 8 },
    "24H": { durationMs: 24 * 60 * 60 * 1000, buckets: 12 },
    "7D": { durationMs: 7 * 24 * 60 * 60 * 1000, buckets: 7 },
    "30D": { durationMs: 30 * 24 * 60 * 60 * 1000, buckets: 10 },
  };
  const now = new Date();
  const config = durations[range];
  return {
    from: new Date(now.getTime() - config.durationMs),
    to: now,
    buckets: config.buckets,
    bucketMs: config.durationMs / config.buckets,
  };
}

function formatTrendLabel(value: Date, range: TrendRange) {
  const options: Intl.DateTimeFormatOptions = range === "7D" || range === "30D"
    ? { day: "2-digit", month: "short" }
    : { hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat("en-GB", options).format(value);
}

function buildIntegrityTrend(
  rows: BackendAuditLog[],
  range: TrendRange,
  totalItems: number,
  window = getTrendWindow(range),
): Array<{
  label: string;
  valid: number;
  tampered: number;
  insert: number;
  update: number;
  delete: number;
  sampleSize: number;
  totalItems: number;
}> {
  if (rows.length === 0) return [];

  const points = Array.from({ length: window.buckets }, (_, index) => ({
    label: formatTrendLabel(
      index === window.buckets - 1
        ? window.to
        : new Date(window.from.getTime() + (index + 1) * window.bucketMs),
      range,
    ),
    valid: 0,
    tampered: 0,
    insert: 0,
    update: 0,
    delete: 0,
    sampleSize: rows.length,
    totalItems,
  }));

  for (const row of rows) {
    const timestamp = new Date(String(row.timestamp ?? "")).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const index = Math.min(
      window.buckets - 1,
      Math.max(0, Math.floor((timestamp - window.from.getTime()) / window.bucketMs)),
    );
    const point = points[index];
    if (!point) continue;
    const status = String(row.integrity_status ?? "").trim().toLowerCase();
    const action = normalizeAction(row.action).toLowerCase();

    if (status === "valid") point.valid += 1;
    if (status === "tampered") point.tampered += 1;
    switch (action) {
      case "insert":
        point.insert += 1;
        break;
      case "update":
        point.update += 1;
        break;
      case "delete":
        point.delete += 1;
        break;
      default:
        break;
    }
  }

  return points;
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

  async getIntegrityTrend(range: TrendRange, token?: string): Promise<TrendPoint[]> {
    if (!token) throw new Error("Session client tidak tersedia.");

    const window = getTrendWindow(range);
    const bucketResponses = await Promise.all(
      Array.from({ length: window.buckets }, (_, index) => {
        const from = new Date(window.from.getTime() + index * window.bucketMs);
        const to = index === window.buckets - 1
          ? window.to
          : new Date(window.from.getTime() + (index + 1) * window.bucketMs);
        const params = new URLSearchParams({
          page: "1",
          page_size: String(TREND_PAGE_SIZE),
          sort_order: "desc",
          from: from.toISOString(),
          to: to.toISOString(),
        });
        return apiClient.get<RecentLogsResponse>(`/dashboard/logs?${params.toString()}`, token);
      }),
    );

    const totalItems = bucketResponses.reduce(
      (total, response) => total + asNumber(response.pagination?.total_items),
      0,
    );
    const exactRows = totalItems <= TREND_EXACT_LIMIT
      ? await Promise.all(bucketResponses.map(async (response, index) => {
        const bucketTotal = asNumber(response.pagination?.total_items);
        const pageCount = Math.ceil(bucketTotal / TREND_PAGE_SIZE);
        if (pageCount <= 1) return response.data ?? [];

        const from = new Date(window.from.getTime() + index * window.bucketMs);
        const to = index === window.buckets - 1
          ? window.to
          : new Date(window.from.getTime() + (index + 1) * window.bucketMs);
        const pages = await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, pageIndex) => {
            const params = new URLSearchParams({
              page: String(pageIndex + 2),
              page_size: String(TREND_PAGE_SIZE),
              sort_order: "desc",
              from: from.toISOString(),
              to: to.toISOString(),
            });
            return apiClient.get<RecentLogsResponse>(`/dashboard/logs?${params.toString()}`, token);
          }),
        );
        return [...(response.data ?? []), ...pages.flatMap((page) => page.data ?? [])];
      }))
      : null;

    const rowsById = new Map<string, BackendAuditLog>();
    if (exactRows) {
      for (const rows of exactRows) {
        for (const row of rows) {
          const key = row.log_id || [row.timestamp, row.resource, row.source_record_id, row.action, row.actor].join("|");
          if (!rowsById.has(key)) rowsById.set(key, row);
        }
      }
    } else {
      const baseSamplePerBucket = Math.floor(TREND_SAMPLE_LIMIT / window.buckets);
      const extraSampleBuckets = TREND_SAMPLE_LIMIT % window.buckets;
      for (const [index, response] of bucketResponses.entries()) {
        const sampleLimit = baseSamplePerBucket + (index < extraSampleBuckets ? 1 : 0);
        const rows = response.data ?? [];
        const sample = rows.length <= sampleLimit
          ? rows
          : Array.from({ length: sampleLimit }, (_, sampleIndex) => {
            const rowIndex = Math.round(sampleIndex * (rows.length - 1) / (sampleLimit - 1));
            return rows[rowIndex];
          });
        for (const row of sample) {
          const key = row.log_id || [row.timestamp, row.resource, row.source_record_id, row.action, row.actor].join("|");
          if (!rowsById.has(key)) rowsById.set(key, row);
        }
      }
    }

    const resolvedTotalItems = exactRows ? rowsById.size : totalItems;
    return buildIntegrityTrend([...rowsById.values()], range, resolvedTotalItems, window);
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
      metadata: row.metadata,
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
}

export const apiDashboardService = new ApiDashboardService();
