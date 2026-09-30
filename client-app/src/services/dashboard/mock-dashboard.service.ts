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
import type {
  TrendRange,
  VerificationRangeEstimate,
  VerificationRangeInput,
  VerificationRangeResult,
  VerificationRun,
} from "@/types/dashboard";

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration));

async function respond<T>(data: T, duration?: number): Promise<T> {
  await wait(duration);
  return structuredClone(data);
}

export class MockDashboardService implements DashboardService {
  getOverview(_token?: string, _workspace?: { name: string; organization: string }) {
    return respond(dashboardOverviewMock, 260);
  }

  getIntegrityTrend(range: TrendRange) {
    return respond(buildTrendMock(range), 320);
  }

  getTables() {
    return respond(watchlistMock, 300);
  }

  getInventory(_token?: string) {
    return respond([], 300);
  }

  estimateVerifyRange(_token: string | undefined, _range: VerificationRangeInput) {
    return respond<VerificationRangeEstimate>({ estimatedItems: 10, syncLimit: 100, canVerifySync: true }, 240);
  }

  verifyRange(_token: string | undefined, range: VerificationRangeInput) {
    return respond<VerificationRangeResult>({
      range,
      summary: { total: 10, valid: 9, invalid: 1, pending: 0 },
    }, 420);
  }

  getLatestVerificationRun(_token?: string) {
    return respond<VerificationRun | null>(null, 220);
  }

  getLatestScan() {
    return respond(latestAuditScanMock, 240);
  }

  getTableInsights() {
    return respond(tableInsightsMock, 280);
  }

  getRecentActivity(_token?: string, limit = 10) {
    return respond(recentActivityMock.slice(0, Math.min(limit, 10)), 340);
  }

  getIssues() {
    return respond(issuesMock, 300);
  }
}

export const mockDashboardService: DashboardService = new MockDashboardService();
