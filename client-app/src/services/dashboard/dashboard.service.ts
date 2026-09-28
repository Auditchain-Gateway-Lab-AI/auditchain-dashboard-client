import type {
  AuditActivity,
  AuditIssue,
  DashboardOverview,
  LatestAuditScan,
  TableInsightsData,
  TrendPoint,
  TrendRange,
  WatchlistItem,
} from "@/types/dashboard";

export interface DashboardService {
  getOverview(): Promise<DashboardOverview>;
  getIntegrityTrend(range: TrendRange): Promise<TrendPoint[]>;
  getTables(): Promise<WatchlistItem[]>;
  getLatestScan(): Promise<LatestAuditScan>;
  getTableInsights(): Promise<TableInsightsData>;
  getRecentActivity(limit?: number): Promise<AuditActivity[]>;
  getIssues(): Promise<AuditIssue[]>;
}
