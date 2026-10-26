import type {
	AuditIssue,
  DashboardOverview,
  ExternalAuditStatsResponse,
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
  AgentAuditRunReport,
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
	getIssues(): Promise<AuditIssue[]>;
  getExternalStats?(token?: string): Promise<ExternalAuditStatsResponse | null>;
  createVerificationRun?(token: string | undefined, range: VerificationRangeInput, batchSize?: number): Promise<VerificationRun>;
  runAgentAudit?(token: string | undefined, range: VerificationRangeInput): Promise<AgentAuditRunReport>;
}
