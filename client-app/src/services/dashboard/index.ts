import type { DashboardService } from "@/services/dashboard/dashboard.service";
import { apiDashboardService } from "@/services/dashboard/api-dashboard.service";
import { mockDashboardService } from "@/services/dashboard/mock-dashboard.service";

export const dashboardMockEnabled = import.meta.env.VITE_USE_MOCK_DASHBOARD === "true";

export const dashboardService: DashboardService = {
  getOverview: (token, workspace) => dashboardMockEnabled
    ? mockDashboardService.getOverview(token, workspace)
    : apiDashboardService.getOverview(token, workspace),
  getIntegrityTrend: (range, token) => dashboardMockEnabled
    ? mockDashboardService.getIntegrityTrend(range, token)
    : apiDashboardService.getIntegrityTrend(range, token),
  getTables: () => mockDashboardService.getTables(),
  getInventory: (token) => dashboardMockEnabled
    ? mockDashboardService.getInventory(token)
    : apiDashboardService.getInventory(token),
  estimateVerifyRange: (token, range) => dashboardMockEnabled
    ? mockDashboardService.estimateVerifyRange(token, range)
    : apiDashboardService.estimateVerifyRange(token, range),
  verifyRange: (token, range) => dashboardMockEnabled
    ? mockDashboardService.verifyRange(token, range)
    : apiDashboardService.verifyRange(token, range),
  getLatestVerificationRun: (token) => dashboardMockEnabled
    ? mockDashboardService.getLatestVerificationRun(token)
    : apiDashboardService.getLatestVerificationRun(token),
  getLatestScan: () => mockDashboardService.getLatestScan(),
  getTableInsights: () => mockDashboardService.getTableInsights(),
  getIssues: () => mockDashboardService.getIssues(),
};
