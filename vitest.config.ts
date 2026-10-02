import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuracion de Vitest. Sin este fichero, `npm test` (vitest run) no
// encuentra los tests de componentes porque falta el entorno DOM.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Un fallo de test debe tumbar el PR: es el gate, no un aviso.
    reporters: 'default',
  },
});