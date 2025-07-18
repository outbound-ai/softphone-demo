
import Keycloak from 'keycloak-js'


console.log('REACT_APP_KEYCLOAK_CLIENT_REALM', process.env.REACT_APP_KEYCLOAK_CLIENT_REALM)

const keycloakInstance = new (Keycloak as any)({
  url: 'https://auth.phoenix.ops.virtualoutbound.com/',
  realm: process.env.REACT_APP_KEYCLOAK_CLIENT_REALM, // need to be reverted to prod no env 
  clientId: 'aquarius-ui',
})

let isKeycloakInitialized = false

export const parseLoginResponseToStateCurrentUser = (token: string) => {
  const decodedToken = JSON.parse(atob(token.split('.')[1]))
  const currentUser = {
    id: decodedToken.sub,
    username: decodedToken.preferred_username,
    email: decodedToken.email,
    email_verified: decodedToken.email_verified,
    family_name: decodedToken.family_name,
    given_name: decodedToken.given_name,
    phone_number: decodedToken.phone_number,
    phone_number_verified: decodedToken.phone_number_verified,
  }
  localStorage.setItem('currentUser', JSON.stringify(currentUser))
  return currentUser
}

const setupTokenRefresh = () => {
  const tokenExp = keycloakInstance.tokenParsed?.exp

  if (!tokenExp) {
    return
  }

  const expirationTime = tokenExp * 1000 // Convert to milliseconds
  const now = Date.now()
  const refreshTime = expirationTime - now - 300000 // Refresh 5 minutes before expiration
  
  if (refreshTime <= 0) {
    keycloakRefresh().catch((err) => {
      console.error('Immediate token refresh failed:', err)
      signOut('true')
    })
    return
  }

  setTimeout(() => {
    keycloakRefresh()
      .then(() => {
        setupTokenRefresh()
      })
      .catch((error) => {
        console.error('Scheduled token refresh failed, logging out', error)
        signOut('true')
      })
  }, refreshTime)
}

const login = async () => {
  try {
    // If Keycloak is already initialized, just return the current user
    if (isKeycloakInitialized) {
      keycloakInstance.login()
      return null // Login will redirect, so we don't need to return anything here
    }

    // Initialize Keycloak with login-required
    const authenticated = await keycloakInstance.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    })

    isKeycloakInitialized = true

    if (!authenticated) {
      console.warn('User is not authenticated')
      return null
    }

    const token = keycloakInstance.token
    const currentUser = parseLoginResponseToStateCurrentUser(token as string)

    // Store tokens
    localStorage.setItem('token', token as string)
    localStorage.setItem('refreshToken', keycloakInstance.refreshToken as string)
    localStorage.setItem('idToken', keycloakInstance.idToken as string)
    localStorage.setItem('tokenParsed', JSON.stringify(keycloakInstance.tokenParsed))
   
    setupTokenRefresh()
    return currentUser
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
}


const initKeycloak = async (onAuthenticatedCallback: (token: string | null) => void) => {
  // Prevent multiple initializations
  if (isKeycloakInitialized) {
    console.log('Keycloak already initialized')
    const token = keycloakInstance.token
    onAuthenticatedCallback(token || null)
    return
  }

  const token = localStorage.getItem('token')
  const refreshToken = localStorage.getItem('refreshToken')
  const idToken = localStorage.getItem('idToken')

  try {
    const authenticated = await keycloakInstance.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      token,
      refreshToken,
      idToken,
    })

    isKeycloakInitialized = true

    if (authenticated) {
      const token = keycloakInstance.token
      const currentUser = parseLoginResponseToStateCurrentUser(token as string)

      console.log('Keycloak initialized with existing token:', currentUser)

      localStorage.setItem('token', token as string)
      localStorage.setItem('refreshToken', keycloakInstance.refreshToken as string)
      localStorage.setItem('idToken', keycloakInstance.idToken as string)
      localStorage.setItem('tokenParsed', JSON.stringify(keycloakInstance.tokenParsed))

      setupTokenRefresh()
      onAuthenticatedCallback(token || null)

    } else {
      console.warn('User is not authenticated')
      onAuthenticatedCallback(null)
    }
  } catch (error) {
    console.error('Keycloak initialization failed:', error)
    onAuthenticatedCallback(null)
  }
}



const getAuthToken = async () => {
  if (keycloakInstance.token) {
    parseLoginResponseToStateCurrentUser(keycloakInstance.token as string)
  }
  return keycloakInstance.token
}

const signOut = (session = 'false') => {
  keycloakInstance
    .logout({
      redirectUri: `${window.location.origin}?sessionExpired=${session}`,
    })
    .then(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('idToken')
      localStorage.removeItem('tokenParsed')
      localStorage.removeItem('currentUser')
      localStorage.clear()
    })
    .catch((err: any) => {
      console.error('Logout error:', err)
    })
}

const keycloakRefresh = async () => {
  try {
    await keycloakInstance.updateToken(30)
    return keycloakInstance.token
  } catch (error) {
    console.error('Error refreshing token:', error)
    throw error
  }
}

const isAuthenticated =  () => {

  return keycloakInstance.authenticated
}

const getCurrentUser = () => {
  const currentUser = localStorage.getItem('currentUser')
  return currentUser ? JSON.parse(currentUser) : null
}

export const authApi = {
  login,
  initKeycloak,
  signOut,
  getAuthToken,
  keycloakRefresh,
  isAuthenticated,
  getCurrentUser,
}
