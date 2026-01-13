# Softphone Demo Application

A browser-based softphone demo application using the @outbound-ai/softphone package. This application provides WebRTC audio capabilities with authentication via Keycloak and integration with outbound AI services.

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
- Enter a valid claim ID in the input field
- Click "Connect" to initiate the call
- Wait for the AI Agent to join the conversation

### 3. Taking Over
- Click "Take Over" when you're ready to handle the call
- Use the audio controls to mute/unmute microphone and speaker
- Use the dialpad to send DTMF tones
- Type messages in the speech input field for text-to-speech

### 4. Audio Controls
- **Microphone**: Mute/unmute your microphone
- **Speaker**: Mute/unmute the speaker audio
- **Volume**: Adjust audio levels as needed

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

