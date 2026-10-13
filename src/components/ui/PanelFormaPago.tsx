import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, CreditCard, DollarSign, ShieldCheck } from 'lucide-react';
import { Button } from '@farutech/design-system';

export interface MetodoPagoItem {
  idTemp: string;
  instrumentoUuid: string;
  instrumentoCodigo: string;
  instrumentoNombre: string;
  monto: number;
  referencia?: string;
  validaEnCierre?: boolean;
  diasCredito?: number;
}

export interface InstrumentoCatalogoOpcion {
  uuid: string;
  codigo: string;
  nombre: string;
  categoria?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTROS' | string;
  validaEnCierre?: boolean;
  permiteReferencia?: boolean;
  diasCredito?: number;
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

export const MEDIOS_CANONICOS: InstrumentoCatalogoOpcion[] = [
  // 1. Efectivo
  { uuid: 'mp-efectivo', codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', validaEnCierre: true, permiteReferencia: false },
  // 2. Transferencia bancaria o consignaciones
  { uuid: 'mp-transferencia', codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancaria', categoria: 'TRANSFERENCIA', validaEnCierre: true, permiteReferencia: true },
  { uuid: 'mp-consignacion', codigo: 'CONSIGNACION', nombre: 'Consignación Bancaria', categoria: 'TRANSFERENCIA', validaEnCierre: true, permiteReferencia: true },
  // 3. Datáfono o por medio de tarjeta
  { uuid: 'mp-datafono', codigo: 'DATAFONO', nombre: 'Datáfono (Tarjeta Débito/Crédito)', categoria: 'TARJETA', validaEnCierre: true, permiteReferencia: true },
  // 4. Otros: Cheques y Crédito a 15, 30, 60, 90 y 120 días
  { uuid: 'mp-cheque', codigo: 'CHEQUE', nombre: 'Cheque', categoria: 'OTROS', validaEnCierre: true, permiteReferencia: true },
  { uuid: 'mp-cred-15', codigo: 'CRED_15', nombre: 'Crédito a 15 días', categoria: 'OTROS', validaEnCierre: false, permiteReferencia: false, diasCredito: 15 },
  { uuid: 'mp-cred-30', codigo: 'CRED_30', nombre: 'Crédito a 30 días', categoria: 'OTROS', validaEnCierre: false, permiteReferencia: false, diasCredito: 30 },
  { uuid: 'mp-cred-60', codigo: 'CRED_60', nombre: 'Crédito a 60 días', categoria: 'OTROS', validaEnCierre: false, permiteReferencia: false, diasCredito: 60 },
  { uuid: 'mp-cred-90', codigo: 'CRED_90', nombre: 'Crédito a 90 días', categoria: 'OTROS', validaEnCierre: false, permiteReferencia: false, diasCredito: 90 },
  { uuid: 'mp-cred-120', codigo: 'CRED_120', nombre: 'Crédito a 120 días', categoria: 'OTROS', validaEnCierre: false, permiteReferencia: false, diasCredito: 120 },
];

/**
 * PanelFormaPago
 * Componente unificado y transversal estructurado estrictamente en 4 categorías universales:
 * 1. Efectivo
 * 2. Transferencia bancaria o consignaciones
 * 3. Datáfono o por medio de tarjeta
 * 4. Otros (Cheques y Créditos 15, 30, 60, 90, 120 días)
 * Indica explícitamente si cada medio valida o no en cierre de caja.
 */
export const PanelFormaPago: React.FC<PanelFormaPagoProps> = ({
  totalDocumento,
  abonosPrevios = 0,
  anticipoMinimoRequerido: _anticipoMinimoRequerido = 0,
  pagos,
  onChangePagos,
  mediosPagoDisponibles = MEDIOS_CANONICOS,
  resumenPrelacion,
  cupoCreditoDisponible: _cupoCreditoDisponible,
  soloLectura = false,
}) => {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTROS'>('EFECTIVO');
  const [instrumentoSeleccionadoUuid, setInstrumentoSeleccionadoUuid] = useState<string>('mp-efectivo');
  const [montoInput, setMontoInput] = useState<string>('');
  const [referenciaInput, setReferenciaInput] = useState<string>('');

  // Unir catálogo disponible con medios canónicos
  const listaOpciones = useMemo(() => {
    const mapa = new Map<string, InstrumentoCatalogoOpcion>();
    MEDIOS_CANONICOS.forEach((m) => mapa.set(m.codigo, m));
    mediosPagoDisponibles.forEach((m) => {
      const canon = MEDIOS_CANONICOS.find((c) => c.codigo === m.codigo);
      mapa.set(m.codigo, {
        ...m,
        categoria: canon?.categoria || (m.codigo.startsWith('CRED') ? 'OTROS' : m.codigo.includes('EFECT') ? 'EFECTIVO' : m.codigo.includes('TARJ') ? 'TARJETA' : 'TRANSFERENCIA'),
        validaEnCierre: m.validaEnCierre !== undefined ? m.validaEnCierre : canon?.validaEnCierre ?? !m.codigo.startsWith('CRED'),
        permiteReferencia: m.permiteReferencia !== undefined ? m.permiteReferencia : canon?.permiteReferencia ?? true,
        diasCredito: m.diasCredito ?? canon?.diasCredito,
      });
    });
    return Array.from(mapa.values());
  }, [mediosPagoDisponibles]);

  // Instrumentos disponibles según la categoría seleccionada
  const instrumentosEnCategoria = useMemo(() => {
    return listaOpciones.filter((i) => i.categoria === categoriaSeleccionada);
  }, [listaOpciones, categoriaSeleccionada]);

  // Asegurar instrumento seleccionado coherente con la categoría
  useEffect(() => {
    if (instrumentosEnCategoria.length > 0 && !instrumentosEnCategoria.some((i) => i.uuid === instrumentoSeleccionadoUuid)) {
      setInstrumentoSeleccionadoUuid(instrumentosEnCategoria[0].uuid);
    }
  }, [categoriaSeleccionada, instrumentosEnCategoria, instrumentoSeleccionadoUuid]);

  const instrumentoActual =
    listaOpciones.find((i) => i.uuid === instrumentoSeleccionadoUuid) ||
    instrumentosEnCategoria[0] ||
    MEDIOS_CANONICOS[0];

  const totalAbonosActuales = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalAbonadoConsolidado = abonosPrevios + totalAbonosActuales;
  const saldoRestante = Math.max(0, totalDocumento - totalAbonadoConsolidado);

  // Cálculos de prelación si se suministran
  const subInv = resumenPrelacion?.subtotalInventario || 0;
  const subServ = resumenPrelacion?.subtotalServicios || 0;
  const cubiertoInventario = Math.min(totalAbonadoConsolidado, subInv);
  const saldoInvPendiente = Math.max(0, subInv - cubiertoInventario);
  const excedenteParaServicios = Math.max(0, totalAbonadoConsolidado - subInv);

  const handleAgregarPago = () => {
    const montoNum = parseFloat(montoInput.replace(/[^\d.-]/g, ''));
    if (!montoNum || montoNum <= 0) return;

    const nuevoPago: MetodoPagoItem = {
      idTemp: `pago-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instrumentoUuid: instrumentoActual.uuid,
      instrumentoCodigo: instrumentoActual.codigo,
      instrumentoNombre: instrumentoActual.nombre,
      monto: Math.round(montoNum),
      referencia: referenciaInput.trim() || undefined,
      validaEnCierre: instrumentoActual.validaEnCierre ?? true,
      diasCredito: instrumentoActual.diasCredito,
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

  const CATEGORIAS: { id: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTROS'; label: string; icon: string }[] = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { id: 'TRANSFERENCIA', label: 'Transferencia / Consignaciones', icon: '🏦' },
    { id: 'TARJETA', label: 'Datáfono / Tarjeta', icon: '💳' },
    { id: 'OTROS', label: 'Otros (Cheques & Créditos)', icon: '📑' },
  ];

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
              Seleccione una de las 4 opciones generales y registre el recaudo
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

      {/* 2. Banner de Prelación Financiera */}
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

      {/* 3. Selector de las 4 Opciones Generales de Pago */}
      {!soloLectura && (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              1. Opción General de Pago
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIAS.map((cat) => {
                const activo = categoriaSeleccionada === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      activo
                        ? 'bg-primary-600/90 border-primary-400 text-white shadow-md shadow-primary-950'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-opciones e Indicador de Cierre de Caja */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
            {/* Sub-selector de Instrumento dentro de la categoría */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Instrumento específico ({instrumentosEnCategoria.length} disp.)
              </label>
              <select
                value={instrumentoSeleccionadoUuid}
                onChange={(e) => setInstrumentoSeleccionadoUuid(e.target.value)}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-primary-500"
              >
                {instrumentosEnCategoria.map((i) => (
                  <option key={i.uuid} value={i.uuid}>
                    {i.nombre} {i.diasCredito ? `(${i.diasCredito} días)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge de Validación en Cierre de Caja */}
            <div className="flex items-center sm:self-end h-9">
              {instrumentoActual.validaEnCierre ? (
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Valida en Cierre de Caja (Arqueo Físico)</span>
                </div>
              ) : (
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Cobro Futuro / Cartera (No Afecta Cierre de Caja)</span>
                </div>
              )}
            </div>
          </div>

          {/* Fila de Inserción: Monto, Referencia y Botón */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1">
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

            {/* Input de Referencia */}
            {instrumentoActual.permiteReferencia && (
              <div className="w-full md:w-48 shrink-0">
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

            {/* Acciones */}
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{p.instrumentoNombre}</span>
                    {p.validaEnCierre ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-medium">
                        Cierre Caja
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-medium">
                        Cartera ({p.diasCredito || 30}d)
                      </span>
                    )}
                  </div>
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
