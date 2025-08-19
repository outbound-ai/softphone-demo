/**
 * UI Module - User Interface Updates and Event Handlers
 *
 * This module handles all user interface updates, DOM manipulations,
 * and visual feedback for the softphone application. It provides
 * functions for updating call status, audio controls, transcript
 * display, and error handling.
 *
 * Global State Variables:
 * - packetsSent: Counter for sent packets
 * - packetsReceived: Counter for received packets
 *
 * Key Functionality:
 * - Transcript management and display
 * - Call status updates
 * - Audio control state management
 * - Error message display
 * - Authentication status updates
 * - Dialpad state management
 *
 * Dependencies:
 * - DOM elements with specific IDs
 * - Global window functions and variables
 * - Authentication module for user information
 *
 * Usage: This module is imported by main.js and provides UI update
 * services to the entire application.
 */

// Global variables for tracking
let packetsSent = 0;
let packetsReceived = 0;

/**
 * Appends a system message to the transcript display.
 *
 * This function adds a simple system message to the transcript container
 * with a "System" label and the provided text content.
 *
 * @param {string} text - The message text to display
 * @returns {void}
 *
 * Functionality:
 * 1. DOM Element Creation: Creates a new div element for the message
 * 2. Styling: Applies 'transcript' CSS class
 * 3. Content Structure: Creates structured HTML with System label and message
 * 4. Container Update: Appends message to transcript container
 * 5. Auto-scroll: Scrolls to bottom to show latest message
 *
 * HTML Structure:
 * <div class="transcript">
 *   <div><span class="bold">System</span></div>
 *   <div>Message text</div>
 * </div>
 *
 * Usage Example:
 * appendMessage('Call connected successfully');
 */
function appendMessage(text) {
  const transcriptContainer = document.getElementById('transcript');
  const div = document.createElement('div');
  div.className = 'transcript';
  div.innerHTML = `<div><span class="bold">System</span></div><div>${text}</div>`;
  transcriptContainer.appendChild(div);
  transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

/**
 * Appends a transcript message with participant information and styling.
 *
 * This function adds a detailed transcript message that includes participant
 * information, timestamp, and appropriate styling based on the participant type.
 * It handles different participant types and applies corresponding CSS classes.
 *
 * @param {string} participantId - Unique identifier for the participant
 * @param {string} participantType - Type of participant (e.g., 'ForeignPhoneParticipant', 'AIAgentParticipant')
 * @param {string} text - The message text to display
 * @param {string} [timestamp=null] - Timestamp for the message (defaults to current time)
 * @returns {void}
 *
 * Functionality:
 * 1. Participant Mapping: Maps participant types to display names
 * 2. Message Styling: Applies appropriate CSS classes based on participant type
 * 3. Timestamp Handling: Uses provided timestamp or current time
 * 4. DOM Creation: Creates structured HTML with participant info and message
 * 5. Auto-scroll: Scrolls to bottom to show latest message
 *
 * Participant Type Mappings:
 * - ForeignPhoneParticipant: 'Foreign Phone' (inbound styling)
 * - BrowserParticipant: Current username (outbound styling)
 * - BrowserHeadsetParticipant: Current username (outbound styling)
 * - AIAgentParticipant: 'AI Agent' (ai styling)
 * - system: 'System' (system styling)
 *
 * CSS Classes Applied:
 * - inbound: For incoming calls/foreign participants
 * - outbound: For browser participants
 * - ai: For AI agent messages
 * - system: For system messages
 *
 * HTML Structure:
 * <div class="transcript">
 *   <div><span class="bold [messageClass]">Speaker (time)</span></div>
 *   <div class="[messageClass]">Message text</div>
 * </div>
 *
 * Usage Example:
 * appendTranscriptMessage('user123', 'AIAgentParticipant', 'Hello, how can I help you?');
 */
function appendTranscriptMessage(participantId, participantType, text, timestamp = null) {
  const transcriptContainer = document.getElementById('transcript');
  const div = document.createElement('div');
  div.className = 'transcript';

  const time = timestamp || new Date().toLocaleTimeString();

  // Get the display title for the participant type
  let speaker = 'Unknown';
  let messageClass = 'system';

  // Define participant type mapping similar to the reference
  const participantTypeToTitleMapping = {
    'ForeignPhoneParticipant': 'Foreign Phone',
    'BrowserParticipant': window.getCurrentUser()?.username || 'Browser',
    'BrowserHeadsetParticipant': window.getCurrentUser()?.username || 'Browser Headset',
    'AIAgentParticipant': 'AI Agent',
    'system': 'System'
  };

  // Get speaker name from mapping
  speaker = participantTypeToTitleMapping[participantType] || participantType;

  // Determine message class based on participant type
  if (participantType === 'ForeignPhoneParticipant') {
    messageClass = 'inbound';
  } else if (participantType === 'BrowserParticipant' || participantType === 'BrowserHeadsetParticipant') {
    messageClass = 'outbound';
  } else if (participantType === 'AIAgentParticipant') {
    messageClass = 'ai';
  } else if (participantType === 'system') {
    messageClass = 'system';
  }

  div.innerHTML = `
    <div><span class="bold ${messageClass}">${speaker} (${time})</span></div>
    <div class="${messageClass}">${text}</div>
  `;

  transcriptContainer.appendChild(div);
  transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

/**
 * Updates the UI based on call connection status.
 *
 * This function manages the visual state of all call-related UI elements
 * based on whether the user is connected to a call or not. It enables/disables
 * buttons and updates visual indicators accordingly.
 *
 * @param {boolean} connected - Whether the user is connected to a call
 * @returns {void}
 *
 * Functionality:
 * 1. Connection Indicator: Updates visual connection status indicator
 * 2. Button States: Enables/disables call control buttons
 * 3. Audio Controls: Manages mute button states
 * 4. Take Over Button: Updates take over button based on current state
 * 5. Speech Input: Enables/disables speech input functionality
 * 6. Dialpad: Updates dialpad button states
 *
 * Connected State Actions:
 * - Sets connection indicator to 'connected' class
 * - Disables connect button
 * - Enables mute speaker and microphone buttons
 * - Enables end call button
 * - Enables speech input and submit button
 * - Updates dialpad state based on take over status
 *
 * Disconnected State Actions:
 * - Sets connection indicator to 'disconnected' class
 * - Enables connect button
 * - Disables all audio control buttons
 * - Disables end call button
 * - Disables speech input and submit button
 * - Disables all dialpad buttons
 *
 * Error Handling:
 * - Wraps all DOM operations in try-catch
 * - Logs errors for debugging
 * - Continues execution even if some elements are missing
 *
 * Usage Example:
 * updateCallStatus(true); // Connected state
 * updateCallStatus(false); // Disconnected state
 */
function updateCallStatus(connected) {
  try {
    const connectionIndicator = document.getElementById('connectionIndicator');
    const connectBtn = document.getElementById('connectBtn');
    const muteSpeakerBtn = document.getElementById('muteSpeakerBtn');
    const muteMicBtn = document.getElementById('muteMicBtn');
    const takeOverBtn = document.getElementById('takeOverBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const speechInput = document.getElementById('speechInput');
    const speechSubmitBtn = document.querySelector('#speechForm button[type="submit"]');
    const dialpadButtons = document.querySelectorAll('.dtmf');

  if (connected) {
    // Connected state
    if (connectionIndicator) {
      connectionIndicator.className = 'connected';
    }
    if (connectBtn) {
      connectBtn.disabled = true; // Disable connect button when connected
    }
    if (muteSpeakerBtn) {
      muteSpeakerBtn.disabled = false;
    }
    if (muteMicBtn) {
      muteMicBtn.disabled = false;
    }
    if (takeOverBtn) {
      const hasTakenOver = window.hasTakenOver || false;
      takeOverBtn.disabled = hasTakenOver; // Disable if already taken over
      takeOverBtn.textContent = hasTakenOver ? 'Taken Over' : 'Take Over';
    }
    if (endCallBtn) {
      endCallBtn.disabled = false;
    }
    if (speechInput) {
      speechInput.disabled = false;
    }
    if (speechSubmitBtn) {
      speechSubmitBtn.disabled = false;
    }

    // Update dialpad state based on take over status
    updateDialpadState();
  } else {
    // Disconnected state
    if (connectionIndicator) {
      connectionIndicator.className = 'disconnected';
    }
    if (connectBtn) {
      connectBtn.disabled = false; // Enable connect button when disconnected
    }
    if (muteSpeakerBtn) {
      muteSpeakerBtn.disabled = true;
    }
    if (muteMicBtn) {
      muteMicBtn.disabled = true;
    }
    if (takeOverBtn) {
      takeOverBtn.disabled = true;
      takeOverBtn.textContent = 'Take Over';
    }
    if (endCallBtn) {
      endCallBtn.disabled = true;
    }
    if (speechInput) {
      speechInput.disabled = true;
    }
    if (speechSubmitBtn) {
      speechSubmitBtn.disabled = true;
    }

    // Disable all dialpad buttons when disconnected
    dialpadButtons.forEach(button => {
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.6';
    });
  }
  } catch (error) {
    console.error('Error updating call status:', error);
  }
}

/**
 * Updates the dialpad button states based on connection and take over status.
 *
 * This function manages the visual state and interactivity of dialpad buttons
 * based on whether the user is connected to a call and has taken over control.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. State Check: Checks connection and take over status
 * 2. Button Management: Updates all dialpad button states
 * 3. Visual Feedback: Changes opacity and pointer events
 *
 * Enabled State (Connected + Taken Over):
 * - Sets pointer-events to 'auto'
 * - Sets opacity to '1' (fully visible)
 * - Allows user interaction with buttons
 *
 * Disabled State (Not Connected or Not Taken Over):
 * - Sets pointer-events to 'none'
 * - Sets opacity to '0.6' (dimmed appearance)
 * - Prevents user interaction with buttons
 *
 * Error Handling:
 * - Wraps all DOM operations in try-catch
 * - Logs errors for debugging
 * - Continues execution even if some elements are missing
 *
 * Usage Example:
 * updateDialpadState();
 */
function updateDialpadState() {
  try {
    const dialpadButtons = document.querySelectorAll('.dtmf');
    const hasTakenOver = window.hasTakenOver || false;
    const isConnected = window.isConnected || false;

    dialpadButtons.forEach(button => {
      if (isConnected && hasTakenOver) {
        // Enable dialpad when connected and taken over
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
      } else {
        // Disable dialpad when not taken over or not connected
        button.style.pointerEvents = 'none';
        button.style.opacity = '0.6';
      }
    });
  } catch (error) {
    console.error('Error updating dialpad state:', error);
  }
}

/**
 * Updates the audio control button states and text based on current audio status.
 *
 * This function manages the visual state and text of audio control buttons
 * (speaker and microphone mute buttons) based on the current audio state
 * and take over status.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. State Retrieval: Gets current conversation and take over status
 * 2. Speaker Button: Updates speaker mute button text and state
 * 3. Microphone Button: Updates microphone mute button text and state
 * 4. Take Over Check: Enables/disables microphone button based on take over status
 *
 * Speaker Button States:
 * - Muted: Shows "Unmute Speaker" text
 * - Unmuted: Shows "Mute Speaker" text
 * - Always enabled when connected
 *
 * Microphone Button States:
 * - Muted: Shows "Unmute Mic" text
 * - Unmuted: Shows "Mute Mic" text
 * - Only enabled when user has taken over
 *
 * Global Variables Used:
 * - window.isOutputMuted: Speaker mute status
 * - window.isInputMuted: Microphone mute status
 * - window.hasTakenOver: Take over status
 *
 * Error Handling:
 * - Wraps all DOM operations in try-catch
 * - Logs errors for debugging
 * - Continues execution even if some elements are missing
 *
 * Usage Example:
 * updateAudioStatus();
 */
function updateAudioStatus() {
  try {
    const muteSpeakerBtn = document.getElementById('muteSpeakerBtn');
    const muteMicBtn = document.getElementById('muteMicBtn');

    // Get conversation state
    const conversation = window.conversation;
    const hasTakenOver = window.hasTakenOver || false;

    console.log('Updating audio status - conversation:', conversation);
    console.log('hasTakenOver:', hasTakenOver);

    // Update speaker button text and state based on local output muted state
    if (muteSpeakerBtn) {
      // Use the global isOutputMuted variable
      const isOutputMuted = window.isOutputMuted || false;
      console.log('isOutputMuted:', isOutputMuted);

      if (isOutputMuted) {
        muteSpeakerBtn.textContent = 'Unmute Speaker';
        muteSpeakerBtn.disabled = false;
      } else {
        muteSpeakerBtn.textContent = 'Mute Speaker';
        muteSpeakerBtn.disabled = false;
      }
    }

    // Update mic button text and state based on local input muted state
    if (muteMicBtn) {
      // Use the global isInputMuted variable
      const isInputMuted = window.isInputMuted || false;
      console.log('isInputMuted:', isInputMuted);

      if (isInputMuted) {
        muteMicBtn.textContent = 'Unmute Mic';
        muteMicBtn.disabled = !hasTakenOver;
      } else {
        muteMicBtn.textContent = 'Mute Mic';
        muteMicBtn.disabled = !hasTakenOver;
      }
    }
  } catch (error) {
    console.error('Error updating audio status:', error);
  }
}

/**
 * Updates the authentication status display in the UI.
 *
 * This function manages the display of user authentication information
 * including the welcome message, username display, and logout button
 * visibility based on the current user state.
 *
 * @param {string} status - Authentication status (not currently used)
 * @param {Object|null} [user=null] - User object containing authentication information
 * @returns {void}
 *
 * Functionality:
 * 1. User Display: Shows username or email in welcome message
 * 2. Welcome Message: Controls visibility of welcome text
 * 3. Logout Button: Shows/hides logout button based on authentication
 * 4. Fallback Handling: Uses 'Unknown' if no username/email available
 *
 * Authenticated State (user provided):
 * - Shows welcome message
 * - Displays username or email
 * - Shows logout button
 *
 * Unauthenticated State (no user):
 * - Hides welcome message
 * - Clears username display
 * - Hides logout button
 *
 * User Object Properties Used:
 * - user.username: Primary username display
 * - user.email: Fallback if username not available
 *
 * Usage Example:
 * updateAuthStatus('authenticated', { username: 'john.doe', email: 'john@example.com' });
 * updateAuthStatus('unauthenticated'); // Hides user info
 */
function updateAuthStatus(status, user = null) {
  const welcomeText = document.getElementById('welcomeText');
  const welcomeUsername = document.getElementById('welcomeUsername');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    const username = user.username || user.email || 'Unknown';
    welcomeUsername.textContent = username;
    welcomeText.style.display = 'block';
    // Show logout button when user is authenticated
    logoutBtn.style.display = 'block';
  } else {
    welcomeText.style.display = 'none';
    welcomeUsername.textContent = '';
    // Hide logout button when no user
    logoutBtn.style.display = 'none';
  }
}

/**
 * Displays an error message in a toast notification.
 *
 * This function shows error messages in a user-friendly toast notification
 * format. It handles different types of error objects and provides
 * intelligent message formatting and auto-hide functionality.
 *
 * @param {string|Object} message - Error message or error object
 * @param {string} [title='Error'] - Error title (not currently displayed)
 * @returns {void}
 *
 * Functionality:
 * 1. Message Processing: Handles string and object error messages
 * 2. Formatting: Extracts relevant error information from objects
 * 3. Truncation: Truncates long messages for better UX
 * 4. Display: Shows error in toast notification
 * 5. Auto-hide: Automatically hides error after timeout
 *
 * Error Object Handling:
 * - message.detail: Primary error detail
 * - message.message: Alternative error message
 * - message.error: Error property
 * - JSON.stringify: Fallback for complex objects
 *
 * Truncation Logic:
 * - Truncates messages longer than 200 characters
 * - Preserves full details for specific error types (412, 403, 401, 404)
 * - Adds "..." to truncated messages
 *
 * Auto-hide Timing:
 * - Regular errors: 8 seconds
 * - Detailed errors: 12 seconds
 *
 * Error Types with Full Details:
 * - 412: Precondition Failed
 * - 403: Forbidden
 * - 401: Unauthorized
 * - 404: Not Found
 *
 * Usage Example:
 * showError('Connection failed');
 * showError({ detail: 'API error message', status: 403 });
 */
/**
 * Sanitizes error messages to remove sensitive data like IDs and tokens.
 *
 * @param {string} message - The error message to sanitize
 * @returns {string} - Sanitized error message
 */
function sanitizeErrorMessage(message) {
  if (typeof message !== 'string') {
    return message;
  }

  // Remove UUIDs and IDs completely (including field names)
  let sanitized = message
    // Remove UUID patterns (8-4-4-4-12 format)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    // Remove ID field patterns completely (including field names)
    .replace(/OaiClaimId=[^,\s]*/gi, '')
    .replace(/User=[^,\s]*/gi, '')
    .replace(/claimId=[^,\s]*/gi, '')
    .replace(/jobId=[^,\s]*/gi, '')
    .replace(/tenantId=[^,\s]*/gi, '')
    .replace(/clientId=[^,\s]*/gi, '')
    .replace(/realm=[^,\s]*/gi, '')
    .replace(/oaiClaimId=[^,\s]*/gi, '')
    .replace(/userId=[^,\s]*/gi, '')
    .replace(/sessionId=[^,\s]*/gi, '')
    .replace(/requestId=[^,\s]*/gi, '')
    .replace(/correlationId=[^,\s]*/gi, '')
    // Remove any remaining UUID-like patterns
    .replace(/[0-9a-f]{32}/gi, '')
    // Remove token patterns
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, '')
    .replace(/token=[A-Za-z0-9\-._~+/]+=*/gi, '')
    // Remove URLs with sensitive data
    .replace(/https?:\/\/[^\s]+/gi, '')
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '');

  // Clean up any extra commas, spaces, or formatting left after removing IDs
  sanitized = sanitized
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/^\s*,\s*/g, '') // Remove leading comma
    .replace(/,\s*$/g, '') // Remove trailing comma
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim(); // Remove leading/trailing whitespace

  return sanitized;
}

function showError(message, title = 'Error') {
  const errorToast = document.getElementById('errorToast');
  const errorMessage = document.getElementById('errorMessage');

  if (errorToast && errorMessage) {
    // Format the error message
    let displayMessage = message;
    let shouldTruncate = true;

    if (typeof message === 'object') {
      // Handle API error objects
      if (message.detail) {
        displayMessage = message.detail;
        // Don't truncate for specific error types that need full details
        if (message.status === 412 || message.status === 403 || message.status === 401 || message.status === 404) {
          shouldTruncate = false;
        }
      } else if (message.message) {
        displayMessage = message.message;
      } else if (message.error) {
        displayMessage = message.error;
      } else {
        displayMessage = JSON.stringify(message);
      }
    }

    // Sanitize the message to remove sensitive data
    displayMessage = sanitizeErrorMessage(displayMessage);

    // Truncate long messages for toast (except for specific error types)
    if (shouldTruncate && displayMessage.length > 200) {
      displayMessage = displayMessage.substring(0, 200) + '...';
    }

    errorMessage.textContent = displayMessage;
    errorToast.classList.add('show');

    // Auto-hide after 8 seconds (longer for detailed errors)
    const autoHideTime = shouldTruncate ? 8000 : 12000;
    setTimeout(() => {
      hideError();
    }, autoHideTime);
  }
}

/**
 * Hides the error message toast notification.
 *
 * This function hides the error toast notification by setting its
 * display style to 'none'. It's used both for manual hiding and
 * as part of the auto-hide functionality.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. Element Selection: Gets the error toast element by ID
 * 2. Visibility Control: Sets display style to 'none'
 * 3. Graceful Handling: Continues if element doesn't exist
 *
 * Usage Example:
 * hideError();
 */
function hideError() {
  const errorToast = document.getElementById('errorToast');
  if (errorToast) {
    errorToast.classList.remove('show');
  }
}

/**
 * Updates authentication message display (deprecated).
 *
 * This function is no longer needed since the authentication message
 * display has been removed from the UI. It's kept for backward
 * compatibility but performs no action.
 *
 * @param {string} message - Authentication message (not used)
 * @returns {void}
 *
 * Note: This function is deprecated and does not perform any action.
 * Authentication messages are now handled by updateAuthStatus().
 *
 * Usage Example:
 * updateAuthMessage('Login successful'); // No effect
 */
function updateAuthMessage(message) {
  // No longer needed since we removed the auth message display

}

/**
 * Shows a notification when a human representative is ready for take over.
 *
 * This function displays a confirmation dialog when a human agent is
 * available to take over the call. It provides the user with the option
 * to accept or decline the take over request.
 *
 * @param {string} message - Notification message (not currently displayed)
 * @returns {void}
 *
 * Functionality:
 * 1. Confirmation Dialog: Shows browser confirm dialog
 * 2. Take Over Handling: Calls handleTakeOver if user confirms
 * 3. Transcript Update: Adds system message to transcript
 * 4. Error Handling: Logs errors if handleTakeOver function is missing
 *
 * User Interaction:
 * - Shows "Payer agent is ready to take over. Do you want to take over?"
 * - User can click "OK" to accept or "Cancel" to decline
 * - Only proceeds with take over if user confirms
 *
 * Error Handling:
 * - Checks if handleTakeOver function exists
 * - Logs error if function is missing
 * - Continues execution even if take over fails
 *
 * Transcript Message:
 * - Adds "Human representative is available for take over" to transcript
 * - Uses system message type for consistent styling
 *
 * Usage Example:
 * showHumanRepresentativeNotification('Agent ready');
 */
function showHumanRepresentativeNotification(message) {
  console.log('Human representative notification function called:', message);

  // Create a custom notification popup
  const notification = document.createElement('div');
  notification.className = 'takeover-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <h3>Human Agent Available</h3>
      <p>Payer agent is ready to take over the call.</p>
      <div class="notification-buttons">
        <button class="btn-primary" onclick="acceptTakeover()">Take Over</button>
        <button class="btn-secondary" onclick="declineTakeover()">Decline</button>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Start notification sound
  startNotificationSound();

  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
      stopNotificationSound();
    }
  }, 30000);

  // Add to transcript
  if (window.appendTranscriptMessage) {
    window.appendTranscriptMessage(null, 'system', 'Human representative is available for take over');
  }
}

// Sound control functions
let notificationAudio = null;
let notificationInterval = null;

function startNotificationSound() {
  try {
    // Create audio element if it doesn't exist
    if (!notificationAudio) {
      notificationAudio = new Audio();
      // Create a simple ding-dong sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create ding-dong pattern
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);

      // Store the audio context for cleanup
      notificationAudio = audioContext;
    }

    // Play sound every 2 seconds
    notificationInterval = setInterval(() => {
      if (notificationAudio && notificationAudio.state === 'suspended') {
        notificationAudio.resume();
      }

      const oscillator = notificationAudio.createOscillator();
      const gainNode = notificationAudio.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(notificationAudio.destination);

      // Create ding-dong pattern
      oscillator.frequency.setValueAtTime(800, notificationAudio.currentTime);
      oscillator.frequency.setValueAtTime(600, notificationAudio.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, notificationAudio.currentTime + 0.4);

      gainNode.gain.setValueAtTime(0.3, notificationAudio.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, notificationAudio.currentTime + 0.6);

      oscillator.start(notificationAudio.currentTime);
      oscillator.stop(notificationAudio.currentTime + 0.6);
    }, 2000);

    console.log('Notification sound started');
  } catch (error) {
    console.error('Error starting notification sound:', error);
  }
}

function stopNotificationSound() {
  try {
    if (notificationInterval) {
      clearInterval(notificationInterval);
      notificationInterval = null;
    }
    if (notificationAudio) {
      notificationAudio.close();
      notificationAudio = null;
    }
    console.log('Notification sound stopped');
  } catch (error) {
    console.error('Error stopping notification sound:', error);
  }
}

// Global functions for the notification buttons
window.acceptTakeover = function() {
  console.log('User accepted take over');
  stopNotificationSound();
  const notification = document.querySelector('.takeover-notification');
  if (notification && notification.parentNode) {
    notification.parentNode.removeChild(notification);
  }
  if (window.handleTakeOver) {
    window.handleTakeOver();
  } else {
    console.error('handleTakeOver function not found!');
  }
};

window.declineTakeover = function() {
  console.log('User declined take over');
  stopNotificationSound();
  const notification = document.querySelector('.takeover-notification');
  if (notification && notification.parentNode) {
    notification.parentNode.removeChild(notification);
  }
};

// Test function to manually trigger the notification
window.testTakeoverNotification = function() {
  console.log('Testing takeover notification...');
  if (window.showHumanRepresentativeNotification) {
    window.showHumanRepresentativeNotification('Test notification');
  } else {
    console.error('showHumanRepresentativeNotification function not found!');
  }
};


/**
 * Global Function Exports
 *
 * These functions are exported to the global window object to make them
 * accessible to other modules and for event handler binding.
 *
 * Exported Functions:
 * - appendMessage: Add system messages to transcript
 * - appendTranscriptMessage: Add detailed transcript messages
 * - updateCallStatus: Update UI based on call connection status
 * - updateDialpadState: Update dialpad button states
 * - updateAudioStatus: Update audio control button states
 * - updateAuthStatus: Update authentication status display
 * - updateAuthMessage: Update auth message (deprecated)
 * - showError: Display error messages in toast
 * - hideError: Hide error message toast
 * - showHumanRepresentativeNotification: Show take over notification
 *
 * Exported Properties:
 * - packetsSent: Getter/setter for sent packet counter
 * - packetsReceived: Getter/setter for received packet counter
 *
 * Purpose: Makes UI functions available globally for use by other modules
 * in the application, particularly main.js for call management.
 */
window.appendMessage = appendMessage;
window.appendTranscriptMessage = appendTranscriptMessage;
window.updateCallStatus = updateCallStatus;
window.updateDialpadState = updateDialpadState;
window.updateAudioStatus = updateAudioStatus;
window.updateAuthStatus = updateAuthStatus;
window.updateAuthMessage = updateAuthMessage;
window.showError = showError;
window.hideError = hideError;
window.showHumanRepresentativeNotification = showHumanRepresentativeNotification;


// Export packet counters as getters/setters
Object.defineProperty(window, 'packetsSent', {
  get: () => packetsSent,
  set: (value) => { packetsSent = value; }
});

Object.defineProperty(window, 'packetsReceived', {
  get: () => packetsReceived,
  set: (value) => { packetsReceived = value; }
});