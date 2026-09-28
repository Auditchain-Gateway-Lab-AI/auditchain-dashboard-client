import type { RecoveryService } from "@/services/recovery/recovery.service";
import { mockRecoveryService } from "@/services/recovery/mock-recovery.service";

// Swap this binding to apiRecoveryService when the Go recovery endpoints are available.
export const recoveryService: RecoveryService = mockRecoveryService;
