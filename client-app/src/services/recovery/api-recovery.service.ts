import { apiClient, ApiError } from "@/services/api/client";
import type {
  RecoveryCandidate,
  RecoveryEvent,
  RecoveryEventPage,
  RecoveryIncident,
  RecoveryIncidentDetail,
  RecoveryIncidentPage,
  RecoveryPreflight,
  RecoveryRequest,
  RecoveryResourceCheck,
} from "@/types/recovery";
import type { CreateRecoveryRequestInput, RecoveryIncidentQuery, RecoveryService } from "@/services/recovery/recovery.service";

interface DataEnvelope<T> {
  data: T;
}

const unwrapData = <T,>(response: DataEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return (response as DataEnvelope<T>).data;
  }
  return response as T;
};

const newIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `client-recovery-${crypto.randomUUID()}`;
  }
  return `client-recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function recoveryErrorMessage(error: unknown): string {
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof ApiError
    ? error.message
    : typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "Permintaan recovery gagal.";
  const code = message.trim().toLowerCase().split(":", 1)[0] || "";
  const knownReasons: Record<string, string> = {
    reference_not_latest_client_event: "Acuan temuan ini sudah digantikan event client yang lebih baru. Muat ulang daftar temuan; acuan lama tidak boleh dipulihkan.",
    incident_closed: "Temuan ini sudah ditutup atau acuannya telah tergantikan. Muat ulang daftar temuan.",
    agent_not_configured: "Fitur pemulihan sementara belum tersedia. Data client tidak diubah.",
    agent_recovery_token_missing: "Fitur pemulihan sementara belum tersedia. Data client tidak diubah.",
    agent_recovery_unreachable: "Data client belum dapat diperiksa. Data tidak diubah.",
    agent_recovery_client_unavailable: "Fitur pemulihan sementara belum tersedia. Data client tidak diubah.",
    agent_audit_trail_unavailable: "Catatan pembanding belum tersedia. Data client tidak diubah.",
    recovery_disabled: "Pemulihan belum tersedia untuk data ini. Data client tidak diubah.",
    agent_recovery_capability_unavailable: "Kelayakan pemulihan belum dapat dipastikan. Data client tidak diubah.",
    agent_recovery_capability_invalid: "Kelayakan pemulihan belum dapat dipastikan. Data client tidak diubah.",
    agent_recovery_disabled: "Pemulihan belum tersedia untuk data ini. Data client tidak diubah.",
    invalid_recovery_token: "Fitur pemulihan sementara belum tersedia. Data client tidak diubah.",
    invalid_token: "Fitur pemulihan sementara belum tersedia. Data client tidak diubah.",
    table_not_allowed: "Pemulihan belum dapat dilakukan untuk bagian data ini. Hubungi pengelola.",
    recovery_table_not_allowed: "Pemulihan belum dapat dilakukan untuk bagian data ini. Hubungi pengelola.",
    gateway_integrity_read_only: "Temuan ini mengenai log audit internal. Data client tidak diubah.",
    agent_direct_recovery_required: "Pemulihan belum tersedia untuk data ini. Hubungi pengelola.",
    operation_not_allowed: "Pemulihan belum dapat dilakukan untuk bagian data ini. Hubungi pengelola.",
    recovery_operation_not_allowed: "Pemulihan belum dapat dilakukan untuk bagian data ini. Hubungi pengelola.",
    payload_incomplete: "Catatan pembanding belum lengkap. Pemulihan ditahan dan data client tidak diubah.",
    reference_payload_redacted: "Catatan pembanding belum lengkap. Pemulihan ditahan dan data client tidak diubah.",
    desired_state_redacted: "Catatan pembanding belum lengkap. Pemulihan ditahan dan data client tidak diubah.",
    column_not_allowed: "Pemulihan belum dapat dilakukan untuk bagian data ini. Hubungi pengelola.",
    column_not_updateable: "Perubahan ini belum dapat dipulihkan. Data client tidak diubah.",
    column_not_insertable: "Perubahan ini belum dapat dipulihkan. Data client tidak diubah.",
    recovery_not_required: "Data client sudah sesuai dengan catatan pembanding. Tidak ada yang perlu dipulihkan.",
    client_state_not_comparable: "Data client belum dapat dibandingkan secara lengkap. Pemulihan ditahan sampai pemeriksaan dapat dipastikan.",
    source_state_changed: "Data berubah sejak pemeriksaan terakhir. Muat ulang sebelum melanjutkan.",
    expected_before_hash_mismatch: "Data berubah sejak pemeriksaan terakhir. Muat ulang sebelum melanjutkan.",
    readback_mismatch: "Hasil pemulihan belum dapat dipastikan. Temuan perlu ditinjau sebelum mencoba lagi.",
    cdc_event_ambiguous: "Hasil pemulihan belum dapat dipastikan. Temuan perlu ditinjau sebelum mencoba lagi.",
    execution_timeout_unknown: "Status pemulihan belum dapat dipastikan. Muat ulang status sebelum mencoba lagi.",
    invalid_request_state: "Status pemulihan sudah berubah. Muat ulang sebelum mengambil tindakan berikutnya.",
    audit_trail_record_not_found: "Catatan pembanding belum tersedia. Data client tidak diubah.",
    audit_trail_reference_missing: "Catatan pembanding belum tersedia. Data client tidak diubah.",
    audit_trail_lookup_ambiguous: "Catatan pembanding belum dapat dipastikan. Data client tidak diubah.",
    audit_trail_reference_ambiguous: "Catatan pembanding belum dapat dipastikan. Data client tidak diubah.",
    audit_trail_reference_hash_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan.",
    reference_local_hash_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan.",
    reference_merkle_proof_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan.",
    reference_fabric_root_mismatch: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan.",
    reference_anchor_missing: "Catatan pembanding belum dapat dipastikan. Pemulihan ditahan.",
    client_source_unreachable: "Data client belum dapat diperiksa. Data tidak diubah.",
  };
  if (knownReasons[code]) return knownReasons[code];
  if (status === 0) return "Layanan belum dapat dihubungi. Coba lagi sebentar.";
  if (status === 401) return "Sesi berakhir. Silakan login kembali.";
  if (status === 403) return "Akun ini tidak memiliki izin untuk melakukan pemulihan.";
  if (status === 404) return "Catatan yang diperlukan belum tersedia. Pastikan nama bagian dan ID data benar.";
  if (status === 409) return "Data berubah sejak pemeriksaan terakhir. Muat ulang sebelum melanjutkan.";
  if (status === 502 || status === 503) return "Status pemulihan belum dapat dipastikan. Muat ulang status sebelum mencoba lagi.";
  if (status === 422) return "Pemulihan belum dapat dilakukan berdasarkan pemeriksaan saat ini.";
  if (message === "Session client tidak tersedia.") return "Sesi tidak tersedia. Silakan login kembali.";
  if (message.startsWith("Gunakan format TABEL:ID")) return message;
  if (message.startsWith("Belum ada catatan pembanding")) return message;
  return "Permintaan belum dapat diselesaikan. Coba lagi atau hubungi pengelola.";
}

export class ApiRecoveryService implements RecoveryService {
  async checkResource(token: string | undefined, resource: string): Promise<RecoveryResourceCheck> {
    if (!token) throw new Error("Session client tidak tersedia.");
    resource = resource.replace(/^([^:]+):/, (_, table: string) => `${table.toUpperCase()}:`);
    if (!/^[A-Za-z][A-Za-z0-9_$#]*:[^\s:/]+$/.test(resource)) {
      throw new Error("Gunakan format TABEL:ID, misalnya RUANGAN:1046.");
    }
    let response: RecoveryResourceCheck;
    try {
      response = await apiClient.get<RecoveryResourceCheck>(`/dashboard/verify-resource/${encodeURIComponent(resource)}`, token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw new Error("Belum ada catatan pembanding untuk data ini. Pastikan nama bagian dan ID data benar.");
      // A proof conflict is a diagnostic result, not a transport failure.
      if (!(error instanceof ApiError) || error.status !== 409 || !error.details || typeof error.details !== "object") throw error;
      response = error.details as RecoveryResourceCheck;
    }
    if (response.resource !== resource || !Array.isArray(response.logs) || typeof response.chain_status !== "string") {
      throw new Error("Hasil pemeriksaan belum dapat dipastikan.");
    }
    return response;
  }

  async getIncidents(token: string | undefined, query: RecoveryIncidentQuery): Promise<RecoveryIncidentPage> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const params = new URLSearchParams({
      status: "OPEN",
      recovery_status: query.status,
      scope: query.scope,
      search: query.search.trim(),
      sort: query.sort,
      page: String(Math.max(1, query.page)),
      page_size: "50",
    });
    const response = await apiClient.get<RecoveryIncidentPage | DataEnvelope<RecoveryIncident[]> | RecoveryIncident[]>(
      `/dashboard/recovery/incidents?${params.toString()}`,
      token,
    );
    if (!Array.isArray(response) && "total_items" in response && Array.isArray(response.data)) {
      return { ...response, server_paged: true };
    }
    const incidents = unwrapData(response as DataEnvelope<RecoveryIncident[]> | RecoveryIncident[]);
    const rows = (Array.isArray(incidents) ? incidents : []).filter((incident) =>
      query.scope === "ALL" || incident.incident_scope === query.scope,
    );
    return {
      data: rows,
      page: 1,
      page_size: 50,
      total_items: rows.length,
      total_pages: Math.max(1, Math.ceil(rows.length / 50)),
      open_count: rows.filter((incident) => incident.status === "OPEN").length,
      active_count: 0,
      server_paged: false,
    };
  }

  async getRequests(token?: string): Promise<RecoveryRequest[]> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryRequest[]> | RecoveryRequest[]>(
      "/dashboard/recovery/requests",
      token,
    );
    const requests = unwrapData(response);
    return Array.isArray(requests) ? requests : [];
  }

  async getHistory(token?: string, page = 1): Promise<RecoveryEventPage> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const params = new URLSearchParams({ page: String(Math.max(1, page)), page_size: "100", include_legacy: "false" });
    return apiClient.get<RecoveryEventPage>(
      `/dashboard/recovery/events?${params.toString()}`,
      token,
    );
  }

  async getIncident(token: string | undefined, incidentId: string): Promise<RecoveryIncidentDetail> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryIncidentDetail>>(
      `/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}`,
      token,
    );
    return unwrapData(response);
  }

  async getCandidates(token: string | undefined, incidentId: string): Promise<RecoveryCandidate[]> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryCandidate[]>>(
      `/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/candidates`,
      token,
    );
    const value = unwrapData(response);
    return Array.isArray(value) ? value : value ? [value as unknown as RecoveryCandidate] : [];
  }

  async runPreflight(token: string | undefined, incidentId: string): Promise<RecoveryPreflight> {
    if (!token) throw new Error("Session client tidak tersedia.");
    return apiClient.post<RecoveryPreflight>(
      `/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/preflight`,
      {},
      token,
    );
  }

  async createRequest(
    token: string | undefined,
    input: CreateRecoveryRequestInput,
  ): Promise<RecoveryRequest> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const payload = {
      ...input,
      idempotency_key: input.idempotency_key || newIdempotencyKey(),
    };
    const response = await apiClient.post<DataEnvelope<RecoveryRequest>>(
      "/dashboard/recovery/requests",
      payload,
      token,
    );
    return unwrapData(response);
  }

  async executeRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.post<DataEnvelope<RecoveryRequest>>(
      `/dashboard/recovery/requests/${encodeURIComponent(requestId)}/execute`,
      {},
      token,
    );
    return unwrapData(response);
  }

  async getRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryRequest>>(
      `/dashboard/recovery/requests/${encodeURIComponent(requestId)}`,
      token,
    );
    return unwrapData(response);
  }

  async getEvent(token: string | undefined, eventId: string): Promise<RecoveryEvent> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryEvent>>(
      `/dashboard/recovery/events/${encodeURIComponent(eventId)}`,
      token,
    );
    return unwrapData(response);
  }
}

export const apiRecoveryService = new ApiRecoveryService();
