import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import type { SubtipoDocumento } from '../../types/catalogos';

/**
 * Modal Unificado de Gestión de Subtipos de Documento (Estilo Novasoft ERP).
 *
 * Configura los parámetros maestros de un subtipo de documento:
 *  1. Maestro del Documento: Código, Nombre, Prefijo, Sufijo, Ceros de relleno, Formato de papel.
 *     (La concatenación es directa: Prefijo + Folio + Sufijo sin insertar '-' automáticamente).
 *  2. Numeración / Consecutivo: Ajuste o salto directo del folio actual con bitácora.
 *  3. Política de Eliminación de Documentos Creados & Estado Operativo:
 *     - Política de cómo se eliminan o anulan los DOCUMENTOS generados con este tipo:
 *       Lógica (Anulación contable conservando consecutivo) vs Física (Purga de borradores).
 *     - Estado del Subtipo (Activo / Inactivo para permitir o bloquear la emisión de nuevos documentos).
 */

export type SubtipoConTipoBaseLocal = SubtipoDocumento & {
  tipoBaseCodigo?: string;
  tipoBaseNombre?: string;
  tipoBaseUuid?: string;
  sufijo?: string;
  politicaEliminacionDocumentos?: 'LOGICO' | 'FISICO';
};

export interface CambiosSubtipoDoc {
  nombre: string;
  descripcion: string;
  prefijo: string;
  sufijo: string;
  formatoPlantilla: string;
  formatoPapel: string;
  imprimeAlAsentar: boolean;
  longitudCeros: number;
  politicaEliminacionDocumentos: 'LOGICO' | 'FISICO';
  activo: boolean;
}

interface EditarSubtipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtipo: SubtipoConTipoBaseLocal | null;
  onGuardarCampos: (uuid: string, cambios: CambiosSubtipoDoc) => Promise<void>;
  onSaltarConsecutivo: (
    tipoBaseCodigo: string,
    codigoSubtipo: string,
    nuevoFolio: number,
    motivo: string
  ) => Promise<void>;
  onEliminar?: (uuid: string, modo: 'FISICO' | 'LOGICO', motivo: string) => Promise<void>;
  onReactivar?: (uuid: string) => Promise<void>;
  tipoEliminacionPermitido?: 'AMBAS' | 'LOGICA' | 'FISICA';
}

export function EditarSubtipoModal({
  isOpen,
  onClose,
  subtipo,
  onGuardarCampos,
  onSaltarConsecutivo,
}: EditarSubtipoModalProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // --- Datos del Maestro ---
  const [form, setForm] = useState<CambiosSubtipoDoc>({
    nombre: '',
    descripcion: '',
    prefijo: '',
    sufijo: '',
    formatoPlantilla: 'TIRILLA_80MM',
    formatoPapel: 'TIRILLA_80MM',
    imprimeAlAsentar: true,
    longitudCeros: 4,
    politicaEliminacionDocumentos: 'LOGICO',
    activo: true,
  });

  // --- Consecutivo / Renumerar (Novasoft Style) ---
  const [folioOriginal, setFolioOriginal] = useState<number>(1);
  const [folioActual, setFolioActual] = useState<number>(1);
  const [motivoSalto, setMotivoSalto] = useState<string>('Ajuste contable / Salto de consecutivo');

  useEffect(() => {
    if (subtipo) {
      setForm({
        nombre: subtipo.nombre || '',
        descripcion: subtipo.descripcion || '',
        prefijo: subtipo.prefijo || '',
        sufijo: subtipo.sufijo || (subtipo as any).suffix || '',
        formatoPlantilla: (subtipo as any).formatoPlantilla || 'TIRILLA_80MM',
        formatoPapel: (subtipo as any).formatoPapel || 'TIRILLA_80MM',
        imprimeAlAsentar: (subtipo as any).imprimeAlAsentar ?? true,
        longitudCeros: (subtipo as any).longitudCeros ?? (subtipo as any).numberLength ?? 4,
        politicaEliminacionDocumentos:
          ((subtipo as any).politicaEliminacionDocumentos as 'LOGICO' | 'FISICO') || 'LOGICO',
        activo: subtipo.activo ?? true,
      });
      const folio = subtipo.folioActual ?? 1;
      setFolioOriginal(folio);
      setFolioActual(folio);
      setError(null);
      setExito(null);
    }
  }, [subtipo]);

  if (!isOpen || !subtipo) return null;

  // Concatenación directa: Prefijo + Folio Relleno + Sufijo (sin guiones inventados)
  const formatearFolio = (
    num: number,
    prefijoStr = form.prefijo,
    ceros = form.longitudCeros,
    sufijoStr = form.sufijo
  ) => {
    const pad = String(Math.max(1, num)).padStart(Math.max(1, ceros), '0');
    return `${prefijoStr || ''}${pad}${sufijoStr || ''}`;
  };

  const handleGuardarMaestro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre del subtipo es obligatorio.');
      return;
    }
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      // 1. Guardar atributos del maestro y políticas del subtipo
      await onGuardarCampos(subtipo.uuid, form);

      // 2. Si se modificó el folio actual, aplicar el salto / renumeración
      if (folioActual !== folioOriginal) {
        const tipoBaseCod = subtipo.tipoBaseCodigo || 'SOL';
        await onSaltarConsecutivo(tipoBaseCod, subtipo.codigoSubtipo, folioActual, motivoSalto);
      }

      setExito('✓ Maestro del documento, políticas y consecutivo actualizados correctamente.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los cambios del subtipo.');
    } finally {
      setGuardando(false);
    }
  };

  const folioHaCambiado = folioActual !== folioOriginal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📑 Maestro de Subtipo de Documento (Novasoft)"
      size="xl"
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1 text-slate-100">
        {/* Encabezado Maestro */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-600/30">
              {subtipo.codigoSubtipo}
            </span>
            <div>
              <h4 className="font-bold text-white text-sm">{subtipo.nombre}</h4>
              <span className="text-xs text-slate-400">
                Tipo Base: <strong className="text-slate-200">{subtipo.tipoBaseCodigo || 'SOL'}</strong> ({subtipo.tipoBaseNombre || 'Operativo'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={form.activo ? 'success' : 'neutral'}>
              {form.activo ? 'Activo para Emisión' : 'Inactivo (Bloqueado)'}
            </Badge>
            <span className="text-xs font-mono text-slate-400">
              Folio Actual: <strong className="text-emerald-400 font-bold">{formatearFolio(folioOriginal)}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-xs text-rose-200 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 font-bold">✕</button>
          </div>
        )}
        {exito && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl text-xs text-emerald-200">
            {exito}
          </div>
        )}

        <form onSubmit={handleGuardarMaestro} className="space-y-4">
          {/* SECCIÓN 1: PROPIEDADES DOCUMENTALES */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>📋</span> Definición del Documento & Estructura de Serie
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Nombre del Subtipo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Solicitud General de Taller"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Prefijo (Ej: <span className="text-amber-400 font-mono">SOL-</span> ó <span className="text-amber-400 font-mono">SG</span>)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.prefijo}
                  onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })}
                  placeholder="SOL-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  Si requiere guión, inclúyalo aquí.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Sufijo (Ej: <span className="text-amber-400 font-mono">-VIP</span> ó <span className="text-amber-400 font-mono">-2026</span>)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.sufijo}
                  onChange={(e) => setForm({ ...form, sufijo: e.target.value.toUpperCase() })}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  Si requiere guión, inclúyalo aquí.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Formato de Impresión
                </label>
                <select
                  value={form.formatoPapel}
                  onChange={(e) =>
                    setForm({ ...form, formatoPapel: e.target.value, formatoPlantilla: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="TIRILLA_80MM">🧾 Tirilla POS 80mm</option>
                  <option value="MEDIA_CARTA">📋 Media Carta (Talón de Taller)</option>
                  <option value="CARTA">📄 Carta Completa (Factura / OT)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Longitud Ceros (Relleno)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.longitudCeros}
                  onChange={(e) =>
                    setForm({ ...form, longitudCeros: Math.max(1, parseInt(e.target.value) || 4) })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.imprimeAlAsentar}
                    onChange={(e) => setForm({ ...form, imprimeAlAsentar: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Imprimir automáticamente al asentar</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CONSECUTIVO Y CONTROL DE SALTO (UNIFICADO) */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>🔢</span> Numeración & Consecutivo Actual (Novasoft)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Ejemplo consecutivo resultante:{' '}
                <strong className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-600/30">
                  {formatearFolio(folioActual)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Número / Consecutivo Actual *
                </label>
                <input
                  type="number"
                  min={1}
                  value={folioActual}
                  onChange={(e) => setFolioActual(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  Edite directamente para saltar o corregir consecutivos
                </span>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  {folioHaCambiado ? '⚠️ Motivo del Salto / Renumeración *' : 'Bitácora / Justificación de Consecutivo'}
                </label>
                <select
                  value={motivoSalto}
                  onChange={(e) => setMotivoSalto(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-xs text-white focus:outline-none cursor-pointer ${
                    folioHaCambiado ? 'border-amber-500' : 'border-slate-700'
                  }`}
                >
                  <option value="Ajuste contable / Salto de consecutivo">
                    Ajuste contable / Salto de consecutivo
                  </option>
                  <option value="Papelería física dañada / Atasco en impresora">
                    Papelería física dañada / Atasco en impresora
                  </option>
                  <option value="Documento anulado físicamente antes de asentar">
                    Documento anulado físicamente antes de asentar
                  </option>
                  <option value="Sincronización con talonario manual de contingencia">
                    Sincronización con talonario manual de contingencia
                  </option>
                </select>
              </div>
            </div>

            {folioHaCambiado && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-600/40 text-xs text-amber-300">
                ℹ️ El folio pasará de <strong>{folioOriginal}</strong> a <strong>{folioActual}</strong> ({formatearFolio(folioActual)}). Se registrará el motivo en la bitácora de auditoría.
              </div>
            )}
          </div>

          {/* SECCIÓN 3: POLÍTICA DE ELIMINACIÓN DE DOCUMENTOS CREADOS & ESTADO DEL SUBTIPO */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>🛡️</span> Política de Eliminación de Documentos Creados & Estado
              </span>
              <span className="text-[11px] text-slate-400">
                Reglas aplicadas a documentos de este tipo
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Configure cómo debe actuar el sistema cuando un usuario desea eliminar o anular un documento emitido bajo este subtipo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.politicaEliminacionDocumentos === 'LOGICO'
                    ? 'bg-amber-950/30 border-amber-600/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="politica-elim-doc"
                  value="LOGICO"
                  checked={form.politicaEliminacionDocumentos === 'LOGICO'}
                  onChange={() => setForm({ ...form, politicaEliminacionDocumentos: 'LOGICO' })}
                  className="mt-0.5 accent-amber-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="block font-bold text-amber-300">
                    🚫 Eliminación Lógica (Anulación & Auditoría - Recomendada)
                  </span>
                  <span className="text-slate-400 block mt-0.5">
                    Al eliminar un documento creado con este subtipo, se marca como <strong>ANULADO</strong>.
                    Conserva el consecutivo numérico y todo el historial para auditoría contable y fiscal.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.politicaEliminacionDocumentos === 'FISICO'
                    ? 'bg-rose-950/30 border-rose-600/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="politica-elim-doc"
                  value="FISICO"
                  checked={form.politicaEliminacionDocumentos === 'FISICO'}
                  onChange={() => setForm({ ...form, politicaEliminacionDocumentos: 'FISICO' })}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="block font-bold text-rose-300">
                    🗑️ Eliminación Física (Purga de Borradores)
                  </span>
                  <span className="text-slate-400 block mt-0.5">
                    Permite borrar físicamente de la base de datos documentos creados bajo este subtipo
                    que se encuentren en borrador o sin movimientos contables ni cobros asentados.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold">
                  Subtipo Activo para Emisión (Permite crear nuevas solicitudes/documentos)
                </span>
              </label>
              <Badge variant={form.activo ? 'success' : 'neutral'} size="sm">
                {form.activo ? 'Emisión Habilitada' : 'Emisión Bloqueada'}
              </Badge>
            </div>
          </div>

          {/* ACCIONES DEL FORMULARIO PRINCIPAL */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={guardando}>
              ✓ Guardar Maestro Subtipo
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default EditarSubtipoModal;
