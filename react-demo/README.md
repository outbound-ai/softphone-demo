# Outbound.Calls.Softphone.Demo
A demonstration of using the [@outbound-ai/softphone] NPM package package with a [create-react-app](https://create-react-app.dev/) project template.

## Recent Changes

### Softphone Package v8.0.7 Update
- 🔄 **Upgraded to @outbound-ai/softphone v8.0.7**
- ✅ **New `getConversationAsync` signature**: Now requires tenant parameter
  ```typescript
  callService.getConversationAsync(jobId, token, tenant)
  ```
- ✅ **Tenant context propagation**: Tenant ID now passed to WebSocket connection initialization

### URL Pattern Support & Tenant Management
- ✅ **Multi-tenant URL support**: New pattern `/{tenant}/claims/claim/{claimId}` extracts tenant from URL
- ✅ **Backward compatibility**: Old pattern `/claims/claim/{claimId}` still supported with dynamic tenant fetching  
- ✅ **Dual API endpoint support**: Automatically tries new tenant API endpoint with fallback to legacy endpoint
- ✅ **Smart tenant resolution**:
  - New URLs: Tenant extracted from URL path
  - Old URLs: Fetched dynamically from API
  - Fallback: Uses environment variable `VITE_APP_PREFERRED_TENANT`
- ✅ **Enhanced API integration**: Updated `fetchPreferedTenant()` to support both new and legacy endpoints

## Notes
- You will need to configure your ~/.npmrc file like this to access the [@outbound-ai/softphone] NPM package and run ```npm install```.

    ```
    //npm.pkg.github.com/:_authToken={YOUR_PAT_TOKEN_HERE}
    @outbound-ai:registry=https://npm.pkg.github.com
    ```

- You can then use  ```npm run start``` to launch this project against a local instance of the call service  See the package.json file for the environment variables if you want to run this against other deployments of the service.

- If you experience a problem, verify that the package.json is referencing the current version of the [@outbound-ai/softphone] NPM package and run ```npm update```. Sometimes a local reference gets checked in.

# Softphone Application Component (src/softphone/Softphone.tsx)

The main Softphone application component.

This component manages the state and UI for a softphone demo, including conversation management,
participant handling, transcript display, dialpad interactions, mute/unmute controls, agent takeover,
and synthesized speech functionality.

## State Variables
- _conversation: The current active conversation instance.
- _connected: Indicates if the softphone is connected to a conversation.
- _muted: Indicates if the output (speaker) is muted.
- _speechMessage: The current text input for speech synthesis.
- _transcript: Array of transcript messages exchanged in the conversation.
- _takeOverType: The current agent takeover type.
- _participants: A record of participant IDs and their display names.
- _hasTakenOver: Indicates if the agent has taken over the conversation.
- _payerAgentReady: Indicates if the payer agent is ready to take over.

## Effects
- Sets up conversation event handlers for connection state, transcript updates, and agent hold events.
- Handles agent takeover confirmation when the payer agent is ready.

## Event Handlers
- handleClickConnectAsync: Connects or disconnects the softphone from a conversation.
- handleClickMute: Toggles speaker mute state.
- handleClickMuteInput: Toggles microphone mute state.
- createHandleClickRemoveParticipant: Removes a participant from the conversation.
- handleSpeechMessageChanged: Updates the speech message input.
- handleSubmitSynthesizedSpeech: Submits text for speech synthesis.
- createHandleClickSendDtmfCode: Sends DTMF codes via the dialpad.
- handleHangup: Hangs up the current conversation.

## UI Elements
- Claim ID input field for starting a call.
- Mute/unmute speaker and microphone buttons.
- Agent takeover and hangup buttons.
- Transcript panel displaying exchanged messages.
- Dialpad for sending DTMF codes.
- Synthesized speech input and submit form.
- Participant list
- End call - Hangup

## URL Pattern Support

The application supports multiple URL formats for claim IDs, providing flexibility and backward compatibility:

### New URL Pattern (Multi-Tenant)
```
/{tenant}/claims/claim/{claimId}
```
**Example:** `/abc123/claims/claim/456`

- Extracts tenant ID (`abc123`) from the URL path
- Extracts claim ID (`456`) from the URL path
- Stores tenant in localStorage for all API calls
- No additional API call needed for tenant

### Old URL Pattern (Legacy)
```
/claims/claim/{claimId}
```
**Example:** `/claims/claim/456`

- Extracts only the claim ID from the URL
- Dynamically fetches preferred tenant via API:
  - **Primary endpoint:** `VITE_APP_TENANT_ROLE_USER_URL/api/v1/preferences/highest/outbound-ai-preferred-tenant`
  - **Fallback endpoint:** `VITE_APP_CLAIMS_URL/api/v1/tenants/preferred`
- Falls back to `VITE_APP_PREFERRED_TENANT` environment variable if both API calls fail

### Direct Claim ID
```
{claimId}
```
**Examples:** 
- UUID: `8dc125d6-1da5-4f28-b06c-60c8d322ad8f`
- Numeric: `456`

- Fetches preferred tenant from API (same as old URL pattern)
- Supports both UUID and numeric claim IDs

### Full Domain URLs
```
https://console.example.com/claims/claim/{claimId}
```
- Automatically extracts claim ID from full domain URLs
- Uses standard tenant fetching logic

## API Endpoints

### Tenant Configuration
The application uses two endpoints for fetching preferred tenant (with automatic fallback):

1. **New Endpoint (Primary):**
   - URL: `VITE_APP_TENANT_ROLE_USER_URL/api/v1/preferences/highest/outbound-ai-preferred-tenant`
   - Response: `{ value: "tenant-id" }`

2. **Old Endpoint (Fallback):**
   - URL: `VITE_APP_CLAIMS_URL/api/v1/tenants/preferred`
   - Response: `{ tenantId: "tenant-id" }`

This dual-endpoint approach ensures backward compatibility while supporting new infrastructure.

## Technical Implementation

### Modified Components

**src/softphone/api.ts:**
- `fetchPreferedTenant()` function for retrieving preferred tenant
- Uses `VITE_APP_TENANT_ROLE_USER_URL` endpoint
- Returns tenant value from API response

- **Updated `getConversationAsync()` call** to pass tenant parameter:
  ```typescript
  const tenant = localStorage.getItem("preferredTenant") || 
                 import.meta.env.VITE_APP_PREFERRED_TENANT;
  conversation = await callService.getConversationAsync(jobId, token, tenant);
  ```
**src/softphone/Softphone.tsx:**
- Enhanced `handleClickConnectAsync()` with URL pattern detection
- Tenant extraction logic using regex patterns:
  - `newUrlPattern`: `/\/([^\/\s]+)\/claims\/claim\/([^\/\s]+)$/`
  - `oldUrlPattern`: `/\/claims\/claim\/([^\/\s]+)/`
- Stores extracted tenant in `localStorage.preferredTenant`
- Falls back to `VITE_APP_PREFERRED_TENANT` for old URLs
- Updated all API calls to include tenant in headers

### Tenant Resolution Flow

```typescript
// 1. Parse URL from input
const input = document.getElementById("claimid") as HTMLInputElement;
const inputValue = input.value;

// 2. Check URL pattern
const newUrlPattern = /\/([^\/\s]+)\/claims\/claim\/([^\/\s]+)$/;
const match = inputValue.match(newUrlPattern);

// 3. Extract or fetch tenant
if (match && !isDomainUrl) {
  // New pattern - extract tenant from URL
  const tenant = match[1];
  localStorage.setItem("preferredTenant", tenant);
} else {
  // Old pattern - use environment variable
  localStorage.setItem("preferredTenant", import.meta.env.VITE_APP_PREFERRED_TENANT);
}

// 4. Use tenant in API calls
const tenant = localStorage.getItem("preferredTenant") || 
               import.meta.env.VITE_APP_PREFERRED_TENANT;
```

### API Integration

All API calls include the tenant in request headers:
```typescript
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
  "currentUser": localStorage.getItem("currentUser") || "",
  "outbound-ai-preferred-tenant": tenant,
  "refresh_token": localStorage.getItem("refreshToken") || "",
}
```

### Environment Configuration

The application uses Vite's environment variable system with mode-specific configurations in `vite.config.ts`:
- `local`: Local development
- `dev`: Development environment
- `pre-staging`: Staging environment
- `prod`: Production environment

Each mode defines:
- `SERVICE_URI`: WebSocket service endpoint
- `TENANT_ROLE_USER_URL`: Tenant preferences API
- `CLAIMS_URL`: Claims API endpoint
- `KEYCLOAK_CLIENT_REALM`: Authentication realm
- `APP_PREFERRED_TENANT`: Default tenant ID

## Breaking Changes in v8.0.7

### Updated `getConversationAsync` Method

The `@outbound-ai/softphone` package (v8.0.7) introduced a **breaking change** to the `getConversationAsync` method signature:

**Previous signature (v8.0.6 and earlier):**
```typescript
callService.getConversationAsync(jobId: string, token: string)
```

**New signature (v8.0.7+):**
```typescript
callService.getConversationAsync(jobId: string, token: string, tenant: string)
```

**Migration:**
```typescript
// Before (v8.0.6)
const conversation = await callService.getConversationAsync(jobId, token);

// After (v8.0.7+)
const tenant = localStorage.getItem("preferredTenant") || 
               import.meta.env.VITE_APP_PREFERRED_TENANT;
const conversation = await callService.getConversationAsync(jobId, token, tenant);
```

**Why this change?**
- Enables multi-tenant support at the WebSocket connection level
- Ensures proper tenant context for all call operations
- Aligns with new URL pattern support for tenant-specific routing
- Provides tenant isolation for enhanced security and data segregation