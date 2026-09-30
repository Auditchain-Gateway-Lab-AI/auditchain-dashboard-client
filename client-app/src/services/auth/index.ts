import type { AuthService } from "@/services/auth/auth.service";
import { apiAuthService } from "@/services/auth/api-auth.service";
import { mockAuthService } from "@/services/auth/mock-auth.service";

const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

export const authService: AuthService = useMockAuth ? mockAuthService : apiAuthService;
