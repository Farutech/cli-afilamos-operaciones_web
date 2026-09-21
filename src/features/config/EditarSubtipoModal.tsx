import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import type { SubtipoDocumento } from '../../types/catalogos';

/**
 * Modal Unificado de Gestión de Subtipos de Documento (Estilo Novasoft).
 *
 * Unifica en UNA sola acción de fila ("Editar Subtipo") lo que antes estaba
 * duplicado en dos botones ("Saltar Consecutivo" y "Editar Subtipo"):
 *
 *  1. Pestaña "Datos del Documento": nombre, descripción, prefijo, formato de
 *     plantilla/papel, impresión al asentar y control de ceros a la izquierda.
 *  2. Pestaña "Consecutivo / Renumerar": saltar folio por daño de papelería,
 *     anulación física o sincronización de talonario manual, con bitácora de motivo.
 *  3. Pestaña "Eliminación": eliminar FÍSICAMENTE (como si nunca hubiera existido)
 *     o LÓGICAMENTE (marcar inactivo conservando el histórico del consecutivo).
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

type PestanaActiva = 'datos' | 'consecutivo' | 'eliminacion';

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
  const [pestana, setPestana] = useState<PestanaActiva>('datos');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // --- Pestaña Datos ---
  const [form, setForm] = useState<CambiosSubtipoDoc>({
    nombre: '',
    descripcion: '',
    prefijo: '',
    formatoPlantilla: 'TIRILLA_POS',
    formatoPapel: 'TIRILLA',
    imprimeAlAsentar: true,
    longitudCeros: 4,
  });

  // --- Pestaña Consecutivo ---
  const [nuevoFolio, setNuevoFolio] = useState<number>(0);
  const [motivoSalto, setMotivoSalto] = useState<string>(
    'Papelería física dañada / Atasco en impresora'
  );

  // --- Pestaña Eliminación ---
  const [modoEliminacion, setModoEliminacion] = useState<'FISICO' | 'LOGICO'>('LOGICO');
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  useEffect(() => {
    if (!subtipo) return;
    setPestana('datos');
    setError(null);
    setExito(null);
    setConfirmacionTexto('');
    setMotivoEliminacion('');
    setForm({
      nombre: subtipo.nombre || '',
      descripcion: subtipo.descripcion || '',
      prefijo: subtipo.prefijo || '',
      formatoPlantilla: subtipo.formatoPlantilla || 'TIRILLA_POS',
      formatoPapel: subtipo.formatoPapel || 'TIRILLA',
      imprimeAlAsentar: subtipo.imprimeAlAsentar ?? true,
      longitudCeros: Number((subtipo as any).longitudCeros ?? 4),
    });
    setNuevoFolio(Number(subtipo.folioActual || 0) + 1);
    setMotivoSalto('Papelería física dañada / Atasco en impresora');
    setModoEliminacion('LOGICO');
  }, [subtipo]);

  if (!isOpen || !subtipo) return null;

  const folioActual = Number(subtipo.folioActual || 0);
  const prefijoVista = form.prefijo || subtipo.prefijo || '';

  const formatearFolio = (num: number) => {
    const pad = String(Math.max(0, num)).padStart(form.longitudCeros || 4, '0');
    return prefijoVista ? `${prefijoVista}-${pad}` : pad;
  };

  const handleGuardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    if (!form.nombre.trim()) {
      setError('El nombre del subtipo es obligatorio.');
      return;
    }
    if (form.longitudCeros < 1 || form.longitudCeros > 12) {
      setError('La longitud de ceros debe estar entre 1 y 12 dígitos.');
      return;
    }
    setGuardando(true);
    try {
      await onGuardarCampos(subtipo.uuid, form);
      setExito('Datos del subtipo actualizados correctamente.');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los datos del subtipo');
    } finally {
      setGuardando(false);
    }
  };

  const handleSaltar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    if (nuevoFolio < folioActual) {
      setError(
        `El nuevo consecutivo (${nuevoFolio}) no puede ser menor al folio actual (${folioActual}).`
      );
      return;
    }
    if (!motivoSalto.trim()) {
      setError('Debe especificar un motivo o justificación para el salto de consecutivo.');
      return;
    }
    setGuardando(true);
    try {
      await onSaltarConsecutivo(
        subtipo.tipoBaseCodigo || '',
        subtipo.codigoSubtipo,
        nuevoFolio,
        motivoSalto
      );
      setExito(
        `Consecutivo renumerado: el siguiente documento será ${formatearFolio(nuevoFolio)}.`
      );
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el consecutivo');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    if (!motivoEliminacion.trim()) {
      setError('Debe registrar el motivo de la eliminación para la bitácora de auditoría.');
      return;
    }
    if (modoEliminacion === 'FISICO' && confirmacionTexto.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Para la eliminación física escriba exactamente "ELIMINAR" para confirmar.');
      return;
    }
    setGuardando(true);
    try {
      await onEliminar(subtipo.uuid, modoEliminacion, motivoEliminacion);
      setExito(
        modoEliminacion === 'FISICO'
          ? 'Subtipo eliminado físicamente de la base de datos.'
          : 'Subtipo desactivado lógicamente (histórico conservado).'
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el subtipo');
    } finally {
      setGuardando(false);
    }
  };

  const handleReactivar = async () => {
    if (!onReactivar) return;
    setError(null);
    setExito(null);
    setGuardando(true);
    try {
      await onReactivar(subtipo.uuid);
      setExito('Subtipo reactivado correctamente.');
    } catch (err: any) {
      setError(err?.message || 'Error al reactivar el subtipo');
    } finally {
      setGuardando(false);
    }
  };

  const pestanas: { id: PestanaActiva; label: string; icono: string }[] = [
    { id: 'datos', label: 'Datos del Documento', icono: '📄' },
    { id: 'consecutivo', label: 'Consecutivo / Renumerar', icono: '⏭️' },
    { id: 'eliminacion', label: 'Eliminación', icono: '🚫' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✏️ Editar Subtipo de Documento (Control Novasoft)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Cabecera del Subtipo */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-sm shrink-0">
                {subtipo.codigoSubtipo}
              </span>
              <span className="text-white font-semibold text-sm truncate">{subtipo.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{subtipo.tipoBaseCodigo || 'DOCUMENTO'}</Badge>
              <Badge variant={subtipo.activo ? 'success' : 'neutral'}>
                {subtipo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block">Prefijo:</span>
              <span className="font-mono font-bold text-slate-200">
                {prefijoVista || '(Sin prefijo)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Folio Actual:</span>
              <span className="font-mono font-bold text-slate-200">{formatearFolio(folioActual)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Siguiente:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatearFolio(folioActual + 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/70 border border-slate-800 rounded-xl">
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPestana(p.id);
                setError(null);
                setExito(null);
              }}
              className={`flex-1 min-w-[8rem] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                pestana === p.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{p.icono}</span>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/40 text-xs text-rose-200">
            {error}
          </div>
        )}
        {exito && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-xs text-emerald-200">
            {exito}
          </div>
        )}

        {/* ─── PESTAÑA: DATOS DEL DOCUMENTO ─────────────────────────── */}
        {pestana === 'datos' && (
          <form onSubmit={handleGuardarDatos} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nombre / Descripción del Subtipo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ej: Solicitud General de Taller e Inventario"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Observaciones / Descripción Larga
                </label>
                <textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white resize-none focus:outline-none focus:border-indigo-500"
                  placeholder="Detalle operativo del subtipo documental..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Prefijo del Documento</label>
                <input
                  type="text"
                  value={form.prefijo}
                  onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="Ej: SG"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Ceros a la Izquierda (padding)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.longitudCeros}
                    onChange={(e) =>
                      setForm({ ...form, longitudCeros: Number(e.target.value) || 4 })
                    }
                    className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono text-right focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">
                    Vista previa:{' '}
                    <span className="font-mono font-bold text-emerald-400">
                      {formatearFolio(folioActual + 1)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Formato de Papel</label>
                <select
                  value={form.formatoPapel}
                  onChange={(e) => setForm({ ...form, formatoPapel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="TIRILLA">Tirilla POS 80mm</option>
                  <option value="MEDIA_CARTA">Media Carta</option>
                  <option value="CARTA">Carta Completa</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Plantilla de Impresión</label>
                <select
                  value={form.formatoPlantilla}
                  onChange={(e) => setForm({ ...form, formatoPlantilla: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="TIRILLA_POS">Tirilla POS (Estándar)</option>
                  <option value="TIRILLA_COMPACTA">Tirilla Compacta</option>
                  <option value="FORMATO_ESPECIAL">Formato Especial / Carta</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.imprimeAlAsentar}
                onChange={(e) => setForm({ ...form, imprimeAlAsentar: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-200">
                <span className="font-semibold">Imprime al Asentar</span>
                <span className="text-slate-400 block">
                  Dispara la impresión automática del documento en el momento de su asentamiento.
                </span>
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
                Cerrar
              </Button>
              <Button type="submit" variant="primary" loading={guardando}>
                Guardar Datos del Subtipo
              </Button>
            </div>
          </form>
        )}

        {/* ─── PESTAÑA: CONSECUTIVO / RENUMERAR ─────────────────────── */}
        {pestana === 'consecutivo' && (
          <form onSubmit={handleSaltar} className="space-y-4">
            <p className="text-xs text-slate-400">
              Adelanta el consecutivo del subtipo para cubrir papelería física dañada, documentos
              anulados antes de asentar o sincronización con talonario manual de contingencia. Todos
              los documentos posteriores continuarán de forma automática desde el nuevo folio.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nuevo Consecutivo *</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm font-bold text-amber-400">
                  {prefijoVista ? `${prefijoVista}-` : ''}
                </span>
                <input
                  type="number"
                  min={folioActual}
                  value={nuevoFolio}
                  onChange={(e) =>
                    setNuevoFolio(Math.max(folioActual, parseInt(e.target.value) || folioActual))
                  }
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-none focus:border-indigo-500 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setNuevoFolio((prev) => prev + 1)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoFolio((prev) => prev + 5)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setNuevoFolio((prev) => prev + 10)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  +10
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Vista previa del siguiente documento:{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {formatearFolio(nuevoFolio)}
                </span>{' '}
                (el folio actual es{' '}
                <span className="font-mono text-slate-300">{formatearFolio(folioActual)}</span>).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Motivo / Justificación del Salto *
              </label>
              <select
                value={motivoSalto}
                onChange={(e) => setMotivoSalto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Papelería física dañada / Atasco en impresora">
                  Papelería física dañada / Atasco en impresora
                </option>
                <option value="Documento anulado físicamente antes de asentar">
                  Documento anulado físicamente antes de asentar
                </option>
                <option value="Sincronización con talonario manual de contingencia">
                  Sincronización con talonario manual de contingencia
                </option>
                <option value="Ajuste contable / Salto por error de digitación">
                  Ajuste contable / Salto por error de digitación
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
                Cerrar
              </Button>
              <Button type="submit" variant="primary" loading={guardando}>
                Confirmar y Renumerar
              </Button>
            </div>
          </form>
        )}

        {/* ─── PESTAÑA: ELIMINACIÓN ─────────────────────────────────── */}
        {pestana === 'eliminacion' && (
          <form onSubmit={handleEliminar} className="space-y-4">
            <p className="text-xs text-slate-400">
              Seleccione el tipo de eliminación. La{' '}
              <span className="text-rose-300 font-semibold">física</span> borra el registro como si
              nunca hubiera existido (solo para errores de digitación sin documentos asociados). La{' '}
              <span className="text-amber-300 font-semibold">lógica</span> marca el subtipo como
              inactivo conservando su histórico y consecutivo para auditoría.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  modoEliminacion === 'LOGICO'
                    ? 'bg-amber-950/30 border-amber-600/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                } ${tipoEliminacionPermitido === 'FISICA' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="modo-eliminacion"
                  value="LOGICO"
                  checked={modoEliminacion === 'LOGICO'}
                  disabled={tipoEliminacionPermitido === 'FISICA'}
                  onChange={() => setModoEliminacion('LOGICO')}
                  className="mt-0.5 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs">
                  <span className="block font-bold text-amber-300">
                    🚫 Eliminación Lógica (Recomendada)
                  </span>
                  <span className="text-slate-400 block mt-0.5">
                    Marca el subtipo como inactivo. No se puede usar en nuevas capturas, pero el
                    histórico y el consecutivo quedan intactos.
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  modoEliminacion === 'FISICO'
                    ? 'bg-rose-950/30 border-rose-600/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                } ${tipoEliminacionPermitido === 'LOGICA' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="modo-eliminacion"
                  value="FISICO"
                  checked={modoEliminacion === 'FISICO'}
                  disabled={tipoEliminacionPermitido === 'LOGICA'}
                  onChange={() => setModoEliminacion('FISICO')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <span className="text-xs">
                  <span className="block font-bold text-rose-300">
                    🗑️ Eliminación Física (Destructiva)
                  </span>
                  <span className="text-slate-400 block mt-0.5">
                    Borra el registro de la base de datos como si nunca hubiera existido. Requiere
                    escribir "ELIMINAR" para confirmar.
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Motivo de la Eliminación *
              </label>
              <textarea
                rows={2}
                value={motivoEliminacion}
                onChange={(e) => setMotivoEliminacion(e.target.value)}
                placeholder="Ej: Subtipo creado por error de digitación, sin documentos asociados."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white resize-none focus:outline-none focus:border-indigo-500"
              />
            </div>

            {modoEliminacion === 'FISICO' && (
              <div className="space-y-1.5 p-3 rounded-xl bg-rose-950/20 border border-rose-800/40">
                <label className="text-xs font-semibold text-rose-200">
                  Escriba "ELIMINAR" para confirmar la destrucción del registro *
                </label>
                <input
                  type="text"
                  value={confirmacionTexto}
                  onChange={(e) => setConfirmacionTexto(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full px-3 py-2 bg-slate-950 border border-rose-700/60 rounded-xl text-sm text-rose-100 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
              {!subtipo.activo && onReactivar && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReactivar}
                  disabled={guardando}
                >
                  ♻️ Reactivar Subtipo
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={modoEliminacion === 'FISICO' ? 'danger' : 'primary'}
                loading={guardando}
              >
                {modoEliminacion === 'FISICO' ? 'Eliminar Físicamente' : 'Desactivar Subtipo'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default EditarSubtipoModal;

