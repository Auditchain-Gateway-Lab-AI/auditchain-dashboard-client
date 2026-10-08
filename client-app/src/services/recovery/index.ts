import type { RecoveryService } from "@/services/recovery/recovery.service";
import { apiRecoveryService } from "@/services/recovery/api-recovery.service";

export const recoveryService: RecoveryService = apiRecoveryService;
