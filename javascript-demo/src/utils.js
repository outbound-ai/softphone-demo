/**
 * Utilities Module - Helper Functions and Constants
 *
 * This module provides utility functions and constants used throughout
 * the softphone application. It includes encoding/decoding functions,
 * DTMF tone generation, URL parsing, and participant type management.
 *
 * Key Functionality:
 * - Base64 encoding and decoding
 * - DTMF tone generation for dialpad
 * - URL parsing and claim ID extraction
 * - Participant type management and mapping
 * - Tenant configuration management
 *
 * Constants:
 * - CallParticipantTypeEnum: Enumeration of participant types
 * - participantTypeToTitleMapping: Mapping of participant types to display names
 *
 * Dependencies:
 * - Web Audio API for DTMF generation
 * - localStorage for user information
 * - Environment variables for configuration
 *
 * Usage: This module is imported by other modules and provides utility
 * functions for common operations throughout the application.
 */

// API URLs - use config from window or fallback to defaults
// Configuration is now provided by environment variables

/**
 * Call Participant Type Enumeration
 *
 * This enumeration defines the different types of participants that can
 * be involved in a call. It matches the React implementation for consistency
 * across the application.
 *
 * Participant Types:
 * - foreignPhoneParticipant: External phone participant
 * - browserParticipant: Browser-based participant
 * - browserHeadsetParticipant: Browser participant with headset
 * - AIAgentParticipant: AI agent participant
 *
 * Usage: Used throughout the application to identify and categorize
 * different types of call participants.
 */
const CallParticipantTypeEnum = {
  foreignPhoneParticipant: "ForeignPhoneParticipant",
  browserParticipant: "BrowserParticipant",
  browserHeadsetParticipant: "BrowserHeadsetParticipant",
  AIAgentParticipant: "AIAgentParticipant"
};

/**
 * Participant Type to Display Title Mapping
 *
 * This mapping converts participant type identifiers to user-friendly
 * display names. It matches the React implementation for consistency
 * and provides human-readable labels for the UI.
 *
 * Mapping:
 * - ForeignPhoneParticipant: "Foreign Phone"
 * - BrowserParticipant: "Browser" (updated with username after auth)
 * - AIAgentParticipant: "AI Agent"
 *
 * Note: BrowserParticipant display name is updated with the actual
 * username after authentication loads.
 *
 * Usage: Used in UI components to display participant names in
 * transcript and other user-facing elements.
 */
const participantTypeToTitleMapping = {
  [CallParticipantTypeEnum.foreignPhoneParticipant]: "Foreign Phone",
  [CallParticipantTypeEnum.browserParticipant]: "Browser", // Will be updated after auth loads
  [CallParticipantTypeEnum.AIAgentParticipant]: "AI Agent",
};

/**
 * Encodes a byte array to Base64 string.
 *
 * This function converts a Uint8Array or array of bytes to a Base64
 * encoded string using the browser's built-in btoa function.
 *
 * @param {Uint8Array|Array<number>} bytes - Array of bytes to encode
 * @returns {string} Base64 encoded string
 *
 * Functionality:
 * 1. Byte Conversion: Converts each byte to a character
 * 2. String Creation: Creates a string from the character array
 * 3. Base64 Encoding: Uses window.btoa for encoding
 *
 * Usage Example:
 * const encoded = encodeBase64(new Uint8Array([72, 101, 108, 108, 111]));
 * console.log(encoded); // "SGVsbG8="
 */
function encodeBase64(bytes) {
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return window.btoa(str);
}

/**
 * Decodes a Base64 string to a byte array.
 *
 * This function converts a Base64 encoded string back to a Uint8Array
 * using the browser's built-in atob function.
 *
 * @param {string} str - Base64 encoded string to decode
 * @returns {Uint8Array} Decoded byte array
 *
 * Functionality:
 * 1. Base64 Decoding: Uses window.atob for decoding
 * 2. Byte Conversion: Converts each character to a byte
 * 3. Array Creation: Creates Uint8Array from bytes
 *
 * Usage Example:
 * const decoded = decodeBase64("SGVsbG8=");
 * console.log(decoded); // Uint8Array [72, 101, 108, 108, 111]
 */
function decodeBase64(str) {
  const bin = window.atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/**
 * Generates DTMF (Dual-Tone Multi-Frequency) tones for dialpad functionality.
 *
 * This function creates dual-tone audio signals that correspond to
 * telephone keypad buttons. It uses the Web Audio API to generate
 * sine wave oscillators at specific frequencies.
 *
 * @param {string} code - DTMF code (0-9, *, #, A-D)
 * @returns {void}
 *
 * Functionality:
 * 1. Audio Context Creation: Creates new AudioContext
 * 2. Frequency Mapping: Maps DTMF codes to frequency pairs
 * 3. Oscillator Creation: Creates two oscillators for dual-tone
 * 4. Audio Routing: Connects oscillators to audio output
 * 5. Volume Control: Sets appropriate gain level
 * 6. Timing Control: Plays tone for 200ms duration
 *
 * DTMF Frequency Pairs:
 * - Row frequencies: 697, 770, 852, 941 Hz
 * - Column frequencies: 1209, 1336, 1477, 1633 Hz
 *
 * Supported Codes:
 * - Numbers: 0-9
 * - Special: *, #
 * - Letters: A, B, C, D
 *
 * Audio Parameters:
 * - Duration: 200 milliseconds
 * - Volume: 0.1 (10% of maximum)
 * - Waveform: Sine wave
 *
 * Browser Compatibility:
 * - Uses window.AudioContext or window.webkitAudioContext
 * - Requires user interaction before audio can play
 *
 * Usage Example:
 * generateDTMFTone('5'); // Plays DTMF tone for key 5
 */
function generateDTMFTone(code) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // DTMF frequencies
  const frequencies = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], 'A': [697, 1633],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 'B': [770, 1633],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], 'C': [852, 1633],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477], 'D': [941, 1633]
  };

  const freq = frequencies[code];
  if (!freq) return;

  // Create two oscillators for dual-tone
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();

  osc1.frequency.setValueAtTime(freq[0], audioContext.currentTime);
  osc2.frequency.setValueAtTime(freq[1], audioContext.currentTime);

  osc1.type = 'sine';
  osc2.type = 'sine';

  // Connect to gain node
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set volume
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  // Play for 200ms
  osc1.start();
  osc2.start();
  osc1.stop(audioContext.currentTime + 0.2);
  osc2.stop(audioContext.currentTime + 0.2);
}

/**
 * Extracts claim ID from various input formats including URLs and text.
 *
 * This function provides flexible claim ID extraction that can handle
 * multiple input formats including direct UUIDs, URLs containing claim IDs,
 * and text containing UUID patterns.
 *
 * @param {string} input - Input string that may contain a claim ID
 * @returns {string|null} Extracted claim ID or null if not found
 *
 * Functionality:
 * 1. UUID Validation: Checks if input is already a valid UUID
 * 2. URL Pattern Matching: Extracts claim ID from URL patterns
 * 3. Text Pattern Matching: Finds UUID patterns in arbitrary text
 * 4. Null Handling: Returns null if no valid UUID is found
 *
 * Supported Input Formats:
 * - Direct UUID: "8dc125d6-1da5-4f28-b06c-60c8d322ad8f"
 * - URL with claim: "https://example.com/claim/8dc125d6-1da5-4f28-b06c-60c8d322ad8f"
 * - Text with UUID: "Claim ID: 8dc125d6-1da5-4f28-b06c-60c8d322ad8f"
 *
 * UUID Pattern:
 * - Format: 8-4-4-4-12 hexadecimal characters
 * - Case insensitive
 * - Example: 8dc125d6-1da5-4f28-b06c-60c8d322ad8f
 *
 * URL Pattern:
 * - Looks for "/claim/" followed by UUID
 * - Handles various URL structures
 *
 * Error Handling:
 * - Returns null for invalid inputs
 * - Handles malformed URLs gracefully
 * - Continues processing even with partial matches
 *
 * Usage Example:
 * const claimId = extractClaimIdFromUrl('https://app.com/claim/8dc125d6-1da5-4f28-b06c-60c8d322ad8f');
 * console.log(claimId); // "8dc125d6-1da5-4f28-b06c-60c8d322ad8f"
 */
function extractClaimIdFromUrl(input) {
  // If it's already a UUID, return it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) {
    return input;
  }

  // If it's a URL, try to extract claim ID
  if (input && input.includes('/claim/')) {
    // Look for /claim/ followed by a UUID
    const claimIdMatch = input.match(/\/claim\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (claimIdMatch) {
      return claimIdMatch[1];
    }
  }

  // If it's not a URL but contains a UUID, extract it
  if (input) {
    const uuidInText = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidInText) {
      return uuidInText[0];
    }
  }

  // If no UUID found, return null instead of the original input
  return null;
}

/**
 * Updates participant mapping with current user information.
 *
 * This function updates the participant type to display name mapping
 * with the current user's username. It retrieves user information from
 * localStorage and updates the browser participant display name.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. User Retrieval: Gets current user from localStorage
 * 2. JSON Parsing: Parses stored user data
 * 3. Username Extraction: Gets username from user object
 * 4. Mapping Update: Updates browser participant display name
 * 5. Error Handling: Handles parsing errors and invalid data
 *
 * User Data Source:
 * - Retrieves from localStorage.getItem('currentUser')
 * - Expects JSON string containing user object
 *
 * Fallback Behavior:
 * - Uses "Browser" if no user data available
 * - Uses "Browser" if username not found in user object
 * - Clears invalid data from localStorage
 *
 * Error Handling:
 * - Catches JSON parsing errors
 * - Logs error details for debugging
 * - Removes invalid data from localStorage
 * - Continues with fallback username
 *
 * Usage Example:
 * updateParticipantMapping();
 * // Updates participantTypeToTitleMapping[CallParticipantTypeEnum.browserParticipant]
 */
function updateParticipantMapping() {
  // Get user directly from localStorage to avoid circular dependency
  const currentUser = localStorage.getItem('currentUser');
  let user = null;

  if (currentUser) {
    try {
      user = JSON.parse(currentUser);
    } catch (error) {
      console.error('Error parsing currentUser from localStorage:', error);
      // Clear invalid data
      localStorage.removeItem('currentUser');
    }
  }

  const username = user?.username || "Browser";
  participantTypeToTitleMapping[CallParticipantTypeEnum.browserParticipant] = username;
}

/**
 * Gets the preferred tenant ID for the application.
 *
 * This function retrieves the preferred tenant ID from environment
 * variables or configuration, with a fallback to a default value.
 *
 * @returns {string} Preferred tenant ID
 *
  * Functionality:
 * 1. Environment Check: Checks for process.env.APP_PREFERRED_TENANT
 * 2. Default Value: Uses environment variable if available
 *
 * Configuration Priority:
 * 1. process.env.APP_PREFERRED_TENANT (environment variable)
 * 2. null if not configured
 *
 * Usage Example:
 * const tenantId = getPreferredTenant();
 * console.log('Preferred tenant:', tenantId);
 */
function getPreferredTenant() {
  // This can be configured based on your needs
  // For now, return the environment variable if available
  return process.env.APP_PREFERRED_TENANT;
}

/**
 * Global Function Exports
 *
 * These functions and constants are exported to the global window object
 * to make them accessible to other modules and for event handler binding.
 *
 * Exported Constants:
 * - CallParticipantTypeEnum: Participant type enumeration
 * - participantTypeToTitleMapping: Participant type to display name mapping
 *
 * Exported Functions:
 * - updateParticipantMapping: Update participant mapping with user info
 * - extractClaimIdFromUrl: Extract claim ID from URLs or text
 * - encodeBase64: Encode byte array to Base64 string
 * - decodeBase64: Decode Base64 string to byte array
 * - generateDTMFTone: Generate DTMF tones for dialpad
 * - getPreferredTenant: Get preferred tenant ID
 *
 * Note: Configuration is now handled by environment variables
 *
 * Purpose: Makes utility functions and constants available globally
 * for use by other modules in the application.
 */
window.CallParticipantTypeEnum = CallParticipantTypeEnum;
window.participantTypeToTitleMapping = participantTypeToTitleMapping;
window.updateParticipantMapping = updateParticipantMapping;
window.extractClaimIdFromUrl = extractClaimIdFromUrl;
window.encodeBase64 = encodeBase64;
window.decodeBase64 = decodeBase64;
window.generateDTMFTone = generateDTMFTone;
window.getPreferredTenant = getPreferredTenant;