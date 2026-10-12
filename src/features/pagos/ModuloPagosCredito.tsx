import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Input, Badge, Modal } from '@farutech/design-system';
import {
  Search,
  Eye,
  RefreshCw,
  X,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Smartphone,
  CheckCircle2,
  DollarSign,
  Receipt,
  Wallet,
} from 'lucide-react';
import { api } from '../../services/api';
import { catalogosApi } from '../../services/catalogosApi';
import { ModuloCaja } from '../caja/ModuloCaja';
import type { MedioPagoInstrumento } from '../../types/catalogos';

interface ModuloPagosCreditoProps {
  token?: string;
  userRole?: string;
}

interface SolicitudSaldo {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerDocument?: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  createdAt: string;
}

interface PagoHistorial {
  id: string;
  documentId?: string;
  documentNumber?: string;
  customerId: string;
  customerName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number;
  currency: string;
  receivedAt: string;
  reference?: string;
  isVoided?: boolean;
}

export const ModuloPagosCredito: React.FC<ModuloPagosCreditoProps> = ({
  token,
  userRole = 'Cajero',
}) => {
  const [tabActiva, setTabActiva] = useState<'abono' | 'historial' | 'caja'>('abono');

  // Estados para Registro de Abono
  const [criterioBusqueda, setCriterioBusqueda] = useState('');
  const [soloConSaldo, setSoloConSaldo] = useState(true);
  const [buscandoSolicitudes, setBuscandoSolicitudes] = useState(false);
  const [solicitudes, setSolicitudes] = useState<SolicitudSaldo[]>([]);

  // Paginación de Solicitudes (Selector / Modal)
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);
  const [isModalSelectorOpen, setIsModalSelectorOpen] = useState(false);

  // Solicitud vinculada para Abono (EntityPicker)
  const [solicitudAbono, setSolicitudAbono] = useState<SolicitudSaldo | null>(null);
  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [recibidoEfectivo, setRecibidoEfectivo] = useState<number>(0);
  const [metodoPagoId, setMetodoPagoId] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [observacionesPago, setObservacionesPago] = useState<string>('');
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>([]);
  const [procesandoAbono, setProcesandoAbono] = useState(false);

  // Estados para Historial de Pagos y Paginación
  const [historialPagos, setHistorialPagos] = useState<PagoHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroMedioPago, setFiltroMedioPago] = useState('');
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [itemsHistorialPorPagina, setItemsHistorialPorPagina] = useState(10);
  const [pagoDetalle, setPagoDetalle] = useState<PagoHistorial | null>(null);

  // Mensajes globales
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cargar Medios de Pago
  useEffect(() => {
    let activo = true;
    const fetchMedios = async () => {
      try {
        const arbol = await catalogosApi.getMediosPagoArbol();
        if (activo) {
          const list = arbol.categorias.flatMap((c) => c.instrumentos);
          if (list.length > 0) {
            setMediosPago(list);
            setMetodoPagoId(list[0].uuid);
          }
        }
      } catch {
        const fallback: MedioPagoInstrumento[] = [
          { uuid: 'ins-01', codigo: 'EFECTIVO', nombre: 'Efectivo Mostrador', categoria: 'EFECTIVO', esHoja: true, requiereReferencia: false, activo: true },
          { uuid: 'ins-02', codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancaria', categoria: 'TRANSFERENCIA', esHoja: true, requiereReferencia: true, activo: true },
          { uuid: 'ins-03', codigo: 'NEQUI', nombre: 'Nequi / Daviplata', categoria: 'TRANSFERENCIA', esHoja: true, requiereReferencia: true, activo: true },
          { uuid: 'ins-04', codigo: 'DATAFONO_TD', nombre: 'Tarjeta Débito / Datáfono', categoria: 'DATAFONO', esHoja: true, requiereReferencia: true, activo: true },
        ];
        if (activo) {
          setMediosPago(fallback);
          setMetodoPagoId(fallback[0].uuid);
        }
      }
    };
    fetchMedios();
    return () => { activo = false; };
  }, []);

  // Cargar Solicitudes
  const cargarSolicitudes = useCallback(async () => {
    setBuscandoSolicitudes(true);
    setErrorMsg(null);
    try {
      const res = await api.get<any>('/requests?page=1&pageSize=300', token);
      const items = Array.isArray(res) ? res : (res?.items || []);

      const mapped: SolicitudSaldo[] = items.map((s: any) => {
        const total = Number(s.total || s.totalAmount || 0);
        const paid = Number(s.paidAmount || 0);
        const balance = Math.max(0, total - paid);
        return {
          id: s.id || s.requestId,
          number: s.number || s.numeroDocumento || 'SOL-0000',
          customerId: s.customerId || s.clienteId || '',
          customerName: s.customerName || s.clienteNombre || 'Cliente',
          customerDocument: s.customerDocument || s.clienteDocumento || '',
          total,
          paidAmount: paid,
          balanceDue: balance,
          status: s.status || s.estado || 'CONFIRMED',
          createdAt: s.createdAt || s.fechaCreacion || new Date().toISOString(),
        };
      });

      setSolicitudes(mapped);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando solicitudes');
    } finally {
      setBuscandoSolicitudes(false);
    }
  }, [token]);

  useEffect(() => {
    if (tabActiva === 'abono') {
      cargarSolicitudes();
    }
  }, [tabActiva, cargarSolicitudes]);

  // Filtrado de Solicitudes
  const solicitudesFiltradas = useMemo(() => {
    let result = solicitudes;
    if (soloConSaldo) {
      result = result.filter((s) => s.balanceDue > 0);
    }
    const q = criterioBusqueda.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.number.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerDocument && s.customerDocument.toLowerCase().includes(q))
      );
    }
    return result;
  }, [solicitudes, soloConSaldo, criterioBusqueda]);

  // Paginación de solicitudes
  const totalPaginas = Math.max(1, Math.ceil(solicitudesFiltradas.length / itemsPorPagina));
  const solicitudesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return solicitudesFiltradas.slice(inicio, inicio + itemsPorPagina);
  }, [solicitudesFiltradas, paginaActual, itemsPorPagina]);

  useEffect(() => {
    setPaginaActual(1);
  }, [criterioBusqueda, soloConSaldo, itemsPorPagina]);

  // Seleccionar solicitud para el formulario EntityPicker
  const handleSeleccionarSolicitud = (sol: SolicitudSaldo) => {
    setSolicitudAbono(sol);
    setMontoAbono(sol.balanceDue > 0 ? sol.balanceDue : 0);
    setRecibidoEfectivo(sol.balanceDue > 0 ? sol.balanceDue : 0);
    setReferenciaPago('');
    setObservacionesPago('');
    setIsModalSelectorOpen(false);
  };

  // Abrir Modal para Registrar Abono (compatibilidad con tests)
  const handleAbrirModalAbono = (sol: SolicitudSaldo) => {
    setSolicitudAbono(sol);
    setMontoAbono(sol.balanceDue > 0 ? sol.balanceDue : 0);
    setRecibidoEfectivo(sol.balanceDue > 0 ? sol.balanceDue : 0);
    setReferenciaPago('');
    setObservacionesPago('');
    if (!metodoPagoId && mediosPago.length > 0) {
      setMetodoPagoId(mediosPago[0].uuid);
    }
    setIsModalAbonoOpen(true);
  };

  // Registrar el Abono
  const handleRegistrarAbono = async () => {
    if (!solicitudAbono) {
      setErrorMsg('No hay solicitud vinculada para el abono.');
      return;
    }
    if (montoAbono <= 0) {
      setErrorMsg('El monto a abonar debe ser mayor a cero.');
      return;
    }

    setProcesandoAbono(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post<any>(
        '/payments',
        {
          customerId: solicitudAbono.customerId,
          documentId: solicitudAbono.id,
          requestId: solicitudAbono.id,
          paymentMethodId: metodoPagoId || mediosPago[0]?.uuid,
          amount: montoAbono,
          reference: referenciaPago.trim() || undefined,
          referenciaTransaccion: referenciaPago.trim() || undefined,
          notes: observacionesPago.trim() || undefined,
        },
        token
      );

      const nuevoPagado = solicitudAbono.paidAmount + montoAbono;
      const nuevoSaldo = Math.max(0, solicitudAbono.total - nuevoPagado);

      setSuccessMsg(
        `¡Abono de $${montoAbono.toLocaleString('es-CO')} registrado con éxito a ${solicitudAbono.number}! Nuevo saldo: $${nuevoSaldo.toLocaleString('es-CO')}.`
      );

      setIsModalAbonoOpen(false);
      setSolicitudAbono(null);
      setMontoAbono(0);
      setRecibidoEfectivo(0);
      await cargarSolicitudes();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al procesar el recaudo');
    } finally {
      setProcesandoAbono(false);
    }
  };

  // Cargar Historial de Pagos
  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorMsg(null);
    try {
      const res = await api.get<any>('/payments?page=1&pageSize=300', token);
      const items = Array.isArray(res) ? res : (res?.items || []);
      setHistorialPagos(
        items.map((p: any) => ({
          id: p.id || p.comprobanteId,
          documentId: p.documentId,
          documentNumber: p.documentNumber,
          customerId: p.customerId,
          customerName: p.customerName || 'Cliente',
          paymentMethodId: p.paymentMethodId,
          paymentMethodName: p.paymentMethodName || 'Efectivo',
          amount: Number(p.amount || p.monto || 0),
          currency: p.currency || 'COP',
          receivedAt: p.receivedAt || p.fechaRecaudo || new Date().toISOString(),
          reference: p.reference || p.referencia,
          isVoided: p.isVoided ?? false,
        }))
      );
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando historial de pagos');
    } finally {
      setCargandoHistorial(false);
    }
  }, [token]);

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarHistorial();
    }
  }, [tabActiva, cargarHistorial]);

  // Filtrado y Paginación de Historial
  const historialFiltrado = useMemo(() => {
    let result = historialPagos;

    if (filtroMedioPago) {
      result = result.filter((p) =>
        p.paymentMethodName.toLowerCase().includes(filtroMedioPago.toLowerCase())
      );
    }

    if (fechaDesde) {
      result = result.filter((p) => p.receivedAt.split('T')[0] >= fechaDesde);
    }

    if (fechaHasta) {
      result = result.filter((p) => p.receivedAt.split('T')[0] <= fechaHasta);
    }

    const q = busquedaHistorial.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          (p.documentNumber && p.documentNumber.toLowerCase().includes(q)) ||
          p.paymentMethodName.toLowerCase().includes(q) ||
          (p.reference && p.reference.toLowerCase().includes(q))
      );
    }
    return result;
  }, [historialPagos, busquedaHistorial, filtroMedioPago, fechaDesde, fechaHasta]);

  useEffect(() => {
    setPaginaHistorial(1);
  }, [busquedaHistorial, filtroMedioPago, fechaDesde, fechaHasta, itemsHistorialPorPagina]);

  const totalPaginasHistorial = Math.max(1, Math.ceil(historialFiltrado.length / itemsHistorialPorPagina));
  const historialPaginado = useMemo(() => {
    const inicio = (paginaHistorial - 1) * itemsHistorialPorPagina;
    return historialFiltrado.slice(inicio, inicio + itemsHistorialPorPagina);
  }, [historialFiltrado, paginaHistorial, itemsHistorialPorPagina]);

  // Totales de Arqueo / Cuadre en una sola franja horizontal
  const totalesCuadre = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;
    let anulados = 0;

    for (const p of historialFiltrado) {
      if (p.isVoided) {
        anulados += 1;
        continue;
      }
      total += p.amount;
      const m = p.paymentMethodName.toLowerCase();
      if (m.includes('efectivo')) efectivo += p.amount;
      else if (m.includes('tarjeta') || m.includes('datafono')) tarjeta += p.amount;
      else if (m.includes('transfe') || m.includes('nequi') || m.includes('daviplata')) transferencia += p.amount;
      else efectivo += p.amount;
    }

    return { total, efectivo, tarjeta, transferencia, anulados, count: historialFiltrado.length };
  }, [historialFiltrado]);

  // Métricas financieras rápidas
  const metricas = useMemo(() => {
    const conSaldo = solicitudes.filter((s) => s.balanceDue > 0);
    const saldoTotal = conSaldo.reduce((acc, s) => acc + s.balanceDue, 0);
    const totalFacturado = solicitudes.reduce((acc, s) => acc + s.total, 0);
    const totalRecaudado = solicitudes.reduce((acc, s) => acc + s.paidAmount, 0);
    return {
      cantidadConSaldo: conSaldo.length,
      saldoTotal,
      totalFacturado,
      totalRecaudado,
    };
  }, [solicitudes]);

  const cambioEfectivo = Math.max(0, recibidoEfectivo - montoAbono);
  const esMetodoEfectivo = useMemo(() => {
    const act = mediosPago.find((m) => m.uuid === metodoPagoId);
    return !act || act.categoria === 'EFECTIVO' || act.codigo.includes('EFECTIVO');
  }, [mediosPago, metodoPagoId]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* Header Glassmorphic Compacto */}
      <div className="relative overflow-hidden rounded-2xl p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Operación · Tesorería & Cartera
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
            Pagos, Abonos y Crédito
          </h1>
        </div>

        {/* Selector de Pestañas SaaS con Iconos */}
        <div className="bg-slate-950/90 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner self-start md:self-auto">
          <button
            onClick={() => setTabActiva('abono')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'abono'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Formulario ágil de recaudo y abonos con selector modal"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Registrar Abono</span>
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'historial'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Historial de recaudos con cuadre de caja diario"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Historial de Pagos</span>
          </button>
          <button
            onClick={() => setTabActiva('caja')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'caja'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Gestión de caja y turnos POS"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Caja y Turnos</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/50 border border-rose-800/60 text-rose-300 rounded-xl text-xs flex items-center justify-between backdrop-blur-md shadow-md">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-center justify-between backdrop-blur-md shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PESTAÑA 1: FORMULARIO CON VINCULACIÓN (ENTITY PICKER) SIN SCROLL */}
      {tabActiva === 'abono' && (
        <div className="space-y-4">
          {/* Franja Horizontal Compacta de KPIs (1 sola línea) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Con Saldo</span>
                <span className="text-base font-bold font-mono text-white">{metricas.cantidadConSaldo} órdenes</span>
              </div>
              <Badge variant="warning" size="sm">Pendiente</Badge>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Facturado</span>
                <span className="text-base font-bold font-mono text-white">${metricas.totalFacturado.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Recaudado</span>
                <span className="text-base font-bold font-mono text-emerald-400">${metricas.totalRecaudado.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider block">Cartera por Cobrar</span>
                <span className="text-base font-black font-mono text-rose-400">${metricas.saldoTotal.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* Plantilla: Formulario con Vinculación EntityPicker (Altura contenida en viewport) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Columna Izquierda: Tarjeta / Selector de Solicitud Vinculada (4 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <Card className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    <span>1. Solicitud a Vincular</span>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsModalSelectorOpen(true)}
                    className="text-xs py-1 px-2.5 flex items-center gap-1 border-indigo-500/30 text-indigo-300 hover:text-white"
                  >
                    <Search className="w-3 h-3" />
                    <span>Buscar...</span>
                  </Button>
                </div>

                {solicitudAbono ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-500/30">
                        {solicitudAbono.number}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsModalSelectorOpen(true)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Cambiar solicitud vinculada"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSolicitudAbono(null)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Desvincular solicitud"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm">{solicitudAbono.customerName}</div>
                      {solicitudAbono.customerDocument && (
                        <div className="text-xs text-slate-400 font-mono">Doc: {solicitudAbono.customerDocument}</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                        <span className="text-slate-200 font-bold">${solicitudAbono.total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Abonado</span>
                        <span className="text-emerald-400 font-bold">${solicitudAbono.paidAmount.toLocaleString('es-CO')}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 flex items-center justify-between text-xs font-mono">
                      <span className="text-rose-300 font-medium">Saldo Pendiente:</span>
                      <span className="text-rose-400 font-black text-sm">${solicitudAbono.balanceDue.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-950/50 border border-dashed border-white/10 space-y-2">
                    <p className="text-xs text-slate-400">
                      Seleccione una solicitud con saldo pendiente para registrar el abono.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsModalSelectorOpen(true)}
                      className="text-xs py-1.5 px-3 mx-auto"
                    >
                      <Search className="w-3.5 h-3.5 mr-1" />
                      Seleccionar Solicitud
                    </Button>
                  </div>
                )}

                {/* Lista rápida de solicitudes con saldo para acceso directo (con scroll interno acotado) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1.5">
                    <span>Órdenes pendientes recientes</span>
                    <button
                      onClick={cargarSolicitudes}
                      className="text-indigo-400 hover:text-indigo-300 p-0.5"
                      title="Refrescar órdenes"
                    >
                      <RefreshCw className={`w-3 h-3 ${buscandoSolicitudes ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {solicitudesPaginadas.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 text-center">No hay órdenes con saldo.</p>
                    ) : (
                      solicitudesPaginadas.map((s) => (
                        <div
                          key={s.id}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                            solicitudAbono?.id === s.id
                              ? 'bg-indigo-950/60 border-indigo-500/60 text-white'
                              : 'bg-slate-950/50 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div
                            className="truncate pr-2 cursor-pointer flex-1"
                            onClick={() => handleSeleccionarSolicitud(s)}
                          >
                            <span className="font-mono font-bold text-indigo-400 mr-1.5">{s.number}</span>
                            <span className="text-white font-medium">{s.customerName}</span>
                          </div>
                          <div className="text-right whitespace-nowrap flex items-center gap-1.5">
                            <span className="font-mono font-bold text-rose-400 mr-1">${s.balanceDue.toLocaleString('es-CO')}</span>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAbrirModalAbono(s)}
                            >
                              💰 Abonar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Columna Derecha: Formulario de Abono y Liquidación en Mostrador (7 cols) */}
            <div className="lg:col-span-7">
              <Card className="p-5 bg-slate-900/80 border border-white/10 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                    <span>2. Datos del Abono & Forma de Pago</span>
                  </h3>
                  {solicitudAbono && (
                    <span className="text-xs font-mono text-slate-400">
                      Saldo actual: <strong className="text-rose-400">${solicitudAbono.balanceDue.toLocaleString('es-CO')}</strong>
                    </span>
                  )}
                </div>

                {/* Formas de Pago tipo Chips con Iconos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Forma de Pago *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {mediosPago.map((m) => {
                      const isSelected = metodoPagoId === m.uuid;
                      const esEfectivo = m.codigo.includes('EFECTIVO');
                      const esTransf = m.codigo.includes('TRANSFERENCIA') || m.codigo.includes('NEQUI');
                      const esTarj = m.codigo.includes('DATAFONO') || m.codigo.includes('TARJETA');

                      return (
                        <button
                          key={m.uuid}
                          type="button"
                          onClick={() => setMetodoPagoId(m.uuid)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                              : 'bg-slate-950/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {esEfectivo && <Banknote className="w-4 h-4" />}
                          {esTransf && <ArrowLeftRight className="w-4 h-4" />}
                          {esTarj && <CreditCard className="w-4 h-4" />}
                          {!esEfectivo && !esTransf && !esTarj && <Smartphone className="w-4 h-4" />}
                          <span className="truncate w-full text-center">{m.nombre.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monto a Abonar + Atajos de Pago */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300 uppercase">
                      Monto a Abonar (COP) *
                    </label>
                    {solicitudAbono && solicitudAbono.balanceDue > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMontoAbono(solicitudAbono.balanceDue);
                            setRecibidoEfectivo(solicitudAbono.balanceDue);
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Saldar Saldo Total
                        </button>
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={montoAbono}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMontoAbono(v);
                      if (recibidoEfectivo < v) setRecibidoEfectivo(v);
                    }}
                    min={1}
                    fullWidth
                  />
                </div>

                {/* Si es efectivo: Recibido y Cambio */}
                {esMetodoEfectivo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/90 border border-white/10">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Efectivo Recibido (COP)
                      </label>
                      <Input
                        type="number"
                        value={recibidoEfectivo}
                        onChange={(e) => setRecibidoEfectivo(Number(e.target.value))}
                        min={0}
                        fullWidth
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Cambio / Devuelta
                      </span>
                      <div className="p-2 rounded-xl bg-slate-900 border border-white/10 font-mono font-black text-emerald-400 text-lg flex items-center justify-between">
                        <span>$</span>
                        <span>{cambioEfectivo.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Input
                      label="Referencia / N° Aprobación / Comprobante Bancario"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder="Ej: Aprobación #123456, Nequi ref, etc."
                      fullWidth
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Observaciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={observacionesPago}
                    onChange={(e) => setObservacionesPago(e.target.value)}
                    placeholder="Nota u observación de caja..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Botón de Acción Principal */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-400">
                    {solicitudAbono && montoAbono > 0 && (
                      <span>
                        Nuevo saldo: <strong className="text-white">${Math.max(0, solicitudAbono.balanceDue - montoAbono).toLocaleString('es-CO')}</strong>
                      </span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    loading={procesandoAbono}
                    disabled={!solicitudAbono || montoAbono <= 0 || procesandoAbono}
                    onClick={handleRegistrarAbono}
                    className="px-4 py-2 text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar e Imprimir Recibo</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE PAGOS CON CUADRE HORIZONTAL Y BOTONES ICONOS */}
      {tabActiva === 'historial' && (
        <div className="space-y-4">
          {/* Franja Horizontal de Totales de Arqueo / Cuadre */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Recaudado</span>
              <span className="text-base font-black font-mono text-emerald-400">${totalesCuadre.total.toLocaleString('es-CO')}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Efectivo</span>
              <span className="text-base font-bold font-mono text-white">${totalesCuadre.efectivo.toLocaleString('es-CO')}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Datáfono / Tarjetas</span>
              <span className="text-base font-bold font-mono text-white">${totalesCuadre.tarjeta.toLocaleString('es-CO')}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Transferencias / Nequi</span>
              <span className="text-base font-bold font-mono text-white">${totalesCuadre.transferencia.toLocaleString('es-CO')}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Anulados</span>
              <span className="text-base font-bold font-mono text-rose-400">{totalesCuadre.anulados} transacciones</span>
            </div>
          </div>

          <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-2xl shadow-xl">
            {/* Barra de Filtros Compacta en 1 Fila */}
            <div className="p-3 border-b border-white/10 bg-slate-950/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs items-center">
              <div className="lg:col-span-3">
                <input
                  type="text"
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  placeholder="Buscar SOL-..., cliente, referencia..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={filtroMedioPago}
                  onChange={(e) => setFiltroMedioPago(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Todos los medios</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Nequi">Nequi / Daviplata</option>
                  <option value="Tarjeta">Tarjeta / Datáfono</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  title="Fecha desde"
                />
              </div>

              <div className="lg:col-span-2">
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  title="Fecha hasta"
                />
              </div>

              <div className="lg:col-span-3 flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cargarHistorial}
                  disabled={cargandoHistorial}
                  className="text-xs py-1 px-2.5"
                  title="Refrescar historial"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoHistorial ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Tabla con Altura Contenida y Botones con Iconos */}
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="min-w-full divide-y divide-white/10 text-xs">
                <thead className="bg-slate-950/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-semibold text-slate-400">Fecha y Hora</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold text-slate-400">Documento</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold text-slate-400">Cliente</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold text-slate-400">Medio</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold text-slate-400">Referencia</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold text-slate-400">Monto</th>
                    <th className="px-3.5 py-2.5 text-center font-semibold text-slate-400">Estado</th>
                    <th className="px-3.5 py-2.5 text-right font-semibold text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/40">
                  {historialPaginado.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                        {cargandoHistorial ? 'Cargando historial...' : 'No hay pagos registrados para estos criterios.'}
                      </td>
                    </tr>
                  ) : (
                    historialPaginado.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-3.5 py-2 font-mono text-slate-400">
                          {new Date(p.receivedAt).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-700/30">
                            {p.documentNumber || 'ANTICIPO'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 font-medium text-white truncate max-w-[160px]">{p.customerName}</td>
                        <td className="px-3.5 py-2 text-slate-300">{p.paymentMethodName}</td>
                        <td className="px-3.5 py-2 font-mono text-slate-400 truncate max-w-[120px]">{p.reference || '—'}</td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-400">
                          ${p.amount.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <Badge variant={p.isVoided ? 'danger' : 'success'} size="sm">
                            {p.isVoided ? 'Anulado' : 'Válido'}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setPagoDetalle(p)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Ver detalle del comprobante de pago"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación Fija */}
            <div className="p-3 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  Mostrando <strong className="text-white">{historialFiltrado.length > 0 ? (paginaHistorial - 1) * itemsHistorialPorPagina + 1 : 0}</strong> a{' '}
                  <strong className="text-white">{Math.min(paginaHistorial * itemsHistorialPorPagina, historialFiltrado.length)}</strong> de{' '}
                  <strong className="text-white">{historialFiltrado.length}</strong>
                </span>
                <select
                  value={itemsHistorialPorPagina}
                  onChange={(e) => setItemsHistorialPorPagina(Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-white ml-2"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaHistorial <= 1}
                  onClick={() => setPaginaHistorial((p) => Math.max(1, p - 1))}
                  className="py-0.5 px-2 text-xs"
                >
                  ←
                </Button>
                <span className="font-mono font-bold text-white px-2">
                  {paginaHistorial} / {totalPaginasHistorial}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaHistorial >= totalPaginasHistorial}
                  onClick={() => setPaginaHistorial((p) => Math.min(totalPaginasHistorial, p + 1))}
                  className="py-0.5 px-2 text-xs"
                >
                  →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: CAJA Y TURNOS */}
      {tabActiva === 'caja' && (
        <div className="space-y-4">
          <ModuloCaja userRole={userRole} token={token} />
        </div>
      )}

      {/* MODAL ENTITY PICKER: BUSCADOR DE SOLICITUDES CON SCROLL INTERNO */}
      <Modal
        isOpen={isModalSelectorOpen}
        onClose={() => setIsModalSelectorOpen(false)}
        title="Buscar Solicitud con Saldo Pendiente"
        size="lg"
      >
        <div className="space-y-3 p-1">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={criterioBusqueda}
                onChange={(e) => setCriterioBusqueda(e.target.value)}
                placeholder="Escribe consecutivo (SOL-...), cliente o documento..."
                fullWidth
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setSoloConSaldo(true)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  soloConSaldo ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Con Saldo
              </button>
              <button
                type="button"
                onClick={() => setSoloConSaldo(false)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  !soloConSaldo ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1 border border-white/10 rounded-xl p-1 bg-slate-950/60">
            {solicitudesPaginadas.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 text-center">
                {buscandoSolicitudes ? 'Buscando...' : 'No se encontraron solicitudes con saldo.'}
              </p>
            ) : (
              solicitudesPaginadas.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSeleccionarSolicitud(s)}
                  className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700/40">
                        {s.number}
                      </span>
                      <span className="font-semibold text-white text-xs">{s.customerName}</span>
                    </div>
                    {s.customerDocument && (
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Doc: {s.customerDocument}</span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Saldo Pendiente</span>
                    <span className="text-xs font-mono font-bold text-rose-400">${s.balanceDue.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/10">
            <span>Página {paginaActual} de {totalPaginas}</span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={paginaActual <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              >
                →
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL DETALLE DE COMPROBANTE DE HISTORIAL */}
      <Modal
        isOpen={!!pagoDetalle}
        onClose={() => setPagoDetalle(null)}
        title={`Comprobante de Pago · ${pagoDetalle?.documentNumber || 'Recaudo'}`}
        size="md"
      >
        {pagoDetalle && (
          <div className="space-y-4 p-2 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{pagoDetalle.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y Hora:</span>
                <span className="font-mono text-slate-200">{new Date(pagoDetalle.receivedAt).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Medio de Pago:</span>
                <span className="font-semibold text-indigo-300">{pagoDetalle.paymentMethodName}</span>
              </div>
              {pagoDetalle.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Referencia:</span>
                  <span className="font-mono text-slate-200">{pagoDetalle.reference}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
                <span className="font-bold text-white">Monto Recaudado:</span>
                <span className="font-mono font-black text-emerald-400">${pagoDetalle.amount.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPagoDetalle(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL PARA REGISTRAR ABONO (Compatibilidad completa con tests unitarios) */}
      <Modal
        isOpen={isModalAbonoOpen && !!solicitudAbono}
        onClose={() => {
          if (!procesandoAbono) {
            setIsModalAbonoOpen(false);
            setSolicitudAbono(null);
          }
        }}
        title={`Registrar Abono · ${solicitudAbono?.number ?? ''}`}
        size="lg"
      >
        {solicitudAbono && (
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950/80 rounded-xl border border-white/10 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Cliente</span>
                <div className="font-bold text-white truncate mt-0.5">{solicitudAbono.customerName}</div>
                {solicitudAbono.customerDocument && (
                  <div className="text-[11px] text-slate-400 font-mono">Doc: {solicitudAbono.customerDocument}</div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total / Abonado</span>
                <div className="font-mono text-slate-200 mt-0.5">${solicitudAbono.total.toLocaleString('es-CO')}</div>
                <div className="font-mono text-emerald-400">${solicitudAbono.paidAmount.toLocaleString('es-CO')}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-rose-300 uppercase">Saldo Pendiente</span>
                <div className="text-base font-black font-mono text-rose-400 mt-0.5">${solicitudAbono.balanceDue.toLocaleString('es-CO')}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Instrumento de Pago *
                </label>
                <select
                  value={metodoPagoId}
                  onChange={(e) => setMetodoPagoId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {mediosPago.map((m) => (
                    <option key={m.uuid} value={m.uuid}>
                      {m.codigo} - {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">
                    Monto a Abonar (COP) *
                  </label>
                  {solicitudAbono.balanceDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setMontoAbono(solicitudAbono.balanceDue)}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Pagar Saldo Total
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(Number(e.target.value))}
                  min={1}
                  fullWidth
                />
              </div>

              <div>
                <Input
                  label="Referencia / N° Transacción / Comprobante Bancario"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Aprobación #123456, Nequi ref, etc."
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  placeholder="Nota u observación opcional..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                disabled={procesandoAbono}
                onClick={() => {
                  setIsModalAbonoOpen(false);
                  setSolicitudAbono(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                loading={procesandoAbono}
                disabled={montoAbono <= 0 || procesandoAbono}
                onClick={handleRegistrarAbono}
              >
                💰 Confirmar y Registrar Abono
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModuloPagosCredito;
