export type RecoveryIncidentStatus = "TAMPERED" | "UNAVAILABLE";
export type RecoverySnapshotStatus = "AVAILABLE" | "NONE";
export type RecoveryJobStatus = "COMPLETED" | "IN PROGRESS" | "QUEUED" | "FAILED";

export interface RecoveryIncident {
  id: string;
  table: string;
  record: string;
  status: RecoveryIncidentStatus;
  snapshot: RecoverySnapshotStatus;
  detectedAt: string;
  actor: string;
  description: string;
}

export interface RecoveryJob {
  id: string;
  resources: string[];
  scope: string;
  requestedBy: string;
  requestedAt: string;
  status: RecoveryJobStatus;
  restored: number;
  total: number;
}

export interface RecoverySnapshot {
  resource: string;
  table: string;
  capturedAt: string;
  anchor: string;
  status: RecoverySnapshotStatus;
}

export interface RecoveryPreviewRow {
  id: string;
  table: string;
  snapshot: RecoverySnapshotStatus;
  status: RecoveryIncidentStatus;
}

export interface RecoveryPreview {
  rows: RecoveryPreviewRow[];
  available: number;
  affectedTables: string[];
  detectedAt: string;
}

export interface RecoveryResult {
  jobId: string;
  restored: number;
  skipped: number;
}
