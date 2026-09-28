# Audit Dashboard Client — AuditChain Gateway

Tanggal audit: 28 September 2026  
Scope: dashboard client/auditor, detail audit log, recovery, interaksi, animasi, dan pemindahan verifikasi range ke proses server-side.

## 1. Scope dan validasi

Folder `auditchain-dashboard-client` saat ini belum berisi aplikasi FE; isinya baru `logo-ag-new.png`. Implementasi dashboard yang dapat diaudit ada di `auditchain-gateway-dashboard`. Dokumen ini memakai implementasi tersebut sebagai baseline untuk FE client berikutnya.

Validasi baseline:

- `npm test -- --watchAll=false --runInBand`: 13 test suite dan 40 test lulus.
- `npm run build`: production build berhasil.
- Browser runtime tidak tersambung pada environment audit, jadi evaluasi visual berasal dari source, CSS, dan component tests.

## 2. Inventaris fitur dan nama produk

| Area | Nama yang disarankan | Fungsi | Baseline |
|---|---|---|---|
| `/dashboard` | **Integrity Overview** | KPI integritas, aktivitas, ringkasan status, jalan cepat ke logs | Ada, masih bernama Dashboard |
| `/audit-logs` | **Audit Logs** | Tabel, search, filter, sort, pagination, date range, export | Ada |
| Drawer detail | **Log Details** | Detail satu event | Ada |
| Detail tab 1 | **Overview** | ID, actor, action, resource, source, hash, payload | Ada |
| Detail tab 2 | **History** | Timeline resource, chain status, integrity evidence | Ada |
| Detail tab 3 | **Recovery** | Incident, trusted/tampered data, preflight, recovery action | Ada |
| Payload toggle | **Structured / JSON** | Tampilan payload biasa dan teknis | Ada |
| `/recovery-data` | **Recovery Center** | Workspace incident dan histori recovery | Ada, menu masih bernama Recovery Data |
| Recovery section 1 | **Tampered Incidents** | Daftar incident | Ada |
| Recovery section 2 | **Recovery History** | Event recovery read-only | Ada |
| Recovery bulk | **Select all matching** | Pilih semua record sesuai filter/search aktif | Ada |
| `/web-users` | **Web Users** | Akun aplikasi/actor yang muncul di audit | Ada |
| `/reports` | **Reports** | Generate CSV/PDF | Ada |
| `/actor-tracking` | **Actor Tracking** | Mapping actor source | Ada |
| User menu | **Profile** | Profil dan password | Ada |

Menu utama FE client yang disarankan: **Integrity Overview, Audit Logs, Recovery Center, Reports, Web Users, Actor Tracking**. Profile tetap di user menu.

## 3. Audit Log Details

Komponen: `src/components/dashboard/ResourceDetailModal.jsx`.

### Overview

Menampilkan Audit Log ID, Action Time, Actor, Action Type, Resource/source table, Source System, Cryptographic Hash, serta payload Structured/JSON. Klik row membuka drawer, Escape/overlay menutup drawer, dan close memakai animasi keluar.

### History

Saat tab dibuka, FE memanggil:

- `GET /dashboard/logs/by-resource/:resource`
- `GET /dashboard/verify-resource/:resource`

Layar menampilkan timeline terbalik, event terbaru `Latest`, chain status, actor, source system, integrity badge, `Client Out of Sync`, dan `Integrity Failed`.

### Recovery

Alurnya: load incident/request/event → load candidate → preflight → tampilkan tampered vs trusted data → confirmation → create request → execute request → load event dan refresh log.

### Temuan detail

| Prioritas | Temuan | Rekomendasi |
|---|---|---|
| P1 | Tab utama belum memakai semantics tab lengkap (`tablist`, `tab`, `aria-selected`, `tabpanel`) | Tambahkan semantics dan keyboard Arrow/Home/End |
| P1 | Drawer belum punya focus trap dan restore focus | Trap focus saat open, kembalikan focus ke row pemicu saat close |
| P1 | `getIntegrityBadge()` mereduksi semua status selain `valid` menjadi `INVALID`; test sekarang mengunci `pending` dan `agent_matched` sebagai invalid | Pisahkan `VALID`, `PENDING`, `INVALID`, `UNREACHABLE`, `NOT_CHECKED` |
| P1 | Badge verification di beberapa area berupa `span` clickable | Ganti button dengan accessible name |
| P2 | JSON/raw metadata tampil tanpa kebijakan masking | Mask field sensitif dan batasi copy/download berdasarkan role |
| P2 | Close drawer memakai `setTimeout` tanpa cleanup | Simpan timeout di ref dan clear saat unmount |

## 4. Audit Recovery Center

Komponen: `src/components/dashboard/recovery/RecoveryDataView.jsx`.

Fitur yang sudah ada:

- Tab **Tampered Incidents** dan **Recovery History**.
- Search dan status filter dinamis.
- Checkbox per row dan master checkbox.
- Tombol **Select all ... incidents (N)** yang hanya memilih record sesuai filter/search.
- **Clear selection**, **Preview selected**, preflight, confirmation, dan result cards.
- Incident `RESOLVED/RECOVERED` tetap dapat dipilih untuk review.
- Recovery history read-only dengan modal detail.
- Polling 5 detik ketika ada event yang menunggu verifikasi otomatis.
- Idempotency key untuk recovery request.

Temuan:

| Prioritas | Temuan | Dampak/rekomendasi |
|---|---|---|
| P0 | Select all mencakup incident closed; execute baru menyaring item ready | Bedakan **Select all for review** dan **Select all ready to recover**, atau tampilkan count `selected vs executable` lebih awal |
| P0 | Bulk execution menjalankan create+execute per incident melalui `Promise.all` | Pindahkan ke satu server-side recovery job dengan batch, lease, retry, progress, dan idempotency |
| P1 | Preview memanggil beberapa endpoint per incident | Tambahkan bulk preview/preflight endpoint terpaginated |
| P1 | `listAllEvents()` mengambil semua halaman histori ke memory browser | Gunakan pagination server-side |
| P1 | Latest results hanya state memory | Backend event/job harus menjadi source of truth agar refresh tidak menghilangkan hasil |

## 5. Audit animasi dan interaction

Animasi yang sudah ada: `spin`, `pulse-dot`, `fadeIn`, `slideIn`, `modalIn`, `drawerIn/out`, `chartSeriesIn`, `chartStrokeDraw`, `radar-ring`, `glow-pulse`, `shimmer`, `live-pulse`, `laser-scan`, dan `ac-verify-*`.

State UI yang disarankan:

- `isLoading`: initial load
- `isRefreshing`: refresh manual
- `isSubmitting`: request dikirim
- `isRunning`: job dikerjakan
- `isCompleted` / `isFailed`
- `isStale`: hasil ada tetapi belum terbaru
- `isUnavailable`: service tidak tersedia

Untuk job, gunakan fase: `Queued → Running → Verifying → Aggregating → Completed/Failed`. Jangan memakai satu label `Loading` untuk semua fase.

Gap animasi: belum ada aturan global `prefers-reduced-motion`. Tambahkan fallback; jangan memberi animasi berulang yang agresif pada status tampered/error.

## 6. Target arsitektur: client tidak melakukan Verify Range

Requirement yang dipakai: client tidak perlu memilih range lalu menunggu verifikasi sinkron. Pemeriksaan dijalankan Gateway/worker/cron; client hanya membaca status dan hasil.

Yang sudah ada di backend:

- Pipeline worker sekitar 10 detik untuk hashing, aggregating, anchoring, dan recovery anchoring.
- Tamper scanner dengan default interval 300 detik, batch 100, concurrency 2.
- Verifikasi otomatis recovery event setelah evidence ter-anchor.
- Endpoint sinkron `verify-range` masih membatasi range besar dan mengembalikan `VERIFY_RANGE_TOO_LARGE`.

Hapus dari FE client biasa:

- Date range picker khusus Verify Range.
- Tombol Verify Range.
- Pesan “persempit range” kepada client.
- Logic estimate/sync limit di browser.

Ganti dengan:

- Banner **Automated verification**.
- KPI **Last verified**, **Logs checked**, **Valid**, **Needs attention**, **Verification pending**.
- Filter hasil: All, Valid, Needs attention, Pending, Unavailable.
- Detail job read-only dan tombol **Refresh status**, bukan Verify now.

Flow target:

```text
Client DB/Agent
  -> Gateway pipeline: hash -> aggregate -> anchor
  -> Gateway verification worker/cron
  -> persist integrity_status + incident + verification_job
  -> client membaca overview, logs, incidents, dan job status
```

API read-only yang disarankan:

```text
GET /dashboard/overview
GET /dashboard/logs?page=&page_size=&integrity_status=&from=&to=
GET /dashboard/verification-jobs?status=&page=
GET /dashboard/verification-jobs/:job_id
GET /dashboard/recovery/incidents
GET /dashboard/recovery/events?page=&page_size=
```

Jika operator membutuhkan pemeriksaan ad-hoc:

```text
POST /dashboard/verification-jobs
body: {
  scope: "range" | "new_anchored" | "recovery_events",
  from: "server-validated RFC3339",
  to: "server-validated RFC3339",
  idempotency_key: "..."
}

202 Accepted: { job_id, status: "QUEUED", estimated_items }
```

Server wajib memvalidasi tenant, permission, batas waktu, dan batas item. Browser bukan sumber kebenaran untuk range atau integrity status.

Model minimal `verification_jobs`: `id`, `client_id`, `scope`, `from_time`, `to_time`, `as_of`, `status`, counters, `cursor/checkpoint`, `last_error`, `idempotency_key`, timestamps. Worker memakai batch, checkpoint, retry terbatas, lease, dan idempotency.

## 7. Status dan copy

| Internal | Copy client | Makna |
|---|---|---|
| `VALID` | Verified | Evidence cocok |
| `PENDING` | Verification pending | Belum selesai diperiksa |
| `INVALID/TAMPERED` | Needs attention | Ada mismatch/integrity issue |
| `UNREACHABLE` | Verification unavailable | Service pembanding tidak dapat dihubungi |
| `RECOVERING` | Recovery in progress | Job recovery aktif |
| `RECOVERED` | Recovered | Trusted data sudah dipulihkan |
| `NOT_CHECKED` | Not checked yet | Belum ada evidence |

Jangan menyamakan pending, unreachable, dan invalid.

## 8. Prioritas implementasi

### P0

1. Hilangkan Verify Range sinkron dari pengalaman client biasa.
2. Standarkan verification worker dan incident persistence di Gateway.
3. Buat `verification_jobs` dengan progress, checkpoint, dan idempotency.
4. Ubah recovery bulk execution menjadi server-side recovery job.
5. Perbaiki mapping status agar pending/unreachable tidak tampil INVALID.

### P1

1. Detail drawer dengan tab semantics dan focus management.
2. Pagination server-side untuk recovery history.
3. Bulk preview endpoint.
4. Overview endpoint agregat.
5. State last updated, stale, retry, dan error per panel.

### P2

1. Reduced motion.
2. Saved filters/views.
3. Export hasil verifikasi tersimpan di server.
4. Audit trail operator.
5. SSE atau adaptive polling untuk job status.

## 9. Acceptance criteria

- Client tidak memanggil `verify-range` saat dashboard dibuka.
- Client tidak pernah meminta user mempersempit range karena limit sinkron.
- Integrity status berasal dari worker yang tersimpan di Gateway.
- Overview menampilkan waktu verifikasi terakhir dan freshness.
- Log Details menyediakan Overview, History, Recovery.
- Recovery Center menyediakan Select all matching, Clear selection, preview, dan count ready-vs-selected.
- Bulk recovery membuat satu server job, bukan N request execute paralel dari browser.
- Refresh halaman tidak menghilangkan hasil job/recovery.
- Pending, unreachable, invalid, dan valid tampil berbeda.
- Drawer/modal mendukung Escape, focus restore, dan keyboard.
- Animasi memiliki reduced-motion fallback.
