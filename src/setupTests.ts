import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  window.print = () => {};
}

// Default fetch fallback to prevent unhandled ECONNREFUSED in happy-dom when backend is offline
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await originalFetch(input, init);
  } catch {
    return new Response(
      JSON.stringify({
        data: [],
        items: [],
        unidades: [],
        canales: [],
        clientes: [],
        categorias: [],
        listas: [],
        tipos: [],
        instrumentos: [],
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
