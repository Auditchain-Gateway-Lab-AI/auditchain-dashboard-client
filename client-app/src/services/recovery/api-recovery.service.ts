import { apiClient, ApiError } from "@/services/api/client";
import type {
  ClientDataTamperRecord,
  ClientRecoveryEventListResponse,
  ClientRecoveryEventQuery,
  ClientTamperListResponse,
  ClientTamperQuery,
  ClientTamperRecoverResponse,
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
    if (error.status === 0) return "The gateway could not be reached. Check your connection and try again.";
    if (error.status === 401) return "Your session has expired. Sign in again.";
    if (error.status === 403) return "Your account is not allowed to run recovery.";
    if (error.status === 404) return "The recovery API route was not found. Confirm the gateway supports recovery and RECOVERY_ENABLED is true.";
    if (error.status === 409) return `The recovery state changed: ${error.message}`;
    if (error.status === 503) return "The Agent, Fabric, or recovery service is unavailable.";
    return error.message || "The recovery request failed.";
  }
  return error instanceof Error ? error.message : "The recovery request failed.";
}

export class ApiRecoveryService implements RecoveryService {
  async getIncidents(token?: string): Promise<RecoveryIncident[]> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryIncident[]>>(
      "/dashboard/recovery/incidents",
      token,
    );
    return unwrapData(response) ?? [];
  }

  async getRequests(token?: string): Promise<RecoveryRequest[]> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryRequest[]>>(
      "/dashboard/recovery/requests",
      token,
    );
    return unwrapData(response) ?? [];
  }

  async getHistory(token?: string, page = 1): Promise<RecoveryEventPage> {
    if (!token) throw new Error("Client session is unavailable.");
    const params = new URLSearchParams({ page: String(Math.max(1, page)), page_size: "100", include_legacy: "false" });
    return apiClient.get<RecoveryEventPage>(
      `/dashboard/recovery/events?${params.toString()}`,
      token,
    );
  }

  async getIncident(token: string | undefined, incidentId: string): Promise<RecoveryIncidentDetail> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryIncidentDetail>>(
      `/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}`,
      token,
    );
    return unwrapData(response);
  }

  async getCandidates(token: string | undefined, incidentId: string): Promise<RecoveryCandidate[]> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryCandidate[]>>(
      `/dashboard/recovery/incidents/${encodeURIComponent(incidentId)}/candidates`,
      token,
    );
    const value = unwrapData(response);
    return Array.isArray(value) ? value : value ? [value as unknown as RecoveryCandidate] : [];
  }

  async runPreflight(token: string | undefined, incidentId: string): Promise<RecoveryPreflight> {
    if (!token) throw new Error("Client session is unavailable.");
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
    if (!token) throw new Error("Client session is unavailable.");
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
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.post<DataEnvelope<RecoveryRequest>>(
      `/dashboard/recovery/requests/${encodeURIComponent(requestId)}/execute`,
      {},
      token,
    );
    return unwrapData(response);
  }

  async getRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryRequest>>(
      `/dashboard/recovery/requests/${encodeURIComponent(requestId)}`,
      token,
    );
    return unwrapData(response);
  }

  async getEvent(token: string | undefined, eventId: string): Promise<RecoveryEvent> {
    if (!token) throw new Error("Client session is unavailable.");
    const response = await apiClient.get<DataEnvelope<RecoveryEvent>>(
      `/dashboard/recovery/events/${encodeURIComponent(eventId)}`,
      token,
    );
    return unwrapData(response);
  }

  async getClientTamperRecords(token?: string, query?: ClientTamperQuery): Promise<ClientTamperListResponse> {
    if (!token) throw new Error("Client session is unavailable.");
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.table_name) params.set("table_name", query.table_name);
    if (query?.resource) params.set("resource", query.resource);
    if (query?.search) params.set("search", query.search);
    if (query?.page) params.set("page", String(query.page));
    if (query?.page_size) params.set("page_size", String(query.page_size));

    const qs = params.toString();
    const endpoint = `/dashboard/client-tampering${qs ? `?${qs}` : ""}`;
    return apiClient.get<ClientTamperListResponse>(endpoint, token);
  }

  async getClientTamperRecord(token: string | undefined, id: string): Promise<ClientDataTamperRecord> {
    if (!token) throw new Error("Client session is unavailable.");
    return apiClient.get<ClientDataTamperRecord>(`/dashboard/client-tampering/${encodeURIComponent(id)}`, token);
  }

  async recoverClientTamperRecord(token: string | undefined, id: string): Promise<ClientTamperRecoverResponse> {
    if (!token) throw new Error("Client session is unavailable.");
    return apiClient.post<ClientTamperRecoverResponse>(
      `/dashboard/client-tampering/${encodeURIComponent(id)}/recover`,
      {},
      token,
    );
  }

  async dismissClientTamperRecord(token: string | undefined, id: string, notes?: string): Promise<ClientDataTamperRecord> {
    if (!token) throw new Error("Client session is unavailable.");
    return apiClient.post<ClientDataTamperRecord>(
      `/dashboard/client-tampering/${encodeURIComponent(id)}/dismiss`,
      { notes: notes || "" },
      token,
    );
  }

  async getClientRecoveryEvents(token?: string, query?: ClientRecoveryEventQuery): Promise<ClientRecoveryEventListResponse> {
    if (!token) throw new Error("Session client tidak tersedia.");
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.table_name) params.set("table_name", query.table_name);
    if (query?.resource) params.set("resource", query.resource);
    if (query?.search) params.set("search", query.search);
    if (query?.page) params.set("page", String(query.page));
    if (query?.page_size) params.set("page_size", String(query.page_size));

    const qs = params.toString();
    const endpoint = `/dashboard/client-recovery/events${qs ? `?${qs}` : ""}`;
    return apiClient.get<ClientRecoveryEventListResponse>(endpoint, token);
  }
}

export const apiRecoveryService = new ApiRecoveryService();
