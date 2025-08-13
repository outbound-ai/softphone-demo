import { defineConfig } from 'vite';

export default defineConfig({
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
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      PUBLIC_URL: JSON.stringify('/')
    }
  }
});
