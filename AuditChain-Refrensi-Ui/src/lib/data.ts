// AuditChain Client Portal — mock domain model
// Client tenant: "SIMRS Morbis 1" (a hospital information system database)

export type ActivityLevel = "VERY HIGH" | "HIGH" | "NORMAL" | "LOW" | "IDLE";
export type EventAction = "INSERT" | "UPDATE" | "DELETE";
export type IntegrityStatus = "VALID" | "PENDING" | "TAMPERED" | "UNAVAILABLE" | "NOT_CHECKED";
export type SnapshotStatus = "AVAILABLE" | "PARTIAL" | "NONE";

export interface WatchTable {
  name: string;
  totalLogs: number;
  ratePerMin: number;
  deltaPct: number; // vs previous hour
  level: ActivityLevel;
  issues: number;
  lastEventSec: number;
  today: number;
  inserts: number;
  updates: number;
  deletes: number;
  checked: number;
  valid: number;
  pending: number;
  tampered: number;
  unavailable: number;
  notChecked: number;
  deletesToday: number;
}

export const TABLES: WatchTable[] = [
  {
    name: "USERS", totalLogs: 14820, ratePerMin: 32, deltaPct: 18.4, level: "HIGH",
    issues: 2, lastEventSec: 2, today: 1284, inserts: 320, updates: 841, deletes: 123,
    checked: 2812, valid: 2800, pending: 10, tampered: 2, unavailable: 0, notChecked: 0, deletesToday: 342,
  },
  {
    name: "RUANGAN", totalLogs: 9210, ratePerMin: 21, deltaPct: 7.1, level: "HIGH",
    issues: 0, lastEventSec: 5, today: 742, inserts: 210, updates: 498, deletes: 34,
    checked: 1904, valid: 1890, pending: 14, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 40,
  },
  {
    name: "TRANSAKSI", totalLogs: 7401, ratePerMin: 12, deltaPct: -4.2, level: "NORMAL",
    issues: 1, lastEventSec: 12, today: 611, inserts: 402, updates: 168, deletes: 41,
    checked: 1580, valid: 1573, pending: 5, tampered: 1, unavailable: 1, notChecked: 0, deletesToday: 181,
  },
  {
    name: "PAYMENT", totalLogs: 5330, ratePerMin: 9, deltaPct: 51.0, level: "VERY HIGH",
    issues: 0, lastEventSec: 8, today: 488, inserts: 291, updates: 172, deletes: 25,
    checked: 1120, valid: 1100, pending: 20, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 22,
  },
  {
    name: "PEGAWAI", totalLogs: 3820, ratePerMin: 4, deltaPct: 0, level: "LOW",
    issues: 0, lastEventSec: 42, today: 92, inserts: 41, updates: 48, deletes: 3,
    checked: 980, valid: 980, pending: 0, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 3,
  },
  {
    name: "OBAT", totalLogs: 2740, ratePerMin: 6, deltaPct: 12.3, level: "NORMAL",
    issues: 0, lastEventSec: 19, today: 148, inserts: 88, updates: 55, deletes: 5,
    checked: 720, valid: 720, pending: 0, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 5,
  },
  {
    name: "REKAM_MEDIS", totalLogs: 2110, ratePerMin: 3, deltaPct: -1.0, level: "LOW",
    issues: 0, lastEventSec: 63, today: 61, inserts: 33, updates: 27, deletes: 1,
    checked: 640, valid: 640, pending: 0, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 1,
  },
  {
    name: "APOTEK", totalLogs: 940, ratePerMin: 0, deltaPct: 0, level: "IDLE",
    issues: 0, lastEventSec: 610, today: 0, inserts: 0, updates: 0, deletes: 0,
    checked: 300, valid: 300, pending: 0, tampered: 0, unavailable: 0, notChecked: 0, deletesToday: 0,
  },
];

export const CLIENT = {
  tenant: "SIMRS Morbis 1",
  org: "RSUD Morbis — POLINEMA",
  lastScan: "08:00",
  nextScan: "16:00",
  scanDate: "26 Sep 2026",
};

export type FeedStatus = "VALID" | "PENDING" | "TAMPERED";

export interface FeedEvent {
  id: number;
  time: string;
  table: string;
  action: EventAction;
  record: number;
  actor: string;
  status: FeedStatus;
  issue?: boolean;
}

const ACTORS = ["mbi", "admin", "system", "POLINEMA", "test123", "petugas04", "svc-sync"];

let feedSeed = 100000;
export function makeEvent(table?: string): FeedEvent {
  const pool = table ? TABLES.filter((t) => t.name === table) : TABLES.filter((t) => t.level !== "IDLE");
  const t = pool[Math.floor(Math.random() * pool.length)] ?? TABLES[0];
  const actions: EventAction[] = ["INSERT", "UPDATE", "UPDATE", "UPDATE", "DELETE"];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const roll = Math.random();
  const status: FeedStatus = roll < 0.03 ? "TAMPERED" : roll < 0.14 ? "PENDING" : "VALID";
  return {
    id: feedSeed++,
    time: `${hh}:${mm}:${ss}`,
    table: t.name,
    action,
    record: Math.floor(Math.random() * 990) + 10,
    actor: ACTORS[Math.floor(Math.random() * ACTORS.length)],
    status,
    issue: status === "TAMPERED",
  };
}

export function seedFeed(count: number, table?: string): FeedEvent[] {
  return Array.from({ length: count }, () => makeEvent(table)).map((e, i) => ({
    ...e,
    time: shiftTime(-i * 2),
  }));
}

function shiftTime(deltaSec: number): string {
  const d = new Date(Date.now() + deltaSec * 1000);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

// Integrity incidents (affected audit records)
export interface Incident {
  id: string; // e.g. USERS:118
  table: string;
  record: number;
  status: IntegrityStatus;
  detected: string;
  actor: string;
  latestAction: EventAction;
  snapshot: SnapshotStatus;
  note: string;
}

export const INCIDENTS: Incident[] = [
  {
    id: "USERS:118", table: "USERS", record: 118, status: "TAMPERED",
    detected: "26 Sep · 08:00 scan", actor: "test123", latestAction: "UPDATE",
    snapshot: "AVAILABLE", note: "Row hash mismatch against anchored evidence.",
  },
  {
    id: "USERS:340", table: "USERS", record: 340, status: "TAMPERED",
    detected: "26 Sep · 08:00 scan", actor: "POLINEMA", latestAction: "DELETE",
    snapshot: "AVAILABLE", note: "Record deleted without matching authorized ticket.",
  },
  {
    id: "TRANSAKSI:822", table: "TRANSAKSI", record: 822, status: "UNAVAILABLE",
    detected: "26 Sep · 08:00 scan", actor: "system", latestAction: "UPDATE",
    snapshot: "NONE", note: "Verification unavailable — evidence anchor not yet confirmed.",
  },
];

// Activity chart series (per period)
export type Period = "1H" | "8H" | "24H" | "7D" | "30D";
export type Metric = "Events" | "Insert" | "Update" | "Delete";

const POINTS: Record<Period, number> = { "1H": 12, "8H": 16, "24H": 24, "7D": 7, "30D": 30 };

// Wall-clock spacing per period so each point maps to a real timestamp ending "now".
const STEP_MIN: Record<Period, number> = { "1H": 5, "8H": 30, "24H": 60, "7D": 1440, "30D": 1440 };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function labelFor(period: Period, i: number, n: number): string {
  // How far back this point sits from "now" (the last point).
  const stepsAgo = n - 1 - i;
  const d = new Date(Date.now() - stepsAgo * STEP_MIN[period] * 60_000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (period === "1H" || period === "8H") return `${hh}:${mm}`;
  if (period === "24H") return `${hh}:00`;
  if (period === "7D") return WEEKDAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export interface ChartPoint {
  label: string;
  events: number;
  insert: number;
  update: number;
  delete: number;
}

export function buildSeries(period: Period, table: string | null): ChartPoint[] {
  const n = POINTS[period];
  const scale = table ? (TABLES.find((t) => t.name === table)?.ratePerMin ?? 8) / 10 : 3.2;
  const base = 40 * scale;
  let acc = base;
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i / n) * Math.PI * 2.2) * base * 0.5;
    const noise = (pseudo(i + (table ? table.length : 7)) - 0.5) * base * 0.6;
    acc = Math.max(6, base + wave + noise);
    const events = Math.round(acc);
    const ins = Math.round(events * 0.34);
    const upd = Math.round(events * 0.52);
    const del = Math.max(0, events - ins - upd);
    return { label: labelFor(period, i, n), events, insert: ins, update: upd, delete: del };
  });
}

export interface IntegrityPoint {
  label: string;
  valid: number;
  tampered: number;
}

// Aggregated integrity trend — mirrors a backend /dashboard/integrity-trend response.
export function buildIntegritySeries(period: Period, table: string | null): IntegrityPoint[] {
  const n = POINTS[period];
  const scale = table ? (TABLES.find((t) => t.name === table)?.checked ?? 800) / 1200 : 2.6;
  const base = 220 * scale;
  const seed = table ? table.length : 11;
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i / n) * Math.PI * 2) * base * 0.28;
    const noise = (pseudo(i + seed) - 0.5) * base * 0.35;
    const valid = Math.max(20, Math.round(base + wave + noise));
    // Tampered events are rare — most points are clean, a few spike to 1-2.
    const t = pseudo(i * 3.7 + seed);
    const tampered = t > 0.86 ? (t > 0.96 ? 2 : 1) : 0;
    return { label: labelFor(period, i, n), valid, tampered };
  });
}

export function statusColor(s: FeedStatus): string {
  return s === "VALID" ? "var(--color-up)" : s === "TAMPERED" ? "var(--color-down)" : "var(--color-warn)";
}

export function pct(part: number, whole: number, digits = 2): string {
  if (whole === 0) return "0%";
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

function pseudo(x: number): number {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function levelColor(level: ActivityLevel): string {
  switch (level) {
    case "VERY HIGH": return "var(--color-up)";
    case "HIGH": return "var(--color-brand-green-bright)";
    case "NORMAL": return "var(--color-navy-bright)";
    case "LOW": return "var(--color-ink-dim)";
    case "IDLE": return "var(--color-ink-faint)";
  }
}

export function actionColor(a: EventAction): string {
  return a === "INSERT" ? "var(--color-insert)" : a === "UPDATE" ? "var(--color-update)" : "var(--color-delete)";
}

// Recovery history / jobs
export interface RecoveryJob {
  id: string;
  resources: string[];
  scope: string;
  requestedBy: string;
  requestedAt: string;
  status: "COMPLETED" | "IN PROGRESS" | "QUEUED" | "FAILED";
  restored: number;
  total: number;
}

export const RECOVERY_HISTORY: RecoveryJob[] = [
  {
    id: "RJ-2041", resources: ["RUANGAN:112"], scope: "Affected records", requestedBy: "mbi",
    requestedAt: "25 Sep · 14:22", status: "COMPLETED", restored: 1, total: 1,
  },
  {
    id: "RJ-2038", resources: ["USERS:77", "USERS:81", "USERS:210"], scope: "Selected records",
    requestedBy: "auditor.lead", requestedAt: "24 Sep · 09:10", status: "COMPLETED", restored: 3, total: 3,
  },
  {
    id: "RJ-2035", resources: ["OBAT:9"], scope: "Affected records", requestedBy: "mbi",
    requestedAt: "23 Sep · 16:48", status: "FAILED", restored: 0, total: 1,
  },
];

export interface Snapshot {
  resource: string;
  table: string;
  capturedAt: string;
  anchor: string;
  status: SnapshotStatus;
}

export const SNAPSHOTS: Snapshot[] = [
  { resource: "USERS:118", table: "USERS", capturedAt: "26 Sep · 06:00", anchor: "0x9f3a…c21b", status: "AVAILABLE" },
  { resource: "USERS:340", table: "USERS", capturedAt: "26 Sep · 06:00", anchor: "0x7dd1…a904", status: "AVAILABLE" },
  { resource: "TRANSAKSI:822", table: "TRANSAKSI", capturedAt: "—", anchor: "pending", status: "NONE" },
  { resource: "RUANGAN:221", table: "RUANGAN", capturedAt: "26 Sep · 06:00", anchor: "0x1c88…4f70", status: "AVAILABLE" },
];

export function globalStats() {
  const totalLogs = TABLES.reduce((a, t) => a + t.totalLogs, 0);
  const today = TABLES.reduce((a, t) => a + t.today, 0);
  const rate = TABLES.reduce((a, t) => a + t.ratePerMin, 0);
  const issues = TABLES.reduce((a, t) => a + t.issues, 0);
  const checked = TABLES.reduce((a, t) => a + t.checked, 0);
  const valid = TABLES.reduce((a, t) => a + t.valid, 0);
  const tampered = TABLES.reduce((a, t) => a + t.tampered, 0);
  const unavailable = TABLES.reduce((a, t) => a + t.unavailable, 0);
  const pending = TABLES.reduce((a, t) => a + t.pending, 0);
  const notChecked = TABLES.reduce((a, t) => a + t.notChecked, 0);
  return { totalLogs, today, rate, issues, checked, valid, tampered, unavailable, pending, notChecked, anchored: 12472 };
}
