import type {
	AuditIssue,
  BackgroundWorkerStatus,
  DashboardOverview,
  IntegrityDimension,
  IntegrityHistory,
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
  getIntegrityHistory(range: TrendRange, dimension: IntegrityDimension, token?: string): Promise<IntegrityHistory>;
  getWorkerStatus(token?: string): Promise<BackgroundWorkerStatus[]>;
  getTables(): Promise<WatchlistItem[]>;
  getInventory(token?: string): Promise<TableInventoryItem[]>;
  estimateVerifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeEstimate>;
  verifyRange(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRangeResult>;
	startVerificationRun(token: string | undefined, range: VerificationRangeInput): Promise<VerificationRun>;
  getLatestVerificationRun(token?: string): Promise<VerificationRun | null>;
  getLatestScan(): Promise<LatestAuditScan>;
  getTableInsights(): Promise<TableInsightsData>;
	getIssues(): Promise<AuditIssue[]>;
}
