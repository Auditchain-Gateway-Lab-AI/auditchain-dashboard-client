import type {
  AuditActivity,
  AuditIssue,
  DashboardOverview,
  LatestAuditScan,
  TableInsightsData,
  TrendPoint,
  TrendRange,
  WatchlistItem,
} from "@/types/dashboard";

export const dashboardOverviewMock: DashboardOverview = {
  tenant: "SIMRS Morbis 1",
  organization: "RSUD Morbis — POLINEMA",
  totalLogs: 46_371,
  valid: 46_368,
  validPercentage: 99.99,
  tampered: 3,
  tamperedPercentage: 0.01,
  logsToday: 3_426,
  monitoredTables: 8,
  lastScan: "08:00",
};

export const watchlistMock: WatchlistItem[] = [
  { table: "USERS", logs: 14_820, integrity: 99.99, issues: 2, level: "HIGH", checked: "2s ago" },
  { table: "RUANGAN", logs: 9_210, integrity: 100, issues: 0, level: "HIGH", checked: "5s ago" },
  { table: "TRANSAKSI", logs: 7_401, integrity: 99.99, issues: 1, level: "NORMAL", checked: "12s ago" },
  { table: "PAYMENT", logs: 5_330, integrity: 100, issues: 0, level: "VERY HIGH", checked: "8s ago" },
  { table: "PEGAWAI", logs: 3_820, integrity: 100, issues: 0, level: "LOW", checked: "42s ago" },
  { table: "OBAT", logs: 2_740, integrity: 100, issues: 0, level: "NORMAL", checked: "19s ago" },
  { table: "REKAM_MEDIS", logs: 2_110, integrity: 100, issues: 0, level: "LOW", checked: "1m ago" },
  { table: "APOTEK", logs: 940, integrity: 100, issues: 0, level: "IDLE", checked: "10m ago" },
];

export const latestAuditScanMock: LatestAuditScan = {
  lastVerified: "08:00",
  nextScan: "16:00",
  logsChecked: 10_056,
  valid: 10_003,
  needsAttention: 3,
  pending: 49,
  unavailable: 1,
  schedule: "2× / DAY",
  description: "Scheduled validator runs twice daily and verifies tracked tables.",
};

export const tableInsightsMock: TableInsightsData = {
  mostActive: [
    { table: "USERS", value: 14_820 },
    { table: "RUANGAN", value: 9_210 },
    { table: "TRANSAKSI", value: 7_401 },
    { table: "PAYMENT", value: 5_330 },
  ],
  mostTampered: [
    { table: "USERS", value: 2 },
    { table: "TRANSAKSI", value: 1 },
  ],
  mostDeletes: [
    { table: "USERS", value: 342 },
    { table: "TRANSAKSI", value: 181 },
    { table: "RUANGAN", value: 40 },
    { table: "PAYMENT", value: 22 },
  ],
};

export const recentActivityMock: AuditActivity[] = [
  { id: "evt-01", time: "11:28:16", table: "OBAT", action: "UPDATE", record: "#173", actor: "svc-sync", status: "VALID" },
  { id: "evt-02", time: "11:28:14", table: "RUANGAN", action: "UPDATE", record: "#615", actor: "petugas04", status: "VALID" },
  { id: "evt-03", time: "11:28:12", table: "TRANSAKSI", action: "INSERT", record: "#532", actor: "POLINEMA", status: "VALID" },
  { id: "evt-04", time: "11:28:10", table: "PAYMENT", action: "UPDATE", record: "#920", actor: "test123", status: "VALID" },
  { id: "evt-05", time: "11:28:08", table: "TRANSAKSI", action: "UPDATE", record: "#967", actor: "mbi", status: "VALID" },
  { id: "evt-06", time: "11:28:06", table: "TRANSAKSI", action: "UPDATE", record: "#393", actor: "svc-sync", status: "VALID" },
  { id: "evt-07", time: "11:28:04", table: "RUANGAN", action: "UPDATE", record: "#975", actor: "svc-sync", status: "VALID" },
  { id: "evt-08", time: "11:28:02", table: "RUANGAN", action: "DELETE", record: "#438", actor: "system", status: "TAMPERED" },
  { id: "evt-09", time: "11:28:00", table: "USERS", action: "UPDATE", record: "#698", actor: "admin", status: "VALID" },
  { id: "evt-10", time: "11:27:58", table: "PAYMENT", action: "UPDATE", record: "#394", actor: "system", status: "VALID" },
];

export const issuesMock: AuditIssue[] = [
  {
    id: "issue-01",
    table: "USERS",
    record: "118",
    status: "TAMPERED",
    description: "Row hash mismatch against anchored evidence.",
    detectedAt: "26 SEP · 08:00 SCAN",
    actor: "TEST123",
  },
  {
    id: "issue-02",
    table: "USERS",
    record: "340",
    status: "TAMPERED",
    description: "Record deleted without matching authorized ticket.",
    detectedAt: "26 SEP · 08:00 SCAN",
    actor: "POLINEMA",
  },
  {
    id: "issue-03",
    table: "TRANSAKSI",
    record: "822",
    status: "UNAVAILABLE",
    description: "Verification unavailable — evidence anchor not yet confirmed.",
    detectedAt: "26 SEP · 08:00 SCAN",
    actor: "SYSTEM",
  },
];

const trendShape: Record<TrendRange, { labels: string[]; scale: number }> = {
  "8H": { labels: ["04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00"], scale: 1 },
  "24H": { labels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"], scale: 2.2 },
  "7D": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], scale: 8.8 },
  "30D": { labels: ["01 Sep", "05 Sep", "09 Sep", "13 Sep", "17 Sep", "21 Sep", "25 Sep", "28 Sep"], scale: 33 },
};

const validBase = [482, 536, 511, 608, 572, 639, 618, 684];
const insertBase = [121, 139, 132, 165, 148, 177, 169, 184];
const updateBase = [294, 318, 307, 356, 342, 381, 369, 402];
const deleteBase = [23, 31, 28, 34, 29, 38, 35, 41];
const tamperedBase = [0, 0, 1, 0, 0, 1, 0, 1];

export function buildTrendMock(range: TrendRange): TrendPoint[] {
  const { labels, scale } = trendShape[range];
  return labels.map((label, index) => ({
    label,
    valid: Math.round((validBase[index] ?? 482) * scale),
    tampered: tamperedBase[index] ?? 0,
    insert: Math.round((insertBase[index] ?? 121) * scale),
    update: Math.round((updateBase[index] ?? 294) * scale),
    delete: Math.round((deleteBase[index] ?? 23) * scale),
  }));
}
