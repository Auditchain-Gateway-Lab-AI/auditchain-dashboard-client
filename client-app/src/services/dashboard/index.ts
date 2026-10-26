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
  getIntegrityHistory: (range, dimension, token) => dashboardMockEnabled
    ? mockDashboardService.getIntegrityHistory(range, dimension, token)
    : apiDashboardService.getIntegrityHistory(range, dimension, token),
  getWorkerStatus: (token) => dashboardMockEnabled
    ? mockDashboardService.getWorkerStatus(token)
    : apiDashboardService.getWorkerStatus(token),
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
  startVerificationRun: (token, range) => dashboardMockEnabled
    ? mockDashboardService.startVerificationRun(token, range)
    : apiDashboardService.startVerificationRun(token, range),
  getLatestVerificationRun: (token) => dashboardMockEnabled
    ? mockDashboardService.getLatestVerificationRun(token)
    : apiDashboardService.getLatestVerificationRun(token),
  getLatestScan: () => mockDashboardService.getLatestScan(),
  getTableInsights: () => mockDashboardService.getTableInsights(),
  getIssues: () => mockDashboardService.getIssues(),
};
