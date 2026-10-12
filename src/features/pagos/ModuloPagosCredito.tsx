import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Input, Badge, Modal } from '@farutech/design-system';
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

  // Paginación de Solicitudes
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Modal de Abono
  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [solicitudAbono, setSolicitudAbono] = useState<SolicitudSaldo | null>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
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

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [criterioBusqueda, soloConSaldo, itemsPorPagina]);

  // Abrir Modal para Registrar Abono
  const handleAbrirModalAbono = (sol: SolicitudSaldo) => {
    setSolicitudAbono(sol);
    setMontoAbono(sol.balanceDue > 0 ? sol.balanceDue : 0);
    setReferenciaPago('');
    setObservacionesPago('');
    if (!metodoPagoId && mediosPago.length > 0) {
      setMetodoPagoId(mediosPago[0].uuid);
    }
    setIsModalAbonoOpen(true);
  };

  // Registrar el Abono desde el Modal
  const handleRegistrarAbono = async () => {
    if (!solicitudAbono) {
      setErrorMsg('No hay solicitud seleccionada para el abono.');
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
        `¡Abono de $${montoAbono.toLocaleString('es-CO')} registrado con éxito a ${solicitudAbono.number}! Nuevo saldo pendiente: $${nuevoSaldo.toLocaleString('es-CO')}.`
      );

      setIsModalAbonoOpen(false);
      setSolicitudAbono(null);
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

  // Reset de página al cambiar filtros en historial
  useEffect(() => {
    setPaginaHistorial(1);
  }, [busquedaHistorial, filtroMedioPago, fechaDesde, fechaHasta, itemsHistorialPorPagina]);

  const totalPaginasHistorial = Math.max(1, Math.ceil(historialFiltrado.length / itemsHistorialPorPagina));
  const historialPaginado = useMemo(() => {
    const inicio = (paginaHistorial - 1) * itemsHistorialPorPagina;
    return historialFiltrado.slice(inicio, inicio + itemsHistorialPorPagina);
  }, [historialFiltrado, paginaHistorial, itemsHistorialPorPagina]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Glassmorphic estilo Linear / Apple */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Operación · Tesorería & Cartera
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Pagos, Abonos y Crédito
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Registre abonos mediante modal ágil sin scroll, consulte solicitudes con paginación optimizada o administre la caja operativa.
          </p>
        </div>

        {/* Selector de Pestañas SaaS */}
        <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setTabActiva('abono')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'abono'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💵</span>
            <span>Registrar Abono</span>
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'historial'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📑</span>
            <span>Historial de Pagos</span>
          </button>
          <button
            onClick={() => setTabActiva('caja')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'caja'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧮</span>
            <span>Caja y Turnos</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold p-1">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold p-1">✕</button>
        </div>
      )}

      {/* PESTAÑA 1: REGISTRAR ABONO A SOLICITUD (VISTA COMPLETA PAGINADA CON MODAL) */}
      {tabActiva === 'abono' && (
        <div className="space-y-6">
          {/* Métricas Compactas Estilo Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Órdenes con Saldo</span>
              <div className="text-xl font-bold font-mono text-white">
                {metricas.cantidadConSaldo} <span className="text-xs text-slate-500 font-normal">de {solicitudes.length}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Facturado</span>
              <div className="text-xl font-bold font-mono text-white">
                ${metricas.totalFacturado.toLocaleString('es-CO')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Recaudado</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                ${metricas.totalRecaudado.toLocaleString('es-CO')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20 shadow-lg space-y-1">
              <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Saldo Total por Cobrar</span>
              <div className="text-xl font-black font-mono text-rose-400">
                ${metricas.saldoTotal.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Tabla Paginada de Solicitudes */}
          <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl">
            <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📑</span> Solicitudes y Cartera Pendiente
                </h2>
                <p className="text-xs text-slate-400">
                  Seleccione cualquier solicitud para abrir el modal de abono rápido sin desplazamiento vertical.
                </p>
              </div>

              {/* Filtros y Buscador */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-64">
                  <Input
                    value={criterioBusqueda}
                    onChange={(e) => setCriterioBusqueda(e.target.value)}
                    placeholder="Buscar SOL-..., cliente..."
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setSoloConSaldo(true)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      soloConSaldo ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Con Saldo ({metricas.cantidadConSaldo})
                  </button>
                  <button
                    onClick={() => setSoloConSaldo(false)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      !soloConSaldo ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({solicitudes.length})
                  </button>
                </div>

                <Button size="sm" variant="secondary" onClick={cargarSolicitudes} disabled={buscandoSolicitudes}>
                  {buscandoSolicitudes ? '...' : '🔄'}
                </Button>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Solicitud</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-300">Total Facturado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-300">Abonado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-300">Saldo Pendiente</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-300">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-300">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {solicitudesPaginadas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                        {buscandoSolicitudes ? 'Cargando solicitudes...' : 'No se encontraron solicitudes con los filtros aplicados.'}
                      </td>
                    </tr>
                  ) : (
                    solicitudesPaginadas.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        onClick={() => handleAbrirModalAbono(s)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30 group-hover:border-indigo-500">
                            {s.number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{s.customerName}</div>
                          {s.customerDocument && (
                            <div className="text-xs text-slate-400 font-mono">Doc: {s.customerDocument}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {new Date(s.createdAt).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          ${s.total.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          ${s.paidAmount.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={s.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            ${s.balanceDue.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={s.balanceDue > 0 ? 'warning' : 'success'}>
                            {s.balanceDue > 0 ? 'Con Saldo' : 'Saldada'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAbrirModalAbono(s)}
                          >
                            💰 Abonar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Barra de Paginación */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Mostrando{' '}
                  <strong className="text-white">
                    {solicitudesFiltradas.length > 0 ? (paginaActual - 1) * itemsPorPagina + 1 : 0}
                  </strong>{' '}
                  a{' '}
                  <strong className="text-white">
                    {Math.min(paginaActual * itemsPorPagina, solicitudesFiltradas.length)}
                  </strong>{' '}
                  de <strong className="text-white">{solicitudesFiltradas.length}</strong> solicitudes
                </span>

                <div className="flex items-center gap-1.5 border-l pl-3 border-white/10">
                  <span>Por página:</span>
                  <select
                    value={itemsPorPagina}
                    onChange={(e) => setItemsPorPagina(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                >
                  ← Anterior
                </Button>
                <span className="font-mono px-2 py-1 bg-slate-900 rounded border border-white/5 text-white font-bold">
                  {paginaActual} / {totalPaginas}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE PAGOS */}
      {tabActiva === 'historial' && (
        <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl">
          <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📑</span> Historial de Recaudos y Pagos Registrados
              </h2>
              <p className="text-xs text-slate-400">
                Transacciones de dinero registradas por caja, transferencias o datáfono.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={cargarHistorial} disabled={cargandoHistorial}>
                {cargandoHistorial ? 'Cargando...' : '🔄 Refrescar'}
              </Button>
            </div>
          </div>

          {/* Barra de Filtros Historial */}
          <div className="p-4 border-b border-white/10 bg-slate-950/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">📅 Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">📅 Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">💳 Medio de Pago</label>
              <select
                value={filtroMedioPago}
                onChange={(e) => setFiltroMedioPago(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Todos los medios</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia bancaria</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Tarjeta">Tarjeta (débito/crédito)</option>
                <option value="Crédito">Crédito interno</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">🔍 Buscar Referencia / Cliente</label>
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="SOL-..., Nequi ref, cliente..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Documento / Solicitud</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Medio de Pago</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Referencia</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Monto</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-300">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historialPaginado.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      {cargandoHistorial ? 'Cargando historial...' : 'No hay pagos registrados aún.'}
                    </td>
                  </tr>
                ) : (
                  historialPaginado.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {new Date(p.receivedAt).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{p.customerName}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30">
                          {p.documentNumber || 'ANTICIPO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.paymentMethodName}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        ${p.amount.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.isVoided ? 'danger' : 'success'}>
                          {p.isVoided ? 'Anulado' : 'Válido'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación Historial */}
          <div className="p-4 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Mostrando{' '}
                <strong className="text-white">
                  {historialFiltrado.length > 0 ? (paginaHistorial - 1) * itemsHistorialPorPagina + 1 : 0}
                </strong>{' '}
                a{' '}
                <strong className="text-white">
                  {Math.min(paginaHistorial * itemsHistorialPorPagina, historialFiltrado.length)}
                </strong>{' '}
                de <strong className="text-white">{historialFiltrado.length}</strong> pagos registrados
              </span>

              <div className="flex items-center gap-1.5 border-l pl-3 border-white/10">
                <span>Por página:</span>
                <select
                  value={itemsHistorialPorPagina}
                  onChange={(e) => setItemsHistorialPorPagina(Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={paginaHistorial <= 1}
                onClick={() => setPaginaHistorial((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </Button>
              <span className="font-mono px-2 py-1 bg-slate-900 rounded border border-white/5 text-white font-bold">
                {paginaHistorial} / {totalPaginasHistorial}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={paginaHistorial >= totalPaginasHistorial}
                onClick={() => setPaginaHistorial((p) => Math.min(totalPaginasHistorial, p + 1))}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* PESTAÑA 3: CAJA Y TURNOS */}
      {tabActiva === 'caja' && (
        <div className="space-y-4">
          <ModuloCaja userRole={userRole} token={token} />
        </div>
      )}

      {/* MODAL PARA REGISTRAR ABONO (SIN SCROLLING) */}
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
          <div className="space-y-5 p-1">
            {/* Cabecera y Resumen de Totales Compacto Estilo Solicitud */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-950/80 rounded-2xl border border-white/10">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</span>
                <div className="font-bold text-white text-sm mt-0.5 truncate">{solicitudAbono.customerName}</div>
                {solicitudAbono.customerDocument && (
                  <div className="text-xs text-slate-400 font-mono">Doc: {solicitudAbono.customerDocument}</div>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total / Ya Abonado</span>
                <div className="font-mono text-sm text-slate-300 mt-0.5">
                  Total: <strong className="text-white">${solicitudAbono.total.toLocaleString('es-CO')}</strong>
                </div>
                <div className="font-mono text-xs text-emerald-400">
                  Abonado: ${solicitudAbono.paidAmount.toLocaleString('es-CO')}
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l md:pl-3 pt-2 md:pt-0 border-white/10">
                <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Saldo Pendiente</span>
                <div className="text-xl font-black font-mono text-rose-400 mt-0.5">
                  ${solicitudAbono.balanceDue.toLocaleString('es-CO')}
                </div>
              </div>
            </div>

            {/* Formulario Compacto Estilo SolicitudCapturaMixta */}
            <div className="space-y-4">
              {/* Fila 1: Instrumento (~60%) y Monto (~40%) en la misma fila */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Instrumento de Pago *
                  </label>
                  <select
                    value={metodoPagoId}
                    onChange={(e) => setMetodoPagoId(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {mediosPago.map((m) => (
                      <option key={m.uuid} value={m.uuid}>
                        {m.codigo} - {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase">
                      Monto a Abonar (COP) *
                    </label>
                    {solicitudAbono.balanceDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setMontoAbono(solicitudAbono.balanceDue)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
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
              </div>

              {/* Fila 2: Referencia / Comprobante */}
              <div>
                <Input
                  label="Referencia / N° Transacción / Comprobante Bancario"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Aprobación #123456, Nequi ref, etc."
                  fullWidth
                />
              </div>

              {/* Fila 3: Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Observaciones del Recaudo / Pago
                </label>
                <textarea
                  rows={2}
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  placeholder="Nota u observación opcional sobre este abono..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Resumen del impacto del abono */}
              {montoAbono > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Nuevo Saldo Pendiente Resultante:</span>
                  <span
                    className={`font-black text-sm ${
                      montoAbono >= solicitudAbono.balanceDue ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    ${Math.max(0, solicitudAbono.balanceDue - montoAbono).toLocaleString('es-CO')}{' '}
                    {montoAbono >= solicitudAbono.balanceDue ? '(¡Saldada al 100%!)' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Acciones del Modal */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
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
