import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Badge } from '@farutech/design-system';
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
  const [buscandoSolicitudes, setBuscandoSolicitudes] = useState(false);
  const [solicitudesEncontradas, setSolicitudesEncontradas] = useState<SolicitudSaldo[]>([]);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudSaldo | null>(null);

  // Formulario de Abono
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoPagoId, setMetodoPagoId] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>([]);
  const [procesandoAbono, setProcesandoAbono] = useState(false);

  // Estados para Historial de Pagos
  const [historialPagos, setHistorialPagos] = useState<PagoHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

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
          { uuid: 'ins-04', codigo: 'DATAFONO_TD', nombre: 'Tarjeta Débito', categoria: 'DATAFONO', esHoja: true, requiereReferencia: true, activo: true },
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

  // Buscar Solicitudes con Saldo
  const buscarSolicitudes = useCallback(async (termino?: string) => {
    setBuscandoSolicitudes(true);
    setErrorMsg(null);
    try {
      const res = await api.get<any>('/requests?page=1&pageSize=50', token);
      const items = Array.isArray(res) ? res : (res?.items || []);

      const mapped: SolicitudSaldo[] = items.map((s: any) => {
        const total = Number(s.total || s.totalAmount || 0);
        const paid = Number(s.paidAmount || 0);
        const balance = Math.max(0, total - paid);
        return {
          id: s.id,
          number: s.number || 'SOL-0000',
          customerId: s.customerId || '',
          customerName: s.customerName || 'Cliente',
          total,
          paidAmount: paid,
          balanceDue: balance,
          status: s.status || 'CONFIRMED',
          createdAt: s.createdAt || new Date().toISOString(),
        };
      });

      const q = (termino ?? criterioBusqueda).trim().toLowerCase();
      const filtradas = q
        ? mapped.filter(
            (s) =>
              s.number.toLowerCase().includes(q) ||
              s.customerName.toLowerCase().includes(q)
          )
        : mapped;

      setSolicitudesEncontradas(filtradas);

      // Si encuentra exactamente 1, seleccionarla automáticamente
      if (filtradas.length === 1 && !solicitudSeleccionada) {
        seleccionarSolicitud(filtradas[0]);
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error buscando solicitudes');
    } finally {
      setBuscandoSolicitudes(false);
    }
  }, [criterioBusqueda, token, solicitudSeleccionada]);

  // Cargar solicitudes iniciales al montar la pestaña de abono
  useEffect(() => {
    if (tabActiva === 'abono') {
      buscarSolicitudes();
    }
  }, [tabActiva, buscarSolicitudes]);

  const seleccionarSolicitud = (s: SolicitudSaldo) => {
    setSolicitudSeleccionada(s);
    setMontoAbono(s.balanceDue > 0 ? s.balanceDue : 0);
    setReferenciaPago('');
  };

  // Registrar el Abono
  const handleRegistrarAbono = async () => {
    if (!solicitudSeleccionada) {
      setErrorMsg('Seleccione una solicitud para registrar el abono.');
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
          customerId: solicitudSeleccionada.customerId,
          documentId: solicitudSeleccionada.id,
          requestId: solicitudSeleccionada.id,
          paymentMethodId: metodoPagoId || mediosPago[0]?.uuid,
          amount: montoAbono,
          reference: referenciaPago.trim() || undefined,
          referenciaTransaccion: referenciaPago.trim() || undefined,
        },
        token
      );

      const nuevoPagado = solicitudSeleccionada.paidAmount + montoAbono;
      const nuevoSaldo = Math.max(0, solicitudSeleccionada.total - nuevoPagado);

      setSuccessMsg(
        `¡Abono de $${montoAbono.toLocaleString('es-CO')} registrado con éxito a la solicitud ${solicitudSeleccionada.number}! Nuevo saldo pendiente: $${nuevoSaldo.toLocaleString('es-CO')}.`
      );

      // Actualizar la solicitud activa
      setSolicitudSeleccionada({
        ...solicitudSeleccionada,
        paidAmount: nuevoPagado,
        balanceDue: nuevoSaldo,
      });

      // Refrescar lista
      buscarSolicitudes();
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
      const res = await api.get<any>('/payments?page=1&pageSize=50', token);
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
            Reciba abonos de clientes para solicitudes en curso, consulte el historial de comprobantes o administre la caja operativa.
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

      {/* PESTAÑA 1: REGISTRAR ABONO A SOLICITUD */}
      {tabActiva === 'abono' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Buscador de Solicitud / Cliente */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>🔍</span> Buscar Solicitud o Cliente
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ingrese el número de la solicitud (ej: <span className="font-mono text-indigo-400">SOL-...</span>) o el nombre del cliente que viene a abonar.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={criterioBusqueda}
                    onChange={(e) => setCriterioBusqueda(e.target.value)}
                    placeholder="Ej: SOL-0001 o Juan Cardona..."
                    onKeyDown={(e) => e.key === 'Enter' && buscarSolicitudes()}
                  />
                </div>
                <Button variant="primary" onClick={() => buscarSolicitudes()} disabled={buscandoSolicitudes}>
                  {buscandoSolicitudes ? '...' : 'Buscar'}
                </Button>
              </div>

              {/* Lista de Solicitudes encontradas */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {solicitudesEncontradas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-2xl">
                    {buscandoSolicitudes ? 'Buscando solicitudes...' : 'No se encontraron solicitudes con saldo pendiente.'}
                  </div>
                ) : (
                  solicitudesEncontradas.map((s) => {
                    const isSelected = solicitudSeleccionada?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => seleccionarSolicitud(s)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/30'
                            : 'bg-slate-950/60 border-white/5 hover:border-white/20 hover:bg-slate-950/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-indigo-400 text-xs bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30">
                              {s.number}
                            </span>
                            <div className="font-bold text-white text-sm mt-1">{s.customerName}</div>
                          </div>
                          <Badge variant={s.balanceDue > 0 ? 'warning' : 'success'}>
                            {s.balanceDue > 0 ? 'Con Saldo' : 'Saldada'}
                          </Badge>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Total: ${s.total.toLocaleString('es-CO')}</span>
                          <span className={`font-bold ${s.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Saldo: ${s.balanceDue.toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Bento Grid y Formulario de Abono */}
          <div className="lg:col-span-7 space-y-6">
            {solicitudSeleccionada ? (
              <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-700/30">
                        {solicitudSeleccionada.number}
                      </span>
                      <h2 className="text-lg font-black text-white">{solicitudSeleccionada.customerName}</h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Fecha de registro: {new Date(solicitudSeleccionada.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>

                  <Badge variant={solicitudSeleccionada.balanceDue > 0 ? 'warning' : 'success'}>
                    {solicitudSeleccionada.balanceDue > 0 ? 'Saldo Pendiente' : 'Saldada al 100%'}
                  </Badge>
                </div>

                {/* Bento Grid: Estado de Cuenta de la Solicitud */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Facturado</span>
                    <div className="text-xl font-bold font-mono text-white">
                      ${solicitudSeleccionada.total.toLocaleString('es-CO')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Abonado</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      ${solicitudSeleccionada.paidAmount.toLocaleString('es-CO')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Pendiente</span>
                    <div className={`text-xl font-black font-mono ${solicitudSeleccionada.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ${solicitudSeleccionada.balanceDue.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                {/* Formulario para Ingresar el Abono */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>💵</span> Registrar Nuevo Abono
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                        Medio de Pago *
                      </label>
                      <select
                        value={metodoPagoId}
                        onChange={(e) => setMetodoPagoId(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {mediosPago.map((m) => (
                          <option key={m.uuid} value={m.uuid}>
                            {m.nombre} ({m.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300 uppercase">
                          Monto a Abonar (COP) *
                        </label>
                        {solicitudSeleccionada.balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setMontoAbono(solicitudSeleccionada.balanceDue)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                          >
                            Pagar Saldo Completo
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

                    <div className="md:col-span-2">
                      <Input
                        label="Referencia o Comprobante Bancario (Opcional)"
                        value={referenciaPago}
                        onChange={(e) => setReferenciaPago(e.target.value)}
                        placeholder="Ej: Aprobación #782910, Nequi ref, etc."
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Resumen del impacto del abono */}
                  {montoAbono > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Nuevo Saldo Resultante:</span>
                      <span className={`font-black ${montoAbono >= solicitudSeleccionada.balanceDue ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ${Math.max(0, solicitudSeleccionada.balanceDue - montoAbono).toLocaleString('es-CO')}{' '}
                        {montoAbono >= solicitudSeleccionada.balanceDue ? '(¡Saldado al 100%!)' : ''}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      loading={procesandoAbono}
                      disabled={montoAbono <= 0}
                      onClick={handleRegistrarAbono}
                    >
                      💰 Confirmar y Registrar Abono
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center space-y-2">
                <span className="text-3xl">👈</span>
                <span className="text-sm font-semibold">Seleccione una solicitud a la izquierda</span>
                <span className="text-xs text-slate-500">
                  Podrá revisar el saldo y registrar el abono en tiempo real.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE PAGOS */}
      {tabActiva === 'historial' && (
        <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-2xl">
          <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📑</span> Historial de Recaudos y Pagos Registrados
              </h2>
              <p className="text-xs text-slate-400">
                Transacciones de dinero registradas por caja, transferencias o datáfono.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={cargarHistorial} disabled={cargandoHistorial}>
              {cargandoHistorial ? 'Cargando...' : '🔄 Refrescar'}
            </Button>
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
                {historialPagos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      {cargandoHistorial ? 'Cargando historial...' : 'No hay pagos registrados aún.'}
                    </td>
                  </tr>
                ) : (
                  historialPagos.map((p) => (
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
        </Card>
      )}

      {/* PESTAÑA 3: CAJA Y TURNOS */}
      {tabActiva === 'caja' && (
        <div className="space-y-4">
          <ModuloCaja userRole={userRole} token={token} />
        </div>
      )}
    </div>
  );
};

export default ModuloPagosCredito;
