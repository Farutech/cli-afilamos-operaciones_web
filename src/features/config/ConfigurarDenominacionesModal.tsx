import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';

export interface DenominacionConfigItem {
  valor: number;
  etiqueta: string;
  tipo: 'BILLETE' | 'MONEDA';
  activa: boolean;
}

interface ConfigurarDenominacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  denominacionesIniciales: DenominacionConfigItem[];
  onGuardar: (denominaciones: DenominacionConfigItem[]) => Promise<void>;
}

const DENOMINACIONES_DEFAULT: DenominacionConfigItem[] = [
  { valor: 100000, etiqueta: '$100.000', tipo: 'BILLETE', activa: true },
  { valor: 50000, etiqueta: '$50.000', tipo: 'BILLETE', activa: true },
  { valor: 20000, etiqueta: '$20.000', tipo: 'BILLETE', activa: true },
  { valor: 10000, etiqueta: '$10.000', tipo: 'BILLETE', activa: true },
  { valor: 5000, etiqueta: '$5.000', tipo: 'BILLETE', activa: true },
  { valor: 2000, etiqueta: '$2.000', tipo: 'BILLETE', activa: true },
  { valor: 1000, etiqueta: '$1.000', tipo: 'BILLETE', activa: true },
  { valor: 500, etiqueta: '$500', tipo: 'MONEDA', activa: true },
  { valor: 200, etiqueta: '$200', tipo: 'MONEDA', activa: true },
  { valor: 100, etiqueta: '$100', tipo: 'MONEDA', activa: true },
  { valor: 50, etiqueta: '$50', tipo: 'MONEDA', activa: true },
  { valor: 20, etiqueta: '$20', tipo: 'MONEDA', activa: false },
  { valor: 10, etiqueta: '$10', tipo: 'MONEDA', activa: false },
  { valor: 5, etiqueta: '$5', tipo: 'MONEDA', activa: false },
  { valor: 2, etiqueta: '$2', tipo: 'MONEDA', activa: false },
  { valor: 1, etiqueta: '$1', tipo: 'MONEDA', activa: false },
];

export function ConfigurarDenominacionesModal({
  isOpen,
  onClose,
  denominacionesIniciales,
  onGuardar,
}: ConfigurarDenominacionesModalProps) {
  const [denominaciones, setDenominaciones] = useState<DenominacionConfigItem[]>([]);
  const [valorNuevo, setValorNuevo] = useState<number | ''>('');
  const [tipoNuevo, setTipoNuevo] = useState<'BILLETE' | 'MONEDA'>('BILLETE');
  const [etiquetaNueva, setEtiquetaNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (denominacionesIniciales && denominacionesIniciales.length > 0) {
        setDenominaciones(denominacionesIniciales);
      } else {
        setDenominaciones(DENOMINACIONES_DEFAULT);
      }
      setValorNuevo('');
      setEtiquetaNueva('');
      setErrorMsg(null);
    }
  }, [isOpen, denominacionesIniciales]);

  const handleToggleActiva = (index: number) => {
    setDenominaciones((prev) =>
      prev.map((d, i) => (i === index ? { ...d, activa: !d.activa } : d))
    );
  };

  const handleEliminar = (index: number) => {
    setDenominaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(valorNuevo);
    if (!val || val <= 0) {
      setErrorMsg('Ingrese un valor numérico válido mayor a 0');
      return;
    }
    if (denominaciones.some((d) => d.valor === val && d.tipo === tipoNuevo)) {
      setErrorMsg(`Ya existe una denominación de ${tipoNuevo.toLowerCase()} con valor ${val}`);
      return;
    }

    const etiqueta = etiquetaNueva.trim() || `$${val.toLocaleString('es-CO')}`;
    const nueva: DenominacionConfigItem = {
      valor: val,
      etiqueta,
      tipo: tipoNuevo,
      activa: true,
    };

    // Insertar ordenado descendente por valor
    setDenominaciones((prev) => {
      const lista = [...prev, nueva];
      return lista.sort((a, b) => b.valor - a.valor);
    });

    setValorNuevo('');
    setEtiquetaNueva('');
    setErrorMsg(null);
  };

  const handleCargarDefault = () => {
    setDenominaciones(DENOMINACIONES_DEFAULT);
    setErrorMsg(null);
  };

  const handleGuardarFinal = async () => {
    setGuardando(true);
    setErrorMsg(null);
    try {
      await onGuardar(denominaciones);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la configuración de monedas');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💵 Configuración de Denominaciones de Efectivo"
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-slate-100">
        <p className="text-xs text-slate-400">
          Configure la planilla de monedas y billetes admitidos en caja para el arqueo ciego y el
          cierre de turno. Puede indicar valores grandes (100k, 50k, 20k) y fracciones o monedas (100, 50, 20, 10, 5, 2, 1) para un conteo físico exacto.
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Formulario de agregar nueva denominación */}
        <form onSubmit={handleAgregar} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide block">
            + Agregar Nueva Moneda o Billete
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Tipo *
              </label>
              <select
                value={tipoNuevo}
                onChange={(e) => setTipoNuevo(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="BILLETE">💵 Billete</option>
                <option value="MONEDA">🪙 Moneda</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Valor Numérico *
              </label>
              <input
                type="number"
                min={1}
                value={valorNuevo}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : '';
                  setValorNuevo(v);
                  if (typeof v === 'number' && !etiquetaNueva) {
                    setEtiquetaNueva(`$${v.toLocaleString('es-CO')}`);
                  }
                }}
                placeholder="Ej: 100, 50, 20, 5..."
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Etiqueta / Rótulo
              </label>
              <input
                type="text"
                value={etiquetaNueva}
                onChange={(e) => setEtiquetaNueva(e.target.value)}
                placeholder="Ej: $100 o $1"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <Button type="submit" variant="primary" size="sm" fullWidth>
                + Añadir
              </Button>
            </div>
          </div>
        </form>

        {/* Tabla de denominaciones configuradas */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <div className="flex items-center justify-between p-3 bg-slate-900/80 border-b border-slate-800 text-xs">
            <span className="font-bold text-white">
              Denominaciones Habilitadas ({denominaciones.filter((d) => d.activa).length} de {denominaciones.length})
            </span>
            <button
              type="button"
              onClick={handleCargarDefault}
              className="text-amber-400 hover:underline font-semibold cursor-pointer text-[11px]"
            >
              ↺ Cargar Estándar COP
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left">Etiqueta</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">En Arqueo</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {denominaciones.map((d, idx) => (
                  <tr key={`${d.tipo}-${d.valor}-${idx}`} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-mono font-bold text-white">
                      {d.etiqueta}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={d.tipo === 'BILLETE' ? 'success' : 'warning'}>
                        {d.tipo === 'BILLETE' ? '💵 Billete' : '🪙 Moneda'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      ${d.valor.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActiva(idx)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          d.activa
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {d.activa ? '✓ Activa' : '✕ Inactiva'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleEliminar(idx)}
                        className="text-rose-400 hover:text-rose-200 text-xs cursor-pointer font-bold"
                        title="Eliminar denominación"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botones de pie */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleGuardarFinal} loading={guardando}>
            Guardar Denominaciones
          </Button>
        </div>
      </div>
    </Modal>
  );
}
