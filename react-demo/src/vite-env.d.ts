/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVICE_URI: string
  readonly VITE_APP_TENANT_ROLE_USER_URL: string
  readonly VITE_APP_CLAIMS_URL: string
  readonly VITE_APP_KEYCLOAK_CLIENT_REALM: string
  readonly VITE_APP_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
