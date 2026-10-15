import { getBaseUrl } from './api';

let cachedPublicKeyPem: string | null = null;
let cachedCryptoKey: CryptoKey | null = null;
let fetchPromise: Promise<CryptoKey | null> | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const byteStr = window.atob(b64);
  const bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getPinPublicKey(): Promise<CryptoKey | null> {
  if (cachedCryptoKey) return cachedCryptoKey;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        return null;
      }
      const res = await fetch(`${getBaseUrl()}/auth/pin-public-key`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.publicKey) return null;
      cachedPublicKeyPem = data.publicKey;
      const spkiBuf = pemToArrayBuffer(cachedPublicKeyPem!);
      cachedCryptoKey = await window.crypto.subtle.importKey(
        'spki',
        spkiBuf,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt'],
      );
      return cachedCryptoKey;
    } catch {
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Cifra el PIN del supervisor usando la clave pública del servidor (RSA-OAEP-256)
 * e inyecta timestamp y nonce para blindarlo contra espionaje en DevTools/red y ataques de replay.
 * Si Web Crypto no está disponible o falla la clave pública, retorna el PIN tal cual como fallback.
 */
export async function securePin(rawPin: string | null | undefined): Promise<string> {
  if (!rawPin || !rawPin.trim()) return rawPin ?? '';
  const pin = rawPin.trim();

  // Si ya viene prefijado como cifrado, no re-cifrar
  if (pin.startsWith('enc:')) return pin;

  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return pin;
    }

    const key = await getPinPublicKey();
    if (!key) return pin;

    const envelope = JSON.stringify({
      pin,
      ts: Date.now(),
      nonce: typeof window.crypto.randomUUID === 'function' ? window.crypto.randomUUID() : Math.random().toString(36).substring(2),
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(envelope);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      key,
      data,
    );

    // Convert to base64
    const bytes = new Uint8Array(ciphertext);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = window.btoa(binary);

    return `enc:v1:${b64}`;
  } catch (err) {
    console.warn('[pinSecurity] No se pudo cifrar el PIN en el cliente, usando fallback:', err);
    return pin;
  }
}
