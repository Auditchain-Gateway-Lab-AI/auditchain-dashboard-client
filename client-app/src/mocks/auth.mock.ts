import type { AuthSession, LoginCredentials } from "@/types/auth";

export type MockAuthAccount = LoginCredentials & { session: AuthSession };

// The API will eventually return this workspace scope after authentication.
// Keeping it on the session lets one portal serve multiple client organizations.
export const MOCK_AUTH_ACCOUNTS: readonly MockAuthAccount[] = [
  {
    username: "client-demo",
    password: "password",
    session: {
      token: "mock-session-client-demo",
      user: {
        id: "usr_client_demo",
        username: "client-demo",
        displayName: "Client Demo",
        role: "Auditor",
        workspace: {
          id: "workspace-client-demo",
          name: "Demo Client Workspace",
          organization: "Example Organization",
        },
      },
    },
  },
  {
    // Kept as a fixture so existing local demos continue to work.
    username: "morbis1",
    password: "password",
    session: {
      token: "mock-session-auditchain-client",
      user: {
        id: "usr_morbis_1",
        username: "morbis1",
        displayName: "mbi",
        role: "Auditor",
        workspace: {
          id: "workspace-morbis-1",
          name: "SIMRS Morbis 1",
          organization: "RSUD Morbis — POLINEMA",
        },
      },
    },
  },
];

// Backwards-compatible named fixture for code that only needs the original demo account.
export const MOCK_AUTH = MOCK_AUTH_ACCOUNTS[1];
