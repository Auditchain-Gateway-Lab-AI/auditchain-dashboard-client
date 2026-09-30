/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GATEWAY_PORTAL_URL?: string;
  readonly VITE_USE_MOCK_AUTH?: string;
  readonly VITE_USE_MOCK_DASHBOARD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
