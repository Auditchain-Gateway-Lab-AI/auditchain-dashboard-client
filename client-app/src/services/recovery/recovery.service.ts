import type {
  RecoveryCandidate,
  RecoveryEvent,
  RecoveryEventPage,
  RecoveryIncidentDetail,
  RecoveryIncidentPage,
  RecoveryPreflight,
  RecoveryRequest,
  RecoveryResourceCheck,
} from "@/types/recovery";

export interface CreateRecoveryRequestInput {
  incident_id: string;
  selected_log_id: string;
  reason: string;
  idempotency_key: string;
}

export interface RecoveryIncidentQuery {
  page: number;
  status: "OPEN" | "ACTIVE_RECOVERY";
  scope: "ALL" | "CLIENT_SOURCE" | "GATEWAY_INTEGRITY";
  search: string;
  sort: "newest" | "oldest" | "resource";
}

export interface RecoveryService {
  checkResource(token: string | undefined, resource: string): Promise<RecoveryResourceCheck>;
  getIncidents(token: string | undefined, query: RecoveryIncidentQuery): Promise<RecoveryIncidentPage>;
  getRequests(token?: string): Promise<RecoveryRequest[]>;
  getHistory(token?: string, page?: number): Promise<RecoveryEventPage>;
  getIncident(token: string | undefined, incidentId: string): Promise<RecoveryIncidentDetail>;
  getCandidates(token: string | undefined, incidentId: string): Promise<RecoveryCandidate[]>;
  runPreflight(token: string | undefined, incidentId: string): Promise<RecoveryPreflight>;
  createRequest(token: string | undefined, input: CreateRecoveryRequestInput): Promise<RecoveryRequest>;
  executeRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest>;
  getRequest(token: string | undefined, requestId: string): Promise<RecoveryRequest>;
  getEvent(token: string | undefined, eventId: string): Promise<RecoveryEvent>;
}
