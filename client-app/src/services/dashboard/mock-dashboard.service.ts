import {
  buildTrendMock,
  dashboardOverviewMock,
  issuesMock,
  latestAuditScanMock,
  recentActivityMock,
  tableInsightsMock,
  watchlistMock,
} from "@/mocks/dashboard.mock";
import type { DashboardService } from "@/services/dashboard/dashboard.service";
import type { TrendRange } from "@/types/dashboard";

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration));

async function respond<T>(data: T, duration?: number): Promise<T> {
  await wait(duration);
  return structuredClone(data);
}

export class MockDashboardService implements DashboardService {
  getOverview() {
    return respond(dashboardOverviewMock, 260);
  }

  getIntegrityTrend(range: TrendRange) {
    return respond(buildTrendMock(range), 320);
  }

  getTables() {
    return respond(watchlistMock, 300);
  }

  getLatestScan() {
    return respond(latestAuditScanMock, 240);
  }

  getTableInsights() {
    return respond(tableInsightsMock, 280);
  }

  getRecentActivity(limit = 10) {
    return respond(recentActivityMock.slice(0, Math.min(limit, 10)), 340);
  }

  getIssues() {
    return respond(issuesMock, 300);
  }
}

export const mockDashboardService: DashboardService = new MockDashboardService();
