export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
