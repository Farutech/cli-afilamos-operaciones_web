import { describe, it, expect } from 'vitest';
import { formatearNumeroDocumento } from '../../utils/documentFormat';

describe('formatearNumeroDocumento', () => {
  it('concatena directamente prefijo y padding de 4 ceros sin guiones inventados', () => {
    expect(formatearNumeroDocumento('SOL', 1)).toBe('SOL0001');
    expect(formatearNumeroDocumento('SOL', 45)).toBe('SOL0045');
    expect(formatearNumeroDocumento('SOL', 1234)).toBe('SOL1234');
  });

  it('respeta el guión si el usuario lo incluye explícitamente en el prefijo', () => {
    expect(formatearNumeroDocumento('SOL-', 1)).toBe('SOL-0001');
    expect(formatearNumeroDocumento('COT-', 45)).toBe('COT-0045');
    expect(formatearNumeroDocumento('OT-', 77)).toBe('OT-0077');
  });

  it('respeta la longitud configurable de ceros a la izquierda (ej. 6 ceros)', () => {
    expect(formatearNumeroDocumento('SOL', 1, '', 6)).toBe('SOL000001');
    expect(formatearNumeroDocumento('SOL-', 250, '', 6)).toBe('SOL-000250');
  });

  it('concatena sufijo directamente y respeta si el sufijo tiene guión propio o no', () => {
    expect(formatearNumeroDocumento('SOL', 1, 'A', 4)).toBe('SOL0001A');
    expect(formatearNumeroDocumento('SOL-', 15, '-2026', 4)).toBe('SOL-0015-2026');
    expect(formatearNumeroDocumento('COT', 9, '-VIP', 6)).toBe('COT000009-VIP');
    expect(formatearNumeroDocumento('COT-', 9, 'VIP', 6)).toBe('COT-000009VIP');
  });

  it('funciona cuando no hay prefijo configurado', () => {
    expect(formatearNumeroDocumento('', 1, '', 4)).toBe('0001');
    expect(formatearNumeroDocumento(undefined, 8, '-SUR', 4)).toBe('0008-SUR');
  });
});

