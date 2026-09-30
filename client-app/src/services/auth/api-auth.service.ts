import { ApiError, apiClient } from "@/services/api/client";
import type { AuthService } from "@/services/auth/auth.service";
import type { AuthSession, AuthUser } from "@/types/auth";

const SESSION_STORAGE_KEY = "auditchain.client.session";

interface LoginResponse {
  token: string;
}

interface ProfileResponse {
  id: string;
  full_name: string;
  username: string;
  role: string;
  client_id: string;
  company_name: string;
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.token || !parsed.user) return null;
    return parsed as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function storeSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function mapProfile(profile: ProfileResponse): AuthUser {
  if (profile.role.trim().toLowerCase() === "admin") {
    throw new Error("Akun admin harus menggunakan Gateway Admin Portal.");
  }

  const clientId = profile.client_id?.trim();
  if (!clientId) {
    throw new Error("Akun ini belum terhubung ke workspace client.");
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.full_name?.trim() || profile.username,
    role: profile.role,
    workspace: {
      id: clientId,
      name: profile.company_name?.trim() || "Client workspace",
      organization: profile.company_name?.trim() || "Your organization",
    },
  };
}

function toSession(token: string, profile: ProfileResponse): AuthSession {
  return { token, user: mapProfile(profile) };
}

function mapAuthError(error: unknown): Error {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error : new Error("Login gagal. Silakan coba lagi.");
  }

  if (error.status === 0) return new Error("Backend tidak dapat dihubungi.");
  if (error.status === 401) return new Error("Username atau password salah.");
  if (error.status === 403) return new Error("Akun atau client sedang tidak aktif.");

  return new Error(error.message || "Login gagal. Silakan coba lagi.");
}

export const apiAuthService: AuthService = {
  async login(credentials) {
    try {
      const { token } = await apiClient.post<LoginResponse>("/auth/login", credentials);
      if (!token) throw new Error("Token login tidak ditemukan dari backend.");

      const profile = await apiClient.get<ProfileResponse>("/auth/me", token);
      const session = toSession(token, profile);
      storeSession(session);
      return session;
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async getCurrentSession() {
    const storedSession = readStoredSession();
    if (!storedSession) return null;

    try {
      const profile = await apiClient.get<ProfileResponse>("/auth/me", storedSession.token);
      const session = toSession(storedSession.token, profile);
      storeSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) throw error;
      clearStoredSession();
      return null;
    }
  },

  async logout() {
    clearStoredSession();
  },
};
