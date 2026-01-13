import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Map mode to environment configurations
  const envConfig = {
    local: {
      SERVICE_URI: 'ws://localhost:5001',
      TENANT_ROLE_USER_URL: '',
      CLAIMS_URL: '',
      KEYCLOAK_CLIENT_REALM: 'dev',
      ENV: 'local',
    },
    dev: {
      SERVICE_URI: 'wss://nayans-calls.phoenix.dev.virtualoutbound.com',
      TENANT_ROLE_USER_URL: 'https://nayans-tenantroleuser.phoenix.dev.virtualoutbound.com',
      CLAIMS_URL: 'https://nayans-claims.phoenix.dev.virtualoutbound.com',
      KEYCLOAK_CLIENT_REALM: 'dev',
      ENV: 'dev',
    },
    'pre-staging': {
      SERVICE_URI: 'wss://pre-staging-calls.phoenix.stg.outbound.ai',
      TENANT_ROLE_USER_URL: 'https://pre-staging-tenantroleuser.phoenix.stg.outbound.ai',
      CLAIMS_URL: 'https://pre-staging-claims.phoenix.stg.outbound.ai',
      KEYCLOAK_CLIENT_REALM: 'stg',
      ENV: 'pre-staging',
    },
    prod: {
      SERVICE_URI: 'wss://calls.phoenix.outbound.ai',
      TENANT_ROLE_USER_URL: 'https://tenantroleuser.phoenix.outbound.ai',
      CLAIMS_URL: 'https://claims.phoenix.outbound.ai',
      KEYCLOAK_CLIENT_REALM: 'prod',
      ENV: 'prod',
    },
  };

  const currentEnvConfig = envConfig[mode as keyof typeof envConfig] || envConfig.prod;

  return {
    plugins: [react()],
    publicDir: 'public',
    base: '/',
    define: {
      'process.env': {},
      'process.env.PUBLIC_URL': JSON.stringify(''),
      'import.meta.env.VITE_APP_SERVICE_URI': JSON.stringify(currentEnvConfig.SERVICE_URI),
      'import.meta.env.VITE_APP_TENANT_ROLE_USER_URL': JSON.stringify(currentEnvConfig.TENANT_ROLE_USER_URL),
      'import.meta.env.VITE_APP_CLAIMS_URL': JSON.stringify(currentEnvConfig.CLAIMS_URL),
      'import.meta.env.VITE_APP_KEYCLOAK_CLIENT_REALM': JSON.stringify(currentEnvConfig.KEYCLOAK_CLIENT_REALM),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(currentEnvConfig.ENV),
    },
    server: {
      port: mode === 'local' ? 3000 : 3030,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    build: {
      outDir: 'build',
      sourcemap: true,
    },
  };
});
