import { useEffect, useRef } from 'react';

/**
 * Hook para detectar lecturas de escáner de código de barras USB/HID (RF-11.2).
 * Los lectores de códigos de barras emulan un teclado ingresando caracteres en rápida
 * sucesión (<50ms entre pulsaciones) finalizando con la tecla Enter.
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: {
    minLength?: number;
    maxIntervalMs?: number;
    enabled?: boolean;
  } = {}
) {
  const { minLength = 3, maxIntervalMs = 50, enabled = true } = options;

  const bufferRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está enfocado en un campo de texto regular a menos que no haya target específico
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = '';
          onScan(barcode);
          if (isInput) {
            e.preventDefault();
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Solo procesar caracteres imprimibles
      if (e.key.length === 1) {
        const now = Date.now();
        const diff = now - lastTimeRef.current;

        // Si el tiempo entre caracteres es corto (emulación de hardware), se acumula
        if (bufferRef.current.length === 0 || diff <= maxIntervalMs) {
          bufferRef.current += e.key;
        } else {
          // Si hubo una pausa larga, reiniciar búfer con el nuevo caracter
          bufferRef.current = e.key;
        }
        lastTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, minLength, maxIntervalMs, enabled]);
}
