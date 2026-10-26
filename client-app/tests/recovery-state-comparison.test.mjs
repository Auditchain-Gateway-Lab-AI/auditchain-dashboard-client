import assert from "node:assert/strict";
import test from "node:test";
import { recoveryChangedFields } from "../src/services/recovery/state-comparison.ts";

test("fresh match supersedes historical discrepancies and raw formatting", () => {
  assert.deepEqual(recoveryChangedFields(
    { status: "NO_RECOVERY_REQUIRED", source_status: "MATCHED" },
    '[{"field":"created_at"},{"field":"id"}]',
    { id: 1467, created_at: 1792732127000000 },
    { ID: "1467", CREATED_AT: "2026-10-23T05:08:47Z" },
  ), []);
});

test("explicit fresh empty list never revives historical fields", () => {
  assert.deepEqual(recoveryChangedFields({ changed_fields: [] }, [{ field: "NAMA" }], { nama: "old" }, { NAMA: "new" }), []);
});

test("backend semantic differences take precedence over raw previews", () => {
  assert.deepEqual(recoveryChangedFields({ changed_fields: ["nama"] }, [{ field: "id" }], { id: 1467 }, { ID: "1467" }), ["nama"]);
});

test("legacy fallback compares column names without case or whitespace differences", () => {
  assert.deepEqual(recoveryChangedFields(undefined, undefined, { aktif: "1", nama: "old" }, { " AKTIF ": "1", NAMA: "new" }), ["nama"]);
});

test("legacy fallback preserves true differences, missing fields and strict values", () => {
  assert.deepEqual(recoveryChangedFields(undefined, undefined, { id_unit: "7", nama: "old", aktif: null }, { ID_UNIT: 7, NAMA: "new" }), ["aktif", "id_unit", "nama"]);
});

test("historical fallback deduplicates names when fresh previews are unavailable", () => {
  assert.deepEqual(recoveryChangedFields(undefined, [{ field: "nama" }, { field: "NAMA" }, { field: "id", changed: false }]), ["nama"]);
});

test("legacy key collision cannot silently hide a different value", () => {
  assert.ok(recoveryChangedFields(undefined, undefined, { nama: "old" }, { nama: "old", NAMA: "new" }).includes("nama"));
});
