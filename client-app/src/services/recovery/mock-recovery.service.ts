import {
  recoveryHistoryMock,
  recoveryIncidentsMock,
  recoverySnapshotsMock,
} from "@/mocks/recovery.mock";
import type { RecoveryService } from "@/services/recovery/recovery.service";
import type { RecoveryPreview, RecoveryResult } from "@/types/recovery";

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration));

export class MockRecoveryService implements RecoveryService {
  async getIncidents() {
    await wait(300);
    return structuredClone(recoveryIncidentsMock);
  }

  async getHistory() {
    await wait(340);
    return structuredClone(recoveryHistoryMock);
  }

  async getSnapshots() {
    await wait(260);
    return structuredClone(recoverySnapshotsMock);
  }

  async prepareRecovery(ids: string[]): Promise<RecoveryPreview> {
    await wait(360);
    const rows = ids.map((id) => {
      const incident = recoveryIncidentsMock.find((item) => item.id === id);
      return {
        id,
        table: incident?.table ?? id.split(":")[0] ?? "UNKNOWN",
        snapshot: incident?.snapshot ?? "AVAILABLE",
        status: incident?.status ?? "TAMPERED",
      };
    });

    return {
      rows,
      available: rows.filter((row) => row.snapshot === "AVAILABLE").length,
      affectedTables: Array.from(new Set(rows.map((row) => row.table))),
      detectedAt: "26 Sep · 08:00 scan",
    };
  }

  async executeRecovery(ids: string[]): Promise<RecoveryResult> {
    await wait(1_200);
    const preview = await this.prepareRecovery(ids);
    return {
      jobId: "RJ-MOCK-2042",
      restored: preview.available,
      skipped: preview.rows.length - preview.available,
    };
  }
}

export const mockRecoveryService: RecoveryService = new MockRecoveryService();
