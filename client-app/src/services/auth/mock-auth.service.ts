import { MOCK_AUTH_ACCOUNTS } from "@/mocks/auth.mock";
import type { AuthService } from "@/services/auth/auth.service";
import type { AuthSession, LoginCredentials } from "@/types/auth";

const SESSION_KEY = "auditchain.client.mock-session";
const wait = (duration = 300) => new Promise((resolve) => window.setTimeout(resolve, duration));

export class MockAuthService implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await wait();
    const account = MOCK_AUTH_ACCOUNTS.find(
      (candidate) => candidate.username === credentials.username && candidate.password === credentials.password,
    );

    if (!account) {
      throw new Error("Username atau password tidak sesuai.");
    }

    const session = structuredClone(account.session);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    await wait(220);
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthSession;
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async logout(): Promise<void> {
    await wait(200);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export const mockAuthService: AuthService = new MockAuthService();
