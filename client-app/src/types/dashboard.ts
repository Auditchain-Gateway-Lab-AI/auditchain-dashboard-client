export type TrendRange = "8H" | "24H" | "7D" | "30D";
export type TrendTab = "INTEGRITY" | "ACTIVITY";
export type ActivityLevel = "VERY HIGH" | "HIGH" | "NORMAL" | "LOW" | "IDLE";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "OTHER";

export interface DashboardOverview {
  tenant: string;
  organization: string;
  totalLogs: number;
  anchoredLogs: number;
  pendingLogs: number;
  anchorPercentage: number;
  integrityScore: number | null;
  totalVerifications: number;
  valid: number;
  validPercentage: number;
  tampered: number;
  tamperedPercentage: number;
  logsToday: number;
  monitoredTables: number | null;
  lastScan: string;
  verificationPending?: number;
  verificationUnavailable?: number;
  rowsVerified?: number;
  tableVerification?: Record<string, TableVerificationSummary>;
  latestIntegrityCheck?: IntegrityCheckSummary;
  openTamperIncidents?: number | null;
  totalRecoveries?: number | null;
}

export interface IntegrityCheckSummary {
  source: string | null;
  checkedAt: string | null;
  checkedLogs: number;
  runId?: string;
}

export interface TableVerificationSummary {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
  unavailable: number;
}

export interface WatchlistItem {
  table: string;
  logs: number;
  integrity: number;
  issues: number;
  level: ActivityLevel;
  checked: string;
}

export interface TableInventoryItem {
  table: string;
  rows: number;
  lastAction: AuditAction;
  lastActor: string;
  updatedAt: string;
}

export interface VerificationRangeInput {
  from: string;
  to: string;
}

export interface VerificationRangeEstimate {
  estimatedItems: number;
  syncLimit: number;
  canVerifySync: boolean;
}

export interface VerificationRangeSummary {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
  alreadyVerified?: number;
  verifiedNow?: number;
}

export interface VerificationRangeResult {
  range: VerificationRangeInput;
  summary: VerificationRangeSummary;
}

export type VerificationRunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface VerificationRun {
  id: string;
  clientId: string;
  from: string;
  to: string;
  status: VerificationRunStatus;
  batchSize: number;
  totalItems: number;
  processedItems: number;
  progressPercent: number;
  totalValid: number;
  totalInvalid: number;
  totalPending: number;
  alreadyVerified: number;
  verifiedNow: number;
  errorMessage?: string;
  requestedBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrendPoint {
  label: string;
  totalLogs: number;
  valid: number;
  tampered: number;
  pending: number;
  unavailable: number;
  notChecked: number;
  insert: number;
  update: number;
  delete: number;
}

export interface LatestAuditScan {
  lastVerified: string;
  nextScan: string;
  logsChecked: number;
  valid: number;
  needsAttention: number;
  pending: number;
  unavailable: number;
  schedule: string;
  description: string;
}

export interface InsightRow {
  table: string;
  value: number;
}

export interface TableInsightsData {
  mostActive: InsightRow[];
  mostTampered: InsightRow[];
  mostDeletes: InsightRow[];
}

export interface AuditIssue {
  id: string;
  table: string;
  record: string;
  status: "TAMPERED" | "UNAVAILABLE";
  description: string;
  detectedAt: string;
  actor: string;
}

export interface ExternalAuditStatsResponse {
  id?: number;
  client_id?: string;
  total_audited: number;
  total_valid: number;
  total_tampered: number;
  total_pending: number;
  integrity_score: number;
  last_audited_at: string | null;
  total_recoveries: number;
  total_tamper_incidents: number;
  open_tamper_incidents: number;
  table_verify_results?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgentAuditRunReport {
  run_id?: string;
  from?: string;
  to?: string;
  total_logs?: number;
  audited_logs?: number;
  historical_skipped?: number;
  data_valid?: number;
  data_tampered?: number;
  data_not_found?: number;
  data_error?: number;
  blockchain_valid?: number;
  blockchain_tampered?: number;
  blockchain_pending?: number;
  blockchain_skipped?: number;
  blockchain_error?: number;
  auto_recovered_count?: number;
  duration?: string;
}
