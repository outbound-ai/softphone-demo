/**
 * Authentication Module - Keycloak and Auth Management
 *
 * This module handles all authentication-related functionality including
 * Keycloak integration, token management, user session handling, and
 * authentication state management.
 *
 * Global State Variables:
 * - authToken: Current authentication token
 * - refreshToken: Token used for refreshing authentication
 * - currentUser: Current user information
 * - isKeycloakInitialized: Keycloak initialization status
 * - keycloakInstance: Keycloak instance reference
 *
 * Dependencies:
 * - Keycloak JS library (loaded dynamically)
 * - localStorage for token persistence
 * - Environment variables for configuration
 *
 * Usage: This module is imported by main.js and provides authentication
 * services to the entire application.
 */

// Authentication state
let authToken = null;
let refreshToken = null;
let currentUser = null;
let isKeycloakInitialized = false;

// Keycloak configuration
const keycloakConfig = window.KEYCLOAK_CONFIG || {
  url: 'https://auth.phoenix.ops.virtualoutbound.com/',
  realm: 'stg',
  clientId: 'aquarius-ui'
};

let keycloakInstance = null;

/**
 * Gets the current Keycloak instance.
 *
 * This function returns the currently active Keycloak instance that was
 * created during initialization. It's used by other modules to access
 * Keycloak functionality.
 *
 * @returns {Object|null} The Keycloak instance or null if not initialized
 *
 * Usage Example:
 * const keycloak = getKeycloakInstance();
 */
function getKeycloakInstance() {
  return keycloakInstance;
}

/**
 * Sets the Keycloak instance.
 *
 * This function allows setting a Keycloak instance from external sources.
 * It's primarily used for testing or when Keycloak is initialized elsewhere.
 *
 * @param {Object} instance - The Keycloak instance to set
 * @returns {void}
 *
 * Usage Example:
 * setKeycloakInstance(externalKeycloakInstance);
 */
function setKeycloakInstance(instance) {
  keycloakInstance = instance;
}

/**
 * Loads Keycloak dynamically from CDN.
 *
 * This function dynamically loads the Keycloak JavaScript library from a CDN
 * and creates a Keycloak instance with the configured settings. It handles
 * script loading errors and provides fallback mechanisms.
 *
 * @returns {Promise<void>} Resolves when Keycloak is loaded
 *
 * Functionality:
 * 1. Script Loading: Dynamically creates script tag for Keycloak library
 * 2. Error Handling: Handles script loading failures
 * 3. Instance Creation: Creates Keycloak instance after successful loading
 * 4. Configuration: Uses keycloakConfig for instance creation
 *
 * CDN URL: https://cdn.jsdelivr.net/npm/keycloak-js@latest/dist/keycloak.min.js
 *
 * Error Handling:
 * - Catches script loading errors
 * - Logs detailed error information
 * - Handles missing Keycloak library gracefully
 *
 * Usage Example:
 * await loadKeycloak();
 */
async function loadKeycloak() {
  try {
    const cdnUrl = (window.KEYCLOAK_CONFIG && window.KEYCLOAK_CONFIG.cdnUrl) || 'https://cdn.jsdelivr.net/npm/keycloak-js@latest/dist/keycloak.min.js';

    // Load Keycloak script
    const script = document.createElement('script');
    script.src = cdnUrl;
    script.onload = () => {
      console.log('Keycloak script loaded');
      // Initialize Keycloak instance
      if (window.Keycloak) {
        keycloakInstance = new window.Keycloak(keycloakConfig);
        console.log('Keycloak instance created');
      } else {
        console.error('Keycloak not available after script load');
      }
    };
    script.onerror = (error) => {
      console.error('Failed to load Keycloak script:', error);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error loading Keycloak:', error);
  }
}

/**
 * Parses JWT token to extract current user information.
 *
 * This function decodes a JWT token and extracts user information from the
 * payload. It creates a user object with standardized properties and stores
 * it in localStorage for persistence.
 *
 * @param {string} token - JWT token to parse
 * @returns {Object|null} User object or null if parsing fails
 *
 * Functionality:
 * 1. Token Decoding: Decodes JWT token using base64
 * 2. User Object Creation: Creates standardized user object
 * 3. Local Storage: Stores user information in localStorage
 * 4. Error Handling: Returns null if parsing fails
 *
 * User Object Properties:
 * - id: User ID from token subject
 * - username: Preferred username
 * - email: User email address
 * - email_verified: Email verification status
 * - family_name: User's last name
 * - given_name: User's first name
 * - phone_number: User's phone number
 * - phone_number_verified: Phone verification status
 *
 * Error Handling:
 * - Catches JWT parsing errors
 * - Logs error details
 * - Returns null on failure
 *
 * Usage Example:
 * const user = parseLoginResponseToStateCurrentUser(jwtToken);
 */
function parseLoginResponseToStateCurrentUser(token) {
  try {
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    const currentUser = {
      id: decodedToken.sub,
      username: decodedToken.preferred_username,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      family_name: decodedToken.family_name,
      given_name: decodedToken.given_name,
      phone_number: decodedToken.phone_number,
      phone_number_verified: decodedToken.phone_number_verified,
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return currentUser;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

/**
 * Sets up automatic token refresh mechanism.
 *
 * This function configures automatic token refresh to prevent session
 * expiration. It calculates the refresh time based on token expiration
 * and sets up a timer to refresh the token 5 minutes before it expires.
 *
 * @returns {void}
 *
 * Functionality:
 * 1. Token Validation: Checks if Keycloak instance and token exist
 * 2. Expiration Calculation: Calculates when token will expire
 * 3. Refresh Timing: Sets refresh to occur 5 minutes before expiration
 * 4. Immediate Refresh: Refreshes immediately if token is already expired
 * 5. Recursive Setup: Re-sets up refresh after successful token refresh
 *
 * Refresh Logic:
 * - Refreshes token 5 minutes before expiration
 * - Handles immediate refresh if token is expired
 * - Sets up recursive refresh after successful refresh
 * - Logs out user if refresh fails
 *
 * Error Handling:
 * - Handles immediate refresh failures
 * - Logs out user on refresh failure
 * - Provides detailed error logging
 *
 * Usage Example:
 * setupTokenRefresh();
 */
function setupTokenRefresh() {
  if (!keycloakInstance || !keycloakInstance.tokenParsed) {
    return;
  }

  const tokenExp = keycloakInstance.tokenParsed.exp;
  if (!tokenExp) {
    return;
  }

  const expirationTime = tokenExp * 1000; // Convert to milliseconds
  const now = Date.now();
  const refreshTime = expirationTime - now - 300000; // Refresh 5 minutes before expiration

  if (refreshTime <= 0) {
    keycloakRefresh().catch((err) => {
      console.error('Immediate token refresh failed:', err);
      signOut('true');
    });
    return;
  }

  setTimeout(() => {
    keycloakRefresh()
      .then(() => {
        setupTokenRefresh();
      })
      .catch((error) => {
        console.error('Scheduled token refresh failed, logging out', error);
        signOut('true');
      });
  }, refreshTime);
}

/**
 * Handles user login process.
 *
 * This function manages the user login process using Keycloak. It handles
 * both initial login and re-authentication scenarios, stores tokens in
 * localStorage, and sets up automatic token refresh.
 *
 * @returns {Promise<Object|null>} User object if successful, null if failed
 *
 * Functionality:
 * 1. Initialization Check: Checks if Keycloak is already initialized
 * 2. Login Flow: Initiates Keycloak login if not authenticated
 * 3. Token Processing: Extracts and stores authentication tokens
 * 4. User Creation: Creates user object from token information
 * 5. Token Refresh: Sets up automatic token refresh mechanism
 *
 * Login Scenarios:
 * - Initial login: Redirects to Keycloak login page
 * - Re-authentication: Uses existing session if available
 * - Token storage: Stores tokens in localStorage for persistence
 *
 * Error Handling:
 * - Catches authentication failures
 * - Logs detailed error information
 * - Throws errors for caller handling
 *
 * Usage Example:
 * const user = await login();
 */
async function login() {
  try {
    // If Keycloak is already initialized, just return the current user
    if (isKeycloakInitialized && keycloakInstance) {
      keycloakInstance.login();
      return null; // Login will redirect, so we don't need to return anything here
    }

    // Initialize Keycloak with login-required
    const authenticated = await keycloakInstance.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });

    isKeycloakInitialized = true;

    if (!authenticated) {
      console.warn('User is not authenticated');
      return null;
    }

    const token = keycloakInstance.token;
    const currentUser = parseLoginResponseToStateCurrentUser(token);

    // Store tokens
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', keycloakInstance.refreshToken);
    localStorage.setItem('idToken', keycloakInstance.idToken);
    localStorage.setItem('tokenParsed', JSON.stringify(keycloakInstance.tokenParsed));

    setupTokenRefresh();
    return currentUser;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Initializes Keycloak authentication system.
 *
 * This function initializes the Keycloak authentication system, loads the
 * Keycloak library if needed, and attempts to restore existing sessions
 * from localStorage. It handles both fresh initialization and session
 * restoration scenarios.
 *
 * @param {Function} [onAuthenticatedCallback] - Callback function called when authentication is complete
 * @returns {Promise<string|null>} Authentication token if successful, null if failed
 *
 * Functionality:
 * 1. Library Loading: Ensures Keycloak library is loaded
 * 2. Session Restoration: Attempts to restore existing session from localStorage
 * 3. Initialization: Initializes Keycloak with existing tokens
 * 4. Authentication Check: Verifies if user is authenticated
 * 5. Token Management: Stores tokens and sets up refresh mechanism
 * 6. Callback Execution: Calls provided callback with authentication result
 *
 * Initialization Modes:
 * - check-sso: Checks for existing session without redirect
 * - login-required: Forces login if no session exists
 *
 * Error Handling:
 * - Handles initialization failures
 * - Provides callback with null on failure
 * - Logs detailed error information
 *
 * Usage Example:
 * const token = await initKeycloak((token) => console.log('Authenticated:', token));
 */
async function initKeycloak(onAuthenticatedCallback) {
  // Ensure Keycloak is loaded
  if (!keycloakInstance) {
    await loadKeycloak();
    // Wait a bit for the script to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Prevent multiple initializations
  if (isKeycloakInitialized) {
    console.log('Keycloak already initialized');
    const token = keycloakInstance.token;
    if (onAuthenticatedCallback) {
      onAuthenticatedCallback(token || null);
    }
    return token || null;
  }

  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const idToken = localStorage.getItem('idToken');

  try {
    const authenticated = await keycloakInstance.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      token,
      refreshToken,
      idToken,
    });

    isKeycloakInitialized = true;

    if (authenticated) {
      const token = keycloakInstance.token;
      const currentUser = parseLoginResponseToStateCurrentUser(token);

      console.log('Keycloak initialized with existing token:', currentUser);

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', keycloakInstance.refreshToken);
      localStorage.setItem('idToken', keycloakInstance.idToken);
      localStorage.setItem('tokenParsed', JSON.stringify(keycloakInstance.tokenParsed));

      setupTokenRefresh();
      if (onAuthenticatedCallback) {
        onAuthenticatedCallback(token || null);
      }
      return token || null;
    } else {
      console.warn('User is not authenticated');
      if (onAuthenticatedCallback) {
        onAuthenticatedCallback(null);
      }
      return null;
    }
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    if (onAuthenticatedCallback) {
      onAuthenticatedCallback(null);
    }
    return null;
  }
}

/**
 * Gets the current authentication token.
 *
 * This function retrieves the current authentication token from the Keycloak
 * instance. It also updates the current user information from the token
 * before returning it.
 *
 * @returns {Promise<string|null>} Current authentication token or null if not available
 *
 * Functionality:
 * 1. Token Retrieval: Gets token from Keycloak instance
 * 2. User Update: Updates current user information from token
 * 3. Null Handling: Returns null if no token is available
 *
 * Error Handling:
 * - Returns null if Keycloak instance is not available
 * - Handles missing token scenarios gracefully
 *
 * Usage Example:
 * const token = await getAuthToken();
 */
async function getAuthToken() {
  if (keycloakInstance && keycloakInstance.token) {
    parseLoginResponseToStateCurrentUser(keycloakInstance.token);
  }
  return keycloakInstance ? keycloakInstance.token : null;
}

/**
 * Gets the current authentication token (alias for getAuthToken).
 *
 * This is a convenience function that provides an alternative name for
 * getAuthToken(). It's used for consistency with other modules that
 * expect a getToken() function.
 *
 * @returns {Promise<string|null>} Current authentication token or null if not available
 *
 * Usage Example:
 * const token = await getToken();
 */
async function getToken() {
  return getAuthToken();
}

/**
 * Signs out the current user and clears all authentication data.
 *
 * This function handles user logout by calling Keycloak's logout method
 * and clearing all stored authentication data from localStorage.
 *
 * @param {string} [session='false'] - Session expiration flag
 * @returns {void}
 *
 * Functionality:
 * 1. Keycloak Logout: Calls Keycloak's logout method
 * 2. Redirect URI: Sets redirect URI with session expiration parameter
 * 3. Data Cleanup: Removes all authentication data from localStorage
 * 4. Complete Clear: Clears all localStorage data
 *
 * Cleanup Actions:
 * - Removes authentication token
 * - Removes refresh token
 * - Removes ID token
 * - Removes token parsing data
 * - Removes current user data
 * - Clears all localStorage
 *
 * Error Handling:
 * - Logs logout errors
 * - Continues cleanup even if Keycloak logout fails
 *
 * Usage Example:
 * signOut('true'); // Session expired
 * signOut(); // Normal logout
 */
function signOut(session = 'false') {
  if (!keycloakInstance) {
    console.error('Keycloak instance not available for logout');
    return;
  }

  keycloakInstance
    .logout({
      redirectUri: `${window.location.origin}?sessionExpired=${session}`,
    })
    .then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('tokenParsed');
      localStorage.removeItem('currentUser');
      localStorage.clear();
    })
    .catch((err) => {
      console.error('Logout error:', err);
    });
}

/**
 * Refreshes the current authentication token.
 *
 * This function refreshes the authentication token using Keycloak's
 * updateToken method. It's used to prevent token expiration and
 * maintain active sessions.
 *
 * @returns {Promise<string>} Refreshed authentication token
 *
 * Functionality:
 * 1. Token Refresh: Calls Keycloak's updateToken method
 * 2. Minimum Validity: Ensures token is valid for at least 30 seconds
 * 3. Token Return: Returns the refreshed token
 *
 * Error Handling:
 * - Throws error if refresh fails
 * - Logs detailed error information
 * - Propagates errors to caller
 *
 * Usage Example:
 * const newToken = await keycloakRefresh();
 */
async function keycloakRefresh() {
  try {
    await keycloakInstance.updateToken(30);
    return keycloakInstance.token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Checks if the user is currently authenticated.
 *
 * This function checks the authentication status by querying the
 * Keycloak instance's authenticated property.
 *
 * @returns {boolean} True if user is authenticated, false otherwise
 *
 * Functionality:
 * 1. Status Check: Queries Keycloak instance authentication status
 * 2. Boolean Return: Returns true/false based on authentication state
 *
 * Usage Example:
 * if (isAuthenticated()) {
 *   console.log('User is logged in');
 * }
 */
function isAuthenticated() {
  return keycloakInstance ? keycloakInstance.authenticated : false;
}

/**
 * Gets the current user information from localStorage.
 *
 * This function retrieves the current user information that was stored
 * in localStorage during the authentication process.
 *
 * @returns {Object|null} User object or null if not found/parsing fails
 *
 * Functionality:
 * 1. Data Retrieval: Gets user data from localStorage
 * 2. JSON Parsing: Parses stored JSON string to object
 * 3. Error Handling: Returns null if parsing fails
 *
 * Error Handling:
 * - Returns null if user data is not found
 * - Returns null if JSON parsing fails
 * - Logs parsing errors for debugging
 *
 * Usage Example:
 * const user = getCurrentUser();
 * if (user) {
 *   console.log('Current user:', user.username);
 * }
 */
function getCurrentUser() {
  try {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser ? JSON.parse(currentUser) : null;
  } catch (error) {
    console.error('Error parsing current user:', error);
    return null;
  }
}

/**
 * Fetches the user's preferred tenant from the API.
 *
 * This function makes an API call to retrieve the user's preferred tenant
 * information. It uses the current authentication token for authorization.
 *
 * @returns {Promise<string|null>} Tenant ID if successful, null if failed
 *
 * Functionality:
 * 1. Token Validation: Ensures authentication token is available
 * 2. API Call: Makes GET request to tenant API endpoint
 * 3. Response Processing: Handles successful and failed responses
 * 4. Error Handling: Returns null on any failure
 *
 * API Endpoint: /api/v1/tenants/preferred
 *
 * Request Headers:
 * - Content-Type: application/json
 * - Authorization: Bearer token
 * - currentUser: Current user information
 * - refresh_token: Refresh token
 *
 * Error Handling:
 * - Returns null if no authentication token
 * - Returns null on API errors
 * - Logs warnings for failed requests
 * - Logs detailed error information
 *
 * Usage Example:
 * const tenantId = await fetchPreferredTenant();
 * if (tenantId) {
 *   console.log('Preferred tenant:', tenantId);
 * }
 */
async function fetchPreferredTenant() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }

    const claimsUrl = process.env.APP_CLAIMS_URL || window.API_CONFIG.CLAIMS_URL;
    const response = await fetch(`${claimsUrl}/api/v1/tenants/preferred`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'currentUser': localStorage.getItem('currentUser') || '',
        'refresh_token': localStorage.getItem('refreshToken') || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.tenantId;
    } else {
      console.warn('Failed to fetch preferred tenant, user may not be assigned to a tenant');
      return null;
    }
  } catch (error) {
    console.error('Error fetching preferred tenant:', error);
    return null;
  }
}

/**
 * Authentication API Object
 *
 * This object provides a centralized interface for all authentication-related
 * functions. It exports the main authentication functions for use by other
 * modules in the application.
 *
 * Available Methods:
 * - login: User login process
 * - initKeycloak: Keycloak initialization
 * - signOut: User logout
 * - getAuthToken: Get current auth token
 * - keycloakRefresh: Refresh authentication token
 * - isAuthenticated: Check authentication status
 * - getCurrentUser: Get current user information
 * - fetchPreferredTenant: Get user's preferred tenant
 *
 * Usage: This object is exported to the global window object for use by
 * other modules in the application.
 */
const authApi = {
  login,
  initKeycloak,
  signOut,
  getAuthToken,
  keycloakRefresh,
  isAuthenticated,
  getCurrentUser,
  fetchPreferredTenant
};

/**
 * Global Function Exports
 *
 * These functions and objects are exported to the global window object
 * to make them accessible to other modules and for event handler binding.
 *
 * Exported Objects:
 * - authApi: Main authentication API object
 * - keycloakConfig: Keycloak configuration object
 *
 * Exported Functions:
 * - loadKeycloak: Load Keycloak library
 * - getCurrentUser: Get current user information
 * - fetchPreferredTenant: Get preferred tenant
 * - getKeycloakInstance: Get Keycloak instance
 * - setKeycloakInstance: Set Keycloak instance
 * - isAuthenticated: Check authentication status
 * - initKeycloak: Initialize Keycloak
 * - getToken: Get authentication token
 *
 * Purpose: Makes authentication functions and configuration available globally
 * for use by other modules in the application.
 */
window.authApi = authApi;
window.keycloakConfig = keycloakConfig;
window.loadKeycloak = loadKeycloak;
window.getCurrentUser = getCurrentUser;
window.fetchPreferredTenant = fetchPreferredTenant;
window.getKeycloakInstance = getKeycloakInstance;
window.setKeycloakInstance = setKeycloakInstance;
window.isAuthenticated = isAuthenticated;
window.initKeycloak = initKeycloak;
window.getToken = getToken;

// Check if Keycloak instance already exists in window
if (window.keycloakInstance && !keycloakInstance) {
  keycloakInstance = window.keycloakInstance;
}

// Don't automatically load Keycloak - let main.js handle initialization
// loadKeycloak();

