import type {
  AuditActivity,
  AuditIssue,
  DashboardOverview,
  LatestAuditScan,
  TableInsightsData,
  TableInventoryItem,
  TrendPoint,
  TrendRange,
  VerificationRangeEstimate,
  VerificationRangeInput,
  VerificationRangeResult,
  VerificationRun,
  WatchlistItem,
} from "@/types/dashboard";
import type { ClientWorkspace } from "@/types/auth";

export interface DashboardService {
  getOverview(token?: string, workspace?: Pick<ClientWorkspace, "name" | "organization">): Promise<DashboardOverview>;
  getIntegrityTrend(range: TrendRange, token?: string): Promise<TrendPoint[]>;
  getTables(): Promise<WatchlistItem[]>;
  getInventory(token?: string): Promise<TableInventoryItem[]>;
  estimateVerifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeEstimate>;
  verifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeResult>;
  getLatestVerificationRun(token?: string): Promise<VerificationRun | null>;
  getLatestScan(): Promise<LatestAuditScan>;
  getTableInsights(): Promise<TableInsightsData>;
  getRecentActivity(token?: string, limit?: number): Promise<AuditActivity[]>;
  getIssues(): Promise<AuditIssue[]>;
}
