export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ClientWorkspace {
  id: string;
  name: string;
  organization: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  workspace: ClientWorkspace;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
