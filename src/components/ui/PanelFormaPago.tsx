import React, { useState } from 'react';
import { Plus, Trash2, CreditCard, DollarSign, ShieldCheck } from 'lucide-react';
import { Button } from '@farutech/design-system';

export interface MetodoPagoItem {
  idTemp: string;
  instrumentoUuid: string;
  instrumentoCodigo: string;
  instrumentoNombre: string;
  monto: number;
  referencia?: string;
}

export interface InstrumentoCatalogoOpcion {
  uuid: string;
  codigo: string;
  nombre: string;
  permiteReferencia?: boolean;
}

export interface PanelFormaPagoProps {
  /** Monto total del documento (Solicitud o Entrega) */
  totalDocumento: number;
  /** Anticipos o pagos previos registrados con anterioridad */
  abonosPrevios?: number;
  /** Anticipo mínimo exigido para servicios (opcional) */
  anticipoMinimoRequerido?: number;
  /** Desglose actual de pagos */
  pagos: MetodoPagoItem[];
  /** Callback al mutar los pagos */
  onChangePagos: (pagos: MetodoPagoItem[]) => void;
  /** Catálogo de medios de pago disponibles */
  mediosPagoDisponibles?: InstrumentoCatalogoOpcion[];
  /** Desglose de prelación financiera para orientar al cajero */
  resumenPrelacion?: {
    subtotalInventario: number;
    subtotalServicios: number;
  };
  /** Cupo de crédito disponible del cliente si aplica */
  cupoCreditoDisponible?: number;
  /** Modo de solo lectura */
  soloLectura?: boolean;
}

const MEDIOS_DEFAULT: InstrumentoCatalogoOpcion[] = [
  { uuid: 'mp-efectivo', codigo: 'EFECTIVO', nombre: 'Efectivo Caja', permiteReferencia: false },
  { uuid: 'mp-bancolombia', codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancolombia', permiteReferencia: true },
  { uuid: 'mp-datafono', codigo: 'DATAFONO', nombre: 'Datafono / Tarjeta', permiteReferencia: true },
  { uuid: 'mp-credito', codigo: 'CREDITO', nombre: 'Crédito Directo (Cartera)', permiteReferencia: false },
];

/**
 * PanelFormaPago
 * Componente unificado y transversal para el registro y gestión de pagos en Solicitudes, Entregas y Caja.
 * Presenta con claridad el total, abonos acumulados, saldo pendiente y prelación financiera de inventario primero.
 */
export const PanelFormaPago: React.FC<PanelFormaPagoProps> = ({
  totalDocumento,
  abonosPrevios = 0,
  anticipoMinimoRequerido: _anticipoMinimoRequerido = 0,
  pagos,
  onChangePagos,
  mediosPagoDisponibles = MEDIOS_DEFAULT,
  resumenPrelacion,
  cupoCreditoDisponible: _cupoCreditoDisponible,
  soloLectura = false,
}) => {
  const [medioSeleccionadoUuid, setMedioSeleccionadoUuid] = useState<string>(
    mediosPagoDisponibles[0]?.uuid || 'mp-efectivo'
  );
  const [montoInput, setMontoInput] = useState<string>('');
  const [referenciaInput, setReferenciaInput] = useState<string>('');

  const totalAbonosActuales = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalAbonadoConsolidado = abonosPrevios + totalAbonosActuales;
  const saldoRestante = Math.max(0, totalDocumento - totalAbonadoConsolidado);

  // Cálculos de prelación si se suministran
  const subInv = resumenPrelacion?.subtotalInventario || 0;
  const subServ = resumenPrelacion?.subtotalServicios || 0;
  const cubiertoInventario = Math.min(totalAbonadoConsolidado, subInv);
  const saldoInvPendiente = Math.max(0, subInv - cubiertoInventario);
  const excedenteParaServicios = Math.max(0, totalAbonadoConsolidado - subInv);

  const medioActual = mediosPagoDisponibles.find((m) => m.uuid === medioSeleccionadoUuid) || mediosPagoDisponibles[0];

  const handleAgregarPago = () => {
    const montoNum = parseFloat(montoInput.replace(/[^\d.-]/g, ''));
    if (!montoNum || montoNum <= 0) return;

    const nuevoPago: MetodoPagoItem = {
      idTemp: `pago-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instrumentoUuid: medioActual.uuid,
      instrumentoCodigo: medioActual.codigo,
      instrumentoNombre: medioActual.nombre,
      monto: Math.round(montoNum),
      referencia: referenciaInput.trim() || undefined,
    };

    onChangePagos([...pagos, nuevoPago]);
    setMontoInput('');
    setReferenciaInput('');
  };

  const handleEliminarPago = (idTemp: string) => {
    onChangePagos(pagos.filter((p) => p.idTemp !== idTemp));
  };

  const handlePagarSaldoCompleto = () => {
    if (saldoRestante <= 0) return;
    setMontoInput(String(Math.round(saldoRestante)));
  };

  const formatCOP = (val: number) => `$ ${Math.round(val).toLocaleString('es-CO')}`;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* 1. Cabecera y Resumen Financiero Consolidado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-950/80 border border-primary-800/60 text-primary-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              Formas de Pago y Recaudo
            </h3>
            <p className="text-xs text-slate-400">
              Registre los medios de pago para liquidar el documento
            </p>
          </div>
        </div>

        {/* Indicadores de Balance */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 uppercase font-medium">Total Documento</div>
            <div className="text-sm font-bold text-slate-200">{formatCOP(totalDocumento)}</div>
          </div>
          <div className="text-right border-l border-slate-800 pl-2 sm:pl-3">
            <div className="text-[11px] text-slate-400 uppercase font-medium">Abonado</div>
            <div className="text-sm font-bold text-emerald-400">{formatCOP(totalAbonadoConsolidado)}</div>
          </div>
          <div className="text-right border-l border-slate-800 pl-2 sm:pl-3">
            <div className="text-[11px] text-slate-400 uppercase font-medium">Saldo Restante</div>
            <div className={`text-sm font-bold ${saldoRestante > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {formatCOP(saldoRestante)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Banner de Prelación Financiera (si hay inventario y servicios involucrados) */}
      {subInv > 0 && subServ > 0 && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-primary-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary-400 shrink-0" />
            <span>Regla de Prelación Financiera: 100% Inventario Primero</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1 border-t border-slate-800/40">
            <div>
              <span className="text-slate-400">Inventario ({formatCOP(subInv)}):</span>{' '}
              <span className={saldoInvPendiente === 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {saldoInvPendiente === 0 ? 'Cubierto al 100%' : `Pendiente ${formatCOP(saldoInvPendiente)}`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Excedente para Servicios:</span>{' '}
              <span className="text-slate-200 font-medium">
                {formatCOP(excedenteParaServicios)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Formulario de Inserción de Pago (Fila Única Limpia) */}
      {!soloLectura && (
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 space-y-2">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Selector de Medio */}
            <div className="w-full md:w-56 shrink-0">
              <select
                value={medioSeleccionadoUuid}
                onChange={(e) => setMedioSeleccionadoUuid(e.target.value)}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-primary-500"
              >
                {mediosPagoDisponibles.map((mp) => (
                  <option key={mp.uuid} value={mp.uuid}>
                    {mp.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Input de Monto */}
            <div className="relative flex-1 min-w-[140px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={montoInput}
                onChange={(e) => setMontoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
                placeholder="Monto a abonar..."
                className="w-full h-9 pl-7 pr-3 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Input de Referencia (si aplica) */}
            {medioActual.permiteReferencia && (
              <div className="w-full md:w-44 shrink-0">
                <input
                  type="text"
                  value={referenciaInput}
                  onChange={(e) => setReferenciaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
                  placeholder="N° Comprobante / Ref..."
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500"
                />
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center gap-2 shrink-0">
              {saldoRestante > 0 && (
                <button
                  type="button"
                  onClick={handlePagarSaldoCompleto}
                  className="h-9 px-2.5 text-xs font-semibold text-primary-400 hover:text-primary-300 bg-primary-950/60 border border-primary-800/80 rounded-lg transition-colors whitespace-nowrap"
                  title="Copiar saldo restante al monto"
                >
                  Saldo ({formatCOP(saldoRestante)})
                </button>
              )}

              <Button
                size="sm"
                variant="primary"
                onClick={handleAgregarPago}
                disabled={!montoInput || Number(montoInput) <= 0}
                className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Pago</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Lista de Pagos Agregados */}
      {pagos.length > 0 ? (
        <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
          {pagos.map((p, idx) => (
            <div
              key={p.idTemp || idx}
              className="flex items-center justify-between p-3 text-xs sm:text-sm hover:bg-slate-800/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="font-semibold text-slate-200">{p.instrumentoNombre}</div>
                  {p.referencia && (
                    <div className="text-[11px] text-slate-400">Ref: {p.referencia}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-emerald-400">
                  {formatCOP(p.monto)}
                </span>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => handleEliminarPago(p.idTemp)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                    title="Eliminar abono"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-5 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No se han registrado abonos para este documento.
        </div>
      )}
    </div>
  );
};
