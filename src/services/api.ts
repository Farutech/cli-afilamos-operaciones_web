declare global {
  interface Window {
    __ENV__?: {
      VITE_API_BASE_URL?: string
      API_BASE_URL?: string
    }
  }
}

const getBaseUrl = (): string => {
  // 1. Prioridad: Inyección en tiempo de ejecución (ConfigMap, Secret o variable de entorno de pod/contenedor)
  if (typeof window !== 'undefined') {
    const runtimeUrl = window.__ENV__?.VITE_API_BASE_URL || window.__ENV__?.API_BASE_URL
    if (runtimeUrl && runtimeUrl.trim() !== '') {
      return runtimeUrl.trim()
    }
  }

  // 2. Prioridad: Variable en tiempo de compilación (.env local de Vite)
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    return import.meta.env.VITE_API_BASE_URL.trim()
  }

  // 3. Prioridad: Detección inteligente por ambiente según el dominio del navegador (Zero-Config para dev/qa/staging/prod)
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location

    // Entornos sobre afilamoshermanos.com
    if (hostname.includes('afilamoshermanos.com')) {
      if (hostname.includes('.dev.') || hostname.includes('-dev') || hostname.startsWith('dev.') || hostname.includes('dev-')) {
        return 'https://api-ops.dev.afilamoshermanos.com/api/v1'
      }
      if (hostname.includes('.qa.') || hostname.includes('-qa') || hostname.startsWith('qa.') || hostname.includes('qa-')) {
        return 'https://api-ops.qa.afilamoshermanos.com/api/v1'
      }
      if (hostname.includes('.staging.') || hostname.includes('-staging') || hostname.startsWith('staging.') || hostname.includes('staging-') || hostname.includes('stg')) {
        return 'https://api-ops.staging.afilamoshermanos.com/api/v1'
      }
      return 'https://api-ops.afilamoshermanos.com/api/v1'
    }

    // Desarrollo local con puerto estándar de frontend
    if (hostname === 'localhost' || hostname === '127.0.0.1' || port === '3000' || port === '5173') {
      return `${protocol}//${hostname}:5000/api/v1`
    }
  }

  // 4. Fallback estándar
  return 'https://api-ops.afilamoshermanos.com/api/v1'
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

