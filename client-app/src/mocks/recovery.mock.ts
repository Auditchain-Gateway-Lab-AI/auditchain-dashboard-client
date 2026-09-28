import type { RecoveryIncident, RecoveryJob, RecoverySnapshot } from "@/types/recovery";

export const recoveryIncidentsMock: RecoveryIncident[] = [
  {
    id: "USERS:118",
    table: "USERS",
    record: "118",
    status: "TAMPERED",
    snapshot: "AVAILABLE",
    detectedAt: "26 Sep · 08:00 scan",
    actor: "test123",
    description: "Row hash mismatch against anchored evidence.",
  },
  {
    id: "USERS:340",
    table: "USERS",
    record: "340",
    status: "TAMPERED",
    snapshot: "AVAILABLE",
    detectedAt: "26 Sep · 08:00 scan",
    actor: "POLINEMA",
    description: "Record deleted without matching authorized ticket.",
  },
  {
    id: "TRANSAKSI:822",
    table: "TRANSAKSI",
    record: "822",
    status: "UNAVAILABLE",
    snapshot: "NONE",
    detectedAt: "26 Sep · 08:00 scan",
    actor: "system",
    description: "Verification unavailable — evidence anchor not yet confirmed.",
  },
];

export const recoveryHistoryMock: RecoveryJob[] = [
  {
    id: "RJ-2041",
    resources: ["RUANGAN:112"],
    scope: "Affected records",
    requestedBy: "mbi",
    requestedAt: "25 Sep · 14:22",
    status: "COMPLETED",
    restored: 1,
    total: 1,
  },
  {
    id: "RJ-2038",
    resources: ["USERS:77", "USERS:81", "USERS:210"],
    scope: "Selected records",
    requestedBy: "auditor.lead",
    requestedAt: "24 Sep · 09:10",
    status: "COMPLETED",
    restored: 3,
    total: 3,
  },
  {
    id: "RJ-2035",
    resources: ["OBAT:9"],
    scope: "Affected records",
    requestedBy: "mbi",
    requestedAt: "23 Sep · 16:48",
    status: "FAILED",
    restored: 0,
    total: 1,
  },
];

export const recoverySnapshotsMock: RecoverySnapshot[] = [
  { resource: "USERS:118", table: "USERS", capturedAt: "26 Sep · 06:00", anchor: "0x9f3a…c21b", status: "AVAILABLE" },
  { resource: "USERS:340", table: "USERS", capturedAt: "26 Sep · 06:00", anchor: "0x7dd1…a904", status: "AVAILABLE" },
  { resource: "TRANSAKSI:822", table: "TRANSAKSI", capturedAt: "—", anchor: "pending", status: "NONE" },
  { resource: "RUANGAN:221", table: "RUANGAN", capturedAt: "26 Sep · 06:00", anchor: "0x1c88…4f70", status: "AVAILABLE" },
];
