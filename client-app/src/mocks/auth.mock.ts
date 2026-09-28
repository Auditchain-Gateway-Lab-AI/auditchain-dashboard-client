import type { AuthSession } from "@/types/auth";

export const MOCK_AUTH = {
  username: "morbis1",
  password: "password",
  session: {
    token: "mock-session-auditchain-client",
    user: {
      id: "usr_morbis_1",
      username: "morbis1",
      displayName: "mbi",
      role: "Auditor",
    },
  } satisfies AuthSession,
} as const;
