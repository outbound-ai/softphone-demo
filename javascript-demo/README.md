# Softphone Demo Application

A browser-based softphone demo application using the @outbound-ai/softphone package. This application provides WebRTC audio capabilities with authentication via Keycloak and integration with outbound AI services.

## Recent Changes

### URL Pattern Support & Tenant Management
- ✅ **Multi-tenant URL support**: New pattern `/{tenant}/claims/claim/{claimId}` extracts tenant from URL
- ✅ **Backward compatibility**: Old pattern `/claims/claim/{claimId}` still supported with dynamic tenant fetching
- ✅ **Dual API endpoint support**: Automatically tries new tenant API endpoint with fallback to legacy endpoint
- ✅ **Smart tenant resolution**: 
  - New URLs: Tenant extracted from URL path
  - Old URLs: Fetched dynamically from API
  - Fallback: Uses environment variable `APP_PREFERRED_TENANT`

## Prerequisites

### Required Software

- **Node.js**: Version 20.19.0 or higher (required for Vite compatibility)
- **npm**: Version 10.0.0 or higher (required for modern package management)

### System Requirements

- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone and speakers/headphones for audio functionality
- Stable internet connection for WebSocket communication

## Setup and Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies including:
- `@outbound-ai/softphone` (v8.0.5) - Core softphone functionality
- `vite` (v7.0.6) - Build tool and development server
- `express` - HTTP server for production
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management

### 2. Configure Environment Variables

```bash
cp env.example .env
```

Edit `.env` with your configuration values:

```env
# API Configuration
APP_CLAIMS_URL=https://your-claims-api-endpoint.com
APP_SERVICE_URI=wss://your-websocket-service-endpoint.com
APP_TENANT_ROLE_USER_URL=https://your-tenant-role-user-api.com
APP_PREFERRED_TENANT=your-preferred-tenant-id

# Keycloak Authentication Configuration
APP_KEYCLOAK_URL=https://your-keycloak-server.com/
APP_KEYCLOAK_REALM=your-realm-name
APP_KEYCLOAK_CLIENT_ID=your-client-id
APP_REDIRECT_URI=http://localhost:3030/
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3030`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run preview` | Preview the production build locally |
| `npm run serve` | Start the Express server (production mode) |
| `npm start` | Start the Express server (alias for serve) |

## Usage

### 1. Authentication
- Navigate to `http://localhost:3030`
- Authenticate with Keycloak using your credentials
- The application will automatically handle token management

### 2. Starting a Call
- Enter a valid claim ID or URL in the input field (see URL Formats below)
- Click "Connect" to initiate the call
- Wait for the AI Agent to join the conversation

#### Supported URL Formats
The application supports multiple URL formats for flexibility:

**New URL Pattern (with tenant):**
```
/{tenant}/claims/claim/{claimId}
```
Example: `/abc123/claims/claim/456`
- Extracts tenant ID (`abc123`) from URL
- Stores tenant for subsequent API calls

**Old URL Pattern (without tenant):**
```
/claims/claim/{claimId}
```
Example: `/claims/claim/456`
- Fetches preferred tenant from API endpoints:
  - Primary: `TENANT_ROLE_USER_URL/api/v1/preferences/highest/outbound-ai-preferred-tenant`
  - Fallback: `CLAIMS_URL/api/v1/tenants/preferred`
- Falls back to `APP_PREFERRED_TENANT` env variable if API fails

**Direct Claim ID:**
```
{claimId}
```
Example: `8dc125d6-1da5-4f28-b06c-60c8d322ad8f` or `456`
- Fetches preferred tenant from API (same as old URL pattern)

**Full Domain URLs:**
```
https://console.example.com/claims/claim/{claimId}
```
- Automatically extracts claim ID
- Uses standard tenant fetching logic

### 3. Taking Over
- Click "Take Over" when you're ready to handle the call
- Use the audio controls to mute/unmute microphone and speaker
- Use the dialpad to send DTMF tones
- Type messages in the speech input field for text-to-speech

### 4. Audio Controls
- **Microphone**: Mute/unmute your microphone
- **Speaker**: Mute/unmute the speaker audio
- **Volume**: Adjust audio levels as needed

## Technical Implementation

### Tenant Resolution Logic

The application implements a sophisticated tenant resolution system:

**For New URL Pattern (`/{tenant}/claims/claim/{claimId}`):**
1. `extractTenantFromUrl()` extracts tenant from URL
2. Tenant stored in `localStorage.preferredTenant`
3. Used for all subsequent API calls

**For Old URL Pattern (`/claims/claim/{claimId}`):**
1. `fetchPreferredTenant()` called to fetch from API
2. Tries primary endpoint: `APP_TENANT_ROLE_USER_URL/api/v1/preferences/highest/outbound-ai-preferred-tenant`
3. Falls back to: `APP_CLAIMS_URL/api/v1/tenants/preferred`
4. Final fallback: `APP_PREFERRED_TENANT` environment variable
5. Result stored in `localStorage.preferredTenant`

### Modified Files

**src/auth.js:**
- Updated `fetchPreferredTenant()` with dual-endpoint support
- Primary: New tenant role user service endpoint
- Fallback: Legacy claims service endpoint

**src/utils.js:**
- Added `extractTenantFromUrl()` function
- Parses new URL pattern to extract tenant
- Distinguishes between relative and absolute URLs
- Exported to global window scope

**src/main.js:**
- Updated `handleConnect()` with URL pattern detection
- Tenant extraction and storage logic
- Modified API headers to use `localStorage.preferredTenant`
- Updated `startCall()`, `resolveClaimId()`, `checkJobStatus()` functions

### API Header Changes

All API calls now include:
```javascript
'outbound-ai-preferred-tenant': localStorage.getItem('preferredTenant') || 
                                 (process.env.APP_PREFERRED_TENANT || '')
```

This ensures tenant context is maintained across all API interactions.

## Troubleshooting

### Common Issues

1. **Port 3030 already in use**
   - Change the port in `vite.config.js` or kill the process using port 3030

2. **Audio not working**
   - Ensure microphone permissions are granted
   - Check browser WebRTC support
   - Verify audio devices are properly connected

3. **Authentication errors**
   - Verify Keycloak configuration in `.env`
   - Check network connectivity to Keycloak server
   - Ensure redirect URI matches Keycloak client configuration

4. **Build errors**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Update Node.js to a supported version


## Security Notes

- `.env` files are excluded from version control

