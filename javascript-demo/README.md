# Softphone Demo Application


## Setup and Run

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Vite (will be installed as a dev dependency)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

   This will install all dependencies including Vite as a development dependency.

2. **Configure environment variables**
   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration values.

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:3030`
   - Authenticate with Keycloak
   - Enter a claim ID to start a call

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run serve    # Start fallback server
```



### Quick Usage

1. **Start a call**: Enter claim ID and click "Connect"
2. **Take over**: Click "Take Over" when human agent is available
3. **Audio controls**: Use mute buttons for speaker/microphone
4. **Dialpad**: Send DTMF tones after taking over
5. **Text-to-speech**: Type messages in the speech input field


