import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Development server configuration
    server: {
      port: 3030,
      host: true,
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..']
      }
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      cssCodeSplit: false, // Bundle all CSS into a single file
      rollupOptions: {
        output: {
          manualChunks: undefined // Don't split CSS
        }
      }
    },

    // Resolve configuration for the softphone package
    resolve: {
      alias: {
        '@outbound-ai/softphone': './node_modules/@outbound-ai/softphone/lib/index.js'
      }
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['@outbound-ai/softphone']
    },

    // Public directory configuration
    publicDir: 'public',

    // Define global variables for browser compatibility
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(env.NODE_ENV || 'development'),
        PUBLIC_URL: JSON.stringify('/'),
        // Only expose APP_* environment variables for security
        APP_CLAIMS_URL: JSON.stringify(env.APP_CLAIMS_URL || ''),
        APP_SERVICE_URI: JSON.stringify(env.APP_SERVICE_URI || ''),
        APP_TENANT_ROLE_USER_URL: JSON.stringify(env.APP_TENANT_ROLE_USER_URL || ''),
        APP_PREFERRED_TENANT: JSON.stringify(env.APP_PREFERRED_TENANT || ''),
        APP_KEYCLOAK_URL: JSON.stringify(env.APP_KEYCLOAK_URL || ''),
        APP_KEYCLOAK_REALM: JSON.stringify(env.APP_KEYCLOAK_REALM || ''),
        APP_KEYCLOAK_CLIENT_ID: JSON.stringify(env.APP_KEYCLOAK_CLIENT_ID || ''),
        APP_REDIRECT_URI: JSON.stringify(env.APP_REDIRECT_URI || '')
      }
    }
  };
});
