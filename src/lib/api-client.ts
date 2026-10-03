declare global {
  interface Window {
    __ENV__?: {
      VITE_API_BASE_URL?: string;
      API_BASE_URL?: string;
    };
  }
}

export function apiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const runtimeUrl = window.__ENV__?.VITE_API_BASE_URL || window.__ENV__?.API_BASE_URL;
    if (runtimeUrl && runtimeUrl.trim() !== '') {
      return runtimeUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }

  // Dynamic hostname fallback
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host.includes('.dev.')) return 'https://api-ops.dev.afilamoshermanos.com';
    if (host.includes('.qa.')) return 'https://api-ops.qa.afilamoshermanos.com';
    if (host.includes('.staging.') || host.includes('.stg.')) return 'https://api-ops.staging.afilamoshermanos.com';
    if (host.includes('afilamoshermanos.com')) return 'https://api-ops.afilamoshermanos.com';
  }

  return 'https://api-ops.dev.afilamoshermanos.com';
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function ordeonRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = apiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: 'no-store',
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'title' in body
        ? String((body as { title?: string }).title)
        : typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: string }).message)
        : `La API respondió con ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}
