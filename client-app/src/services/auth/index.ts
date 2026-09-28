import type { AuthService } from "@/services/auth/auth.service";
import { mockAuthService } from "@/services/auth/mock-auth.service";

// Swap this binding to an API implementation when the Go authentication endpoints are ready.
export const authService: AuthService = mockAuthService;
