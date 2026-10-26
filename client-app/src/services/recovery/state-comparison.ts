import type { RecoveryIncident, RecoveryPreflight } from "@/types/recovery";

/** Fresh backend results supersede historical incident discrepancies. */
export function recoveryChangedFields(
  preflight: RecoveryPreflight | undefined,
  summary: RecoveryIncident["discrepancy_summary"],
  trusted: unknown,
  current: unknown,
): string[] {
  if (preflight?.status === "NO_RECOVERY_REQUIRED" || preflight?.source_status === "MATCHED") return [];
  const fields = preflight?.changed_fields ?? (
    trusted !== undefined && current !== undefined
      ? getChangedStateFields(trusted, current)
      : getDiscrepancyFields(summary)
  );
  return Array.from(new Set(fields.map((field) => field.trim().toLowerCase()))).sort();
}

function getDiscrepancyFields(value?: string | Array<{ field?: string; changed?: boolean }>) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item.changed !== false && item.field).map((item) => item.field as string);
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.field === "string" && item.changed !== false).map((item) => item.field as string) : [];
  } catch { return []; }
}

function getChangedStateFields(trusted: unknown, current: unknown): string[] {
  const before = normalizePreviewKeys(asRecord(trusted));
  const after = normalizePreviewKeys(asRecord(current));
  if (!before || !after) return trusted !== undefined && current !== undefined && stableJson(trusted) !== stableJson(current) ? ["Entire record"] : [];
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((key) => stableJson(before[key]) !== stableJson(after[key]))
    .sort((left, right) => left.localeCompare(right));
}

function normalizePreviewKeys(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!record) return undefined;
  const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const name = key.trim().toLowerCase();
    // A collision is ambiguous. Preserve the original keys for the fallback
    // preview rather than silently hiding either value.
    if (Object.hasOwn(normalized, name)) return record;
    normalized[name] = value;
  }
  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try { return asRecord(JSON.parse(value) as unknown); } catch { return undefined; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
}
