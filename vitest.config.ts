/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion de Vitest. Sin este fichero, `npm test` (vitest run) no
// encuentra los tests de componentes porque falta el entorno DOM.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // Los tests existentes importan describe/it/expect de 'vitest' de forma
    // explicita y no usan los matchers de jest-dom, asi que no hace falta un
    // setupFiles. Si se anaden matchers de @testing-library/jest-dom, crear
    // src/setupTests.ts con la importacion y registrarlo aqui.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Un fallo de test debe tumbar el PR: es el gate, no un aviso.
    reporters: 'default',
  },
});
