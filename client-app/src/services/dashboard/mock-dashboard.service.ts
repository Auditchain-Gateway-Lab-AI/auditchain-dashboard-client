import {
  buildTrendMock,
  dashboardOverviewMock,
  issuesMock,
  latestAuditScanMock,
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
  AgentAuditRunReport,
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

  getIntegrityTrend(range: TrendRange, _token?: string) {
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

  getIssues() {
    return respond(issuesMock, 300);
  }

  getExternalStats(_token?: string) {
    return respond(null, 200);
  }

  createVerificationRun(_token: string | undefined, range: VerificationRangeInput, _batchSize?: number) {
    return respond<VerificationRun>({
      id: "mock-ext-run-1",
      clientId: "mock-client",
      from: range.from,
      to: range.to,
      status: "COMPLETED",
      batchSize: 100,
      totalItems: 10,
      processedItems: 10,
      progressPercent: 100,
      totalValid: 10,
      totalInvalid: 0,
      totalPending: 0,
      alreadyVerified: 0,
      verifiedNow: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 300);
  }

  runAgentAudit(_token: string | undefined, _range: VerificationRangeInput): Promise<AgentAuditRunReport> {
    return respond({
      run_id: "mock-agent-run-1",
      total_logs: 10,
      audited_logs: 2,
      historical_skipped: 8,
      data_valid: 2,
      data_tampered: 0,
      data_not_found: 0,
      data_error: 0,
      blockchain_valid: 2,
      blockchain_tampered: 0,
      blockchain_pending: 0,
      duration: "45ms",
    }, 300);
  }
}

export const mockDashboardService: DashboardService = new MockDashboardService();
