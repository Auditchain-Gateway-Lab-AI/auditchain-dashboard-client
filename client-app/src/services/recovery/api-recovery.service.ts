import { apiClient, ApiError } from "@/services/api/client";
import type {
  RecoveryCandidate,
  RecoveryEvent,
  RecoveryEventPage,
  RecoveryIncident,
  RecoveryIncidentDetail,
  RecoveryPreflight,
  RecoveryRequest,
} from "@/types/recovery";
import type { CreateRecoveryRequestInput, RecoveryService } from "@/services/recovery/recovery.service";

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
  if (error instanceof ApiError) {
    if (error.status === 0) return "Gateway tidak dapat dihubungi. Periksa koneksi lalu coba lagi.";
    if (error.status === 401) return "Sesi berakhir. Silakan login kembali.";
    if (error.status === 403) return "Akun ini tidak memiliki izin untuk menjalankan recovery.";
    if (error.status === 404) return "Fitur recovery belum diaktifkan pada gateway ini.";
    if (error.status === 409) return `Kondisi recovery berubah: ${error.message}`;
    if (error.status === 503) return "Agent, Fabric, atau layanan recovery sedang tidak tersedia.";
    return error.message || "Permintaan recovery gagal.";
  }
  return error instanceof Error ? error.message : "Permintaan recovery gagal.";
}

export class ApiRecoveryService implements RecoveryService {
  async getIncidents(token?: string): Promise<RecoveryIncident[]> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryIncident[]>>(
      "/dashboard/recovery/incidents",
      token,
    );
    return unwrapData(response) ?? [];
  }

  async getRequests(token?: string): Promise<RecoveryRequest[]> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const response = await apiClient.get<DataEnvelope<RecoveryRequest[]>>(
      "/dashboard/recovery/requests",
      token,
    );
    return unwrapData(response) ?? [];
  }

  async getHistory(token?: string): Promise<RecoveryEventPage> {
    if (!token) throw new Error("Session client tidak tersedia.");
    return apiClient.get<RecoveryEventPage>(
      "/dashboard/recovery/events?page=1&page_size=100&include_legacy=false",
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
