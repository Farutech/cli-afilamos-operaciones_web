import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, Button, Badge, Input, Modal } from '@farutech/design-system';
import { FileText } from 'lucide-react';
import { entregasApi } from '../../services/entregasApi';
import { catalogosApi } from '../../services/catalogosApi';
import type {
  ItemListoEntrega,
  RemisionDetalle,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
  DeliveryPreviewResultDto,
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

const EMPTY_INSTRUMENTOS: MedioPagoInstrumento[] = [];

export const ModuloEntregas: React.FC<ModuloEntregasProps> = ({
  token,
  instrumentosPago: instrumentosProps = EMPTY_INSTRUMENTOS,
  usuarioActual = { id: 1, publicId: 'usr-01', codigo: 'CAJ-01', rol: 'Cajero' },
}) => {
  const [itemsListos, setItemsListos] = useState<ItemListoEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pestaña activa: 'solicitudes' (Por Solicitud) | 'cliente' (Entrega Consolidada por Cliente)
  const [vistaActiva, setVistaActiva] = useState<'solicitudes' | 'cliente'>('solicitudes');

  // Paginación para vista Por Solicitud
  const [paginaSolicitudes, setPaginaSolicitudes] = useState(1);
  const [itemsPorPaginaSolicitudes, setItemsPorPaginaSolicitudes] = useState(10);
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState('');

  // Paginación para vista Por Cliente
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [itemsPorPaginaClientes, setItemsPorPaginaClientes] = useState(8);

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

  // Modal de Pago para remisión activa individual
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState('');

  // Formulario de Despacho tradicional (T044)
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorDocumento, setRecibidoPorDocumento] = useState('');

  // Cargar medios de pago del catálogo si no vinieron en props
  const fetchedMediosRef = useRef(false);
  useEffect(() => {
    let activo = true;
    if (instrumentosProps.length > 0) {
      setMediosPago(instrumentosProps);
      return;
    }
    if (fetchedMediosRef.current && mediosPago.length > 0) {
      return;
    }
    const fetchMedios = async () => {
      try {
        const arbol = await catalogosApi.getMediosPagoArbol();
        if (activo) {
          fetchedMediosRef.current = true;
          const list = arbol.categorias.flatMap((c) => c.instrumentos).filter((m) => m.activo);
          if (list.length > 0) {
            setMediosPago(list);
            const defaultMethod = list.find((m) => m.isDefault || m.esPorDefecto) ?? list[0];
            setMetodoPagoConsolidado(defaultMethod.uuid);
            setInstrumentoSeleccionado(defaultMethod.uuid);
          } else {
            setMediosPago([]);
            setMetodoPagoConsolidado('');
            setInstrumentoSeleccionado('');
          }
        }
      } catch {
        if (activo) {
          setMediosPago([]);
          setMetodoPagoConsolidado('');
          setInstrumentoSeleccionado('');
          setErrorMsg('No fue posible cargar las formas de pago configuradas en el sistema.');
        }
      }
    };
    fetchMedios();
    return () => { activo = false; };
  }, [instrumentosProps, mediosPago.length]);

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
    return () => { activo = false; };
  }, [token]);

  // Agrupación por Cliente (Entrega Consolidada)
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

    let arr = Array.from(map.values());
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.clienteNombre.toLowerCase().includes(q) ||
          c.clienteDocumento.toLowerCase().includes(q) ||
          Array.from(c.solicitudesNumeros).some((num) => num.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [itemsListos, busqueda]);

  // Agrupar ítems por Solicitud
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

    let arr = Array.from(map.entries()).map(([solicitudPublicId, data]) => ({
      solicitudPublicId,
      ...data,
    }));

    if (busquedaSolicitudes.trim()) {
      const q = busquedaSolicitudes.trim().toLowerCase();
      arr = arr.filter(
        (sol) =>
          sol.solicitudNumero.toLowerCase().includes(q) ||
          sol.clienteNombre.toLowerCase().includes(q) ||
          sol.clienteDocumento.toLowerCase().includes(q)
      );
    }

    return arr;
  }, [itemsListos, busquedaSolicitudes]);

  // Paginación de solicitudes
  const totalPaginasSolicitudes = Math.max(1, Math.ceil(solicitudesAgrupadas.length / itemsPorPaginaSolicitudes));
  const solicitudesPaginadas = useMemo(() => {
    const inicio = (paginaSolicitudes - 1) * itemsPorPaginaSolicitudes;
    return solicitudesAgrupadas.slice(inicio, inicio + itemsPorPaginaSolicitudes);
  }, [solicitudesAgrupadas, paginaSolicitudes, itemsPorPaginaSolicitudes]);

  // Paginación de clientes
  const totalPaginasClientes = Math.max(1, Math.ceil(clientesAgrupados.length / itemsPorPaginaClientes));
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaClientes - 1) * itemsPorPaginaClientes;
    return clientesAgrupados.slice(inicio, inicio + itemsPorPaginaClientes);
  }, [clientesAgrupados, paginaClientes, itemsPorPaginaClientes]);

  // Cliente activo para la entrega consolidada
  const clienteActivo = useMemo(() => {
    return clientesAgrupados.find((c) => c.clienteId === clienteSeleccionadoId) || null;
  }, [clientesAgrupados, clienteSeleccionadoId]);

  // Auto-seleccionar primer cliente si ninguno está seleccionado
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

  const itemsClienteMarcados = useMemo(() => {
    if (!clienteActivo) return [];
    return clienteActivo.items.filter((i) => itemsSeleccionadosIds.includes(i.itemPublicId));
  }, [clienteActivo, itemsSeleccionadosIds]);

  const totalesSeleccion = useMemo(() => {
    const totalNeto = itemsClienteMarcados.reduce((acc, i) => acc + i.subtotal, 0);
    const totalAnticipos = itemsClienteMarcados.reduce((acc, i) => acc + i.anticipoDirectoImputado, 0);
    const saldoPendiente = itemsClienteMarcados.reduce((acc, i) => acc + i.saldoPendienteItem, 0);
    return { totalNeto, totalAnticipos, saldoPendiente };
  }, [itemsClienteMarcados]);

  // Límites matemáticos [m, M] (Doc 13 / RA-01 a RA-12, CF-10 a CF-13)
  const [previewData, setPreviewData] = useState<DeliveryPreviewResultDto | null>(null);
  const [ordenesAvanceAplicado, setOrdenesAvanceAplicado] = useState<Record<string, number>>({});
  const [anticipoClienteAplicado, setAnticipoClienteAplicado] = useState<number>(0);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  useEffect(() => {
    let cancelado = false;
    if (!clienteActivo || itemsClienteMarcados.length === 0) {
      setPreviewData(null);
      setOrdenesAvanceAplicado({});
      setAnticipoClienteAplicado(0);
      return;
    }

    const consultarPreview = async () => {
      setLoadingPreview(true);
      try {
        const preview = await entregasApi.previewEntregaConsolidada(
          {
            customerId: clienteActivo.clienteId,
            itemsToDeliver: itemsClienteMarcados.map((i) => ({
              documentItemId: i.itemPublicId,
              quantityToDeliver: i.cantidad,
            })),
          },
          token
        );
        if (!cancelado && preview) {
          setPreviewData(preview);
          const initialAlloc: Record<string, number> = {};
          if (Array.isArray(preview.requests)) {
            for (const req of preview.requests) {
              initialAlloc[req.documentId] = req.suggestedAdvanceToApply;
            }
          }
          setOrdenesAvanceAplicado(initialAlloc);

          const sumaOrdenes = Object.values(initialAlloc).reduce((a, b) => a + b, 0);
          const saldoTrasOrdenes = Math.max(0, preview.totalDeliverySubtotal - sumaOrdenes);
          const saldoClienteUsar = Math.min(preview.availableCustomerAdvance || 0, saldoTrasOrdenes);
          setAnticipoClienteAplicado(saldoClienteUsar);
          const aPagar = Math.max(0, saldoTrasOrdenes - saldoClienteUsar);
          setMontoPagoConsolidado(aPagar);
        }
      } catch {
        if (!cancelado) {
          setPreviewData(null);
          setOrdenesAvanceAplicado({});
          setAnticipoClienteAplicado(0);
          setMontoPagoConsolidado(totalesSeleccion.saldoPendiente);
        }
      } finally {
        if (!cancelado) setLoadingPreview(false);
      }
    };

    consultarPreview();
    return () => { cancelado = true; };
  }, [clienteActivo, itemsClienteMarcados, token, totalesSeleccion.saldoPendiente]);

  const resumenFinanciero = useMemo(() => {
    const totalEntregar = previewData ? previewData.totalDeliverySubtotal : totalesSeleccion.totalNeto;
    const anticiposOrdenes = Object.values(ordenesAvanceAplicado).reduce((acc, val) => acc + (val || 0), 0);
    const anticipoCliente = anticipoClienteAplicado || 0;
    const totalAnticipos = previewData ? (anticiposOrdenes + anticipoCliente) : totalesSeleccion.totalAnticipos;
    const saldoPendiente = Math.max(0, totalEntregar - (previewData ? (anticiposOrdenes + anticipoCliente) : totalesSeleccion.totalAnticipos));
    return {
      totalEntregar,
      anticiposOrdenes,
      anticipoCliente,
      totalAnticipos,
      saldoPendiente,
    };
  }, [previewData, ordenesAvanceAplicado, anticipoClienteAplicado, totalesSeleccion]);

  const handleCambiarAnticipoOrden = (documentId: string, nuevoMonto: number, min: number, max: number) => {
    const valorClamp = Math.max(min, Math.min(max, isNaN(nuevoMonto) ? min : nuevoMonto));
    setOrdenesAvanceAplicado((prev) => {
      const next = { ...prev, [documentId]: valorClamp };
      const suma = Object.values(next).reduce((a, b) => a + b, 0);
      const subtotal = previewData?.totalDeliverySubtotal ?? totalesSeleccion.totalNeto;
      const saldoTrasOrdenes = Math.max(0, subtotal - suma);
      const clienteUsar = Math.min(anticipoClienteAplicado, saldoTrasOrdenes);
      setAnticipoClienteAplicado(clienteUsar);
      setMontoPagoConsolidado(Math.max(0, saldoTrasOrdenes - clienteUsar));
      return next;
    });
  };

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

  // Crear y Despachar Entrega Consolidada
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

    const saldoPendiente = resumenFinanciero.saldoPendiente;
    const montoAPagar = incluirPagoConsolidado ? montoPagoConsolidado : 0;

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
      const requestAdvanceApplications = Object.entries(ordenesAvanceAplicado).map(([docId, adv]) => ({
        documentId: docId,
        advanceToApply: adv,
      }));

      const rem = await entregasApi.generarEntregaConsolidada(
        {
          clienteUuid: clienteActivo.clienteId,
          items: itemsClienteMarcados.map((i) => ({
            itemPublicId: i.itemPublicId,
            cantidad: i.cantidad,
          })),
          requestAdvanceApplications,
          customerAdvanceToApply: anticipoClienteAplicado,
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

  // Generar Remisión individual
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

  // Modal pago remisión individual activa
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
              Operación · Despachos y Liquidación
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Módulo de Entregas y Despacho
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Consulte órdenes listas de taller paginadas, liquide saldos con formato sobrio libre de scroll y despache formalmente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={cargarItemsListos} disabled={loading}>
            {loading ? 'Sincronizando...' : '🔄 Actualizar'}
          </Button>

          {/* Selector de Pestañas Sobrio */}
          <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setVistaActiva('solicitudes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                vistaActiva === 'solicitudes'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>Por Solicitud</span>
            </button>
            <button
              onClick={() => setVistaActiva('cliente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                vistaActiva === 'cliente'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span>Por Cliente (Consolidada)</span>
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

      {/* DETALLE DE REMISIÓN ACTIVA / RESULTADO (FORMATO SOBRIO ESTILO SOLICITUD) */}
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

          {/* Resumen de Totales Compacto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/70 rounded-2xl border border-white/5">
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

      {/* VISTA 1: POR SOLICITUD (PAGINADA Y SOBRIA) */}
      {vistaActiva === 'solicitudes' && (
        <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-xl">
          <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📋</span> Órdenes Listas para Entrega (Por Solicitud)
              </h2>
              <p className="text-xs text-slate-400">
                Trabajos de taller finalizados pendientes de entrega y liquidación individual en mostrador.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-64">
                <Input
                  value={busquedaSolicitudes}
                  onChange={(e) => setBusquedaSolicitudes(e.target.value)}
                  placeholder="Buscar SOL-..., cliente..."
                />
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                {solicitudesAgrupadas.length} órdenes listas
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                {solicitudesPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                      {loading ? 'Cargando órdenes listas...' : 'No hay órdenes listas para entrega pendientes.'}
                    </td>
                  </tr>
                ) : (
                  solicitudesPaginadas.map((sol) => (
                    <tr key={sol.solicitudPublicId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-white">
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30">
                          {sol.solicitudNumero}
                        </span>
                      </td>
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
                      <td className="px-4 py-3 text-right font-mono text-white font-semibold">
                        ${sol.totalNeto.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${sol.totalAnticipos.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                        ${sol.saldoPendiente.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGenerarRemision(sol.solicitudPublicId)}
                            disabled={loading}
                            title="Generar remisión de entrega y despacho"
                            className="p-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-600/50 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="sr-only sm:not-sr-only text-[11px] font-semibold">Remisión</span>
                            <span className="sr-only">📄 Generar Remisión</span>
                          </button>
                        </div>
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
                  {solicitudesAgrupadas.length > 0 ? (paginaSolicitudes - 1) * itemsPorPaginaSolicitudes + 1 : 0}
                </strong>{' '}
                a{' '}
                <strong className="text-white">
                  {Math.min(paginaSolicitudes * itemsPorPaginaSolicitudes, solicitudesAgrupadas.length)}
                </strong>{' '}
                de <strong className="text-white">{solicitudesAgrupadas.length}</strong> órdenes
              </span>

              <div className="flex items-center gap-1.5 border-l pl-3 border-white/10">
                <span>Por página:</span>
                <select
                  value={itemsPorPaginaSolicitudes}
                  onChange={(e) => setItemsPorPaginaSolicitudes(Number(e.target.value))}
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
                disabled={paginaSolicitudes <= 1}
                onClick={() => setPaginaSolicitudes((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </Button>
              <span className="font-mono px-2 py-1 bg-slate-900 rounded border border-white/5 text-white font-bold">
                {paginaSolicitudes} / {totalPaginasSolicitudes}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={paginaSolicitudes >= totalPaginasSolicitudes}
                onClick={() => setPaginaSolicitudes((p) => Math.min(totalPaginasSolicitudes, p + 1))}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* VISTA 2: ENTREGA CONSOLIDADA POR CLIENTE */}
      {vistaActiva === 'cliente' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Filtro / Lista de Clientes Paginada */}
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
                  Seleccione el cliente para consolidar todas sus solicitudes en un solo despacho.
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
                  {clientesPaginados.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-2xl">
                      No hay clientes con ítems listos pendientes.
                    </div>
                  ) : (
                    clientesPaginados.map((c) => {
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
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span className="text-indigo-400">👤</span>
                                <span>{c.clienteNombre && c.clienteNombre !== 'Cliente' ? c.clienteNombre : 'Cliente Registrado'}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                Doc: {c.clienteDocumento && c.clienteDocumento !== '0000000' && c.clienteDocumento !== '—' ? c.clienteDocumento : 'Consumidor Final'}
                              </div>
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

                {/* Paginación de Clientes */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>Ver:</span>
                    <select
                      value={itemsPorPaginaClientes}
                      onChange={(e) => setItemsPorPaginaClientes(Number(e.target.value))}
                      className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-white text-[10px]"
                    >
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={15}>15</option>
                    </select>
                  </div>

                  {totalPaginasClientes > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={paginaClientes <= 1}
                        onClick={() => setPaginaClientes((p) => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                      >
                        ←
                      </button>
                      <span>
                        {paginaClientes} / {totalPaginasClientes}
                      </span>
                      <button
                        disabled={paginaClientes >= totalPaginasClientes}
                        onClick={() => setPaginaClientes((p) => Math.min(totalPaginasClientes, p + 1))}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                      >
                        →
                      </button>
                    </div>
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
                          <h2 className="text-lg font-black text-white">
                            Cliente: {clienteActivo.clienteNombre && clienteActivo.clienteNombre !== 'Cliente' ? clienteActivo.clienteNombre : 'Cliente Registrado'}
                          </h2>
                          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-white/5">
                            Doc: {clienteActivo.clienteDocumento && clienteActivo.clienteDocumento !== '0000000' && clienteActivo.clienteDocumento !== '—' ? clienteActivo.clienteDocumento : 'Consumidor Final'}
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
                          COP ${resumenFinanciero.totalEntregar.toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Anticipos Imputados</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          -COP ${resumenFinanciero.totalAnticipos.toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Pendiente</span>
                        <div className={`text-xl font-black font-mono ${resumenFinanciero.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          COP ${resumenFinanciero.saldoPendiente.toLocaleString('es-CO')}
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

                  {/* LÍMITES MATEMÁTICOS DE ANTICIPO [m, M] (Doc 13) */}
                  {previewData && previewData.requests && previewData.requests.length > 0 && (
                    <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⚖️</span>
                          <div>
                            <h3 className="text-sm font-bold text-white">
                              Distribución de Anticipos y Límites Matemáticos [m, M]
                            </h3>
                            <p className="text-xs text-slate-400">
                              Límites legales calculados para proteger ítems pendientes en taller (Doc 13).
                            </p>
                          </div>
                        </div>
                        {loadingPreview && (
                          <span className="text-xs text-indigo-400 animate-pulse font-mono">Calculando cotas...</span>
                        )}
                      </div>

                      <div className="space-y-3 pt-1">
                        {previewData.requests.map((req) => {
                          const aplicado = ordenesAvanceAplicado[req.documentId] ?? req.suggestedAdvanceToApply;
                          const min = req.minAdvanceToApply;
                          const max = req.maxAdvanceToApply;

                          return (
                            <div
                              key={req.documentId}
                              className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/40">
                                    {req.documentNumber}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    Subtotal Entregar: <strong className="text-white font-mono">${req.deliverySubtotal.toLocaleString('es-CO')}</strong>
                                  </span>
                                </div>
                                <div className="text-xs font-mono font-bold text-emerald-400">
                                  Rango [m={min.toLocaleString('es-CO')}, M={max.toLocaleString('es-CO')}]
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={min}
                                  max={max}
                                  step={100}
                                  value={aplicado}
                                  disabled={min === max}
                                  onChange={(e) =>
                                    handleCambiarAnticipoOrden(req.documentId, Number(e.target.value), min, max)
                                  }
                                  className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                                <div className="w-36">
                                  <Input
                                    type="number"
                                    min={min}
                                    max={max}
                                    value={aplicado}
                                    onChange={(e) =>
                                      handleCambiarAnticipoOrden(req.documentId, Number(e.target.value), min, max)
                                    }
                                    fullWidth
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {previewData.availableCustomerAdvance > 0 && (
                          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <span className="text-indigo-200">
                              🌟 Saldo a favor global: <strong>${previewData.availableCustomerAdvance.toLocaleString('es-CO')}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <span>Aplicar:</span>
                              <div className="w-28">
                                <Input
                                  type="number"
                                  min={0}
                                  max={previewData.availableCustomerAdvance}
                                  value={anticipoClienteAplicado}
                                  onChange={(e) =>
                                    setAnticipoClienteAplicado(
                                      Math.min(
                                        previewData.availableCustomerAdvance,
                                        Math.max(0, Number(e.target.value))
                                      )
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FORMATO SOBRIO DE PAGO Y DESPACHO (ESTILO SOLICITUD DE 2 COLUMNAS) */}
                  <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
                    <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💵</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Liquidación de Pago y Datos de Despacho
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={incluirPagoConsolidado}
                            onChange={(e) => setIncluirPagoConsolidado(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Registrar cobro en entrega</span>
                        </label>
                        <Badge variant={resumenFinanciero.saldoPendiente > 0 ? 'warning' : 'success'}>
                          {resumenFinanciero.saldoPendiente > 0 ? 'Con Saldo en Mostrador' : '100% Cubierto'}
                        </Badge>
                      </div>
                    </div>

                    {/* Estructura Sobria 2 Columnas Estilo SolicitudCapturaMixta */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Columna Izquierda (~65%): Formulario Compacto de Cobro y Receptor */}
                      <div className="lg:col-span-7 space-y-4">
                        {/* Fila 1: Instrumento (~60%) y Monto (~40%) en la MISMA línea */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-7">
                            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                              Medio de Pago *
                            </label>
                            <select
                              value={metodoPagoConsolidado}
                              onChange={(e) => setMetodoPagoConsolidado(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                Monto a Cobrar *
                              </label>
                              {resumenFinanciero.saldoPendiente > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setMontoPagoConsolidado(resumenFinanciero.saldoPendiente)}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                                >
                                  Pagar Total
                                </button>
                              )}
                            </div>
                            <Input
                              type="number"
                              value={montoPagoConsolidado}
                              onChange={(e) => setMontoPagoConsolidado(Number(e.target.value))}
                              min={0}
                              fullWidth
                            />
                          </div>
                        </div>

                        {/* Fila 2: Referencia / Comprobante */}
                        <div>
                          <Input
                            label="Referencia / N° Transacción / Comprobante"
                            value={referenciaPagoConsolidado}
                            onChange={(e) => setReferenciaPagoConsolidado(e.target.value)}
                            placeholder="Ej: Aprobación datáfono #123456"
                            fullWidth
                          />
                        </div>

                        {/* Fila 3: Receptor (Nombre y Documento juntos) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Recibido por (Nombre) *"
                            value={receptorNombre}
                            onChange={(e) => setReceptorNombre(e.target.value)}
                            placeholder="Nombre de quien retira"
                            required
                            fullWidth
                          />
                          <Input
                            label="Documento Identidad *"
                            value={receptorDocumento}
                            onChange={(e) => setReceptorDocumento(e.target.value)}
                            placeholder="Cédula o NIT"
                            required
                            fullWidth
                          />
                        </div>

                        {/* Fila 4: Observaciones */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                            Observaciones de Entrega
                          </label>
                          <textarea
                            rows={2}
                            value={observacionEntrega}
                            onChange={(e) => setObservacionEntrega(e.target.value)}
                            placeholder="Notas adicionales sobre la entrega, embalaje..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Columna Derecha (~35%): Panel Sobrio de Totales y Acción */}
                      <div className="lg:col-span-5 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-medium">Total Ítems:</span>
                          <span className="font-mono text-white text-sm font-bold">
                            ${resumenFinanciero.totalEntregar.toLocaleString('es-CO')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-medium">Anticipos Imputados:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            -${resumenFinanciero.totalAnticipos.toLocaleString('es-CO')}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-rose-300 font-bold">
                          <span>Saldo en Mostrador:</span>
                          <span className="font-mono text-rose-400 text-base font-black">
                            ${resumenFinanciero.saldoPendiente.toLocaleString('es-CO')}
                          </span>
                        </div>

                        {/* Indicador de Despacho */}
                        {montoPagoConsolidado >= resumenFinanciero.saldoPendiente ? (
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                            <span>✓</span> Saldo 100% cubierto. Despacho directo habilitado.
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                            <span>⚠️</span> Saldo restante de ${(resumenFinanciero.saldoPendiente - montoPagoConsolidado).toLocaleString('es-CO')}.
                          </div>
                        )}

                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          loading={loading}
                          disabled={
                            itemsClienteMarcados.length === 0 ||
                            !receptorNombre.trim() ||
                            !receptorDocumento.trim()
                          }
                          onClick={handleCrearEntregaConsolidada}
                          className="mt-2"
                        >
                          🚀 Despachar ({itemsClienteMarcados.length} ítems)
                        </Button>
                      </div>
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

      {/* MODAL COBRAR SALDO PENDIENTE (REMISIÓN INDIVIDUAL) */}
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Medio de Pago *</label>
                  <select
                    value={instrumentoSeleccionado}
                    onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {mediosPago.map((inst) => (
                      <option key={inst.uuid} value={inst.uuid}>
                        {inst.nombre} ({inst.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto a Cobrar *</label>
                  <Input
                    type="number"
                    value={montoPago}
                    onChange={(e) => setMontoPago(Number(e.target.value))}
                    max={remisionActiva.saldoPendiente}
                    min={1}
                    fullWidth
                  />
                </div>
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
