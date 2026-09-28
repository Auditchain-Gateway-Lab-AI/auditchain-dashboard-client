export type TrendRange = "8H" | "24H" | "7D" | "30D";
export type TrendTab = "INTEGRITY" | "ACTIVITY";
export type ActivityLevel = "VERY HIGH" | "HIGH" | "NORMAL" | "LOW" | "IDLE";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
export type AuditStatus = "VALID" | "TAMPERED" | "PENDING" | "UNAVAILABLE";

export interface DashboardOverview {
  tenant: string;
  organization: string;
  totalLogs: number;
  valid: number;
  validPercentage: number;
  tampered: number;
  tamperedPercentage: number;
  logsToday: number;
  monitoredTables: number;
  lastScan: string;
}

export interface WatchlistItem {
  table: string;
  logs: number;
  integrity: number;
  issues: number;
  level: ActivityLevel;
  checked: string;
}

export interface TrendPoint {
  label: string;
  valid: number;
  tampered: number;
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

export interface AuditActivity {
  id: string;
  time: string;
  table: string;
  action: AuditAction;
  record: string;
  actor: string;
  status: "VALID" | "TAMPERED";
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
