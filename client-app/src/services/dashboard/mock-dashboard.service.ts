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
  BackgroundWorkerStatus,
  IntegrityDimension,
  IntegrityHistory,
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

  getIntegrityTrend(range: TrendRange, _token?: string) {
    return respond(buildTrendMock(range), 320);
  }

  async getIntegrityHistory(range: TrendRange, dimension: IntegrityDimension, _token?: string): Promise<IntegrityHistory> {
    const trend = await respond(buildTrendMock(range), 320);
    const generatedAt = new Date().toISOString();
    return {
      range,
      dimension,
      availableFrom: generatedAt,
      generatedAt,
      points: trend.map((point) => {
        const tampered = dimension === "source" ? point.sourceTampered : point.tampered;
        const checked = point.valid + tampered + point.pending + point.unavailable;
        return {
          label: point.label,
          checked,
          valid: point.valid,
          tampered,
          pending: point.pending,
          unavailable: point.unavailable,
          limited: 0,
          notComparable: 0,
        };
      }),
    };
  }

  getWorkerStatus(_token?: string) {
    const now = new Date().toISOString();
    return respond<BackgroundWorkerStatus[]>([
      { worker: "PROOF_SCANNER", enabled: true, healthy: true, lastHeartbeatAt: now, lastCheckAt: now, lastCheckedItems: 45, queuedItems: 0, scope: "gateway" },
      { worker: "SOURCE_SWEEP", enabled: true, healthy: true, lastHeartbeatAt: now, lastCheckAt: now, lastCheckedItems: 12, queuedItems: 0, scope: "latest event per resource" },
    ], 180);
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

  startVerificationRun(_token: string | undefined, range: { from: string; to: string }) {
    return respond({
      id: "mock-verification-run",
      clientId: "mock-client",
      ...range,
      status: "COMPLETED" as const,
      batchSize: 100,
      totalItems: 10,
      processedItems: 10,
      progressPercent: 100,
      totalValid: 9,
      totalInvalid: 1,
      totalPending: 0,
      alreadyVerified: 0,
      verifiedNow: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 420);
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
}

export const mockDashboardService: DashboardService = new MockDashboardService();
