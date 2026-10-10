import type { RecoveryIncident, RecoveryRequest } from "@/types/recovery";

export type DemoValue = string | number | boolean | null;
export type DemoPayload = Record<string, DemoValue>;

export interface DemoEvidence {
  operation: "UPSERT" | "DELETE";
  snapshot: boolean;
  anchor: boolean;
  source: string;
  currentData: DemoPayload | null;
  trustedData: DemoPayload | null;
}

export interface DemoHistoryEntry {
  id: string;
  incidentId: string;
  logId: string;
  resource: string;
  operation: "UPSERT" | "DELETE";
  result: "SUCCEEDED" | "FAILED_VERIFICATION";
  integrity: "VALID" | "NOT_CHECKED";
  cdc: "CONFIRMED" | "UNKNOWN";
  executedAt: string;
  beforeHash?: string;
  afterHash?: string;
  beforeData: DemoPayload | null;
  afterData: DemoPayload | null;
  reason?: string;
}

const client_id = "demo-client";
const stamp = (day: number, hour: number) => new Date(2026, 8, day, hour, 20).toISOString();
const hash = (pair: string) => pair.repeat(32);

const row = (
  id: string,
  log: string,
  resource: string,
  issue: string,
  source: string,
  day: number,
  hour: number,
  scope = "CLIENT_SOURCE",
  status = "OPEN",
): RecoveryIncident => ({
  id,
  client_id,
  log_id: log,
  reference_log_id: scope === "CLIENT_SOURCE" ? log : undefined,
  resource,
  incident_type: issue,
  source_status: source,
  incident_scope: scope,
  status,
  detected_state_hash: hash("a3"),
  expected_hash: hash("b4"),
  detected_at: stamp(day, hour),
  resolved_at: status === "RESOLVED" ? stamp(day, hour + 1) : undefined,
});

export const demoIncidents: RecoveryIncident[] = [
  row("INC-018", "LOG-8841", "patients / MR-10482", "PAYLOAD_MISMATCH", "MISMATCH", 26, 9),
  row("INC-017", "LOG-8829", "billing / INV-20984", "MISSING_SOURCE_ROW", "MISSING", 26, 8),
  row("INC-016", "LOG-8812", "encounters / ENC-7791", "UNEXPECTED_SOURCE_ROW", "UNEXPECTED_PRESENT", 25, 16),
  row("INC-015", "LOG-8804", "lab_results / LAB-5403", "PAYLOAD_MISMATCH", "UNREACHABLE", 25, 11),
  row("INC-014", "LOG-8788", "audit_logs / LOG-8788", "MERKLE_ROOT_MISMATCH", "NOT_COMPARABLE", 24, 14, "GATEWAY_INTEGRITY"),
  row("INC-013", "LOG-8761", "prescriptions / RX-3118", "PAYLOAD_MISMATCH", "MATCHED", 23, 10, "CLIENT_SOURCE", "RESOLVED"),
  row("INC-012", "LOG-8754", "appointments / APT-9034", "PAYLOAD_MISMATCH", "MISMATCH", 22, 15),
  row("INC-011", "LOG-8733", "insurance / POL-2017", "PAYLOAD_MISMATCH", "MISMATCH", 21, 9),
];

// Synthetic example values used only by the recovery UI prototype.
export const demoEvidence: Record<string, DemoEvidence> = {
  "INC-018": {
    operation: "UPSERT", snapshot: true, anchor: true, source: "SIMRS",
    currentData: { medical_record_id: "MR-10482", patient_name: "Rani Pratama", blood_type: "O+", allergy: "None", status: "ACTIVE" },
    trustedData: { medical_record_id: "MR-10482", patient_name: "Rani Pratama", blood_type: "O+", allergy: "Penicillin", status: "ACTIVE" },
  },
  "INC-017": {
    operation: "UPSERT", snapshot: true, anchor: true, source: "SIMRS",
    currentData: null,
    trustedData: { invoice_id: "INV-20984", patient_id: "MR-20311", amount: 785000, currency: "IDR", status: "PAID" },
  },
  "INC-016": {
    operation: "DELETE", snapshot: true, anchor: true, source: "SIMRS",
    currentData: { encounter_id: "ENC-7791", patient_id: "MR-10902", visit_type: "Emergency", status: "OPEN" },
    trustedData: null,
  },
  "INC-015": {
    operation: "UPSERT", snapshot: true, anchor: false, source: "LIS",
    currentData: { result_id: "LAB-5403", test: "Hemoglobin", value: "18.1 g/dL", status: "VERIFIED" },
    trustedData: { result_id: "LAB-5403", test: "Hemoglobin", value: "13.8 g/dL", status: "VERIFIED" },
  },
  "INC-013": {
    operation: "UPSERT", snapshot: true, anchor: true, source: "SIMRS",
    currentData: { prescription_id: "RX-3118", medicine: "Amoxicillin", dosage: "500 mg", status: "ACTIVE" },
    trustedData: { prescription_id: "RX-3118", medicine: "Amoxicillin", dosage: "250 mg", status: "ACTIVE" },
  },
  "INC-012": {
    operation: "UPSERT", snapshot: true, anchor: true, source: "SIMRS",
    currentData: { appointment_id: "APT-9034", patient_id: "MR-18201", clinic: "Internal Medicine", status: "CANCELLED" },
    trustedData: { appointment_id: "APT-9034", patient_id: "MR-18201", clinic: "Internal Medicine", status: "CONFIRMED" },
  },
  "INC-011": {
    operation: "UPSERT", snapshot: false, anchor: false, source: "SIMRS",
    currentData: { policy_id: "POL-2017", insurer: "Garuda Care", coverage: 25000000, status: "ACTIVE" },
    trustedData: { policy_id: "POL-2017", insurer: "Garuda Care", coverage: 50000000, status: "ACTIVE" },
  },
};

export const demoRequests: RecoveryRequest[] = [
  {
    id: "REQ-041", client_id, incident_id: "INC-012", target_log_id: "LOG-8754",
    selected_log_id: "LOG-8754", resource: "appointments / APT-9034",
    status: "APPLIED_AWAITING_CDC", requested_at: stamp(26, 10),
  },
];

export const demoHistory: DemoHistoryEntry[] = [
  {
    id: "EVT-2409-103", incidentId: "INC-013", logId: "LOG-8761",
    resource: "prescriptions / RX-3118", operation: "UPSERT", result: "SUCCEEDED",
    integrity: "VALID", cdc: "CONFIRMED", executedAt: stamp(23, 12),
    beforeHash: hash("c5"), afterHash: hash("b4"),
    beforeData: demoEvidence["INC-013"]?.currentData ?? null,
    afterData: demoEvidence["INC-013"]?.trustedData ?? null,
  },
  {
    id: "EVT-2409-102", incidentId: "INC-011", logId: "LOG-8733",
    resource: "insurance / POL-2017", operation: "UPSERT", result: "FAILED_VERIFICATION",
    integrity: "NOT_CHECKED", cdc: "UNKNOWN", executedAt: stamp(21, 10),
    beforeHash: hash("a3"), afterHash: hash("a3"),
    beforeData: demoEvidence["INC-011"]?.currentData ?? null,
    afterData: demoEvidence["INC-011"]?.currentData ?? null,
    reason: "Trusted snapshot and anchor were unavailable. No client data was changed.",
  },
];

export interface DemoPersistedState {
  incidents: RecoveryIncident[];
  history: DemoHistoryEntry[];
}

export const initialDemoState: DemoPersistedState = {
  incidents: demoIncidents,
  history: demoHistory,
};

export const DEMO_STORAGE_KEY = "auditchain.client.recovery-demo.v2";
