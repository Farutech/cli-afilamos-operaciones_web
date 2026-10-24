/**
 * Utilidades para dar formato canónico a los números de documentos y consecutivos
 * según las definiciones de cnf__document_serial_number (Prefijo, Folio con ceros, Sufijo).
 *
 * NOTA: La concatenación es directa: (prefijo || '') + pad + (sufijo || '').
 * NO se insertan guiones '-' automáticamente. Si el usuario desea guiones,
 * debe incluirlos explícitamente en el prefijo (ej: 'SOL-') o en el sufijo (ej: '-VIP').
 */

export function formatearNumeroDocumento(
  prefijo?: string,
  folio: number = 1,
  sufijo?: string,
  longitudCeros: number = 4
): string {
  const len = Math.max(1, longitudCeros || 4);
  const pad = String(Math.max(1, Math.floor(folio || 1))).padStart(len, '0');
  const pref = (prefijo || '').trim();
  const suf = (sufijo || '').trim();

  return `${pref}${pad}${suf}`;
}

