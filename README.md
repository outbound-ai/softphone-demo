# Softphone Demo Application

## Setup and Run

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   ```

   Edit `.env` with your configuration values. See `src/config.example.js` for detailed configuration options.

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

### Configuration

The application uses a two-tier configuration system:

1. **Environment Variables** (`.env` file) - Highest priority
2. **Default Configuration** (`src/config.js`) - Fallback values

See `src/config.example.js` for detailed configuration options and examples.

### Quick Usage

1. **Start a call**: Enter claim ID and click "Connect"
2. **Take over**: Click "Take Over" when human agent is available
3. **Audio controls**: Use mute buttons for speaker/microphone
4. **Dialpad**: Send DTMF tones after taking over
5. **Text-to-speech**: Type messages in the speech input field


