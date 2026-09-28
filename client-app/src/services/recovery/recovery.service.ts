import type {
  RecoveryIncident,
  RecoveryJob,
  RecoveryPreview,
  RecoveryResult,
  RecoverySnapshot,
} from "@/types/recovery";

export interface RecoveryService {
  getIncidents(): Promise<RecoveryIncident[]>;
  getHistory(): Promise<RecoveryJob[]>;
  getSnapshots(): Promise<RecoverySnapshot[]>;
  prepareRecovery(ids: string[]): Promise<RecoveryPreview>;
  executeRecovery(ids: string[]): Promise<RecoveryResult>;
}
