import type { AuthSession, LoginCredentials } from "@/types/auth";

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  getCurrentSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}
