import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBaseUrl } from '@/services/api';
import { apiBaseUrl } from '@/lib/api-client';

describe('Resolución de URLs de API (apiBaseUrl y getBaseUrl)', () => {
  const originalEnv = window.__ENV__;
  const originalLocation = window.location;

  beforeEach(() => {
    window.__ENV__ = {};
  });

  afterEach(() => {
    window.__ENV__ = originalEnv;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.unstubAllEnvs();
  });

  it('prioriza window.__ENV__.VITE_API_BASE_URL inyectada en runtime', () => {
    window.__ENV__ = {
      VITE_API_BASE_URL: 'https://api-ops.custom.internal:8443/api/v1',
    };

    expect(getBaseUrl()).toBe('https://api-ops.custom.internal:8443/api/v1');
    expect(apiBaseUrl()).toBe('https://api-ops.custom.internal:8443');
  });

  it('sanitiza barras finales y asegura /api/v1 en getBaseUrl cuando runtime no incluye sufijo', () => {
    window.__ENV__ = {
      VITE_API_BASE_URL: 'https://api-ops.custom.internal:8443/',
    };

    expect(getBaseUrl()).toBe('https://api-ops.custom.internal:8443/api/v1');
    expect(apiBaseUrl()).toBe('https://api-ops.custom.internal:8443');
  });

  it('detecta correctamente ambiente local por dominio afilamoshermanos.local cuando no hay variable', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_URL', '');
    window.__ENV__ = {};

    // Simular hostname ops.afilamoshermanos.local con HTTPS
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'ops.afilamoshermanos.local',
        protocol: 'https:',
      },
      writable: true,
    });

    expect(getBaseUrl()).toBe('https://api-ops.afilamoshermanos.local/api/v1');
    expect(apiBaseUrl()).toBe('https://api-ops.afilamoshermanos.local');
  });

  it('detecta correctamente ambiente local por localhost mapeado a puerto 5005 cuando no hay variable', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_URL', '');
    window.__ENV__ = {};

    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        protocol: 'http:',
      },
      writable: true,
    });

    expect(getBaseUrl()).toBe('http://localhost:5005/api/v1');
    expect(apiBaseUrl()).toBe('http://localhost:5005');
  });
});
