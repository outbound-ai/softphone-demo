import { authApi } from "../AuthApi";

export const fetchPreferedTenant = async () => {
  const token = await authApi.getAuthToken();
  try {
    const response = await fetch(`${process.env.REACT_APP_TENANT_ROLE_USER_URL}/api/v1/preferences/highest/outbound-ai-preferred-tenant`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch preferred tenant')
    }

    const data = await response.json()
    return data.value
  } catch (error) {
    console.error('Error fetching preferred tenant:', error)
    throw error
  }
}

