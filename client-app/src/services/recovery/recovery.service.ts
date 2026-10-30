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

export interface CreateRecoveryRequestInput {
  incident_id: string;
  selected_log_id: string;
  reason: string;
  idempotency_key: string;
}

export interface RecoveryService {
  getIncidents(token?: string): Promise<RecoveryIncident[]>;
  getRequests(token?: string): Promise<RecoveryRequest[]>;
  getHistory(token?: string, page?: number): Promise<RecoveryEventPage>;
  getIncident(token: string | undefined, incidentId: string): Promise<RecoveryIncidentDetail>;
  getCandidates(token: string | undefined, incidentId: string): Promise<RecoveryCandidate[]>;
  runPreflight(token: string | undefined, incidentId: string): Promise<RecoveryPreflight>;
  createRequest(token: string | undefined, input: CreateRecoveryRequestInput): Promise<RecoveryRequest>;
  executeRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest>;
  getRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest>;
  getEvent(token: string | undefined, eventId: string): Promise<RecoveryEvent>;
  getClientTamperRecords?(token?: string, query?: ClientTamperQuery): Promise<ClientTamperListResponse>;
  getClientTamperRecord?(token: string | undefined, id: string): Promise<ClientDataTamperRecord>;
  recoverClientTamperRecord?(token: string | undefined, id: string): Promise<ClientTamperRecoverResponse>;
  dismissClientTamperRecord?(token: string | undefined, id: string, notes?: string): Promise<ClientDataTamperRecord>;
  getClientRecoveryEvents?(token?: string, query?: ClientRecoveryEventQuery): Promise<ClientRecoveryEventListResponse>;
}
