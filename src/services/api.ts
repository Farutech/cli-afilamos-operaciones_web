declare global {
  interface Window {
    __ENV__?: {
      VITE_API_BASE_URL?: string
      API_BASE_URL?: string
    }
  }
}

const API_URLS = {
  dev: 'https://api-ops.dev.afilamoshermanos.com/api/v1',
  qa: 'https://api-ops.qa.afilamoshermanos.com/api/v1',
  staging: 'https://api-ops.staging.afilamoshermanos.com/api/v1',
  prod: 'https://api-ops.afilamoshermanos.com/api/v1',
} as const

type ApiEnvironment = keyof typeof API_URLS

const normalizeEnvironment = (value?: string): ApiEnvironment | undefined => {
  const environment = value?.trim().toLowerCase()
  if (environment === 'development' || environment === 'dev') return 'dev'
  if (environment === 'qa' || environment === 'quality') return 'qa'
  if (environment === 'staging' || environment === 'stage' || environment === 'stg') return 'staging'
  if (environment === 'production' || environment === 'prod') return 'prod'
  return undefined
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

  // 3. Ambiente explícito del despliegue (VITE_APP_ENV), ideal para ConfigMaps por namespace.
  const configuredEnvironment = normalizeEnvironment(import.meta.env.VITE_APP_ENV)
  if (configuredEnvironment) {
    return API_URLS[configuredEnvironment]
  }

  // 4. Detección zero-config por hostname del frontend.
  if (typeof window !== 'undefined') {
    const { hostname } = window.location

    if (hostname.includes('afilamoshermanos.com')) {
      if (hostname.includes('.dev.') || hostname.includes('-dev') || hostname.startsWith('dev.') || hostname.includes('dev-')) {
        return API_URLS.dev
      }
      if (hostname.includes('.qa.') || hostname.includes('-qa') || hostname.startsWith('qa.') || hostname.includes('qa-')) {
        return API_URLS.qa
      }
      if (hostname.includes('.staging.') || hostname.includes('-staging') || hostname.startsWith('staging.') || hostname.includes('staging-') || hostname.includes('stg')) {
        return API_URLS.staging
      }
      return API_URLS.prod
    }
  }

  // 5. Localhost y cualquier fallback no identificado validan contra DEV.
  return API_URLS.dev
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
    signal: options.signal,
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

