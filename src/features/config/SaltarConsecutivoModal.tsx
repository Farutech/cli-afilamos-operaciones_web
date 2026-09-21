import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import type { SubtipoDocumento } from '../../types/catalogos';

interface SaltarConsecutivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtipo: (SubtipoDocumento & { tipoBaseCodigo?: string; tipoBaseNombre?: string }) | null;
  onActualizarConsecutivo: (
    tipoBaseCodigo: string,
    codigoSubtipo: string,
    nuevoFolio: number,
    motivo: string
  ) => Promise<void>;
}

export function SaltarConsecutivoModal({
  isOpen,
  onClose,
  subtipo,
  onActualizarConsecutivo,
}: SaltarConsecutivoModalProps) {
  const [nuevoFolio, setNuevoFolio] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('Papelería física dañada / Salto de folio');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subtipo) {
      const actual = Number(subtipo.folioActual || 0);
      setNuevoFolio(actual + 1);
      setError(null);
    }
  }, [subtipo]);

  if (!isOpen || !subtipo) return null;

  const actual = Number(subtipo.folioActual || 0);
  const prefijo = subtipo.prefijo || '';
  const longitudCeros = 4; // Estándar Novasoft

  const formatear = (num: number) => {
    const pad = String(num).padStart(longitudCeros, '0');
    return prefijo ? `${prefijo}-${pad}` : pad;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoFolio < actual) {
      setError(`El nuevo consecutivo (${nuevoFolio}) no puede ser menor al folio actual (${actual}).`);
      return;
    }
    if (!motivo.trim()) {
      setError('Debe especificar un motivo o justificación para el salto de consecutivo.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await onActualizarConsecutivo(
        subtipo.tipoBaseCodigo || '',
        subtipo.codigoSubtipo,
        nuevoFolio,
        motivo
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el consecutivo');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⏭️ Saltar Consecutivo / Renumerar (Control Documental)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cabecera del Subtipo */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-sm">
                {subtipo.codigoSubtipo}
              </span>
              <span className="text-white font-semibold text-sm">{subtipo.nombre}</span>
            </div>
            <Badge variant="info">{subtipo.tipoBaseCodigo || 'DOCUMENTO'}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400">Prefijo Actual:</span>
              <span className="ml-2 font-mono font-bold text-slate-200">{prefijo || '(Sin prefijo)'}</span>
            </div>
            <div>
              <span className="text-slate-400">Folio Actual en BD:</span>
              <span className="ml-2 font-mono font-bold text-emerald-400 text-sm">{actual}</span>
            </div>
          </div>
        </div>

        {/* Comparativa Visual Novasoft */}
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-around text-center">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Folio Registrado</div>
            <div className="text-xl font-mono font-bold text-slate-300 mt-1">
              {formatear(actual)}
            </div>
          </div>
          <div className="text-indigo-400 font-bold text-2xl">➔</div>
          <div>
            <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Nuevo Siguiente Folio</div>
            <div className="text-xl font-mono font-bold text-emerald-300 mt-1">
              {formatear(nuevoFolio)}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Input del Nuevo Folio y Botones de Salto Rápido */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Nuevo Número de Consecutivo a Asignar *
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={actual}
              value={nuevoFolio}
              onChange={(e) => setNuevoFolio(Math.max(actual, parseInt(e.target.value) || actual))}
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
            Las órdenes posteriores tomarán este nuevo folio de manera consecutiva y automática.
          </p>
        </div>

        {/* Motivo del Salto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Motivo / Justificación del Salto de Consecutivo *
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 mb-2"
          >
            <option value="Papelería física dañada / Atasco en impresora">Papelería física dañada / Atasco en impresora</option>
            <option value="Documento anulado físicamente antes de asentar">Documento anulado físicamente antes de asentar</option>
            <option value="Sincronización con talonario manual de contingencia">Sincronización con talonario manual de contingencia</option>
            <option value="Ajuste contable / Salto por error de digitación">Ajuste contable / Salto por error de digitación</option>
            <option value="Otro motivo especificado en observación">Otro motivo especificado</option>
          </select>

          {motivo === 'Otro motivo especificado en observación' && (
            <input
              type="text"
              placeholder="Describa el motivo específico del salto de folio..."
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando}>
            Confirmar y Renumerar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
