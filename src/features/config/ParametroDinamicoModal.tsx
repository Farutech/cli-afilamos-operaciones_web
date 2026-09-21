import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import type { ParametroSistema } from '../../types/catalogos';

interface ParametroDinamicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  parametro: ParametroSistema | null;
  onGuardar: (clave: string, valorActualizado: any) => Promise<void>;
}

interface CampoDef {
  key: string;
  label: string;
  tipo: 'boolean' | 'number' | 'string' | 'select';
  descripcion?: string;
  min?: number;
  max?: number;
  step?: number;
  sufijo?: string;
  opciones?: { label: string; value: string }[];
}

interface ParametroMetadata {
  nombreVisible: string;
  descripcion: string;
  categoria: string;
  icono: string;
  campos: CampoDef[];
}

// Catálogo de Metadatos y Esquemas de Parámetros del Sistema
const METADATOS_PARAMETROS: Record<string, ParametroMetadata> = {
  anticipo_obligatorio: {
    nombreVisible: 'Política de Anticipos en Mostrador',
    descripcion: 'Reglas de recaudo obligatorio de anticipo porcentual antes de enviar ítems a taller.',
    categoria: 'Finanzas & POS',
    icono: '💰',
    campos: [
      {
        key: 'activo',
        label: 'Exigir Anticipo Obligatorio',
        tipo: 'boolean',
        descripcion: 'Si está activo, ninguna orden pasará a Taller sin haber recaudado la seña mínima.',
      },
      {
        key: 'porcentajeMinimo',
        label: 'Porcentaje Mínimo de Anticipo',
        tipo: 'number',
        min: 0,
        max: 100,
        step: 5,
        sufijo: '%',
        descripcion: 'Porcentaje del total del servicio requerido como anticipo (ej: 50%).',
      },
      {
        key: 'permitirExcepcionVoBo',
        label: 'Permitir Excepción con VoBo',
        tipo: 'boolean',
        descripcion: 'Permite al Administrador o Supervisor liberar una orden sin anticipo mediante clave/PIN.',
      },
    ],
  },
  porcentaje_anticipo_min: {
    nombreVisible: 'Porcentaje Mínimo de Anticipo (Estándar)',
    descripcion: 'Porcentaje por defecto exigido a clientes generales al recibir herramientas.',
    categoria: 'Finanzas & POS',
    icono: '📊',
    campos: [
      {
        key: 'valor',
        label: 'Porcentaje Mínimo',
        tipo: 'number',
        min: 0,
        max: 100,
        step: 5,
        sufijo: '%',
        descripcion: 'Porcentaje estándar aplicado a órdenes regulares.',
      },
    ],
  },
  consecutivo_estricto: {
    nombreVisible: 'Control de Consecutivos (Novasoft-Style)',
    descripcion: 'Políticas de auditoría sobre saltos de números de facturas, remisiones y comprobantes.',
    categoria: 'Auditoría & Documentos',
    icono: '🔢',
    campos: [
      {
        key: 'sinHuecos',
        label: 'Prohibir Huecos de Consecutivo',
        tipo: 'boolean',
        descripcion: 'Exige justificación de auditoría cada vez que se salte un folio en impresión.',
      },
      {
        key: 'longitudCerosDefecto',
        label: 'Longitud de Ceros a la Izquierda',
        tipo: 'number',
        min: 2,
        max: 10,
        step: 1,
        sufijo: 'dígitos',
        descripcion: 'Cantidad de dígitos para relleno numérico (ej: 4 dígitos -> 0005).',
      },
      {
        key: 'permitirFechasAnteriores',
        label: 'Permitir Registro con Fecha Pasada',
        tipo: 'boolean',
        descripcion: 'Habilita a cajeros registrar comprobantes con fecha extemporánea controlada.',
      },
    ],
  },
  iva_general: {
    nombreVisible: 'Régimen Tributario & IVA',
    descripcion: 'Tarifa general de impuesto sobre las ventas aplicada a servicios y productos.',
    categoria: 'Tributaria',
    icono: '🏛️',
    campos: [
      {
        key: 'porcentaje',
        label: 'Tarifa IVA',
        tipo: 'number',
        min: 0,
        max: 30,
        step: 1,
        sufijo: '%',
        descripcion: 'Tarifa legal aplicable (19% en Colombia régimen común).',
      },
      {
        key: 'preciosConIva',
        label: 'Precios en Catálogo Incluyen IVA',
        tipo: 'boolean',
        descripcion: 'Indica si los precios mostrados en el mostrador ya contemplan el impuesto.',
      },
    ],
  },
  turnos_caja: {
    nombreVisible: 'Seguridad & Cierres de Turno',
    descripcion: 'Parámetros de arqueo ciego y discrepancias toleradas en efectivo.',
    categoria: 'Tesorería',
    icono: '🔒',
    campos: [
      {
        key: 'arqueoCiegoObligatorio',
        label: 'Arqueo Ciego Estricto',
        tipo: 'boolean',
        descripcion: 'El cajero debe digitar el efectivo contado sin ver el saldo esperado por sistema.',
      },
      {
        key: 'toleranciaDiferenciaCop',
        label: 'Tolerancia Máxima Discrepancia',
        tipo: 'number',
        min: 0,
        max: 50000,
        step: 1000,
        sufijo: 'COP',
        descripcion: 'Monto máximo de diferencia aceptado sin requerir VoBo de gerencia.',
      },
    ],
  },
};

export function ParametroDinamicoModal({
  isOpen,
  onClose,
  parametro,
  onGuardar,
}: ParametroDinamicoModalProps) {
  const [valoresForm, setValoresForm] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parametro) {
      setValoresForm({});
      setError(null);
      return;
    }

    let parsed: any = {};
    if (typeof parametro.valorJson === 'string') {
      try {
        parsed = JSON.parse(parametro.valorJson);
      } catch {
        parsed = { valor: parametro.valorJson };
      }
    } else if (typeof parametro.valorJson === 'object' && parametro.valorJson !== null) {
      parsed = { ...(parametro.valorJson as Record<string, any>) };
    } else {
      parsed = { valor: parametro.valorJson };
    }

    // Si es un valor primitivo directo
    if (typeof parsed !== 'object' || parsed === null) {
      parsed = { valor: parsed };
    }

    setValoresForm(parsed);
    setError(null);
  }, [parametro]);

  if (!isOpen || !parametro) return null;

  const meta = METADATOS_PARAMETROS[parametro.clave] || {
    nombreVisible: parametro.clave.replace(/_/g, ' ').toUpperCase(),
    descripcion: parametro.descripcion || 'Configuración del sistema',
    categoria: parametro.categoria || 'Sistema',
    icono: '⚙️',
    campos: Object.keys(valoresForm).map((k) => {
      const val = valoresForm[k];
      const tipo = typeof val === 'boolean' ? 'boolean' : typeof val === 'number' ? 'number' : 'string';
      return {
        key: k,
        label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
        tipo,
        descripcion: `Configuración para ${k}`,
      };
    }),
  };

  const handleToggle = (key: string) => {
    setValoresForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNumberChange = (key: string, val: number) => {
    setValoresForm((prev) => ({
      ...prev,
      [key]: isNaN(val) ? 0 : val,
    }));
  };

  const handleTextChange = (key: string, val: string) => {
    setValoresForm((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(parametro.clave, valoresForm);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el parámetro');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${meta.icono} ${meta.nombreVisible}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cabecera descriptiva */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold shrink-0">
            {parametro.clave}
          </div>
          <div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {meta.descripcion}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="neutral">{parametro.categoria || meta.categoria}</Badge>
              <span className="text-[11px] text-slate-500 font-mono">Tipo: JSON Estructurado</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Campos Dinámicos */}
        <div className="space-y-4">
          {meta.campos.map((campo) => {
            const val = valoresForm[campo.key];

            if (campo.tipo === 'boolean') {
              const isChecked = Boolean(val);
              return (
                <div
                  key={campo.key}
                  onClick={() => handleToggle(campo.key)}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4 select-none"
                >
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{campo.label}</span>
                      <Badge variant={isChecked ? 'success' : 'neutral'}>
                        {isChecked ? 'Habilitado' : 'Deshabilitado'}
                      </Badge>
                    </div>
                    {campo.descripcion && (
                      <p className="text-xs text-slate-400 mt-0.5">{campo.descripcion}</p>
                    )}
                  </div>

                  {/* Switch Visual */}
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                      isChecked ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        isChecked ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
              );
            }

            if (campo.tipo === 'number') {
              const numVal = typeof val === 'number' ? val : Number(val) || 0;
              return (
                <div key={campo.key} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">
                      {campo.label}
                    </label>
                    {campo.sufijo && (
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {campo.sufijo}
                      </span>
                    )}
                  </div>
                  {campo.descripcion && (
                    <p className="text-xs text-slate-400">{campo.descripcion}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={campo.min ?? 0}
                      max={campo.max ?? 100}
                      step={campo.step ?? 1}
                      value={numVal}
                      onChange={(e) => handleNumberChange(campo.key, Number(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={campo.min ?? 0}
                        max={campo.max ?? 100}
                        step={campo.step ?? 1}
                        value={numVal}
                        onChange={(e) => handleNumberChange(campo.key, Number(e.target.value))}
                        className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-right font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                      {campo.sufijo && (
                        <span className="text-xs text-slate-400 font-mono font-semibold">{campo.sufijo}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // String por defecto
            return (
              <div key={campo.key} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <label className="text-sm font-semibold text-white">
                  {campo.label}
                </label>
                {campo.descripcion && (
                  <p className="text-xs text-slate-400">{campo.descripcion}</p>
                )}
                <input
                  type="text"
                  value={String(val ?? '')}
                  onChange={(e) => handleTextChange(campo.key, e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            );
          })}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando}>
            Guardar Configuración
          </Button>
        </div>
      </form>
    </Modal>
  );
}
