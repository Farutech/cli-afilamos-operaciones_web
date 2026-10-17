import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  Alert,
  EmptyState,
} from '@farutech/design-system';
import {
  DocumentPrintPreviewModal,
  type DocumentPrintData,
  ListPageLayout,
  PanelFormaPago,
  type MetodoPagoItem,
} from '../../components/ui';
import { CheckCircle, Printer } from 'lucide-react';
import { entregasApi } from '../../services/entregasApi';
import { catalogosApi } from '../../services/catalogosApi';
import type {
  ItemListoEntrega,
  RemisionDetalle,
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
  validaEnCierre: true,
  permiteEnCierre: true,
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
  const [busqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // Paginación para vista Por Solicitud
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState('');

  // Medios de pago cargados (con fallback inicial por defecto a Efectivo)
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>(
    instrumentosProps.length > 0 ? instrumentosProps : [DEFAULT_EFECTIVO]
  );

  // Cliente seleccionado (tanto en vista consolidada como por selección de solicitud)
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>('');

  // Ítems seleccionados para el despacho actual
  const [itemsSeleccionadosIds, setItemsSeleccionadosIds] = useState<string[]>([]);

  // Etapa del flujo: 'seleccion' (lista global con checks) | 'proceso' (revisión solo lectura + liquidación)
  const [etapaEntrega, setEtapaEntrega] = useState<'seleccion' | 'proceso'>('seleccion');

  // Pago en Entrega
  const [incluirPagoConsolidado] = useState<boolean>(true);
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

  // Cliente activo para el despacho (bien sea por cliente directo o por solicitud)
  const clienteActivo = useMemo(() => {
    return clientesAgrupados.find((c) => c.clienteId === clienteSeleccionadoId) || null;
  }, [clientesAgrupados, clienteSeleccionadoId]);

  // Lista global filtrada (orden, cliente o documento)
  const itemsFiltrados = useMemo(() => {
    const q = busquedaSolicitudes.trim().toLowerCase();
    if (!q) return itemsListos;
    return itemsListos.filter(
      (i) =>
        i.documentoSolicitudNumero?.toLowerCase().includes(q) ||
        i.clienteNombre?.toLowerCase().includes(q) ||
        i.clienteNumeroDocumento?.toLowerCase().includes(q) ||
        i.descripcion?.toLowerCase().includes(q)
    );
  }, [itemsListos, busquedaSolicitudes]);

  const clienteKey = (i: ItemListoEntrega) => i.clientePublicId || i.clienteNumeroDocumento || 'sin-cliente';

  // Selección global: el primer ítem marcado fija el cliente; solo se permiten ítems de ese cliente.
  const toggleItemGlobal = (item: ItemListoEntrega) => {
    const cId = clienteKey(item);
    setErrorMsg(null);
    if (itemsSeleccionadosIds.length > 0 && clienteSeleccionadoId && clienteSeleccionadoId !== cId) {
      setErrorMsg('Solo se pueden agrupar en una entrega ítems del mismo cliente.');
      return;
    }
    const next = itemsSeleccionadosIds.includes(item.itemPublicId)
      ? itemsSeleccionadosIds.filter((id) => id !== item.itemPublicId)
      : [...itemsSeleccionadosIds, item.itemPublicId];
    setItemsSeleccionadosIds(next);
    if (next.length === 0) {
      setClienteSeleccionadoId('');
    } else if (clienteSeleccionadoId !== cId) {
      setClienteSeleccionadoId(cId);
      setReceptorNombre(item.clienteNombre);
      setReceptorDocumento(item.clienteNumeroDocumento);
    }
  };

  const limpiarSeleccion = () => {
    setItemsSeleccionadosIds([]);
    setClienteSeleccionadoId('');
    setEtapaEntrega('seleccion');
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
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);

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

  const [pagosEntrega, setPagosEntrega] = useState<MetodoPagoItem[]>([]);

  const totalInventario = useMemo(() => {
    return itemsClienteMarcados
      .filter((i) => !i.documentoOtNumero && !i.etapaActualCodigo)
      .reduce((acc, i) => acc + i.subtotal, 0);
  }, [itemsClienteMarcados]);

  const totalServicios = useMemo(() => {
    return itemsClienteMarcados
      .filter((i) => !!(i.documentoOtNumero || i.etapaActualCodigo))
      .reduce((acc, i) => acc + i.subtotal, 0);
  }, [itemsClienteMarcados]);

  const montoPagadoEnMostrador = useMemo(() => {
    if (pagosEntrega.length > 0) {
      return pagosEntrega.reduce((sum, p) => sum + p.monto, 0);
    }
    return incluirPagoConsolidado ? montoPagoConsolidado : 0;
  }, [pagosEntrega, incluirPagoConsolidado, montoPagoConsolidado]);

  const totalAbonadoYAnticipos = useMemo(() => {
    return resumenFinanciero.totalAnticipos + montoPagadoEnMostrador;
  }, [resumenFinanciero.totalAnticipos, montoPagadoEnMostrador]);

  const saldoPendienteNeto = useMemo(() => {
    return Math.max(0, resumenFinanciero.totalEntregar - totalAbonadoYAnticipos);
  }, [resumenFinanciero.totalEntregar, totalAbonadoYAnticipos]);

  const comprobanteEntregaData = useMemo<DocumentPrintData | null>(() => {
    if (!despachoExitoso) return null;
    return {
      tipoDocumento: 'COMPROBANTE DE ENTREGA Y REMISIÓN',
      numeroDocumento: despachoExitoso.numeroDocumento,
      fechaEmision: new Date(despachoExitoso.fechaEmision || Date.now()).toLocaleDateString('es-CO'),
      cliente: {
        nombre: despachoExitoso.cliente.nombreRazonSocial,
        documento: despachoExitoso.cliente.numeroDocumento,
        telefono: despachoExitoso.cliente.telefono,
      },
      observaciones: despachoExitoso.notas,
      items: (despachoExitoso.items || []).map((it) => ({
        codigo: it.codigo,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.subtotal,
        franjaCompromiso: it.franjaCompromiso,
      })),
      totales: {
        subtotalNeto: despachoExitoso.totalNeto,
        totalDocumento: despachoExitoso.totalNeto,
        totalAbonado: (despachoExitoso.totalAnticiposPrevios || 0) + (despachoExitoso.totalPagosEntrega || 0),
        saldoPendiente: despachoExitoso.saldoPendiente,
      },
      pagos: (despachoExitoso.recaudos || []).flatMap((r) =>
        (r.desgloses || []).map((d) => ({
          medio: r.tipoRecaudo || 'Pago Entrega',
          monto: d.monto,
          referencia: d.referenciaTransaccion,
        }))
      ),
    };
  }, [despachoExitoso]);


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

    const montoAPagar = montoPagadoEnMostrador;
    const metodoUuid = pagosEntrega[0]?.instrumentoUuid || metodoPagoConsolidado || mediosPago[0]?.uuid || '';
    const refPago = pagosEntrega[0]?.referencia || referenciaPagoConsolidado.trim() || undefined;

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
                  instrumentoPublicId: metodoUuid,
                  monto: montoAPagar,
                  referencia: refPago,
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
    setClienteSeleccionadoId('');
    setEtapaEntrega('seleccion');
    setReceptorNombre('');
    setReceptorDocumento('');
    setObservacionEntrega('');
    setReferenciaPagoConsolidado('');
    setErrorMsg(null);
    setSuccessMsg(null);
    cargarItemsListos();
  };

  return (
    <div className="space-y-4 pb-8">
      <ListPageLayout
        title="Despachos y Entregas"
        eyebrow="OPERACIÓN · DESPACHOS"
        description="Consulte órdenes listas de taller, liquide saldos con formato unificado y despache formalmente."
        actions={
          <Button variant="secondary" size="sm" onClick={cargarItemsListos} disabled={loading} className="cursor-pointer">
            {loading ? 'Sincronizando...' : '🔄 Actualizar'}
          </Button>
        }
        onRefresh={cargarItemsListos}
        isRefreshing={loading}
      >
        {(errorMsg || successMsg) && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 p-3 rounded-lg border text-xs shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 ${
              errorMsg
                ? 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
            }`}
          >
            <span>{errorMsg || successMsg}</span>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
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
          <div className={`${etapaEntrega === 'proceso' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
            {/* ETAPA 1: Lista global de ítems listos con selección (bloqueada al cliente del primer ítem) */}
            {etapaEntrega === 'seleccion' && (
              <Card className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>📦</span> Ítems Listos para Entrega
                    </h2>
                    <p className="text-xs text-slate-400">
                      Marque los ítems a entregar. El primer ítem fija el cliente; solo se pueden combinar ítems del mismo cliente.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Buscar por orden, cliente o ítem..."
                      value={busquedaSolicitudes}
                      onChange={(e) => setBusquedaSolicitudes(e.target.value)}
                      className="w-64 text-xs"
                    />
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 whitespace-nowrap">
                      {itemsFiltrados.length} ítems
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
                  <table className="min-w-full divide-y divide-white/5 text-sm">
                    <thead className="bg-white/[0.02]">
                      <tr>
                        <th className="px-4 py-3 w-10" aria-label="Seleccionar" />
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Solicitud</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Ítem / Servicio</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Cant</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Abonado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {itemsFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-500 italic">
                            No hay ítems que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        itemsFiltrados.map((it) => {
                          const marcado = itemsSeleccionadosIds.includes(it.itemPublicId);
                          const bloqueado =
                            itemsSeleccionadosIds.length > 0 && !!clienteSeleccionadoId && clienteKey(it) !== clienteSeleccionadoId;
                          return (
                            <tr
                              key={it.itemPublicId}
                              onClick={() => !bloqueado && toggleItemGlobal(it)}
                              className={`transition-colors ${
                                bloqueado
                                  ? 'opacity-35 cursor-not-allowed'
                                  : marcado
                                    ? 'bg-indigo-600/10 cursor-pointer'
                                    : 'hover:bg-white/[0.02] cursor-pointer'
                              }`}
                              title={bloqueado ? 'Pertenece a otro cliente' : undefined}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  aria-label={`Seleccionar ${it.descripcion}`}
                                  checked={marcado}
                                  disabled={bloqueado}
                                  onChange={() => toggleItemGlobal(it)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/30">
                                  {it.documentoSolicitudNumero}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-white text-xs">{it.clienteNombre}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{it.clienteNumeroDocumento}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-white text-xs">{it.descripcion}</div>
                                <div className="text-[11px] text-slate-400 font-mono">Cód: {it.itemCodigo}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-300">{it.cantidad}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-white">{formatMoneyCOP(it.subtotal)}</td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatMoneyCOP(it.anticipoDirectoImputado)}</td>
                              <td className={`px-4 py-3 text-right font-mono font-bold ${it.saldoPendienteItem > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {it.saldoPendienteItem > 0 ? formatMoneyCOP(it.saldoPendienteItem) : 'Pagado'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Barra de acción global */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-400">
                    {itemsClienteMarcados.length > 0 ? (
                      <>
                        <strong className="text-white">{itemsClienteMarcados.length}</strong> ítem(s) de{' '}
                        <strong className="text-white">{clienteActivo?.clienteNombre}</strong> · Total{' '}
                        <span className="font-mono text-white">{formatMoneyCOP(totalesSeleccion.totalNeto)}</span> · Saldo{' '}
                        <span className="font-mono text-rose-400">{formatMoneyCOP(totalesSeleccion.saldoPendiente)}</span>
                      </>
                    ) : (
                      'Ningún ítem seleccionado.'
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {itemsClienteMarcados.length > 0 && (
                      <Button size="sm" variant="secondary" onClick={limpiarSeleccion} className="min-h-[40px]">
                        Limpiar
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      disabled={itemsClienteMarcados.length === 0}
                      onClick={() => setEtapaEntrega('proceso')}
                      className="min-h-[40px] font-bold"
                    >
                      ➡️ Procesar Entrega ({itemsClienteMarcados.length})
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* ETAPA 2: Revisión solo lectura + liquidación */}
            {etapaEntrega === 'proceso' && (clienteActivo ? (
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

                    <Button size="sm" variant="secondary" onClick={() => setEtapaEntrega('seleccion')} className="min-h-[44px]">
                      ← Volver a selección
                    </Button>
                  </div>

                  {/* Tabla de Selección de Ítems */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Ítems a Entregar (solo lectura)
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        {itemsClienteMarcados.length} ítem(s)
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

                {/* ANTICIPOS PREVIOS IMPUTADOS AUTOMÁTICAMENTE */}
                {previewData && previewData.requestAdvances && previewData.requestAdvances.length > 0 && (
                  <Card className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚖️</span>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Anticipos de Órdenes Imputados Automáticamente
                          </h3>
                          <p className="text-xs text-slate-400">
                            Cálculo automático de anticipos aplicables según las órdenes seleccionadas.
                          </p>
                        </div>
                      </div>
                      {loadingPreview && (
                        <span className="text-xs text-indigo-400 animate-pulse font-mono">Calculando cotas...</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {previewData.requestAdvances.map((req) => (
                        <div
                          key={req.documentId}
                          className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/40">
                              {req.documentNumber}
                            </span>
                            <div className="text-slate-400 text-[11px] mt-1">
                              Pendiente: {formatMoneyCOP(req.deliveringItemsPending)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase block">Anticipo Aplicado</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {formatMoneyCOP(ordenesAvanceAplicado[req.documentId] ?? req.suggestedAdvanceToApply)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {previewData.customerAdvance?.availableAdvance > 0 && (
                      <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-indigo-200">
                          🌟 Anticipo a favor global del cliente: <strong>{formatMoneyCOP(previewData.customerAdvance.availableAdvance)}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Aplicado:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatMoneyCOP(anticipoClienteAplicado)}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* MEDIOS DE PAGO Y ABONOS (COMPONENTE CANÓNICO REUTILIZABLE) */}
                <PanelFormaPago
                  title="MEDIOS DE PAGO Y ABONOS DE LA ENTREGA"
                  subtitulo="Registre los abonos o liquidación del despacho en mostrador"
                  modo="entrega"
                  totalDocumento={resumenFinanciero.totalEntregar}
                  totalInventario={totalInventario}
                  totalServicios={totalServicios}
                  abonosPrevios={resumenFinanciero.totalAnticipos}
                  pagos={pagosEntrega}
                  onChangePagos={setPagosEntrega}
                  montoInput={String(montoPagoConsolidado || '')}
                  onChangeMontoInput={(val) => {
                    if (val === '') {
                      setMontoPagoConsolidado(0);
                    } else {
                      const num = Number(val);
                      setMontoPagoConsolidado(isNaN(num) ? 0 : num);
                    }
                    setErrorMsg(null);
                  }}
                  referenciaInput={referenciaPagoConsolidado}
                  onChangeReferenciaInput={setReferenciaPagoConsolidado}
                  instrumentoSeleccionadoUuid={metodoPagoConsolidado}
                  onChangeInstrumentoSeleccionadoUuid={(uuid) => {
                    setMetodoPagoConsolidado(uuid);
                    setErrorMsg(null);
                  }}
                  observacionesPago={observacionEntrega}
                  onChangeObservacionesPago={setObservacionEntrega}
                  mediosPagoDisponibles={mediosPago.map((m) => ({
                    uuid: m.uuid,
                    codigo: m.codigo,
                    nombre: m.nombre,
                    categoria: m.categoria,
                    validaEnCierre: m.validaEnCierre,
                    permiteReferencia: m.requiereReferencia,
                    diasCredito: m.diasCredito,
                  }))}
                />

                {/* RECEPTOR DE LA ENTREGA */}
                <Card className="p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <span className="text-base">👤</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Receptor / Quien Recibe la Entrega
                    </h4>
                  </div>
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
                </Card>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-dashed border-white/10">
                Seleccione una orden o cliente arriba para preparar la entrega y liquidación.
              </div>
            ))}
          </div>

          {/* COLUMNA LATERAL FIJA (~35% en lg:col-span-4): Resumen Financiero Sticky y Despacho */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
            <Card className="p-5 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🧾</span> Resumen de Liquidación
                </h3>
                <Badge variant={saldoPendienteNeto <= 0 ? 'success' : 'warning'}>
                  {saldoPendienteNeto <= 0 ? '100% Cubierto' : 'Con Saldo'}
                </Badge>
              </div>

              {/* Métricas con el formato exacto del wireframe canónico */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Total Inventario:</span>
                  <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-white text-right w-32">
                    ${Math.round(totalInventario).toLocaleString('es-CO')}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Total Servicio:</span>
                  <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-white text-right w-32">
                    ${Math.round(totalServicios).toLocaleString('es-CO')}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-white font-bold">
                  <span>Total Neto:</span>
                  <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-emerald-400 font-bold text-sm text-right w-32">
                    ${Math.round(resumenFinanciero.totalEntregar).toLocaleString('es-CO')}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Total Abonado:</span>
                  <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-400 text-right w-32">
                    -${Math.round(resumenFinanciero.totalAnticipos).toLocaleString('es-CO')}
                  </div>
                </div>

                <div className="flex justify-between items-center text-rose-300 font-bold">
                  <span>Saldo Pendiente:</span>
                  <div className="px-3 py-1 bg-slate-900 border border-rose-900/50 rounded font-mono text-rose-400 font-bold text-sm text-right w-32">
                    ${Math.round(resumenFinanciero.saldoPendiente).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>

              {/* Alerta de error del backend visible inmediatamente junto al botón Despachar */}
              {errorMsg && (
                <Alert variant="error" onClose={() => setErrorMsg(null)} className="text-xs">
                  {errorMsg}
                </Alert>
              )}

              {/* Botones de acción alineados con el diseño canónico */}
              <div className="space-y-2 pt-2">
                {etapaEntrega === 'proceso' && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setEtapaEntrega('seleccion')}
                    className="min-h-[44px] py-2.5 text-xs font-semibold"
                  >
                    ← Volver a Selección de Ítems
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={
                    loading ||
                    itemsClienteMarcados.length === 0 ||
                    !receptorNombre.trim() ||
                    !receptorDocumento.trim() ||
                    (!metodoPagoConsolidado && pagosEntrega.length === 0)
                  }
                  onClick={handleCrearEntregaConsolidada}
                  className="min-h-[48px] py-3 text-sm font-bold tracking-wide shadow-lg bg-indigo-600 hover:bg-indigo-500"
                >
                  {loading
                    ? 'Despachando...'
                    : `⚡ Despachar Entrega (${itemsClienteMarcados.length} ${itemsClienteMarcados.length === 1 ? 'ítem' : 'ítems'})`}
                </Button>
              </div>
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
                onClick={() => {
                  setIsPrintPreviewOpen(true);
                  window.print();
                }}
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

      {/* MODAL UNIVERSAL DE IMPRESIÓN Y DESCARGA (TIRILLA 80MM / MEDIA CARTA) */}
      {comprobanteEntregaData && (
        <DocumentPrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => setIsPrintPreviewOpen(false)}
          documentData={comprobanteEntregaData}
          defaultFormat="pos-80mm"
        />
      )}
      </ListPageLayout>
    </div>
  );
};

export default ModuloEntregas;
