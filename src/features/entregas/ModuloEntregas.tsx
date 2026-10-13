import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Modal,
  Alert,
  EmptyState,
} from '@farutech/design-system';
import { FileText, Printer, CheckCircle } from 'lucide-react';
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

const DEFAULT_EFECTIVO: MedioPagoInstrumento = {
  uuid: 'inst-efectivo',
  codigo: 'EFECTIVO',
  nombre: 'Efectivo',
  categoria: 'EFECTIVO',
  esHoja: true,
  requiereReferencia: false,
  isDefault: true,
  esPorDefecto: true,
  activo: true,
};

export const formatMoneyCOP = (val: number | null | undefined): string => {
  return `$${Math.round(val || 0).toLocaleString('es-CO')}`;
};

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
  const [solicitudSeleccionadaId, setSolicitudSeleccionadaId] = useState<string>('');

  // Paginación para vista Por Cliente
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [itemsPorPaginaClientes, setItemsPorPaginaClientes] = useState(8);

  // Medios de pago cargados (con fallback inicial por defecto a Efectivo)
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>(
    instrumentosProps.length > 0 ? instrumentosProps : [DEFAULT_EFECTIVO]
  );

  // Cliente seleccionado (tanto en vista consolidada como por selección de solicitud)
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>('');

  // Ítems seleccionados para el despacho actual
  const [itemsSeleccionadosIds, setItemsSeleccionadosIds] = useState<string[]>([]);

  // Pago en Entrega
  const [incluirPagoConsolidado, setIncluirPagoConsolidado] = useState<boolean>(true);
  const [montoPagoConsolidado, setMontoPagoConsolidado] = useState<number>(0);
  const [metodoPagoConsolidado, setMetodoPagoConsolidado] = useState<string>(
    instrumentosProps[0]?.uuid || DEFAULT_EFECTIVO.uuid
  );
  const [referenciaPagoConsolidado, setReferenciaPagoConsolidado] = useState<string>('');

  // Datos de despacho (Receptor)
  const [receptorNombre, setReceptorNombre] = useState<string>('');
  const [receptorDocumento, setReceptorDocumento] = useState<string>('');
  const [observacionEntrega, setObservacionEntrega] = useState<string>('');

  // Modal post-despacho exitoso
  const [despachoExitoso, setDespachoExitoso] = useState<RemisionDetalle | null>(null);

  // Remisión Activa en edición / despacho (flujo individual de remisión previa)
  const [remisionActiva, setRemisionActiva] = useState<RemisionDetalle | null>(null);

  // Modal de Pago para remisión individual activa
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<string>(
    instrumentosProps[0]?.uuid || DEFAULT_EFECTIVO.uuid
  );
  const [referenciaPago, setReferenciaPago] = useState('');

  // Formulario de Despacho tradicional individual
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorDocumento, setRecibidoPorDocumento] = useState('');

  // Cargar medios de pago del catálogo (una sola vez por sesión P1)
  const fetchedMediosRef = useRef(false);
  useEffect(() => {
    let activo = true;
    if (instrumentosProps.length > 0) {
      setMediosPago(instrumentosProps);
      return;
    }
    if (fetchedMediosRef.current && mediosPago.length > 1) {
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
          }
        }
      } catch {
        // Fallback activo
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
      clientePublicId: string;
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
          clientePublicId: item.clientePublicId || item.clienteNumeroDocumento || 'sin-cliente',
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

  // Cliente activo para el despacho (bien sea por cliente directo o por solicitud)
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
    setErrorMsg(null);
    setSuccessMsg(null);
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

  const handleSeleccionarSolicitud = (solicitudPublicId: string) => {
    setSolicitudSeleccionadaId(solicitudPublicId);
    setErrorMsg(null);
    setSuccessMsg(null);
    const sol = solicitudesAgrupadas.find((s) => s.solicitudPublicId === solicitudPublicId);
    if (sol) {
      setClienteSeleccionadoId(sol.clientePublicId);
      setItemsSeleccionadosIds(sol.items.map((i) => i.itemPublicId));
      setReceptorNombre(sol.clienteNombre);
      setReceptorDocumento(sol.clienteDocumento);
      setMontoPagoConsolidado(sol.saldoPendiente);
    }
  };

  // Ítems marcados actualmente para el cliente activo
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

  // Preview de entrega consolidada (cálculo oficial de cotas y saldo a cobrar)
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
          if (Array.isArray(preview.requestAdvances)) {
            for (const req of preview.requestAdvances) {
              initialAlloc[req.documentId] = req.suggestedAdvanceToApply;
            }
          }
          setOrdenesAvanceAplicado(initialAlloc);
          setAnticipoClienteAplicado(preview.customerAdvance?.maxApplicableAdvance || 0);
          setMontoPagoConsolidado(preview.netBalanceToCollect);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setPreviewData(null);
          setOrdenesAvanceAplicado({});
          setAnticipoClienteAplicado(0);
          setMontoPagoConsolidado(totalesSeleccion.saldoPendiente);
          const msg = (err as { message?: string })?.message;
          if (msg) {
            setErrorMsg(msg);
          }
        }
      } finally {
        if (!cancelado) setLoadingPreview(false);
      }
    };

    consultarPreview();
    return () => { cancelado = true; };
  }, [clienteActivo, itemsClienteMarcados, token, totalesSeleccion.saldoPendiente]);

  const resumenFinanciero = useMemo(() => {
    if (previewData) {
      const anticiposOrdenes = Object.values(ordenesAvanceAplicado).reduce((acc, val) => acc + (val || 0), 0);
      const anticipoCliente = anticipoClienteAplicado || 0;
      return {
        totalEntregar: previewData.totalDeliveredAmount,
        anticiposOrdenes,
        anticipoCliente,
        totalAnticipos: anticiposOrdenes + anticipoCliente,
        saldoPendiente: previewData.netBalanceToCollect,
      };
    }
    return {
      totalEntregar: totalesSeleccion.totalNeto,
      anticiposOrdenes: totalesSeleccion.totalAnticipos,
      anticipoCliente: 0,
      totalAnticipos: totalesSeleccion.totalAnticipos,
      saldoPendiente: totalesSeleccion.saldoPendiente,
    };
  }, [previewData, ordenesAvanceAplicado, anticipoClienteAplicado, totalesSeleccion]);

  const handleCambiarAnticipoOrden = (documentId: string, nuevoMonto: number, min: number, max: number) => {
    const valorClamp = Math.max(min, Math.min(max, isNaN(nuevoMonto) ? min : nuevoMonto));
    setOrdenesAvanceAplicado((prev) => {
      const next = { ...prev, [documentId]: valorClamp };
      const suma = Object.values(next).reduce((a, b) => a + b, 0);
      const subtotal = previewData?.totalDeliveredAmount ?? totalesSeleccion.totalNeto;
      const saldoTrasOrdenes = Math.max(0, subtotal - suma);
      const clienteUsar = Math.min(anticipoClienteAplicado, saldoTrasOrdenes);
      setAnticipoClienteAplicado(clienteUsar);
      setMontoPagoConsolidado(Math.max(0, saldoTrasOrdenes - clienteUsar));
      return next;
    });
  };

  const toggleSeleccionItem = (itemPublicId: string) => {
    setErrorMsg(null);
    setItemsSeleccionadosIds((prev) =>
      prev.includes(itemPublicId) ? prev.filter((id) => id !== itemPublicId) : [...prev, itemPublicId]
    );
  };

  const seleccionarTodosLosItems = () => {
    setErrorMsg(null);
    if (!clienteActivo) return;
    if (itemsClienteMarcados.length === clienteActivo.items.length) {
      setItemsSeleccionadosIds([]);
    } else {
      setItemsSeleccionadosIds(clienteActivo.items.map((i) => i.itemPublicId));
    }
  };

  // Crear y Despachar Entrega Consolidada / Por Solicitud
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
    if (!metodoPagoConsolidado) {
      setErrorMsg('Debe seleccionar un instrumento de pago.');
      return;
    }

    const montoAPagar = incluirPagoConsolidado ? montoPagoConsolidado : 0;

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

      // Si la remisión quedó con saldo saldado pero en borrador, despachar
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
          setDespachoExitoso(desp);
        } catch {
          setDespachoExitoso(rem);
        }
      } else {
        setDespachoExitoso(rem);
      }

      setSuccessMsg(
        `¡Entrega ${rem.numeroDocumento} registrada con éxito para ${clienteActivo.clienteNombre}!`
      );
      await cargarItemsListos();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al registrar la entrega consolidada');
    } finally {
      setLoading(false);
    }
  };

  const handleDespacharOtra = () => {
    setDespachoExitoso(null);
    setItemsSeleccionadosIds([]);
    setReceptorNombre('');
    setReceptorDocumento('');
    setObservacionEntrega('');
    setReferenciaPagoConsolidado('');
    setErrorMsg(null);
    setSuccessMsg(null);
    cargarItemsListos();
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
      setSuccessMsg(`Pago de ${formatMoneyCOP(montoPago)} registrado con éxito.`);
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
      {/* Encabezado Glassmorphism Unificado */}
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
          <Button variant="secondary" onClick={cargarItemsListos} disabled={loading} className="min-h-[44px]">
            {loading ? 'Sincronizando...' : '🔄 Actualizar'}
          </Button>

          {/* Selector de Pestañas Sobrio */}
          <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setVistaActiva('solicitudes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
                vistaActiva === 'solicitudes'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>Por Solicitud</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('cliente')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
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
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* DETALLE DE REMISIÓN ACTIVA / RESULTADO INDIVIDUAL */}
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
            <Button variant="secondary" size="sm" onClick={() => setRemisionActiva(null)} className="min-h-[44px]">
              ✕ Cerrar Vista
            </Button>
          </div>

          {/* Resumen de Totales Compacto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/70 rounded-2xl border border-white/5">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Facturado</span>
              <div className="text-lg font-bold text-white font-mono">{formatMoneyCOP(remisionActiva.totalNeto)}</div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Anticipos Previos</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">-{formatMoneyCOP(remisionActiva.totalAnticiposPrevios)}</div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cobrado en Entrega</span>
              <div className="text-lg font-bold text-indigo-400 font-mono">-{formatMoneyCOP(remisionActiva.totalPagosEntrega)}</div>
            </div>
            <div className="border-l pl-4 border-white/10">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Saldo Pendiente</span>
              <div className={`text-xl font-black font-mono ${remisionActiva.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatMoneyCOP(remisionActiva.saldoPendiente)}
              </div>
            </div>
          </div>

          {/* Formulario de Despacho y Cobro */}
          {remisionActiva.estado === 'BORRADOR' && (
            <div className="space-y-4 pt-2">
              {remisionActiva.saldoPendiente > 0 ? (
                <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-amber-300">
                    <span className="font-bold">⚠️ Invariante #3:</span> Existe un saldo pendiente de <strong className="font-mono">{formatMoneyCOP(remisionActiva.saldoPendiente)}</strong>. El sistema bloquea el despacho hasta que el saldo esté 100% saldado.
                  </div>
                  <Button variant="primary" onClick={handleAbrirPago} className="min-h-[44px]">
                    💳 Registrar Cobro ({formatMoneyCOP(remisionActiva.saldoPendiente)})
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
                    label="Entregado a (Nombre Completo)"
                    value={recibidoPorNombre}
                    onChange={(e) => setRecibidoPorNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    required
                    fullWidth
                  />
                </div>
                <div>
                  <Input
                    label="Cédula / Documento Identidad"
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
                  className="min-h-[44px]"
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

      {/* ESTADO VACÍO CUANDO NO HAY ÓRDENES NI ÍTEMS */}
      {!loading && itemsListos.length === 0 ? (
        <Card className="p-12 bg-slate-900/80 border border-white/10 rounded-3xl shadow-xl">
          <EmptyState
            title="No hay órdenes listas para entrega"
            description="Todos los trabajos de taller finalizados ya fueron despachados o no se encontraron ítems pendientes de liquidación."
            action={{
              label: 'Actualizar lista',
              onClick: cargarItemsListos,
              variant: 'primary',
            }}
          />
        </Card>
      ) : (
        /* LAYOUT DE DOS COLUMNAS (Wireframe Fase 2) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA PRINCIPAL (~65% en lg:col-span-8): Selección, Ítems, Liquidación y Receptor */}
          <div className="lg:col-span-8 space-y-6">
            {/* SUB-VISTA 1: Por Solicitud */}
            {vistaActiva === 'solicitudes' && (
              <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-xl">
                <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>📋</span> Órdenes Listas para Entrega
                    </h2>
                    <p className="text-xs text-slate-400">
                      Seleccione una orden para cargarla directamente en la liquidación de mostrador.
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
                      {solicitudesAgrupadas.length} órdenes
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.02]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-300">Solicitud</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-300">Cliente</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-300">Ítems Listos</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-300">Total</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-300">Anticipos</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-300">Saldo</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-300">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {solicitudesPaginadas.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                            No hay órdenes que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        solicitudesPaginadas.map((sol) => {
                          const isSelected = solicitudSeleccionadaId === sol.solicitudPublicId;
                          return (
                            <tr
                              key={sol.solicitudPublicId}
                              onClick={() => handleSeleccionarSolicitud(sol.solicitudPublicId)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-600/20' : 'hover:bg-white/[0.03]'
                              }`}
                            >
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
                                      <span>• {it.descripcion} (x{it.cantidad})</span>
                                      <Badge variant="success">{it.etapaActualNombre}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-white font-semibold">
                                {formatMoneyCOP(sol.totalNeto)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                {formatMoneyCOP(sol.totalAnticipos)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                                {formatMoneyCOP(sol.saldoPendiente)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerarRemision(sol.solicitudPublicId)}
                                    disabled={loading}
                                    title="Generar remisión de entrega"
                                    className="p-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-600/50 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50 min-h-[32px]"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span className="sr-only sm:not-sr-only text-[11px] font-semibold">Remisión</span>
                                    <span className="sr-only">📄 Generar Remisión</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
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
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={paginaSolicitudes <= 1}
                      onClick={() => setPaginaSolicitudes((p) => Math.max(1, p - 1))}
                      className="min-h-[36px]"
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
                      className="min-h-[36px]"
                    >
                      Siguiente →
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* SUB-VISTA 2: Por Cliente (Consolidada) */}
            {vistaActiva === 'cliente' && (
              <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>👥</span> Clientes con Ítems Listos
                    </h3>
                    <p className="text-xs text-slate-400">
                      Seleccione el cliente para consolidar todas sus solicitudes en un solo despacho.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                    {clientesAgrupados.length} clientes
                  </span>
                </div>

                <div className="w-full">
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Filtrar por nombre o cédula..."
                    fullWidth
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {clientesPaginados.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-slate-500 italic border border-dashed border-white/10 rounded-2xl">
                      No hay clientes que coincidan con la búsqueda.
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
                                <span>{c.clienteNombre || 'Cliente Registrado'}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                Doc: {c.clienteDocumento || '0000000'}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                              {c.items.length} {c.items.length === 1 ? 'ítem' : 'ítems'}
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">
                              {c.solicitudesNumeros.size} {c.solicitudesNumeros.size === 1 ? 'orden' : 'órdenes'}
                            </span>
                            <span className={`font-bold ${c.saldoPendiente > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              Saldo: {formatMoneyCOP(c.saldoPendiente)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginación de Clientes */}
                {totalPaginasClientes > 1 && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Página {paginaClientes} de {totalPaginasClientes}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={paginaClientes <= 1}
                        onClick={() => setPaginaClientes((p) => Math.max(1, p - 1))}
                        className="min-h-[36px]"
                      >
                        ← Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={paginaClientes >= totalPaginasClientes}
                        onClick={() => setPaginaClientes((p) => Math.min(totalPaginasClientes, p + 1))}
                        className="min-h-[36px]"
                      >
                        Siguiente →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN UNIFICADA: Ítems Listos para Despacho del Cliente/Orden Activo */}
            {clienteActivo ? (
              <div className="space-y-6">
                <Card className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white">
                          Cliente: {clienteActivo.clienteNombre || 'Cliente Registrado'}
                        </h2>
                        <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-white/5">
                          Doc: {clienteActivo.clienteDocumento || '0000000'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Solicitudes involucradas:{' '}
                        <span className="font-mono text-indigo-400 font-bold">
                          {Array.from(clienteActivo.solicitudesNumeros).join(', ')}
                        </span>
                      </p>
                    </div>

                    <Button size="sm" variant="secondary" onClick={seleccionarTodosLosItems} className="min-h-[44px]">
                      {itemsSeleccionadosIds.length === clienteActivo.items.length
                        ? 'Deseleccionar Todos'
                        : 'Seleccionar Todos'}
                    </Button>
                  </div>

                  {/* Tabla de Selección de Ítems */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Ítems Disponibles para Entrega
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        {itemsClienteMarcados.length} de {clienteActivo.items.length} seleccionados
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
                      <table className="min-w-full divide-y divide-white/5 text-sm">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="px-4 py-3 text-left w-10">
                              <input
                                type="checkbox"
                                aria-label="Seleccionar todos los ítems"
                                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={itemsClienteMarcados.length === clienteActivo.items.length && clienteActivo.items.length > 0}
                                onChange={seleccionarTodosLosItems}
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Ítem / Servicio</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Solicitud</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Cant</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Subtotal</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Anticipo</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Saldo</th>
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
                                    aria-label={`Seleccionar ${it.descripcion}`}
                                    checked={marcado}
                                    onChange={() => toggleSeleccionItem(it.itemPublicId)}
                                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                                  {formatMoneyCOP(it.subtotal)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                  {formatMoneyCOP(it.anticipoDirectoImputado)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                                  {formatMoneyCOP(it.saldoPendienteItem)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>

                {/* DISTRIBUCIÓN MATEMÁTICA DE ANTICIPOS [m, M] */}
                {previewData && previewData.requestAdvances && previewData.requestAdvances.length > 0 && (
                  <Card className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚖️</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Distribución de Anticipos y Límites Matemáticos [m, M]
                          </h3>
                          <p className="text-xs text-slate-400">
                            Límites legales calculados para proteger ítems pendientes en taller.
                          </p>
                        </div>
                      </div>
                      {loadingPreview && (
                        <span className="text-xs text-indigo-400 animate-pulse font-mono">Calculando cotas...</span>
                      )}
                    </div>

                    <div className="space-y-3 pt-1">
                      {previewData.requestAdvances.map((req) => {
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
                                  Pendiente Entregar: <strong className="text-white font-mono">{formatMoneyCOP(req.deliveringItemsPending)}</strong>
                                </span>
                              </div>
                              <div className="text-xs font-mono font-bold text-emerald-400">
                                Rango [{formatMoneyCOP(min)} - {formatMoneyCOP(max)}]
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

                      {previewData.customerAdvance?.availableAdvance > 0 && (
                        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <span className="text-indigo-200">
                            🌟 Anticipo a favor global: <strong>{formatMoneyCOP(previewData.customerAdvance.availableAdvance)}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <span>Aplicar:</span>
                            <div className="w-32">
                              <Input
                                type="number"
                                min={0}
                                max={previewData.customerAdvance.maxApplicableAdvance}
                                value={anticipoClienteAplicado}
                                onChange={(e) =>
                                  setAnticipoClienteAplicado(
                                    Math.min(
                                      previewData.customerAdvance.maxApplicableAdvance,
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
                  </Card>
                )}

                {/* FORMULARIO DE LIQUIDACIÓN Y RECEPTOR */}
                <Card className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💵</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Liquidación de Pago y Receptor
                      </h3>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incluirPagoConsolidado}
                        onChange={(e) => setIncluirPagoConsolidado(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Registrar cobro en entrega</span>
                    </label>
                  </div>

                  <div className="space-y-4">
                    {/* Fila 1: Instrumento de Pago y Monto a Cobrar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-7">
                        <label htmlFor="instrumento-pago-select" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                          Instrumento de pago *
                        </label>
                        <select
                          id="instrumento-pago-select"
                          aria-label="Instrumento de pago"
                          value={metodoPagoConsolidado}
                          onChange={(e) => {
                            setMetodoPagoConsolidado(e.target.value);
                            setErrorMsg(null);
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] cursor-pointer"
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
                          <label htmlFor="monto-a-cobrar-input" className="block text-xs font-semibold text-slate-300 uppercase">
                            Monto a cobrar *
                          </label>
                          {resumenFinanciero.saldoPendiente > 0 && (
                            <button
                              type="button"
                              onClick={() => setMontoPagoConsolidado(resumenFinanciero.saldoPendiente)}
                              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                            >
                              Pagar Saldo Completo
                            </button>
                          )}
                        </div>
                        <Input
                          id="monto-a-cobrar-input"
                          type="number"
                          value={montoPagoConsolidado}
                          onChange={(e) => setMontoPagoConsolidado(Number(e.target.value))}
                          min={0}
                          fullWidth
                          className="min-h-[44px]"
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
                        className="min-h-[44px]"
                      />
                    </div>

                    {/* Fila 3: Receptor (Nombre y Documento sin asterisco duplicado) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Recibido por (Nombre)"
                        required
                        value={receptorNombre}
                        onChange={(e) => {
                          setReceptorNombre(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Nombre de quien retira"
                        fullWidth
                        className="min-h-[44px]"
                      />
                      <Input
                        label="Documento de identidad"
                        required
                        value={receptorDocumento}
                        onChange={(e) => {
                          setReceptorDocumento(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Cédula o NIT"
                        fullWidth
                        className="min-h-[44px]"
                      />
                    </div>

                    {/* Fila 4: Observaciones */}
                    <div>
                      <Textarea
                        label="Observaciones de entrega"
                        rows={2}
                        value={observacionEntrega}
                        onChange={(e) => setObservacionEntrega(e.target.value)}
                        placeholder="Notas adicionales sobre la entrega, estado del paquete, etc."
                        fullWidth
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-dashed border-white/10">
                Seleccione una orden o cliente arriba para preparar la entrega y liquidación.
              </div>
            )}
          </div>

          {/* COLUMNA LATERAL FIJA (~35% en lg:col-span-4): Resumen Financiero Sticky y Despacho */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
            <Card className="p-5 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🧾</span> Resumen de Liquidación
                </h3>
                <Badge variant={resumenFinanciero.saldoPendiente <= 0 || montoPagoConsolidado >= resumenFinanciero.saldoPendiente ? 'success' : 'warning'}>
                  {resumenFinanciero.saldoPendiente <= 0 || montoPagoConsolidado >= resumenFinanciero.saldoPendiente ? '100% Cubierto' : 'Con Saldo'}
                </Badge>
              </div>

              {/* Métricas reales del Preview */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Total Ítems:</span>
                  <span className="font-mono text-white text-sm font-bold">
                    {formatMoneyCOP(resumenFinanciero.totalEntregar)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Anticipos Aplicados:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    -{formatMoneyCOP(resumenFinanciero.totalAnticipos)}
                  </span>
                </div>

                {anticipoClienteAplicado > 0 && (
                  <div className="flex justify-between items-center text-indigo-300">
                    <span className="font-medium">Anticipo Libre Cliente:</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      -{formatMoneyCOP(anticipoClienteAplicado)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-rose-300 font-bold">
                  <span>Saldo a Cobrar:</span>
                  <span className="font-mono text-rose-400 text-base font-black">
                    {formatMoneyCOP(resumenFinanciero.saldoPendiente)}
                  </span>
                </div>

                {montoPagoConsolidado > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 pt-1">
                    <span className="font-medium">Abono / Pago mostrador:</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {formatMoneyCOP(montoPagoConsolidado)}
                    </span>
                  </div>
                )}
              </div>

              {/* Alerta de error del backend visible inmediatamente junto al botón Despachar */}
              {errorMsg && (
                <Alert variant="error" onClose={() => setErrorMsg(null)} className="text-xs">
                  {errorMsg}
                </Alert>
              )}

              {/* Botón Principal de Despacho (mínimo 44px de alto) */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={
                  loading ||
                  itemsClienteMarcados.length === 0 ||
                  !receptorNombre.trim() ||
                  !receptorDocumento.trim() ||
                  !metodoPagoConsolidado
                }
                onClick={handleCrearEntregaConsolidada}
                className="min-h-[44px] py-3 text-sm font-bold tracking-wide shadow-lg"
              >
                {loading
                  ? 'Despachando...'
                  : `🚀 Despachar (${itemsClienteMarcados.length} ${itemsClienteMarcados.length === 1 ? 'ítem' : 'ítems'})`}
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL POST-DESPACHO EXITOSO (Número de Remisión, Imprimir Comprobante, Despachar Otra) */}
      <Modal
        isOpen={!!despachoExitoso}
        onClose={handleDespacharOtra}
        title="¡Entrega Despachada Exitosamente!"
        size="lg"
      >
        {despachoExitoso && (
          <div className="space-y-6 p-2">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Remisión y Entrega Asentada
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {despachoExitoso.numeroDocumento}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Cliente: <strong className="text-white">{despachoExitoso.cliente.nombreRazonSocial}</strong> ({despachoExitoso.cliente.numeroDocumento})
                </div>
              </div>
              <Badge variant="success">DESPACHADO</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950 rounded-2xl border border-white/5 text-xs">
              <div>
                <span className="text-slate-400">Total Liquidado</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {formatMoneyCOP(despachoExitoso.totalNeto)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Anticipos Imputados</span>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  -{formatMoneyCOP(despachoExitoso.totalAnticiposPrevios)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Cobro en Entrega</span>
                <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                  {formatMoneyCOP(despachoExitoso.totalPagosEntrega)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Saldo Pendiente</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {formatMoneyCOP(despachoExitoso.saldoPendiente)}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
              <div>
                Recibido por: <strong className="text-white">{despachoExitoso.recibidoPorNombre || receptorNombre}</strong> (Doc: {despachoExitoso.recibidoPorDocumento || receptorDocumento})
              </div>
              <div className="text-slate-400 text-[11px]">
                Fecha de despacho: {new Date(despachoExitoso.fechaEmision || Date.now()).toLocaleString('es-CO')}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.print()}
                className="min-h-[44px] flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante</span>
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleDespacharOtra}
                className="min-h-[44px]"
              >
                Despachar Otra Entrega
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                  <label htmlFor="modal-instrumento-pago" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Instrumento de pago *
                  </label>
                  <select
                    id="modal-instrumento-pago"
                    value={instrumentoSeleccionado}
                    onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                  >
                    {mediosPago.map((inst) => (
                      <option key={inst.uuid} value={inst.uuid}>
                        {inst.nombre} ({inst.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label htmlFor="modal-monto-pago" className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Monto a Cobrar *
                  </label>
                  <Input
                    id="modal-monto-pago"
                    type="number"
                    value={montoPago}
                    onChange={(e) => setMontoPago(Number(e.target.value))}
                    max={remisionActiva.saldoPendiente}
                    min={1}
                    fullWidth
                    className="min-h-[44px]"
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
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsPagoModalOpen(false)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmarPago} disabled={montoPago <= 0} className="min-h-[44px]">
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
