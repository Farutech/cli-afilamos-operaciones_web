import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Badge, Input, Modal } from '@farutech/design-system';
import { entregasApi } from '../../services/entregasApi';
import { catalogosApi } from '../../services/catalogosApi';
import type {
  ItemListoEntrega,
  RemisionDetalle,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
} from '../../types/entregas';
import type { MedioPagoInstrumento } from '../../types/catalogos';

interface ModuloEntregasProps {
  token?: string;
  instrumentosPago?: MedioPagoInstrumento[];
  usuarioActual?: {
    id?: number;
    publicId?: string;
    codigo: string;
    rol: string;
  };
}

export const ModuloEntregas: React.FC<ModuloEntregasProps> = ({
  token,
  instrumentosPago: instrumentosProps = [],
  usuarioActual = { id: 1, publicId: 'usr-01', codigo: 'CAJ-01', rol: 'Cajero' },
}) => {
  const [itemsListos, setItemsListos] = useState<ItemListoEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pestaña activa: 'cliente' (Entrega Consolidada por Cliente) | 'solicitudes' (Por Solicitud)
  const [vistaActiva, setVistaActiva] = useState<'cliente' | 'solicitudes'>('cliente');

  // Medios de pago cargados
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>(instrumentosProps);

  // Cliente seleccionado en la vista consolidada
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>('');

  // Ítems seleccionados para la entrega consolidada
  const [itemsSeleccionadosIds, setItemsSeleccionadosIds] = useState<string[]>([]);

  // Pago en Entrega Consolidada
  const [incluirPagoConsolidado, setIncluirPagoConsolidado] = useState<boolean>(true);
  const [montoPagoConsolidado, setMontoPagoConsolidado] = useState<number>(0);
  const [metodoPagoConsolidado, setMetodoPagoConsolidado] = useState<string>('');
  const [referenciaPagoConsolidado, setReferenciaPagoConsolidado] = useState<string>('');

  // Datos de despacho de la entrega consolidada
  const [receptorNombre, setReceptorNombre] = useState<string>('');
  const [receptorDocumento, setReceptorDocumento] = useState<string>('');
  const [observacionEntrega, setObservacionEntrega] = useState<string>('');

  // Remisión Activa en edición / despacho (flujo individual o resultado)
  const [remisionActiva, setRemisionActiva] = useState<RemisionDetalle | null>(null);

  // Modal de Selección para Nueva Entrega (por solicitud)
  const [mostrarModalNuevaEntrega, setMostrarModalNuevaEntrega] = useState(false);

  // Modal de Pago para remisión activa
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState('');

  // Formulario de Despacho tradicional (T044)
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorDocumento, setRecibidoPorDocumento] = useState('');

  // Cargar medios de pago del catálogo si no vinieron en props
  useEffect(() => {
    let activo = true;
    const fetchMedios = async () => {
      if (instrumentosProps.length > 0) return;
      try {
        const arbol = await catalogosApi.getMediosPagoArbol();
        if (activo) {
          const list = arbol.categorias.flatMap((c) => c.instrumentos);
          if (list.length > 0) {
            setMediosPago(list);
            setMetodoPagoConsolidado(list[0].uuid);
            setInstrumentoSeleccionado(list[0].uuid);
          }
        }
      } catch {
        // Fallback estándar
        const fallback: MedioPagoInstrumento[] = [
          { uuid: 'ins-01', codigo: 'EFECTIVO', nombre: 'Efectivo Mostrador', categoria: 'EFECTIVO', esHoja: true, requiereReferencia: false, activo: true },
          { uuid: 'ins-02', codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancaria', categoria: 'TRANSFERENCIA', esHoja: true, requiereReferencia: true, activo: true },
          { uuid: 'ins-03', codigo: 'NEQUI', nombre: 'Nequi / Daviplata', categoria: 'TRANSFERENCIA', esHoja: true, requiereReferencia: true, activo: true },
          { uuid: 'ins-04', codigo: 'DATAFONO_TD', nombre: 'Tarjeta Débito / Datafono', categoria: 'DATAFONO', esHoja: true, requiereReferencia: true, activo: true },
        ];
        if (activo) {
          setMediosPago(fallback);
          setMetodoPagoConsolidado(fallback[0].uuid);
          setInstrumentoSeleccionado(fallback[0].uuid);
        }
      }
    };
    fetchMedios();
    return () => { activo = false; };
  }, [instrumentosProps]);

  const cargarItemsListos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await entregasApi.getItemsListos(busqueda || undefined, undefined, token);
      setItemsListos(data);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando ítems listos para entrega');
    } finally {
      setLoading(false);
    }
  }, [busqueda, token]);

  useEffect(() => {
    let activo = true;
    const init = async () => {
      try {
        const data = await entregasApi.getItemsListos(undefined, undefined, token);
        if (activo) setItemsListos(data);
      } catch (err: unknown) {
        if (activo) setErrorMsg((err as { message?: string }).message || 'Error cargando ítems listos');
      }
    };
    init();
    return () => {
      activo = false;
    };
  }, [token]);

  // Agrupación por Cliente (Regla de Negocio: una entrega NO puede tener varios clientes, pero puede abarcar varias solicitudes de un mismo cliente)
  const clientesAgrupados = useMemo(() => {
    const map = new Map<string, {
      clienteId: string;
      clienteNombre: string;
      clienteDocumento: string;
      clienteTelefono: string;
      items: ItemListoEntrega[];
      solicitudesNumeros: Set<string>;
      totalNeto: number;
      totalAnticipos: number;
      saldoPendiente: number;
    }>();

    for (const item of itemsListos) {
      const cId = item.clientePublicId || item.clienteNumeroDocumento || 'sin-cliente';
      if (!map.has(cId)) {
        map.set(cId, {
          clienteId: cId,
          clienteNombre: item.clienteNombre,
          clienteDocumento: item.clienteNumeroDocumento,
          clienteTelefono: item.clienteTelefono,
          items: [],
          solicitudesNumeros: new Set<string>(),
          totalNeto: 0,
          totalAnticipos: 0,
          saldoPendiente: 0,
        });
      }
      const entry = map.get(cId)!;
      entry.items.push(item);
      entry.solicitudesNumeros.add(item.documentoSolicitudNumero);
      entry.totalNeto += item.subtotal;
      entry.totalAnticipos += item.anticipoDirectoImputado;
      entry.saldoPendiente += item.saldoPendienteItem;
    }

    return Array.from(map.values());
  }, [itemsListos]);

  // Agrupar ítems por Solicitud (compatibilidad con flujo individual y tests)
  const solicitudesAgrupadas = useMemo(() => {
    const map = new Map<string, {
      solicitudNumero: string;
      clienteNombre: string;
      clienteDocumento: string;
      items: ItemListoEntrega[];
      totalNeto: number;
      totalAnticipos: number;
      saldoPendiente: number;
    }>();

    for (const item of itemsListos) {
      const solId = item.documentoSolicitudPublicId;
      if (!map.has(solId)) {
        map.set(solId, {
          solicitudNumero: item.documentoSolicitudNumero,
          clienteNombre: item.clienteNombre,
          clienteDocumento: item.clienteNumeroDocumento,
          items: [],
          totalNeto: 0,
          totalAnticipos: 0,
          saldoPendiente: 0,
        });
      }
      const entry = map.get(solId)!;
      entry.items.push(item);
      entry.totalNeto += item.subtotal;
      entry.totalAnticipos += item.anticipoDirectoImputado;
      entry.saldoPendiente += item.saldoPendienteItem;
    }

    return Array.from(map.entries()).map(([solicitudPublicId, data]) => ({
      solicitudPublicId,
      ...data,
    }));
  }, [itemsListos]);

  // Cliente activo para la entrega consolidada
  const clienteActivo = useMemo(() => {
    return clientesAgrupados.find((c) => c.clienteId === clienteSeleccionadoId) || null;
  }, [clientesAgrupados, clienteSeleccionadoId]);

  // Auto-seleccionar primer cliente si ninguno está seleccionado y hay clientes
  useEffect(() => {
    if (!clienteSeleccionadoId && clientesAgrupados.length > 0) {
      const primer = clientesAgrupados[0];
      setClienteSeleccionadoId(primer.clienteId);
      setItemsSeleccionadosIds(primer.items.map((i) => i.itemPublicId));
      setReceptorNombre(primer.clienteNombre);
      setReceptorDocumento(primer.clienteDocumento);
      setMontoPagoConsolidado(primer.saldoPendiente);
    }
  }, [clientesAgrupados, clienteSeleccionadoId]);

  // Al cambiar de cliente manualmente
  const handleSeleccionarCliente = (cId: string) => {
    setClienteSeleccionadoId(cId);
    const c = clientesAgrupados.find((cl) => cl.clienteId === cId);
    if (c) {
      setItemsSeleccionadosIds(c.items.map((i) => i.itemPublicId));
      setReceptorNombre(c.clienteNombre);
      setReceptorDocumento(c.clienteDocumento);
      setMontoPagoConsolidado(c.saldoPendiente);
    } else {
      setItemsSeleccionadosIds([]);
      setMontoPagoConsolidado(0);
    }
  };

  // Ítems marcados actualmente del cliente
  const itemsClienteMarcados = useMemo(() => {
    if (!clienteActivo) return [];
    return clienteActivo.items.filter((i) => itemsSeleccionadosIds.includes(i.itemPublicId));
  }, [clienteActivo, itemsSeleccionadosIds]);

  // Totales de la selección actual
  const totalesSeleccion = useMemo(() => {
    const totalNeto = itemsClienteMarcados.reduce((acc, i) => acc + i.subtotal, 0);
    const totalAnticipos = itemsClienteMarcados.reduce((acc, i) => acc + i.anticipoDirectoImputado, 0);
    const saldoPendiente = itemsClienteMarcados.reduce((acc, i) => acc + i.saldoPendienteItem, 0);
    return { totalNeto, totalAnticipos, saldoPendiente };
  }, [itemsClienteMarcados]);

  // Al cambiar la selección de ítems, sincronizar el monto prellenado
  useEffect(() => {
    if (totalesSeleccion.saldoPendiente > 0) {
      setMontoPagoConsolidado(totalesSeleccion.saldoPendiente);
    } else {
      setMontoPagoConsolidado(0);
    }
  }, [totalesSeleccion.saldoPendiente]);

  const toggleSeleccionItem = (itemPublicId: string) => {
    setItemsSeleccionadosIds((prev) =>
      prev.includes(itemPublicId) ? prev.filter((id) => id !== itemPublicId) : [...prev, itemPublicId]
    );
  };

  const seleccionarTodosLosItems = () => {
    if (!clienteActivo) return;
    if (itemsSeleccionadosIds.length === clienteActivo.items.length) {
      setItemsSeleccionadosIds([]);
    } else {
      setItemsSeleccionadosIds(clienteActivo.items.map((i) => i.itemPublicId));
    }
  };

  // Crear y Despachar Entrega Consolidada por Cliente
  const handleCrearEntregaConsolidada = async () => {
    if (!clienteActivo) {
      setErrorMsg('Seleccione un cliente para realizar la entrega.');
      return;
    }
    if (itemsClienteMarcados.length === 0) {
      setErrorMsg('Debe seleccionar al menos un ítem para entregar.');
      return;
    }
    if (!receptorNombre.trim() || !receptorDocumento.trim()) {
      setErrorMsg('Debe registrar el nombre y documento de la persona que recibe la entrega.');
      return;
    }

    const saldoPendiente = totalesSeleccion.saldoPendiente;
    const montoAPagar = incluirPagoConsolidado ? montoPagoConsolidado : 0;

    // Validación financiera: si hay saldo pendiente y no se cubre
    if (saldoPendiente > 0 && montoAPagar < saldoPendiente) {
      setErrorMsg(
        `Existe un saldo pendiente de $${saldoPendiente.toLocaleString('es-CO')}. Ingrese el pago correspondiente para saldar el total y habilitar el despacho.`
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const rem = await entregasApi.generarEntregaConsolidada(
        {
          clienteUuid: clienteActivo.clienteId,
          items: itemsClienteMarcados.map((i) => ({
            itemPublicId: i.itemPublicId,
            cantidad: i.cantidad,
          })),
          pagoLiquidacion:
            montoAPagar > 0
              ? {
                  instrumentoPublicId: metodoPagoConsolidado || mediosPago[0]?.uuid || '',
                  monto: montoAPagar,
                  referencia: referenciaPagoConsolidado.trim() || undefined,
                }
              : undefined,
          recibidoPorNombre: receptorNombre.trim(),
          recibidoPorDocumento: receptorDocumento.trim(),
          notas: observacionEntrega.trim() || undefined,
        },
        token
      );

      // Despachar inmediatamente si quedó liquidada
      if (rem.saldoPendiente === 0 && rem.estado !== 'DESPACHADO' && rem.estado !== 'ASENTADO') {
        try {
          const desp = await entregasApi.despacharRemision(
            rem.publicId,
            {
              usuarioDespachaCodigo: usuarioActual.codigo,
              recibidoPorNombre: receptorNombre.trim(),
              recibidoPorDocumento: receptorDocumento.trim(),
            },
            token
          );
          setRemisionActiva(desp);
        } catch {
          setRemisionActiva(rem);
        }
      } else {
        setRemisionActiva(rem);
      }

      setSuccessMsg(
        `¡Entrega ${rem.numeroDocumento} registrada y saldada con éxito para ${clienteActivo.clienteNombre}!`
      );
      await cargarItemsListos();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al registrar la entrega consolidada');
    } finally {
      setLoading(false);
    }
  };

  // Generar Remisión Borrador individual (T040, usado en tests y flujo simple)
  const handleGenerarRemision = async (solicitudPublicId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const rem = await entregasApi.generarRemision(
        {
          solicitudPublicId,
          usuarioGeneraCodigo: usuarioActual.codigo,
        },
        token
      );
      setRemisionActiva(rem);
      setRecibidoPorNombre(rem.cliente.nombreRazonSocial || '');
      setRecibidoPorDocumento(rem.cliente.numeroDocumento || '');
      setSuccessMsg(`Remisión ${rem.numeroDocumento} creada en borrador.`);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error generando remisión');
    } finally {
      setLoading(false);
    }
  };

  // Modal pago remisión activa individual
  const handleAbrirPago = () => {
    if (!remisionActiva) return;
    setMontoPago(remisionActiva.saldoPendiente);
    setReferenciaPago('');
    if (!instrumentoSeleccionado && mediosPago.length > 0) {
      setInstrumentoSeleccionado(mediosPago[0].uuid);
    }
    setIsPagoModalOpen(true);
  };

  const handleConfirmarPago = async () => {
    if (!remisionActiva || montoPago <= 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const req: RegistrarPagoEntregaRequest = {
      monto: montoPago,
      cajeroCodigo: usuarioActual.codigo,
      desgloses: [
        {
          instrumentoPublicId: instrumentoSeleccionado || mediosPago[0]?.uuid,
          monto: montoPago,
          referenciaTransaccion: referenciaPago,
        },
      ],
    };

    try {
      const remActualizada = await entregasApi.registrarPago(remisionActiva.publicId, req, token);
      setRemisionActiva(remActualizada);
      setIsPagoModalOpen(false);
      setSuccessMsg(`Pago de $${montoPago.toLocaleString('es-CO')} registrado con éxito.`);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error registrando el pago');
    }
  };

  // Despachar remisión individual activa
  const handleDespacharRemision = async () => {
    if (!remisionActiva) return;
    if (!recibidoPorNombre.trim() || !recibidoPorDocumento.trim()) {
      setErrorMsg('Debe ingresar el nombre y documento de quien recibe la entrega (RF-5.5).');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const req: DespacharRemisionRequest = {
      usuarioDespachaCodigo: usuarioActual.codigo,
      recibidoPorNombre: recibidoPorNombre.trim(),
      recibidoPorDocumento: recibidoPorDocumento.trim(),
    };

    try {
      const remDespachada = await entregasApi.despacharRemision(remisionActiva.publicId, req, token);
      setRemisionActiva(remDespachada);
      setSuccessMsg(`¡Remisión ${remDespachada.numeroDocumento} despachada y entregada con éxito a ${recibidoPorNombre}!`);
      cargarItemsListos();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al despachar la remisión');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Glassmorphism estilo Apple / SaaS */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Operación · Despachos y Recaudo
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Módulo de Entregas y Despacho
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Filtre por cliente para consolidar múltiples solicitudes en una sola entrega, liquide saldos pendientes y despache formalmente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={cargarItemsListos} disabled={loading}>
            {loading ? 'Sincronizando...' : '🔄 Actualizar'}
          </Button>

          {/* Toggle de Vistas */}
          <div className="bg-slate-950/90 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setVistaActiva('cliente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                vistaActiva === 'cliente'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Por Cliente (Consolidada)
            </button>
            <button
              onClick={() => setVistaActiva('solicitudes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                vistaActiva === 'solicitudes'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Por Solicitud
            </button>
          </div>
        </div>
      </div>

      {/* Alertas dinámicas */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold p-1">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold p-1">✕</button>
        </div>
      )}

      {/* DETALLE DE REMISIÓN ACTIVA / RESULTADO */}
      {remisionActiva && (
        <Card className="p-6 border border-indigo-500/40 bg-slate-900/90 backdrop-blur-2xl rounded-3xl space-y-6 shadow-2xl ring-1 ring-indigo-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white tracking-wide font-mono">
                  Remisión: {remisionActiva.numeroDocumento}
                </h2>
                <Badge variant={remisionActiva.estado === 'ASENTADO' || remisionActiva.estado === 'DESPACHADO' ? 'success' : 'warning'}>
                  {remisionActiva.estado}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cliente: <span className="font-bold text-white">{remisionActiva.cliente.nombreRazonSocial}</span> ({remisionActiva.cliente.numeroDocumento})
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setRemisionActiva(null)}>
              ✕ Cerrar Vista
            </Button>
          </div>

          {/* Bento Grid Financiero de la Remisión */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Facturado</span>
              <div className="text-lg font-bold text-white font-mono">${remisionActiva.totalNeto.toLocaleString('es-CO')}</div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Anticipos Previos</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">-${remisionActiva.totalAnticiposPrevios.toLocaleString('es-CO')}</div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cobrado en Entrega</span>
              <div className="text-lg font-bold text-indigo-400 font-mono">-${remisionActiva.totalPagosEntrega.toLocaleString('es-CO')}</div>
            </div>
            <div className="border-l pl-4 border-white/10">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Saldo Pendiente</span>
              <div className={`text-xl font-black font-mono ${remisionActiva.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${remisionActiva.saldoPendiente.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Formulario de Despacho y Cobro */}
          {remisionActiva.estado === 'BORRADOR' && (
            <div className="space-y-4 pt-2">
              {remisionActiva.saldoPendiente > 0 ? (
                <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-amber-300">
                    <span className="font-bold">⚠️ Invariante #3:</span> Existe un saldo pendiente de <strong className="font-mono">${remisionActiva.saldoPendiente.toLocaleString('es-CO')}</strong>. El sistema bloquea el despacho hasta que el saldo esté 100% saldado.
                  </div>
                  <Button variant="primary" onClick={handleAbrirPago}>
                    💳 Registrar Cobro (${remisionActiva.saldoPendiente.toLocaleString('es-CO')})
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-2xl text-sm font-semibold flex items-center gap-2">
                  <span>✅</span> Saldo 100% liquidado. La remisión está lista para asentar y despachar al cliente.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-white/5">
                <div>
                  <Input
                    label="Entregado a (Nombre Completo) *"
                    value={recibidoPorNombre}
                    onChange={(e) => setRecibidoPorNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    required
                    fullWidth
                  />
                </div>
                <div>
                  <Input
                    label="Cédula / Documento Identidad *"
                    value={recibidoPorDocumento}
                    onChange={(e) => setRecibidoPorDocumento(e.target.value)}
                    placeholder="Ej: 1098765432"
                    required
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={
                    remisionActiva.saldoPendiente > 0 ||
                    !recibidoPorNombre.trim() ||
                    !recibidoPorDocumento.trim()
                  }
                  onClick={handleDespacharRemision}
                >
                  🚀 Asentar y Despachar al Cliente
                </Button>
              </div>
            </div>
          )}

          {(remisionActiva.estado === 'ASENTADO' || remisionActiva.estado === 'DESPACHADO') && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-sm text-slate-200 space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>📦</span> Remisión Finalizada y Despachada
              </div>
              <div>Recibido por: <strong className="text-white">{remisionActiva.recibidoPorNombre}</strong> (Doc: {remisionActiva.recibidoPorDocumento})</div>
              <div className="text-xs text-slate-400">Fecha de entrega: {new Date(remisionActiva.fechaEmision).toLocaleString('es-CO')}</div>
            </div>
          )}
        </Card>
      )}

      {/* VISTA 1: ENTREGA CONSOLIDADA POR CLIENTE */}
      {vistaActiva === 'cliente' && (
        <div className="space-y-6">
          {/* Bento Grid: Selección Estricta de Cliente */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Filtro / Lista de Clientes con Trabajos Listos */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>👥</span> Clientes con Ítems Listos
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {clientesAgrupados.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Seleccione primero el cliente. Una entrega consolida todos los ítems listos del mismo cliente.
                </p>

                {/* Buscador reactivo */}
                <div className="pt-1">
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Filtrar por nombre o cédula..."
                  />
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {clientesAgrupados.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-2xl">
                      No hay clientes con ítems listos pendientes.
                    </div>
                  ) : (
                    clientesAgrupados.map((c) => {
                      const isSelected = c.clienteId === clienteSeleccionadoId;
                      return (
                        <div
                          key={c.clienteId}
                          onClick={() => handleSeleccionarCliente(c.clienteId)}
                          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/30'
                              : 'bg-slate-950/60 border-white/5 hover:border-white/20 hover:bg-slate-950/90'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white text-sm">👤 {c.clienteNombre}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">Doc: {c.clienteDocumento}</div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                              {c.items.length} {c.items.length === 1 ? 'ítem' : 'ítems'}
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">
                              {c.solicitudesNumeros.size} {c.solicitudesNumeros.size === 1 ? 'solicitud' : 'solicitudes'}
                            </span>
                            <span className={`font-bold ${c.saldoPendiente > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              Saldo: COP ${c.saldoPendiente.toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Detalle de Ítems, Liquidación y Despacho */}
            <div className="lg:col-span-8 space-y-6">
              {clienteActivo ? (
                <div className="space-y-6">
                  {/* Tarjeta del Cliente y Bento Grid de Totales */}
                  <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-white">Cliente: {clienteActivo.clienteNombre}</h2>
                          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-white/5">
                            Doc: {clienteActivo.clienteDocumento}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Solicitudes involucradas:{' '}
                          <span className="font-mono text-indigo-400 font-bold">
                            {Array.from(clienteActivo.solicitudesNumeros).join(', ')}
                          </span>
                        </p>
                      </div>

                      <Button size="sm" variant="secondary" onClick={seleccionarTodosLosItems}>
                        {itemsSeleccionadosIds.length === clienteActivo.items.length
                          ? 'Deseleccionar Todos'
                          : 'Seleccionar Todos'}
                      </Button>
                    </div>

                    {/* Bento Grid: Métricas de la selección */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ítems a Entregar</span>
                        <div className="text-xl font-bold font-mono text-white">
                          {itemsClienteMarcados.length} <span className="text-xs text-slate-500 font-normal">de {clienteActivo.items.length}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Ítems</span>
                        <div className="text-xl font-bold font-mono text-white">
                          COP ${totalesSeleccion.totalNeto.toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Anticipos Imputados</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          -COP ${totalesSeleccion.totalAnticipos.toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Pendiente</span>
                        <div className={`text-xl font-black font-mono ${totalesSeleccion.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          COP ${totalesSeleccion.saldoPendiente.toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Selección de Ítems */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Ítems Disponibles de Taller para este Cliente
                      </h4>
                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
                        <table className="min-w-full divide-y divide-white/5 text-sm">
                          <thead className="bg-white/[0.02]">
                            <tr>
                              <th className="px-4 py-3 text-left w-10">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                  checked={itemsClienteMarcados.length === clienteActivo.items.length && clienteActivo.items.length > 0}
                                  onChange={seleccionarTodosLosItems}
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Ítem / Servicio</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Solicitud / OT</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Cant</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Subtotal</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Anticipo</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Saldo Ítem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {clienteActivo.items.map((it) => {
                              const marcado = itemsSeleccionadosIds.includes(it.itemPublicId);
                              return (
                                <tr
                                  key={it.itemPublicId}
                                  onClick={() => toggleSeleccionItem(it.itemPublicId)}
                                  className={`cursor-pointer transition-colors ${
                                    marcado ? 'bg-indigo-600/10' : 'hover:bg-white/[0.02]'
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={marcado}
                                      onChange={() => toggleSeleccionItem(it.itemPublicId)}
                                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-white">{it.descripcion}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">Cód: {it.itemCodigo}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30">
                                      {it.documentoSolicitudNumero}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-slate-300">{it.cantidad}</td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                                    ${it.subtotal.toLocaleString('es-CO')}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                    ${it.anticipoDirectoImputado.toLocaleString('es-CO')}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                                    ${it.saldoPendienteItem.toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN INTEGRADA DE PAGO Y LIQUIDACIÓN EN LA ENTREGA */}
                  {totalesSeleccion.saldoPendiente > 0 && (
                    <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 shadow-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💳</span>
                          <div>
                            <h3 className="text-base font-bold text-white">
                              Liquidación de Saldo Pendiente en la Entrega
                            </h3>
                            <p className="text-xs text-slate-400">
                              Registre el pago para saldar los ${totalesSeleccion.saldoPendiente.toLocaleString('es-CO')} y autorizar el despacho inmediato.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={incluirPagoConsolidado}
                            onChange={(e) => setIncluirPagoConsolidado(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Registrar recaudo ahora</span>
                        </label>
                      </div>

                      {incluirPagoConsolidado ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                              Medio de Pago *
                            </label>
                            <select
                              value={metodoPagoConsolidado}
                              onChange={(e) => setMetodoPagoConsolidado(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {mediosPago.length === 0 ? (
                                <option value="">Efectivo Mostrador</option>
                              ) : (
                                mediosPago.map((m) => (
                                  <option key={m.uuid} value={m.uuid}>
                                    {m.nombre} ({m.codigo})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-300 uppercase">
                                Monto a Pagar *
                              </label>
                              <button
                                type="button"
                                onClick={() => setMontoPagoConsolidado(totalesSeleccion.saldoPendiente)}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                              >
                                Pagar Total
                              </button>
                            </div>
                            <Input
                              type="number"
                              value={montoPagoConsolidado}
                              onChange={(e) => setMontoPagoConsolidado(Number(e.target.value))}
                              min={1}
                              fullWidth
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                              Referencia / N° Transacción
                            </label>
                            <Input
                              value={referenciaPagoConsolidado}
                              onChange={(e) => setReferenciaPagoConsolidado(e.target.value)}
                              placeholder="Ej: Aprobación #83921"
                              fullWidth
                            />
                          </div>

                          {/* Feedback de saldo restante */}
                          <div className="md:col-span-3 pt-1">
                            {montoPagoConsolidado >= totalesSeleccion.saldoPendiente ? (
                              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                <span>✓</span>
                                <span>
                                  El saldo pendiente quedará 100% liquidado ($0). Los pedidos quedarán saldados en el sistema.
                                </span>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                                <span>⚠️</span>
                                <span>
                                  Abono parcial: quedará un saldo restante de{' '}
                                  <strong className="font-mono">
                                    ${(totalesSeleccion.saldoPendiente - montoPagoConsolidado).toLocaleString('es-CO')}
                                  </strong>{' '}
                                  (se requiere cupo de crédito para completar el despacho).
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs">
                          ⚠️ Se intentará despachar sin pago. Solo procederá si el cliente cuenta con cupo de crédito activo suficiente.
                        </div>
                      )}
                    </div>
                  )}

                  {/* DATOS DE DESPACHO Y RECEPCIÓN */}
                  <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>📦</span> Datos de Despacho y Entrega
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Nombre de quien recibe *"
                          value={receptorNombre}
                          onChange={(e) => setReceptorNombre(e.target.value)}
                          placeholder="Nombre completo"
                          required
                          fullWidth
                        />
                      </div>
                      <div>
                        <Input
                          label="Documento de quien recibe *"
                          value={receptorDocumento}
                          onChange={(e) => setReceptorDocumento(e.target.value)}
                          placeholder="Cédula o NIT"
                          required
                          fullWidth
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Observaciones de entrega"
                          value={observacionEntrega}
                          onChange={(e) => setObservacionEntrega(e.target.value)}
                          placeholder="Notas adicionales sobre la entrega, embalaje, etc."
                          fullWidth
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                      <Button
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={
                          itemsClienteMarcados.length === 0 ||
                          !receptorNombre.trim() ||
                          !receptorDocumento.trim()
                        }
                        onClick={handleCrearEntregaConsolidada}
                      >
                        🚀 Generar y Despachar Entrega ({itemsClienteMarcados.length} ítems)
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-dashed border-white/10">
                  Seleccione un cliente a la izquierda para ver sus ítems listos y preparar la entrega.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LISTADO DE ÓRDENES LISTAS PARA ENTREGA */}
      <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-xl">
          <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Órdenes Listas para Entrega (1 Solicitud por Remisión)</h2>
              <p className="text-xs text-slate-400">
                Trabajos de taller terminados pendientes de entrega y liquidación en mostrador.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
              {solicitudesAgrupadas.length} pendientes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Solicitud</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Ítems Listos</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Anticipos</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Saldo a Cobrar</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {solicitudesAgrupadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      {loading ? 'Cargando órdenes listas...' : 'No hay órdenes listas para entrega pendientes.'}
                    </td>
                  </tr>
                ) : (
                  solicitudesAgrupadas.map((sol) => (
                    <tr key={sol.solicitudPublicId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-white">{sol.solicitudNumero}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{sol.clienteNombre}</div>
                        <div className="text-xs text-slate-400 font-mono">{sol.clienteDocumento}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {sol.items.map((it) => (
                            <div key={it.itemPublicId} className="text-xs text-slate-300 flex items-center gap-2">
                              <span>• {it.descripcion} (Cant: {it.cantidad})</span>
                              <Badge variant="success">{it.etapaActualNombre}</Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white font-semibold">${sol.totalNeto.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">${sol.totalAnticipos.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">${sol.saldoPendiente.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleGenerarRemision(sol.solicitudPublicId)}
                          disabled={loading}
                        >
                          📄 Generar Remisión
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      {/* MODAL NUEVA ENTREGA / SELECCIONAR SOLICITUD (Compatibilidad) */}
      <Modal
        isOpen={mostrarModalNuevaEntrega}
        onClose={() => setMostrarModalNuevaEntrega(false)}
        title="Registrar Nueva Entrega / Despacho"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Seleccione la solicitud u orden de servicio finalizada en taller para liquidar saldos y generar remisión formal de despacho.
          </p>

          {solicitudesAgrupadas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-white/10 rounded-xl">
              No hay órdenes listas para entrega pendientes en cola de taller.
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-slate-950/60">
              {solicitudesAgrupadas.map((sol) => (
                <div key={sol.solicitudPublicId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{sol.solicitudNumero}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-medium">
                        {sol.items.length} {sol.items.length === 1 ? 'ítem listo' : 'ítems listos'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 mt-1">{sol.clienteNombre}</div>
                    <div className="text-xs text-slate-400 font-mono">Doc: {sol.clienteDocumento}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Saldo a Cobrar</div>
                      <div className={`text-base font-black font-mono ${sol.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${sol.saldoPendiente.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setMostrarModalNuevaEntrega(false);
                        handleGenerarRemision(sol.solicitudPublicId);
                      }}
                    >
                      📦 Iniciar Entrega
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-white/10">
            <Button variant="secondary" onClick={() => setMostrarModalNuevaEntrega(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL COBRAR SALDO PENDIENTE */}
      <Modal
        isOpen={isPagoModalOpen && !!remisionActiva}
        onClose={() => setIsPagoModalOpen(false)}
        title="Cobro de Saldo de Entrega"
        size="md"
      >
        {remisionActiva && (
          <div className="p-4 space-y-4">
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400">Remisión: </span>
              <span className="font-bold font-mono text-white">{remisionActiva.numeroDocumento}</span>
              <div className="text-xs text-slate-300 mt-0.5">Cliente: {remisionActiva.cliente.nombreRazonSocial}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto a Cobrar (COP) *</label>
                <Input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(Number(e.target.value))}
                  max={remisionActiva.saldoPendiente}
                  min={1}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Medio de Pago *</label>
                <select
                  value={instrumentoSeleccionado}
                  onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {mediosPago.length === 0 ? (
                    <option value="">Efectivo Mostrador (Predeterminado)</option>
                  ) : (
                    mediosPago.map((inst) => (
                      <option key={inst.uuid} value={inst.uuid}>
                        {inst.nombre} ({inst.codigo})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <Input
                  label="Referencia Transacción (Opcional)"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Aprobación datáfono #987654"
                  fullWidth
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsPagoModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmarPago} disabled={montoPago <= 0}>
                Confirmar Recaudo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModuloEntregas;
