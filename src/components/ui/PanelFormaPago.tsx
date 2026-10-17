import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@farutech/design-system';
import { CurrencyInput } from './CurrencyInput';

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

export interface AbonoHistoricoItem {
  id: string;
  fecha?: string;
  instrumentoNombre: string;
  monto: number;
  referencia?: string;
  observaciones?: string;
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
  /** Título principal (por defecto: 'MEDIOS DE PAGO Y ABONOS DE LA SOLICITUD') */
  title?: string;
  /** Subtítulo descriptivo */
  subtitulo?: string;
  /** Modo de operación */
  modo?: 'solicitud' | 'entrega' | 'general';

  /** Monto total del documento (Solicitud o Entrega) */
  totalDocumento: number;
  /** Subtotal inventario si aplica prelación */
  totalInventario?: number;
  /** Subtotal servicios si aplica prelación */
  totalServicios?: number;

  /** Abonos previos/históricos registrados con anterioridad (estrictamente solo lectura) */
  abonosHistoricos?: AbonoHistoricoItem[];
  /** Anticipos previos como valor numérico consolidado si no hay desglose histórico */
  abonosPrevios?: number;

  /** Anticipo mínimo exigido para servicios (opcional) */
  anticipoMinimoRequerido?: number;

  /** Desglose de nuevos pagos en esta sesión/borrador */
  pagos: MetodoPagoItem[];
  /** Callback al mutar los nuevos pagos */
  onChangePagos: (pagos: MetodoPagoItem[]) => void;

  /** Estado controlado de monto digitado en tiempo real (opcional) */
  montoInput?: string;
  onChangeMontoInput?: (val: string) => void;

  /** Estado controlado de referencia (opcional) */
  referenciaInput?: string;
  onChangeReferenciaInput?: (val: string) => void;

  /** Estado controlado de instrumento seleccionado (opcional) */
  instrumentoSeleccionadoUuid?: string;
  onChangeInstrumentoSeleccionadoUuid?: (val: string) => void;

  /** Observaciones del recaudo / comprobante */
  observacionesPago?: string;
  /** Callback para actualizar observaciones del recaudo */
  onChangeObservacionesPago?: (val: string) => void;

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

  /** Handler para liquidación automática de saldo en entrega */
  onLiquidarSaldoCompleto?: () => void;
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
 * PanelFormaPago / MediosPagoYAbonos
 * Componente modular, compacto y de alta ergonomía para recaudos, abonos y entregas.
 */
export const PanelFormaPago: React.FC<PanelFormaPagoProps> = ({
  title = 'MEDIOS DE PAGO Y ABONOS DE LA SOLICITUD',
  subtitulo,
  modo = 'solicitud',
  totalDocumento,
  totalInventario,
  totalServicios,
  abonosHistoricos = [],
  abonosPrevios = 0,
  anticipoMinimoRequerido: _anticipoMinimoRequerido = 0,
  pagos,
  onChangePagos,
  montoInput: propMontoInput,
  onChangeMontoInput,
  referenciaInput: propReferenciaInput,
  onChangeReferenciaInput,
  instrumentoSeleccionadoUuid: propInstrumentoSeleccionadoUuid,
  onChangeInstrumentoSeleccionadoUuid,
  observacionesPago = '',
  onChangeObservacionesPago,
  mediosPagoDisponibles = MEDIOS_CANONICOS,
  resumenPrelacion,
  cupoCreditoDisponible: _cupoCreditoDisponible,
  soloLectura = false,
  onLiquidarSaldoCompleto,
}) => {
  // Toggles de acordeón para maximizar el espacio útil
  const [isPrelacionOpen, setIsPrelacionOpen] = useState(false);
  const [isHistoricosOpen, setIsHistoricosOpen] = useState(false);

  const [internalInstrumentoUuid, setInternalInstrumentoUuid] = useState<string>('mp-efectivo');
  const instrumentoSeleccionadoUuid = propInstrumentoSeleccionadoUuid !== undefined ? propInstrumentoSeleccionadoUuid : internalInstrumentoUuid;
  const setInstrumentoSeleccionadoUuid = (val: string) => {
    if (onChangeInstrumentoSeleccionadoUuid) onChangeInstrumentoSeleccionadoUuid(val);
    else setInternalInstrumentoUuid(val);
  };

  const [internalMonto, setInternalMonto] = useState<string>('');
  const montoInput = propMontoInput !== undefined ? propMontoInput : internalMonto;
  const setMontoInput = (val: string) => {
    if (onChangeMontoInput) onChangeMontoInput(val);
    else setInternalMonto(val);
  };

  const [internalReferencia, setInternalReferencia] = useState<string>('');
  const referenciaInput = propReferenciaInput !== undefined ? propReferenciaInput : internalReferencia;
  const setReferenciaInput = (val: string) => {
    if (onChangeReferenciaInput) onChangeReferenciaInput(val);
    else setInternalReferencia(val);
  };

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

  const instrumentoActual =
    listaOpciones.find((i) => i.uuid === instrumentoSeleccionadoUuid) ||
    listaOpciones[0] ||
    MEDIOS_CANONICOS[0];

  // Cálculo de totales históricos y nuevos
  const totalAbonosHistoricos = useMemo(() => {
    if (abonosHistoricos && abonosHistoricos.length > 0) {
      return abonosHistoricos.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
    }
    return Number(abonosPrevios) || 0;
  }, [abonosHistoricos, abonosPrevios]);

  const totalAbonosNuevos = useMemo(() => {
    return pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagos]);

  const totalAbonadoConsolidado = totalAbonosHistoricos + totalAbonosNuevos;
  const saldoRestante = Math.max(0, totalDocumento - totalAbonadoConsolidado);

  // Cálculos de prelación si se suministran
  const subInv = totalInventario ?? resumenPrelacion?.subtotalInventario ?? 0;
  const subServ = totalServicios ?? resumenPrelacion?.subtotalServicios ?? 0;
  const cubiertoInventario = Math.min(totalAbonadoConsolidado, subInv);
  const saldoInvPendiente = Math.max(0, subInv - cubiertoInventario);
  const excedenteParaServicios = Math.max(0, totalAbonadoConsolidado - subInv);

  const formatCOP = (val: number) => `$ ${Math.round(val).toLocaleString('es-CO')}`;

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
    if (onLiquidarSaldoCompleto) {
      onLiquidarSaldoCompleto();
    } else {
      setMontoInput(String(Math.round(saldoRestante)));
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-lg backdrop-blur-md">
      {/* 1. Header con Título a la izquierda y Botón '+ Registrar Abono' a la derecha */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-950/80 border border-primary-800/60 text-primary-400 shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide m-0">
              {title}
            </h3>
            {subtitulo && (
              <p className="text-[11px] text-slate-400 m-0 leading-tight">
                {subtitulo}
              </p>
            )}
          </div>
        </div>
        {!soloLectura && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleAgregarPago}
            disabled={!montoInput || Number(montoInput) <= 0}
            className="h-8 sm:h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Registrar Abono</span>
          </Button>
        )}
      </div>

      {/* 2. Banner Específico de Modo Entrega (solo si aplica) */}
      {modo === 'entrega' && (
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
          <span className="text-indigo-300 font-medium flex items-center gap-1.5 text-[11px]">
            <span>📦</span>
            <span>Liquidación de Despacho: Abonos previos consolidados.</span>
          </span>
          {saldoRestante === 0 ? (
            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Cubierto
            </span>
          ) : (
            <span className="text-amber-300 font-mono font-bold text-[11px]">
              Saldo: {formatCOP(saldoRestante)}
            </span>
          )}
        </div>
      )}

      {/* 3. Acordeón Colapsable: Regla de Prelación Financiera (si aplica) */}
      {subInv > 0 && subServ > 0 && (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPrelacionOpen(!isPrelacionOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              <span>Regla de Prelación Financiera: 100% Inventario Primero</span>
            </span>
            <span className="flex items-center gap-2 text-[11px]">
              <span className={saldoInvPendiente === 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {saldoInvPendiente === 0 ? 'Inventario 100% Cubierto' : `Faltan ${formatCOP(saldoInvPendiente)}`}
              </span>
              {isPrelacionOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </span>
          </button>

          {isPrelacionOpen && (
            <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-400">Inventario ({formatCOP(subInv)}):</span>{' '}
                <span className={saldoInvPendiente === 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {saldoInvPendiente === 0 ? 'Cubierto al 100%' : `Pendiente ${formatCOP(saldoInvPendiente)}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Excedente para Servicios:</span>{' '}
                <span className="text-slate-200 font-mono font-medium">
                  {formatCOP(excedenteParaServicios)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Acordeón Colapsable: Abonos Históricos Previos (Solo Lectura) */}
      {((abonosHistoricos && abonosHistoricos.length > 0) || totalAbonosHistoricos > 0) && (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsHistoricosOpen(!isHistoricosOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Abonos Históricos Previos ({abonosHistoricos ? abonosHistoricos.length : 1})</span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded font-normal">
                Solo lectura
              </span>
            </span>
            <span className="flex items-center gap-2 text-[11px]">
              <span className="font-mono text-indigo-400 font-bold">{formatCOP(totalAbonosHistoricos)}</span>
              {isHistoricosOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </span>
          </button>

          {isHistoricosOpen && (
            <div className="divide-y divide-slate-800/60 border-t border-slate-800/60 bg-slate-900/40">
              {abonosHistoricos.map((ah, idx) => (
                <div key={ah.id || idx} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <span className="font-semibold text-slate-200 text-xs">{ah.instrumentoNombre}</span>
                      {ah.referencia && <span className="text-[10px] text-slate-400 ml-2">Ref: {ah.referencia}</span>}
                      {ah.fecha && <span className="text-[10px] text-slate-500 ml-2 font-mono">{ah.fecha}</span>}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{formatCOP(ah.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Campos de Captura Directa según Imagen */}
      {!soloLectura && (
        <div className="space-y-3">
          {/* Fila 1: Instrumento de pago y Monto */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8">
              <label htmlFor="instrumento-pago-select" className="block text-xs font-semibold text-slate-300 mb-1">
                Instrumento de pago *
              </label>
              <select
                id="instrumento-pago-select"
                aria-label="Instrumento de pago"
                value={instrumentoSeleccionadoUuid}
                onChange={(e) => setInstrumentoSeleccionadoUuid(e.target.value)}
                className="w-full h-9 px-3 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {listaOpciones.map((i) => (
                  <option key={i.uuid} value={i.uuid}>
                    {i.codigo} - {i.nombre} {i.diasCredito ? `(${i.diasCredito}d)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="monto-abono-input" className="block text-xs font-semibold text-slate-300">
                  {modo === 'entrega' ? 'Monto a cobrar *' : 'Monto *'}
                </label>
                {saldoRestante > 0 && (
                  <button
                    type="button"
                    onClick={handlePagarSaldoCompleto}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center gap-1"
                    title="Copiar saldo restante al monto"
                  >
                    <span>Saldo</span>
                    <span className="font-mono">{formatCOP(saldoRestante)}</span>
                  </button>
                )}
              </div>
              <CurrencyInput
                id="monto-abono-input"
                aria-label={modo === 'entrega' ? 'Monto a cobrar' : 'Monto'}
                value={montoInput ? Number(montoInput) : undefined}
                onChange={(val) => setMontoInput(val !== undefined ? String(val) : '')}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
                placeholder={modo === 'entrega' ? '0' : 'Monto a abonar...'}
                className="font-mono font-bold text-xs h-9 w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 text-white"
              />
            </div>
          </div>

          {/* Fila 2: Referencia / Comprobante */}
          <div>
            <label htmlFor="referencia-abono-input" className="block text-xs font-semibold text-slate-300 mb-1">
              Referencia / Comprobante
            </label>
            <input
              id="referencia-abono-input"
              aria-label="Referencia / Comprobante"
              type="text"
              value={referenciaInput}
              onChange={(e) => setReferenciaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
              placeholder="Ej: Voucher #123456, Aprobación..."
              className="w-full h-9 px-3 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Fila 3: Observaciones del Recaudo / Pago */}
          <div>
            <label htmlFor="observaciones-pago-textarea" className="block text-xs font-semibold text-slate-300 mb-1">
              Observaciones del Recaudo / Pago
            </label>
            <textarea
              id="observaciones-pago-textarea"
              aria-label="Observaciones del Recaudo / Pago"
              rows={2}
              value={observacionesPago}
              onChange={(e) => onChangeObservacionesPago && onChangeObservacionesPago(e.target.value)}
              placeholder="Observación o nota adicional del recaudo o comprobante..."
              className="w-full min-h-[60px] px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* 6. Lista Compacta de Nuevos Abonos Registrados en la Sesión */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 text-[11px]">
            Abonos de la Sesión ({pagos.length}) · Total:{' '}
            <strong className="text-emerald-400 font-mono">{formatCOP(totalAbonosNuevos)}</strong>
          </span>
          {pagos.length > 0 && !soloLectura && (
            <button
              type="button"
              onClick={() => onChangePagos([])}
              className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              Limpiar nuevos
            </button>
          )}
        </div>

        {pagos.length > 0 ? (
          <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
            {pagos.map((p, idx) => (
              <div
                key={p.idTemp || idx}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-200">{p.instrumentoNombre}</span>
                    {p.validaEnCierre ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                        Caja
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300">
                        Cartera
                      </span>
                    )}
                    {p.referencia && (
                      <span className="text-[10px] text-slate-400 font-mono">Ref: {p.referencia}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-400">{formatCOP(p.monto)}</span>
                  {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => handleEliminarPago(p.idTemp)}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-0.5"
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
          <div className="text-center py-2 text-[11px] text-slate-500 italic bg-slate-950/20 rounded-lg border border-dashed border-slate-800/60">
            Sin nuevos abonos registrados en esta sesión.
          </div>
        )}
      </div>
    </div>
  );
};

export { PanelFormaPago as MediosPagoYAbonos };
