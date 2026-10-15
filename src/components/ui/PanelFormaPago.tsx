import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
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
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTROS'>('EFECTIVO');

  // Toggles de acordeón para maximizar el espacio útil
  const [isPrelacionOpen, setIsPrelacionOpen] = useState(false);
  const [isHistoricosOpen, setIsHistoricosOpen] = useState(false);
  const [isNotasOpen, setIsNotasOpen] = useState(Boolean(observacionesPago && observacionesPago.trim().length > 0));

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

  const CATEGORIAS: { id: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTROS'; label: string; icon: string }[] = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
    { id: 'TARJETA', label: 'Tarjeta / Datáfono', icon: '💳' },
    { id: 'OTROS', label: 'Otros / Crédito', icon: '📑' },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-lg backdrop-blur-md">
      {/* 1. Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-950/80 border border-primary-800/60 text-primary-400 shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide m-0">
              {title}
            </h3>
            {subtitulo && (
              <p className="text-[11px] text-slate-400 m-0 leading-tight">
                {subtitulo}
              </p>
            )}
          </div>
          {/* Botón Primario para Registrar Abono */}
            <Button
              size="sm"
              variant="primary"
              onClick={handleAgregarPago}
              disabled={!montoInput || Number(montoInput) <= 0}
              className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Abono</span>
            </Button>
        </div>
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

      {/* 3. Acordeón Colapsable: Regla de Prelación Financiera (Ahorro de Espacio) */}
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
      {abonosHistoricos && abonosHistoricos.length > 0 && (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsHistoricosOpen(!isHistoricosOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Abonos Históricos Previos ({abonosHistoricos.length})</span>
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

      {/* 5. Selector Ergonómico de Medios de Pago & Barra de Acción */}
      {!soloLectura && (
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-2.5 sm:p-3 space-y-2.5">
          {/* Fila Única: 1. Opción General de Pago + Instrumento de Pago específico */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-0.5">
            {/* 1. Opción General de Pago */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                1. Opción General de Pago:
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 border border-slate-800 rounded-lg overflow-x-auto">
                {CATEGORIAS.map((cat) => {
                  const activo = categoriaSeleccionada === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaSeleccionada(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        activo
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instrumento de pago * (X disp.) */}
            <div className="flex items-center gap-2 flex-1 justify-start lg:justify-end min-w-0">
              <label htmlFor="instrumento-pago-select" className="text-[11px] font-semibold text-slate-300 uppercase shrink-0 whitespace-nowrap">
                Instrumento de pago * ({instrumentosEnCategoria.length} disp.):
              </label>
              <select
                id="instrumento-pago-select"
                aria-label="Instrumento de pago"
                value={instrumentoSeleccionadoUuid}
                onChange={(e) => setInstrumentoSeleccionadoUuid(e.target.value)}
                className="h-8 px-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:border-primary-500 cursor-pointer flex-1 max-w-[210px]"
              >
                {instrumentosEnCategoria.map((i) => (
                  <option key={i.uuid} value={i.uuid}>
                    {i.nombre} {i.diasCredito ? `(${i.diasCredito}d)` : ''}
                  </option>
                ))}
              </select>

              {/* Badge sutil de validación en cierre */}
              <div className="text-[11px] font-medium shrink-0 hidden sm:block">
                {instrumentoActual.validaEnCierre ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Caja
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Cartera
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Acción Unificada: Monto, Saldo Rápido, Ref y Botón */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-800/60">
            {/* Input de Monto */}
            <div className="relative w-full sm:w-44 shrink-0">
              <label htmlFor="monto-abono-input" className="sr-only">Monto *</label>
              <CurrencyInput
                id="monto-abono-input"
                aria-label="Monto"
                value={montoInput ? Number(montoInput) : undefined}
                onChange={(val) => setMontoInput(val !== undefined ? String(val) : '')}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
                placeholder="Monto a abonar..."
                className="font-mono font-bold text-xs h-9"
              />
            </div>

            {/* Botón Rápido de Saldo */}
            {saldoRestante > 0 && (
              <button
                type="button"
                onClick={handlePagarSaldoCompleto}
                className="h-9 px-2.5 text-xs font-semibold text-primary-300 hover:text-primary-200 bg-primary-950/60 border border-primary-800/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0"
                title="Copiar saldo restante al monto"
              >
                Saldo ({formatCOP(saldoRestante)})
              </button>
            )}

            {/* Input de Referencia */}
            <div className="flex-1 min-w-[130px]">
              <label htmlFor="referencia-abono-input" className="sr-only">Referencia / Comprobante</label>
              <input
                id="referencia-abono-input"
                aria-label="Referencia / Comprobante"
                type="text"
                value={referenciaInput}
                onChange={(e) => setReferenciaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregarPago()}
                placeholder={instrumentoActual.permiteReferencia ? "N° Comprobante / Ref..." : "Ref. opcional..."}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Observaciones del Recaudo: Accesible y Compacto */}
          {onChangeObservacionesPago && (
            <div className="pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-0.5">
                <label htmlFor="observaciones-pago-textarea" className="cursor-pointer flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Observaciones del Recaudo / Pago</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsNotasOpen(!isNotasOpen)}
                  className="text-[10px] text-primary-400 hover:text-primary-300 font-medium cursor-pointer"
                >
                  {isNotasOpen ? 'Contraer' : '+ Desplegar'}
                </button>
              </div>
              <textarea
                id="observaciones-pago-textarea"
                aria-label="Observaciones del Recaudo / Pago"
                rows={isNotasOpen ? 2 : 1}
                value={observacionesPago}
                onChange={(e) => onChangeObservacionesPago(e.target.value)}
                placeholder="Nota adicional o comprobante de la transacción (opcional)..."
                className={`w-full px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none transition-all ${
                  isNotasOpen ? 'h-14' : 'h-7 text-[11px]'
                }`}
              />
            </div>
          )}
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
