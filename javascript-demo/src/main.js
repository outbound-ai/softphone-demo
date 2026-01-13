// Polyfill for Node.js globals in browser environment
if (typeof window !== 'undefined') {
  // Ensure process is available
  if (!window.process) {
    window.process = {
      env: {
        NODE_ENV: 'development',
        PUBLIC_URL: '/'
      }
    };
  }

  // Ensure global is available
  if (!window.global) {
    window.global = window;
  }
}

/**
 * Audio Worklet Interceptor - Immediately Invoked Function Expression (IIFE)
 *
 * This function intercepts and handles audio worklet loading requests by wrapping
 * the AudioContext constructor. It provides fallback mechanisms for loading the
 * softphone audio worklet from multiple possible paths.
 *
 * Purpose: Intercepts and handles audio worklet loading requests
 * Parameters: None (Immediately Invoked Function Expression)
 * Returns: void
 *
 * Functionality:
 * 1. Constructor Wrapping:
 *    - Wraps original AudioContext constructor
 *    - Intercepts addModule method calls
 *    - Handles softphone worklet specifically
 *
 * 2. Path Resolution:
 *    - Tries multiple possible paths for worklet
 *    - Falls back to original URL if needed
 *    - Handles path resolution errors
 *
 * 3. Error Handling:
 *    - Attempts multiple paths before failing
 *    - Logs each attempt and failure
 *    - Throws error if all paths fail
 *
 * Intercepted Paths:
 * - /softphoneAudioWorklet/SoftPhoneAudioWorklet.js
 * - ./softphoneAudioWorklet/SoftPhoneAudioWorklet.js
 * - ../softphoneAudioWorklet/SoftPhoneAudioWorklet.js
 * - Original module URL
 *
 * Usage: Automatically executed when file loads
 */
(function() {
  // Store the original AudioContext constructor
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;

  if (OriginalAudioContext) {
    // Create a wrapper constructor
    function WrappedAudioContext(options) {
      const audioContext = new OriginalAudioContext(options);

      // Override the addModule method to handle softphone worklet loading
      const originalAddModule = audioContext.audioWorklet.addModule;
      audioContext.audioWorklet.addModule = async function(moduleURL, options) {
        // Check if this is the softphone worklet
        if (moduleURL.includes('softphoneAudioWorklet') || moduleURL.includes('SoftPhoneAudioWorklet')) {
          console.log('Intercepted softphone worklet loading request:', moduleURL);

          // Try multiple paths
          const possiblePaths = [
            '/softphoneAudioWorklet/SoftPhoneAudioWorklet.js',
            './softphoneAudioWorklet/SoftPhoneAudioWorklet.js',
            '../softphoneAudioWorklet/SoftPhoneAudioWorklet.js',
            moduleURL
          ];

          for (const path of possiblePaths) {
            try {
              console.log('Trying to load worklet from:', path);
              const result = await originalAddModule.call(this, path, options);
              console.log('Successfully loaded worklet from:', path);
              return result;
            } catch (error) {
              console.warn('Failed to load worklet from:', path, error.message);
            }
          }

          throw new Error('Failed to load softphone audio worklet from any available path');
        }

        // For non-softphone worklets, use the original method
        return originalAddModule.call(this, moduleURL, options);
      };

      return audioContext;
    }

    // Copy static properties and methods
    WrappedAudioContext.prototype = OriginalAudioContext.prototype;
    Object.setPrototypeOf(WrappedAudioContext, OriginalAudioContext);

    // Replace the global AudioContext
    window.AudioContext = WrappedAudioContext;
    window.webkitAudioContext = WrappedAudioContext;

    console.log('Softphone audio worklet interceptor set up immediately');
  }
})();

// Import the softphone package
import CallService from '@outbound-ai/softphone';

// Import CSS
import './style.css';

// Import our modules
import './utils.js';
import './auth.js';
import './ui.js';

// Global variables
let conversation = null;
let callService = null;
let isConnected = false;
let hasTakenOver = false;
let payerAgentReady = false;
window.payerAgentReady = false;
let takeOverType = null;
let isLoading = false;
let isOutputMuted = false;
let isInputMuted = false;

/**
 * Preloads the audio worklet to ensure it's available before starting calls.
 *
 * This function attempts to load the softphone audio worklet module before it's needed
 * to prevent delays during call initialization. It handles autoplay restrictions
 * gracefully and provides fallback mechanisms.
 *
 * @returns {Promise<boolean>} Returns true if successful, false if failed but can continue
 *
 * Functionality:
 * - Attempts to use global audio worklet loader if available
 * - Creates a temporary AudioContext to preload the worklet
 * - Handles autoplay restrictions gracefully
 * - Loads worklet from '/softphoneAudioWorklet/SoftPhoneAudioWorklet.js'
 * - Closes temporary context after loading
 * - Returns true even if blocked by autoplay policy (allows continuation)
 *
 * Error Handling:
 * - Catches and logs autoplay restriction errors
 * - Continues execution even if preloading fails
 * - Provides detailed error logging
 *
 * Usage Example:
 * await preloadAudioWorklet();
 */
async function preloadAudioWorklet() {
  try {
    console.log('Preloading audio worklet...');

    // Use the global loader if available
    if (window.softphoneAudioWorkletLoader) {
      console.log('Using global audio worklet loader...');
      return await window.softphoneAudioWorkletLoader.preload();
    }

    // Fallback: create a temporary audio context to preload the worklet
    const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Wait for the audio context to be ready
    if (tempAudioContext.state === 'suspended') {
      console.log('AudioContext is suspended, attempting to resume...');
      await tempAudioContext.resume();
    }

    // Preload the worklet module
    const workletPath = '/softphoneAudioWorklet/SoftPhoneAudioWorklet.js';
    console.log('Loading worklet from:', workletPath);

    await tempAudioContext.audioWorklet.addModule(workletPath);
    console.log('Audio worklet preloaded successfully');

    // Close the temporary context
    await tempAudioContext.close();

    return true;
  } catch (error) {
    console.error('Failed to preload audio worklet:', error);

    // If it's an autoplay restriction error, we can continue
    if (error.message.includes('not allowed to start') || error.message.includes('user gesture')) {
      console.warn('AudioContext blocked by autoplay policy, will retry when needed');
      return true; // Return true so we continue with the call
    }

    return false;
  }
}

/**
 * Global function to load audio worklet with retry mechanism.
 *
 * This function provides a robust way to load the audio worklet with automatic
 * retry logic and exponential backoff. It's designed to handle network issues
 * and temporary failures gracefully.
 *
 * @param {AudioContext} audioContext - The audio context to load the worklet into
 * @param {number} [retries=3] - Number of retry attempts (default: 3)
 * @returns {Promise<boolean>} Returns true if successful, throws error if all retries fail
 *
 * Functionality:
 * - Attempts to load worklet multiple times with exponential backoff
 * - Waits between retry attempts (1s, 2s, 3s)
 * - Logs each attempt and failure
 * - Throws error if all retries are exhausted
 *
 * Error Handling:
 * - Implements retry mechanism with delays
 * - Provides detailed logging for each attempt
 * - Throws final error if all retries fail
 *
 * Usage Example:
 * await window.loadAudioWorklet(audioContext, 5);
 */
window.loadAudioWorklet = async function(audioContext, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting to load audio worklet (attempt ${attempt}/${retries})...`);

      const workletPath = '/softphoneAudioWorklet/SoftPhoneAudioWorklet.js';
      console.log('Loading worklet from:', workletPath);

      await audioContext.audioWorklet.addModule(workletPath);
      console.log('Audio worklet loaded successfully');
      return true;
    } catch (error) {
      console.error(`Failed to load audio worklet (attempt ${attempt}/${retries}):`, error);

      if (attempt === retries) {
        console.error('All attempts to load audio worklet failed');
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Audio worklet interceptor is set up immediately at the top of the file

/**
 * Main application initialization function that sets up all components.
 *
 * This is the primary initialization function that orchestrates the setup of
 * all application components including DOM, authentication, call service,
 * and event listeners. It ensures proper loading order and error handling.
 *
 * @returns {Promise<void>} Resolves when initialization is complete
 *
 * Functionality:
 * 1. DOM Setup: Adds 'loaded' class to body for styling
 * 2. CSS Loading: Listens for CSS file load completion
 * 3. Fallback Timer: Ensures page visibility after 1 second
 * 4. Keycloak Initialization:
 *    - Calls window.initKeycloak()
 *    - Checks authentication status
 *    - Updates UI with user information
 * 5. Call Service Setup:
 *    - Initializes CallService with WebSocket URI
 *    - Sets up logging callbacks
 * 6. Event Listeners: Sets up all UI event handlers
 * 7. Loading Overlay: Hides authentication loading overlay
 *
 * Error Handling:
 * - Wraps each major section in try-catch blocks
 * - Logs detailed error information
 * - Shows user-friendly error messages
 * - Ensures page remains visible even on errors
 *
 * Dependencies:
 * - Requires window.initKeycloak function
 * - Requires window.authApi object
 * - Requires window.getCurrentUser function
 * - Requires various UI update functions
 *
 * Usage Example:
 * await initializeApp();
 */
async function initializeApp() {
  try {
    console.log('DOM loaded, initializing application...');

    // Show the page immediately when DOM is ready
    document.body.classList.add('loaded');

    // Also show when CSS is loaded
    const styleSheet = document.querySelector('link[href*="style.css"]');
    if (styleSheet) {
      styleSheet.addEventListener('load', () => {
        document.body.classList.add('loaded');
      });
    }

    // Fallback: ensure page is visible after 1 second
    setTimeout(() => {
      document.body.classList.add('loaded');
    }, 1000);

    // Note: Audio worklet preloading is deferred until user interaction to avoid autoplay restrictions

    // Initialize Keycloak
    try {
      if (window.initKeycloak) {
        console.log('Initializing Keycloak...');
        await window.initKeycloak();
        console.log('Keycloak initialized successfully');

        // Check if user is authenticated
        const isAuthenticated = window.authApi && window.authApi.isAuthenticated ? window.authApi.isAuthenticated() : false;
        const currentUser = window.getCurrentUser();

        if (isAuthenticated && currentUser) {
          // Update auth status after initialization
          if (window.updateAuthStatus) {
            window.updateAuthStatus('authenticated', currentUser);
          }
          console.log('User authenticated:', currentUser);
        } else {
          // User is not authenticated, redirect to login
          console.log('User not authenticated, redirecting to login...');
          if (window.authApi && window.authApi.login) {
            try {
              await window.authApi.login();
            } catch (error) {
              console.error('Login redirect failed:', error);
              // If login fails, still hide the overlay so user can see the page
            }
          }
        }
      } else {
        console.warn('Keycloak initialization function not available');
      }
    } catch (error) {
      console.error('Keycloak initialization failed:', error);
      console.error('Error details:', error.message);
    }

    // Initialize the call service with the service URI
    const serviceUri = (process.env.APP_SERVICE_URI || '').replace(/^\"|\"$/g, ''); // Remove quotes from environment variable
    console.log('Initializing CallService with URI:', serviceUri);
    callService = new CallService(serviceUri);

    // Set up logging
    callService.onLog = (message) => {
      console.log('softphone', message);
    };

    console.log('Softphone package initialized successfully');

    // Set up event listeners
    try {
      setupEventListeners();
      console.log('Event listeners set up successfully');
    } catch (error) {
      console.error('Event listeners setup failed:', error);
      console.error('Error details:', error.message);
    }



    // Hide auth loading overlay
    try {
      const authLoadingOverlay = document.getElementById('authLoadingOverlay');
      if (authLoadingOverlay) {
        authLoadingOverlay.style.display = 'none';
        console.log('Auth loading overlay hidden');
      } else {
        console.warn('Auth loading overlay not found');
      }
    } catch (error) {
      console.error('Error hiding auth loading overlay:', error);
    }

  } catch (error) {
    console.error('Error initializing app:', error);
    if (window.showError) {
      window.showError('Failed to initialize application: ' + error.message);
    }
  } finally {
    // Ensure page is visible even if there's an error
    document.body.classList.add('loaded');
  }
}

/**
 * Sets up event handlers for conversation state changes and events.
 *
 * This function configures all the necessary event listeners for a conversation
 * instance, including connection state changes, transcript updates, and human
 * agent availability notifications.
 *
 * @param {Conversation} conversation - The conversation instance to set up handlers for
 * @returns {void}
 *
 * Functionality:
 * 1. Connection State Handler:
 *    - Listens for connection state changes
 *    - Updates global connection status
 *    - Triggers UI updates for call status and audio status
 *
 * 2. Transcript Handler:
 *    - Listens for new transcript messages
 *    - Appends messages to UI transcript display
 *    - Handles participant ID and type information
 *
 * 3. Human Agent Handler:
 *    - Listens for "stop" messages indicating human agent availability
 *    - Sets payerAgentReady flag to true
 *    - Shows notification to user
 *    - Only triggers when takeover hasn't occurred yet
 *
 * Event Types Handled:
 * - onConnectionStateChanged: Connection status updates
 * - onTranscriptAvailable: New transcript messages
 * - onHoldForHumanEvent: Human agent availability events
 *
 * Usage Example:
 * setupConversationHandlers(conversation);
 */
function setupConversationHandlers(conversation) {
  if (conversation) {
    conversation.onConnectionStateChanged = (connected) => {
      console.log('Connection state changed:', connected);
      window.isConnected = connected;
      if (window.updateCallStatus) {
        window.updateCallStatus(connected);
      }
      if (window.updateAudioStatus) {
        window.updateAudioStatus();
      }

          // Clear UI and reload page when connection is lost (call ends)
    if (!connected) {
      clearUIAfterCall();
      // Reload page after a short delay to ensure fresh state for next call
      setTimeout(() => {
        reloadPageAfterCall();
      }, 1000); // 1 second delay to allow UI to update
    }
    };

    conversation.onTranscriptAvailable = (participantId, participantType, text) => {
      console.log('Transcript available:', participantId, participantType, text);
      if (window.appendTranscriptMessage) {
        window.appendTranscriptMessage(participantId, participantType, text);
      }
    };

    conversation.onHoldForHumanEvent = async (message) => {
      console.log('Hold for human event:', message);
      console.log('Message type:', typeof message);
      console.log('Message value:', message);
      console.log('takeOverType:', takeOverType);
      console.log('showHumanRepresentativeNotification available:', !!window.showHumanRepresentativeNotification);

      // Only trigger when message is "stop" and we haven't taken over yet
      if (message === "stop" && takeOverType === null) {
        console.log('Setting payer agent as ready');
        payerAgentReady = true;
        window.payerAgentReady = true;
        console.log('Agent set as ready:', payerAgentReady);

        // Show notification immediately when agent is ready
        if (window.showHumanRepresentativeNotification) {
          console.log('Calling showHumanRepresentativeNotification...');
          window.showHumanRepresentativeNotification('Payer agent is ready');
        } else {
          console.error('showHumanRepresentativeNotification function not found!');
        }
      } else {
        console.log('Condition not met: message !== "stop" or takeOverType !== null');
        console.log('message === "stop":', message === "stop");
        console.log('takeOverType === null:', takeOverType === null);
      }
    };
  }
}

/**
 * Sets up all DOM event listeners for user interactions.
 *
 * This function configures all the event listeners for user interface elements
 * including call control buttons, audio controls, authentication, speech input,
 * and dialpad functionality.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. Call Control Buttons:
 *    - Connect button: Triggers handleConnect()
 *    - End call button: Triggers handleDisconnect()
 *
 * 2. Audio Control Buttons:
 *    - Mute speaker button: Toggles speaker output
 *    - Mute microphone button: Toggles microphone input (only when taken over)
 *
 * 3. Call Management:
 *    - Take over button: Triggers handleTakeOver()
 *    - Error close button: Hides error messages
 *
 * 4. Authentication:
 *    - Logout button: Calls authApi.signOut()
 *
 * 5. Speech Input:
 *    - Speech form: Handles text-to-speech input
 *    - Validates input and connection status
 *    - Calls conversation.synthesizeSpeech(text)
 *
 * 6. Dialpad:
 *    - DTMF buttons: Sends touch-tone signals
 *    - Validates connection status before sending
 *
 * Button IDs Handled:
 * - connectBtn, endCallBtn
 * - muteSpeakerBtn, muteMicBtn
 * - takeOverBtn, errorCloseBtn, logoutBtn
 * - speechForm, speechInput
 * - .dtmf class elements
 *
 * Usage Example:
 * setupEventListeners();
 */
function setupEventListeners() {
  // Start call button
  const startCallBtn = document.getElementById('connectBtn');
  if (startCallBtn) {
    startCallBtn.addEventListener('click', handleConnect);
  }

  // End call button
  const endCallBtn = document.getElementById('endCallBtn');
  if (endCallBtn) {
    endCallBtn.addEventListener('click', handleDisconnect);
  }



  // Mute speaker button
  const muteSpeakerBtn = document.getElementById('muteSpeakerBtn');
  if (muteSpeakerBtn) {
    muteSpeakerBtn.addEventListener('click', () => {
      console.log('Mute speaker clicked');
      if (conversation) {
        console.log('Before mute - isOutputMuted:', isOutputMuted);
        if (isOutputMuted) {
          console.log('Unmuting output');
          conversation.unmuteOutput();
          isOutputMuted = false;
          window.isOutputMuted = false;
        } else {
          console.log('Muting output');
          conversation.muteOutput();
          isOutputMuted = true;
          window.isOutputMuted = true;
        }
        console.log('After mute - isOutputMuted:', isOutputMuted);
        console.log('After mute - window.isOutputMuted:', window.isOutputMuted);
        if (window.updateAudioStatus) {
          window.updateAudioStatus();
        }
      }
    });
  }

  // Mute mic button
  const muteMicBtn = document.getElementById('muteMicBtn');
  if (muteMicBtn) {
    muteMicBtn.addEventListener('click', () => {
      console.log('Mute mic clicked');
      if (conversation && hasTakenOver) {
        console.log('Before mute - isInputMuted:', isInputMuted);
        if (isInputMuted) {
          console.log('Unmuting input');
          conversation.unmuteInput();
          isInputMuted = false;
          window.isInputMuted = false;
        } else {
          console.log('Muting input');
          conversation.muteInput();
          isInputMuted = true;
          window.isInputMuted = true;
        }
        console.log('After mute - isInputMuted:', isInputMuted);
        console.log('After mute - window.isInputMuted:', window.isInputMuted);
        if (window.updateAudioStatus) {
          window.updateAudioStatus();
        }
      }
    });
  }

  // Take over button
  const takeOverBtn = document.getElementById('takeOverBtn');
  if (takeOverBtn) {
    takeOverBtn.addEventListener('click', handleTakeOver);
  }

  // Error close button
  const errorCloseBtn = document.getElementById('errorCloseBtn');
  if (errorCloseBtn) {
    errorCloseBtn.addEventListener('click', () => {
      if (window.hideError) {
        window.hideError();
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authApi.signOut();
    });
  }

  // Speech form
  const speechForm = document.getElementById('speechForm');
  if (speechForm) {
    speechForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const speechInput = document.getElementById('speechInput');
      const text = speechInput.value.trim();

      if (text && conversation && conversation.connected) {
        conversation.synthesizeSpeech(text);
        speechInput.value = '';
      } else if (!text) {
        alert('Please enter text to speak');
      } else if (!conversation || !conversation.connected) {
        alert('Not connected to call. Please start a call first.');
      }
    });
  }

  // Dialpad buttons
  const dialpadButtons = document.querySelectorAll('.dtmf');
  dialpadButtons.forEach(button => {
    button.addEventListener('click', () => {
      const code = button.getAttribute('data-code');
      if (code && conversation && conversation.connected) {
        conversation.synthesizeTouchTones(code);
      } else if (!conversation || !conversation.connected) {
        alert('Not connected to call. Please start a call first.');
      }
    });
  });
}

/**
 * Handles the human agent takeover process from AI agent.
 *
 * This function manages the transition from AI agent control to human agent
 * control, enabling the user to take over the call and interact directly
 * with the other party.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. Takeover Execution:
 *    - Calls conversation.agentTakeOver()
 *    - Sets takeover type to 'browser'
 *    - Updates global takeover status
 *
 * 2. Audio Management:
 *    - Unmutes microphone input
 *    - Enables user to speak
 *
 * 3. State Management:
 *    - Resets payer agent ready status
 *    - Updates global state variables
 *
 * 4. UI Updates:
 *    - Adds takeover message to transcript
 *    - Updates call status display
 *    - Enables dialpad functionality
 *
 * 5. User Feedback:
 *    - Shows success message
 *    - Updates UI elements
 *
 * Prerequisites:
 * - Requires active conversation
 * - User must be connected to call
 *
 * Error Handling:
 * - Shows alert if not connected to call
 * - Validates conversation exists before proceeding
 *
 * Usage Example:
 * handleTakeOver();
 */
function handleTakeOver() {
  if (conversation) {
    // Use package method
    conversation.agentTakeOver();

    takeOverType = 'browser';
    hasTakenOver = true;
    window.hasTakenOver = true;

    // Unmute input
    if (conversation.unmuteInput) {
      conversation.unmuteInput();
    }

    if (payerAgentReady) {
      payerAgentReady = false;
      window.payerAgentReady = false;
    }

    // Add to transcript
    if (window.appendTranscriptMessage) {
      const currentUser = window.getCurrentUser();
      const username = currentUser && currentUser.username ? currentUser.username : 'Unknown User';
      window.appendTranscriptMessage(null, 'system', `${username} took over the call`);
    }

    // Update UI
    if (window.updateCallStatus) {
      window.updateCallStatus(true);
    }

    // Update dialpad state
    if (window.updateDialpadState) {
      window.updateDialpadState();
    }

    console.log('Take over completed successfully');
  } else {
    alert('Not connected to call. Please start a call first.');
  }
}

/**
 * Main function to initiate a call connection.
 *
 * This is the primary function for starting a call. It handles the entire
 * connection process from audio worklet preloading to establishing the
 * WebSocket connection for real-time communication.
 *
 * @returns {Promise<void>} Resolves when connection is complete or fails
 *
 * Functionality:
 * 1. Audio Worklet Preloading:
 *    - Preloads audio worklet after user interaction
 *    - Handles autoplay restrictions
 *
 * 2. State Reset:
 *    - Resets all call-related state variables
 *    - Prepares for new call
 *
 * 3. Authentication Check:
 *    - Validates user authentication
 *    - Retrieves access token
 *    - Ensures user is logged in
 *
 * 4. Claim ID Processing:
 *    - Gets claim ID from input field
 *    - Extracts claim ID from URL or direct input
 *    - Validates claim ID format
 *
 * 5. Call Initiation:
 *    - Calls startCall() to create call via API
 *    - Waits for job to be ready (status 2)
 *    - Polls job status with timeout
 *
 * 6. WebSocket Connection:
 *    - Gets conversation from call service
 *    - Sets up conversation handlers
 *    - Establishes real-time connection
 *
 * Error Handling:
 * - Comprehensive error catching and display
 * - Shows loading overlay during process
 * - Hides overlay on completion or error
 * - Provides user-friendly error messages
 *
 * Timeout Handling:
 * - Waits up to 30 seconds for job to be ready
 * - Shows error if job doesn't reach ready state
 *
 * Usage Example:
 * await handleConnect();
 */
async function handleConnect() {
  try {
    console.log('Starting connection process...');

    // Preload audio worklet now that user has interacted with the page
    console.log('Preloading audio worklet after user interaction...');
    try {
      await preloadAudioWorklet();
      console.log('Audio worklet preloaded successfully');
    } catch (error) {
      console.warn('Audio worklet preloading failed, but continuing:', error.message);
    }

    // Reset state for new call (like React app)
    payerAgentReady = false;
    window.payerAgentReady = false;
    hasTakenOver = false;
    window.hasTakenOver = false;
    takeOverType = null;

    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }

    // Get current user
    const currentUser = window.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get token
    const token = await window.getToken();
    if (!token) {
      throw new Error('No access token available');
    }

    // Get claim ID from input field
    const claimIdInput = document.getElementById('claimId');
    const claimIdValue = claimIdInput ? claimIdInput.value.trim() : '';

    // Extract claim ID from input (could be a URL or just the ID)
    const claimId = window.extractClaimIdFromUrl(claimIdValue);
    if (!claimId) {
      throw new Error('Please enter a valid claim ID or URL in the input field');
    }

    console.log('Starting call for claim:', '[ID]');

    // Start call using the package
    const callData = await startCall(claimId, token);
    console.log('Call started successfully:', '[CALL_DATA]');

    // Wait for job to be ready (status 2 indicates ready for WebSocket connection)
    let jobStatus = await checkJobStatus(callData.jobId, token);
    let retryCount = 0;
    const maxRetries = 30; // Wait up to 30 seconds

    while (jobStatus.status !== 2 && retryCount < maxRetries) {
      console.log(`Job status: ${jobStatus.status}, waiting for status 2...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      jobStatus = await checkJobStatus(callData.jobId, token);
      retryCount++;
    }

    if (jobStatus.status !== 2) {
      throw new Error(`Job did not reach ready state after ${maxRetries} seconds.`);
    }

    console.log('Job is ready for WebSocket connection');

    // Get conversation using the package
    conversation = await callService.getConversationAsync(callData.jobId, token);
    window.conversation = conversation; // Make conversation available globally
    setupConversationHandlers(conversation);

    // Hide loading overlay
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    console.log('Connection process completed successfully');
  } catch (error) {
    console.error('Error during connection:', error);

    // Hide loading overlay on error
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    // Show error
    if (window.showError) {
      window.showError(error.message);
    }
  }
}

/**
 * Disconnects from active call and cleans up resources.
 *
 * This function properly terminates the call connection and performs
 * comprehensive cleanup of all resources, state variables, and UI elements.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. Call Termination:
 *    - Calls conversation.hangup() if available
 *    - Calls conversation.close() if available
 *    - Nullifies conversation object
 *
 * 2. Service Cleanup:
 *    - Closes call service if exists
 *    - Nullifies call service object
 *
 * 3. State Reset:
 *    - Resets all connection flags
 *    - Resets audio mute states
 *    - Resets takeover status
 *    - Resets agent ready status
 *
 * 4. UI Updates:
 *    - Updates call status display
 *    - Resets UI to disconnected state
 *
 * Cleanup Actions:
 * - Hangs up active call
 * - Closes WebSocket connections
 * - Resets all global state variables
 * - Updates UI immediately
 *
 * Usage Example:
 * handleDisconnect();
 */
function clearUIAfterCall() {
  try {
    // Clear the claim ID input field
    const claimIdInput = document.getElementById('claimId');
    if (claimIdInput) {
      claimIdInput.value = '';
    }

    // Clear the transcript
    const transcriptDiv = document.getElementById('transcript');
    if (transcriptDiv) {
      transcriptDiv.innerHTML = '';
    }

    // Clear the speech input field
    const speechInput = document.getElementById('speechInput');
    if (speechInput) {
      speechInput.value = '';
    }

    console.log('UI cleared after call ended');
  } catch (error) {
    console.error('Error clearing UI:', error);
  }
}

/**
 * Reloads the page after a call ends.
 *
 * This function provides an alternative to clearing the UI by reloading
 * the entire page, which ensures a completely fresh state.
 *
 * Usage Example:
 * reloadPageAfterCall();
 */
function reloadPageAfterCall() {
  try {
    console.log('Reloading page after call ended');
    window.location.reload();
  } catch (error) {
    console.error('Error reloading page:', error);
  }
}

function handleDisconnect() {
  try {
    console.log('Disconnecting...');

    // Hangup the call immediately
    if (conversation) {
      if (conversation.hangup) {
        conversation.hangup();
      }
      if (conversation.close) {
        conversation.close();
      }
      conversation = null;
    }

    // Close call service if exists
    if (callService) {
      if (callService.close) {
        callService.close();
      }
      callService = null;
    }

    // Reset state
    isConnected = false;
    hasTakenOver = false;
    window.isConnected = false;
    window.hasTakenOver = false;
    isOutputMuted = false;
    isInputMuted = false;
    window.isOutputMuted = false;
    window.isInputMuted = false;
    takeOverType = null;
    payerAgentReady = false;
    window.payerAgentReady = false;
    lastPayerAgentReady = false;

    // Update UI immediately
    if (window.updateCallStatus) {
      window.updateCallStatus(false);
    }

    // Clear UI fields after disconnection
    clearUIAfterCall();

    // Reload page after a short delay to ensure fresh state for next call
    setTimeout(() => {
      reloadPageAfterCall();
    }, 1000); // 1 second delay to allow UI to update

    console.log('Disconnected successfully');
  } catch (error) {
    console.error('Error during disconnect:', error);
  }
}

/**
 * Initiates a call via the claims API.
 *
 * This function makes an API call to start a call for a specific claim ID.
 * It handles authentication, request preparation, and response processing.
 *
 * @param {string} claimId - The claim ID to start a call for
 * @param {string} token - Authentication token for API requests
 * @returns {Promise<Object>} Call data object containing job information
 *
 * Functionality:
 * 1. Request Preparation:
 *    - Builds headers with authentication
 *    - Includes current user and refresh token
 *    - Prepares request body with call type
 *
 * 2. API Call:
 *    - POST request to /api/v1/claims/{claimId}/calls
 *    - Sends call type as 'HumanAgent'
 *    - Sends use case as 'CSI'
 *
 * 3. Response Handling:
 *    - Validates response status
 *    - Parses JSON response
 *    - Handles error responses
 *
 * 4. Error Management:
 *    - Attempts to parse error as JSON
 *    - Shows user-friendly error messages
 *    - Clears existing errors on success
 *
 * Request Body:
 * {
 *   "type": "HumanAgent",
 *   "useCase": "CSI"
 * }
 *
 * Response Structure:
 * {
 *   "oaiClaimId": "string",
 *   "jobId": "string",
 *   "phoneNumber": "string",
 *   "initiatorUserId": "string",
 *   "jobType": "number"
 * }
 *
 * Error Handling:
 * - Handles HTTP error status codes
 * - Parses error responses for details
 * - Shows errors in UI
 * - Throws descriptive error messages
 *
 * Usage Example:
 * const callData = await startCall('claim-id-123', 'auth-token');
 */
async function startCall(claimId, token) {
  try {
    console.log('Starting call for claim:', '[ID]');

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'currentUser': localStorage.getItem('currentUser') || '',
      'refresh_token': localStorage.getItem('refreshToken') || '',
    };

    const claimsUrl = (process.env.APP_CLAIMS_URL || '').replace(/^\"|\"$/g, ''); // Remove quotes from environment variable
    const fullUrl = `${claimsUrl}/api/v1/claims/${claimId}/calls`;
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        type: 'HumanAgent',
        useCase: 'CSI',
      }),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);

      // Try to parse the error as JSON to get structured error info
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }

      // Show error in UI
      if (window.showError) {
        window.showError(errorData);
      }

      // Throw error with the actual detail from the API
      throw new Error(errorData.detail || `Failed to start call: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Call started successfully:', '[CALL_DATA]');

    // Clear any existing errors on success
    if (window.hideError) {
      window.hideError();
    }

    return data;
  } catch (error) {
    console.error('Error starting call:', error);
    throw error;
  }
}

/**
 * Checks the status of a call job.
 *
 * This function polls the API to check the current status of a call job,
 * which is used to determine when the job is ready for WebSocket connection.
 *
 * @param {string} jobId - The job ID to check status for
 * @param {string} token - Authentication token for API requests
 * @returns {Promise<Object>} Job status object
 *
 * Functionality:
 * 1. Request Preparation:
 *    - Builds headers with authentication
 *    - Includes current user and refresh token
 *
 * 2. API Call:
 *    - GET request to /api/v1/calls/{jobId}
 *    - Retrieves current job status
 *
 * 3. Response Handling:
 *    - Validates response status
 *    - Parses JSON response
 *    - Handles error responses
 *
 * 4. Status Processing:
 *    - Returns job status information
 *    - Logs status for debugging
 *
 * Response Structure:
 * {
 *   "oaiClaimId": "string",
 *   "jobId": "string",
 *   "status": "number",
 *   "phoneNumber": "string",
 *   "initiatorUserId": "string"
 * }
 *
 * Status Values:
 * - 1: Job created, processing
 * - 2: Job ready for WebSocket connection
 *
 * Error Handling:
 * - Handles HTTP error status codes
 * - Parses error responses for details
 * - Shows errors in UI
 * - Throws descriptive error messages
 *
 * Usage Example:
 * const status = await checkJobStatus('job-id-123', 'auth-token');
 */
async function checkJobStatus(jobId, token) {
  try {
    console.log('Checking job status for:', '[ID]');

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'currentUser': localStorage.getItem('currentUser') || '',
      'refresh_token': localStorage.getItem('refreshToken') || '',
    };

    const claimsUrl = (process.env.APP_CLAIMS_URL || '').replace(/^\"|\"$/g, ''); // Remove quotes from environment variable
    const fullUrl = `${claimsUrl}/api/v1/calls/${jobId}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: headers,
    });

    console.log('Job status response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Job status error response:', errorText);

      // Try to parse the error as JSON to get structured error info
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }

      // Show error in UI
      if (window.showError) {
        window.showError(errorData);
      }

      // Throw error with the actual detail from the API
      throw new Error(errorData.detail || `Failed to check job status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Job status:', '[JOB_DATA]');

    // Clear any existing errors on success
    if (window.hideError) {
      window.hideError();
    }

    return data;
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
}

/**
 * DOM Content Loaded Event Listener
 *
 * This event listener ensures that the application initialization happens
 * after the DOM is fully loaded and ready for manipulation.
 *
 * Purpose: Ensures application initialization happens after DOM is fully loaded
 * Functionality:
 * - Waits for DOM to be ready
 * - Adds 100ms delay for module loading
 * - Calls initializeApp() to start application
 *
 * Usage: Automatically executed when DOM content is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOMContentLoaded event fired ===');
  console.log('✓ DOM loaded, initializing application...');

  // Add a small delay to ensure auth module is loaded
  setTimeout(() => {
    console.log('✓ Starting initializeApp after delay...');
    initializeApp();
  }, 100);
});

/**
 * Global Function Exports
 *
 * These functions are exported to the global window object to make them
 * accessible to other modules and for event handler binding.
 *
 * Exported Functions:
 * - handleConnect: Call connection handler
 * - handleDisconnect: Call disconnection handler
 * - handleTakeOver: Agent takeover handler
 * - isAgentReady: Agent availability checker
 *
 * Exported State:
 * - isOutputMuted: Speaker mute status
 * - isInputMuted: Microphone mute status
 *
 * Purpose: Makes functions and state available globally for other modules
 * Usage: These functions can be called from HTML event handlers or other modules
 */
window.handleConnect = handleConnect;
window.handleDisconnect = handleDisconnect;
window.handleTakeOver = handleTakeOver;
window.isAgentReady = () => payerAgentReady;
window.clearUIAfterCall = clearUIAfterCall;
window.reloadPageAfterCall = reloadPageAfterCall;

// Payer agent ready state tracking
let lastPayerAgentReady = false;

// Export mute state variables for global access
window.isOutputMuted = isOutputMuted;
window.isInputMuted = isInputMuted;