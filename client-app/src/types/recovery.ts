export type RecoveryIncidentStatus = "OPEN" | "RESOLVED" | "RECOVERED" | string;
export type RecoveryIncidentScope = "CLIENT_SOURCE" | "GATEWAY_INTEGRITY" | string;
export type RecoverySourceStatus =
  | "MATCHED"
  | "MISMATCH"
  | "MISSING"
  | "UNEXPECTED_PRESENT"
  | "UNREACHABLE"
  | "NOT_COMPARABLE"
  | string;
export type RecoveryOperation = "UPSERT" | "DELETE" | "NOOP" | string;
export type RecoveryRequestStatus =
  | "PENDING_EXECUTION"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "APPLIED_AWAITING_CDC"
  | "APPLIED_CDC_TIMEOUT"
  | "SUCCEEDED"
  | "FAILED_VERIFICATION"
  | "FAILED_EXECUTION"
  | "REJECTED"
  | string;

export interface RecoveryIncident {
  id: string;
  client_id: string;
  log_id: string;
  reference_log_id?: string;
  resource: string;
  incident_type: string;
  expected_hash?: string;
  detected_hash?: string;
  status: RecoveryIncidentStatus;
  incident_scope: RecoveryIncidentScope;
  source_status?: RecoverySourceStatus;
  detected_state_hash?: string;
  discrepancy_summary?: string | Array<{ field?: string; changed?: boolean }>;
  detected_at: string;
  resolved_at?: string | null;
}

export interface RecoveryIncidentDetail extends RecoveryIncident {
  tampered_metadata?: unknown;
  tampered_evidence_available?: boolean;
}

export interface RecoveryCandidate {
  log_id: string;
  resource?: string;
  operation?: RecoveryOperation;
  reference_log_hash?: string;
  reference_merkle_root?: string;
  reference_anchor_id?: string;
  source_status?: RecoverySourceStatus;
  eligible: boolean;
  reason?: string;
}

export interface RecoveryTrustedPreview {
  actor?: string;
  action?: string;
  resource?: string;
  timestamp?: string;
  source_system?: string;
  authorization_context?: string;
  source_record_id?: string;
  metadata?: unknown;
}

export interface RecoveryPreflight {
  status: string;
  recoverable: boolean;
  log_id: string;
  current_hash?: string;
  current_integrity?: string;
  snapshot_hash?: string;
  merkle_root?: string;
  anchor_id?: string;
  object_version_id?: string;
  operation?: RecoveryOperation;
  reference_log_hash?: string;
  fabric_root?: string;
  client_state_hash?: string;
  desired_state_hash?: string;
  source_status?: RecoverySourceStatus;
  agent_status?: string;
  source_found?: boolean;
  snapshot_preview?: RecoveryTrustedPreview;
}

export interface RecoveryRequest {
  id: string;
  client_id: string;
  incident_id: string;
  target_log_id: string;
  selected_log_id: string;
  resource: string;
  operation?: RecoveryOperation;
  status: RecoveryRequestStatus;
  cdc_status?: string;
  result_audit_log_id?: string;
  recovery_event_id?: string;
  requested_by?: string;
  executed_by?: string;
  reason?: string;
  before_hash?: string;
  after_hash?: string;
  failure_reason?: string;
  requested_at?: string;
  executed_at?: string | null;
  execution_started_at?: string | null;
}

export interface RecoveryEvent {
  id: string;
  client_id: string;
  request_id?: string;
  incident_id?: string;
  target_log_id?: string;
  selected_log_id?: string;
  event_type?: string;
  result_status: string;
  operation?: RecoveryOperation;
  resource: string;
  target_actor?: string;
  target_action?: string;
  target_timestamp?: string;
  source_system?: string;
  target_source_system?: string;
  recovered_metadata?: unknown;
  executor_system?: string;
  executed_by?: string;
  before_hash?: string;
  after_hash?: string;
  client_before_hash?: string;
  client_after_hash?: string;
  cdc_status?: string;
  result_audit_log_id?: string;
  failure_code?: string;
  failure_reason?: string;
  executed_at: string;
  pipeline_status?: string;
  integrity_status?: string;
  integrity_error?: string;
  snapshot_status?: string;
  legacy?: boolean;
}

export interface RecoveryEventPage {
  data: RecoveryEvent[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface RecoveryPreviewItem {
  incident: RecoveryIncidentDetail;
  candidate?: RecoveryCandidate;
  preflight?: RecoveryPreflight;
  request?: RecoveryRequest;
  ready: boolean;
  error?: string;
}

export interface RecoveryExecutionItem {
  incident: RecoveryIncidentDetail;
  request?: RecoveryRequest;
  event?: RecoveryEvent;
  error?: string;
}
