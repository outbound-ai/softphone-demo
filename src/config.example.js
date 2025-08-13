// Configuration Example for Softphone Demo Application
//
// This application uses a two-tier configuration system:
// 1. Environment Variables (.env file) - Highest priority
// 2. Default Configuration (src/config.js) - Fallback values
//
// To configure the application:
// 1. Copy env.example to .env in the root directory
// 2. Update the .env file with your actual values
// 3. The application will automatically use environment variables if set,
//    otherwise fall back to default values in src/config.js

// API Configuration Environment Variables
// APP_CLAIMS_URL=https://your-claims-api-endpoint.com
// APP_SERVICE_URI=wss://your-websocket-endpoint.com
// APP_TENANT_ROLE_USER_URL=https://your-tenant-role-user-api-endpoint.com
// APP_PREFERRED_TENANT=your-preferred-tenant-id

// Keycloak Authentication Configuration Environment Variables
// APP_KEYCLOAK_URL=https://your-keycloak-server/auth
// APP_KEYCLOAK_REALM=your-realm-name
// APP_KEYCLOAK_CLIENT_ID=your-client-id
// APP_REDIRECT_URI=http://localhost:3030/

// Example .env file content:
/*
APP_CLAIMS_URL=https://your-claims-api-endpoint.com
APP_SERVICE_URI=wss://your-websocket-endpoint.com
APP_TENANT_ROLE_USER_URL=https://your-tenant-role-user-api-endpoint.com
APP_PREFERRED_TENANT=your-preferred-tenant-id
APP_KEYCLOAK_URL=https://your-keycloak-server/auth
APP_KEYCLOAK_REALM=your-realm-name
APP_KEYCLOAK_CLIENT_ID=your-client-id
APP_REDIRECT_URI=http://localhost:3030/
*/

// Configuration Priority:
// The application checks for configuration values in this order:
// 1. Environment variables (.env file) - Highest priority
// 2. Default values in src/config.js - Fallback values
//
// This allows you to override any configuration by setting environment variables
// while maintaining fallback defaults for development and testing.