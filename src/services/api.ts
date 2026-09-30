const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location

    // Desarrollo local con puerto estándar de frontend
    if (port === '3000' || port === '5173') {
      return `${protocol}//${hostname}:5005/api/v1`
    }

    // Entornos dev, qa y producción sobre afilamoshermanos.com
    if (hostname.includes('dev-ops') || hostname.includes('dev-api') || hostname.includes('.dev.') || hostname.startsWith('dev.')) {
      if (hostname.includes('dev-ops')) {
        return `${protocol}//dev-api.afilamoshermanos.com/api/v1`
      }
      return `${protocol}//api.ops.dev.afilamoshermanos.com/api/v1`
    }
    if (hostname.includes('qa-ops') || hostname.includes('qa-api') || hostname.includes('.qa.') || hostname.startsWith('qa.')) {
      if (hostname.includes('qa-ops')) {
        return `${protocol}//qa-api.afilamoshermanos.com/api/v1`
      }
      return `${protocol}//api.ops.qa.afilamoshermanos.com/api/v1`
    }
    if (hostname.includes('afilamoshermanos.com')) {
      return `${protocol}//api-ops.afilamoshermanos.com/api/v1`
    }

  }

  return 'https://api.ops.afilamoshermanos.com/api/v1'
}


const BASE_URL = getBaseUrl()

export async function apiClient<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ordeon_token') : null)
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorDetail = `Error ${response.status}: ${response.statusText}`
    try {
      const text = await response.text()
      try {
        const errorJson = JSON.parse(text)
        errorDetail = errorJson.detail || errorJson.title || errorJson.message || errorDetail
      } catch {
        if (text && !text.includes('<!doctype') && !text.includes('<html')) {
          errorDetail = text.slice(0, 150)
        }
      }
    } catch {
      // Ignorar error de lectura
    }
    throw new Error(`[${response.status}] ${errorDetail}`)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }

  const text = await response.text()
  if (!text || text.trim() === '') {
    return undefined as unknown as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Respuesta inválida del servidor al invocar ${endpoint}`)
  }
}

export const api = {
  get: <T>(endpoint: string, token?: string) => apiClient<T>(endpoint, { method: 'GET' }, token),
  post: <T>(endpoint: string, data?: unknown, token?: string) =>
    apiClient<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }, token),
  put: <T>(endpoint: string, data?: unknown, token?: string) =>
    apiClient<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }, token),
  patch: <T>(endpoint: string, data?: unknown, token?: string) =>
    apiClient<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }, token),
  delete: <T>(endpoint: string, token?: string) => apiClient<T>(endpoint, { method: 'DELETE' }, token),
}

