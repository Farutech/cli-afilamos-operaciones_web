import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import type { SubtipoDocumento } from '../../types/catalogos';

/**
 * Modal Unificado de Gestión de Subtipos de Documento (Estilo Novasoft ERP).
 *
 * Integra en UN solo maestro sin duplicar acciones:
 *  1. Maestro del Documento: Código, Nombre, Prefijo, Ceros de relleno, Formato de papel.
 *  2. Numeración / Consecutivo: Permite saltar o ajustar el folio actual directamente.
 *  3. Política de Eliminación: Configura si la eliminación es FÍSICA (borrado permanente)
 *     o LÓGICA (marcar inactivo para conservar auditoría y trazabilidad).
 */

export type SubtipoConTipoBaseLocal = SubtipoDocumento & {
  tipoBaseCodigo?: string;
  tipoBaseNombre?: string;
  tipoBaseUuid?: string;
};

export interface CambiosSubtipoDoc {
  nombre: string;
  descripcion: string;
  prefijo: string;
  formatoPlantilla: string;
  formatoPapel: string;
  imprimeAlAsentar: boolean;
  longitudCeros: number;
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
  onEliminar: (uuid: string, modo: 'FISICO' | 'LOGICO', motivo: string) => Promise<void>;
  onReactivar?: (uuid: string) => Promise<void>;
  tipoEliminacionPermitido?: 'AMBAS' | 'LOGICA' | 'FISICA';
}

export function EditarSubtipoModal({
  isOpen,
  onClose,
  subtipo,
  onGuardarCampos,
  onSaltarConsecutivo,
  onEliminar,
  onReactivar,
  tipoEliminacionPermitido = 'AMBAS',
}: EditarSubtipoModalProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // --- Datos del Maestro ---
  const [form, setForm] = useState<CambiosSubtipoDoc>({
    nombre: '',
    descripcion: '',
    prefijo: '',
    formatoPlantilla: 'TIRILLA_80MM',
    formatoPapel: 'TIRILLA_80MM',
    imprimeAlAsentar: true,
    longitudCeros: 4,
  });

  // --- Consecutivo / Renumerar (Novasoft Style) ---
  const [folioOriginal, setFolioOriginal] = useState<number>(1);
  const [folioActual, setFolioActual] = useState<number>(1);
  const [motivoSalto, setMotivoSalto] = useState<string>('Ajuste contable / Salto de consecutivo');

  // --- Política de Eliminación ---
  const [modoEliminacion, setModoEliminacion] = useState<'LOGICO' | 'FISICO'>('LOGICO');
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [confirmacionFisica, setConfirmacionFisica] = useState('');
  const [mostrarSeccionEliminar, setMostrarSeccionEliminar] = useState(false);

  useEffect(() => {
    if (subtipo) {
      setForm({
        nombre: subtipo.nombre || '',
        descripcion: subtipo.descripcion || '',
        prefijo: subtipo.prefijo || '',
        formatoPlantilla: (subtipo as any).formatoPlantilla || 'TIRILLA_80MM',
        formatoPapel: (subtipo as any).formatoPapel || 'TIRILLA_80MM',
        imprimeAlAsentar: (subtipo as any).imprimeAlAsentar ?? true,
        longitudCeros: (subtipo as any).longitudCeros ?? 4,
      });
      const folio = subtipo.folioActual ?? 1;
      setFolioOriginal(folio);
      setFolioActual(folio);
      setModoEliminacion(tipoEliminacionPermitido === 'FISICA' ? 'FISICO' : 'LOGICO');
      setMotivoEliminacion('');
      setConfirmacionFisica('');
      setMostrarSeccionEliminar(false);
      setError(null);
      setExito(null);
    }
  }, [subtipo, tipoEliminacionPermitido]);

  if (!isOpen || !subtipo) return null;

  const formatearFolio = (num: number, prefijoStr = form.prefijo, ceros = form.longitudCeros) => {
    const pad = String(Math.max(1, num)).padStart(Math.max(1, ceros), '0');
    return prefijoStr ? `${prefijoStr}-${pad}` : pad;
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
      // 1. Guardar atributos del maestro
      await onGuardarCampos(subtipo.uuid, form);

      // 2. Si se modificó el folio actual, aplicar el salto / renumeración
      if (folioActual !== folioOriginal) {
        const tipoBaseCod = subtipo.tipoBaseCodigo || 'SOL';
        await onSaltarConsecutivo(tipoBaseCod, subtipo.codigoSubtipo, folioActual, motivoSalto);
      }

      setExito('✓ Maestro del documento y consecutivo actualizados correctamente.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los cambios del subtipo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEjecutarEliminacion = async () => {
    if (!motivoEliminacion.trim()) {
      setError('Debe indicar el motivo de la desactivación/eliminación.');
      return;
    }
    if (modoEliminacion === 'FISICO' && confirmacionFisica.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Para eliminación física debe escribir la palabra "ELIMINAR" como confirmación.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await onEliminar(subtipo.uuid, modoEliminacion, motivoEliminacion.trim());
      setExito(
        modoEliminacion === 'FISICO'
          ? 'Subtipo eliminado físicamente de la base de datos.'
          : 'Subtipo marcado como inactivo (eliminación lógica conservando histórico).'
      );
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la eliminación del subtipo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleReactivar = async () => {
    if (!onReactivar) return;
    setGuardando(true);
    setError(null);
    try {
      await onReactivar(subtipo.uuid);
      setExito('✓ Subtipo reactivado correctamente.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error al reactivar el subtipo.');
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
            <Badge variant={subtipo.activo ? 'success' : 'neutral'}>
              {subtipo.activo ? 'Activo' : 'Inactivo'}
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
              <span>📋</span> Definición del Documento
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  Prefijo Documental
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={form.prefijo}
                  onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })}
                  placeholder="Ej: SG"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
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
                Siguiente folio generado:{' '}
                <strong className="text-emerald-400 font-bold">
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

          {/* SECCIÓN 3: POLÍTICA DE ELIMINACIÓN (CONFIGURACIÓN FÍSICA VS LÓGICA) */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>🛡️</span> Política de Eliminación & Estado
              </span>
              <button
                type="button"
                onClick={() => setMostrarSeccionEliminar(!mostrarSeccionEliminar)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                {mostrarSeccionEliminar ? 'Ocultar opciones de eliminación' : 'Configurar eliminación'}
              </button>
            </div>

            {mostrarSeccionEliminar ? (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  Seleccione cómo se procesa la eliminación de este subtipo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      modoEliminacion === 'LOGICO'
                        ? 'bg-amber-950/30 border-amber-600/50'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modo-elim"
                      value="LOGICO"
                      checked={modoEliminacion === 'LOGICO'}
                      onChange={() => setModoEliminacion('LOGICO')}
                      className="mt-0.5 accent-amber-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="block font-bold text-amber-300">
                        🚫 Eliminación Lógica (Recomendada)
                      </span>
                      <span className="text-slate-400 block mt-0.5">
                        Marca el documento como inactivo. No permite nuevas emisiones, pero conserva
                        todo el histórico de documentos y consecutivos para auditoría.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      modoEliminacion === 'FISICO'
                        ? 'bg-rose-950/30 border-rose-600/50'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modo-elim"
                      value="FISICO"
                      checked={modoEliminacion === 'FISICO'}
                      onChange={() => setModoEliminacion('FISICO')}
                      className="mt-0.5 accent-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="block font-bold text-rose-300">
                        🗑️ Eliminación Física (Destructiva)
                      </span>
                      <span className="text-slate-400 block mt-0.5">
                        Borra todo el registro de la base de datos como si el documento nunca hubiera
                        existido. Solo para errores de digitación iniciales sin movimientos.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Motivo de Eliminación / Desactivación
                  </label>
                  <input
                    type="text"
                    value={motivoEliminacion}
                    onChange={(e) => setMotivoEliminacion(e.target.value)}
                    placeholder="Ej: Subtipo duplicado o reemplazado por nueva serie..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {modoEliminacion === 'FISICO' && (
                  <div className="p-2.5 bg-rose-950/30 border border-rose-700/50 rounded-lg space-y-1">
                    <label className="text-[11px] font-semibold text-rose-300">
                      Escriba "ELIMINAR" para confirmar el borrado físico permanente:
                    </label>
                    <input
                      type="text"
                      value={confirmacionFisica}
                      onChange={(e) => setConfirmacionFisica(e.target.value)}
                      placeholder="ELIMINAR"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-rose-600 rounded-lg text-xs text-rose-200 font-mono font-bold focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant={modoEliminacion === 'FISICO' ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={handleEjecutarEliminacion}
                    disabled={guardando}
                  >
                    {modoEliminacion === 'FISICO' ? 'Ejecutar Eliminación Física' : 'Desactivar Subtipo (Lógica)'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Política activa: {modoEliminacion === 'LOGICO' ? 'Lógica (inactivar conservando histórico)' : 'Física (borrado total)'}. Estado actual: {subtipo.activo ? 'Activo' : 'Inactivo'}.
              </p>
            )}
          </div>

          {/* ACCIONES DEL FORMULARIO PRINCIPAL */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div>
              {!subtipo.activo && onReactivar && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReactivar}
                  disabled={guardando}
                >
                  ♻️ Reactivar Subtipo
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={guardando}>
                ✓ Guardar Maestro Subtipo
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default EditarSubtipoModal;
