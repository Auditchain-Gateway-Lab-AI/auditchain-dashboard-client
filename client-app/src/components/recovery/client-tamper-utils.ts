import type { ClientDataTamperRecord } from "@/types/recovery";

export interface ParsedClientDiscrepancy {
  field: string;
  expected: unknown;
  actual: unknown;
}

export function parseClientDiscrepancies(record: ClientDataTamperRecord): {
  discrepancies: ParsedClientDiscrepancy[];
  invalid: boolean;
} {
  let value: unknown = record.discrepancies;
  let invalid = false;

  if (typeof value === "string") {
    const raw = value;
    try {
      value = JSON.parse(raw);
    } catch {
      invalid = raw.trim().length > 0;
      value = [];
    }
  }

  if (!Array.isArray(value)) {
    const detailsWereProvided = value !== undefined && value !== null && value !== "";
    return { discrepancies: [], invalid: invalid || detailsWereProvided };
  }

  return {
    invalid,
    discrepancies: value.map((item, index) => {
      const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        field: String(entry.field ?? entry.column ?? `Column ${index + 1}`),
        expected: firstPresent(entry, ["expected", "in_log", "offchain_value"]),
        actual: firstPresent(entry, ["actual", "in_agent", "client_value"]),
      };
    }),
  };
}

function firstPresent(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  }
  return undefined;
}

export function formatDiffValue(value: unknown) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (value === "") return "(empty string)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export function formatRecoveryDate(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
