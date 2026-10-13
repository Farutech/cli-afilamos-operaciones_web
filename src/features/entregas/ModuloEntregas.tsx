import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, Button, Badge, Input, Modal } from '@farutech/design-system';
import { FileText, CheckCircle2, Search, ArrowLeft, CreditCard, User, Package, AlertCircle, RefreshCw } from 'lucide-react';
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

const DEFAULT_INSTRUMENTOS: MedioPagoInstrumento[] = [];

export const ModuloEntregas: React.FC<ModuloEntregasProps> = ({
  token,
  instrumentosPago: instrumentosProps = DEFAULT_INSTRUMENTOS,
  usuarioActual = { id: 1, publicId: 'usr-01', codigo: 'CAJ-01', rol: 'Cajero' },
}) => {
  const [itemsListos, setItemsListos] = useState<ItemListoEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAgrupacion, setFiltroAgrupacion] = useState<'todas' | 'solicitudes' | 'clientes'>('todas');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Entrega en atención activa (por cliente o solicitud seleccionada)
  const [entregaActivaClienteId, setEntregaActivaClienteId] = useState<string | null>(null);

  // Remisión Activa en edición / despacho (flujo individual o resultado)
  const [remisionActiva, setRemisionActiva] = useState<RemisionDetalle | null>(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Medios de pago cargados
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>(instrumentosProps);
  const hasLoadedMediosRef = useRef(false);

  // Ítems seleccionados para el despacho
  const [itemsSeleccionadosIds, setItemsSeleccionadosIds] = useState<string[]>([]);

  // Pago en Entrega
  const incluirPagoConsolidado = true;
  const [montoPagoConsolidado, setMontoPagoConsolidado] = useState<number>(0);
  const [metodoPagoConsolidado, setMetodoPagoConsolidado] = useState<string>('');
  const [referenciaPagoConsolidado, setReferenciaPagoConsolidado] = useState<string>('');

  // Datos de despacho de la entrega
  const [receptorNombre, setReceptorNombre] = useState<string>('');
  const [receptorDocumento, setReceptorDocumento] = useState<string>('');
  const [observacionEntrega, setObservacionEntrega] = useState<string>('');

  // Modal de Pago para remisión activa individual (compatibilidad T044)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<string>('');
  const [referenciaPago, setReferenciaPago] = useState('');

  // Formulario de Despacho tradicional (T044)
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorDocumento, setRecibidoPorDocumento] = useState('');

  // Cargar medios de pago del catálogo una sola vez si no vinieron en props (evita loop infinito)
  useEffect(() => {
    if (hasLoadedMediosRef.current) return;

    if (instrumentosProps.length > 0) {
      setMediosPago(instrumentosProps);
      const defaultMethod = instrumentosProps.find((m) => m.isDefault || m.esPorDefecto) ?? instrumentosProps[0];
      if (defaultMethod) {
        setMetodoPagoConsolidado(defaultMethod.uuid);
        setInstrumentoSeleccionado(defaultMethod.uuid);
      }
      hasLoadedMediosRef.current = true;
      return;
    }

    let activo = true;
    const fetchMedios = async () => {
      try {
        const arbol = await catalogosApi.getMediosPagoArbol(token);
        if (activo) {
          hasLoadedMediosRef.current = true;
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
          hasLoadedMediosRef.current = true;
          setMediosPago([]);
          setMetodoPagoConsolidado('');
          setInstrumentoSeleccionado('');
        }
      }
    };

    fetchMedios();
    return () => { activo = false; };
  }, [token, instrumentosProps]);

  const cargarItemsListos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await entregasApi.getItemsListos(undefined, undefined, token);
      setItemsListos(data);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando ítems listos para entrega');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarItemsListos();
  }, [cargarItemsListos]);

  // Agrupación de ítems por Solicitud
  const solicitudesAgrupadas = useMemo(() => {
    const map = new Map<string, {
      solicitudPublicId: string;
      solicitudNumero: string;
      clienteId: string;
      clienteNombre: string;
      clienteDocumento: string;
      clienteTelefono: string;
      items: ItemListoEntrega[];
      totalNeto: number;
      totalAnticipos: number;
      saldoPendiente: number;
    }>();

    for (const item of itemsListos) {
      const solId = item.documentoSolicitudPublicId || item.documentoSolicitudNumero;
      const cId = item.clientePublicId || item.clienteNumeroDocumento || 'sin-cliente';
      if (!map.has(solId)) {
        map.set(solId, {
          solicitudPublicId: solId,
          solicitudNumero: item.documentoSolicitudNumero,
          clienteId: cId,
          clienteNombre: item.clienteNombre,
          clienteDocumento: item.clienteNumeroDocumento,
          clienteTelefono: item.clienteTelefono,
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

    let arr = Array.from(map.values());
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter(
        (sol) =>
          sol.solicitudNumero.toLowerCase().includes(q) ||
          sol.clienteNombre.toLowerCase().includes(q) ||
          sol.clienteDocumento.toLowerCase().includes(q) ||
          sol.items.some((it) => it.descripcion.toLowerCase().includes(q) || it.itemCodigo.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [itemsListos, busqueda]);

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
          Array.from(c.solicitudesNumeros).some((num) => num.toLowerCase().includes(q)) ||
          c.items.some((it) => it.descripcion.toLowerCase().includes(q) || it.itemCodigo.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [itemsListos, busqueda]);

  // Cliente activo para la entrega en pantalla
  const clienteActivo = useMemo(() => {
    if (!entregaActivaClienteId) return null;
    return clientesAgrupados.find((c) => c.clienteId === entregaActivaClienteId) || null;
  }, [clientesAgrupados, entregaActivaClienteId]);

  // Seleccionar cliente u orden para atender la entrega
  const handleSeleccionarEntrega = (cId: string, itemsIniciales?: ItemListoEntrega[]) => {
    setEntregaActivaClienteId(cId);
    setRemisionActiva(null);
    const c = clientesAgrupados.find((cl) => cl.clienteId === cId);
    if (c) {
      const itemsToSelect = itemsIniciales ? itemsIniciales.map((i) => i.itemPublicId) : c.items.map((i) => i.itemPublicId);
      setItemsSeleccionadosIds(itemsToSelect);
      setReceptorNombre(c.clienteNombre);
      setReceptorDocumento(c.clienteDocumento);
      const saldoInicial = (itemsIniciales || c.items).reduce((acc, it) => acc + it.saldoPendienteItem, 0);
      setMontoPagoConsolidado(saldoInicial);
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

  useEffect(() => {
    let cancelado = false;
    if (!clienteActivo || itemsClienteMarcados.length === 0) {
      setPreviewData(null);
      setOrdenesAvanceAplicado({});
      setAnticipoClienteAplicado(0);
      return;
    }

    const consultarPreview = async () => {
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
    const saldoPendiente = Math.max(0, totalEntregar - totalAnticipos);
    return {
      totalEntregar,
      anticiposOrdenes,
      anticipoCliente,
      totalAnticipos,
      saldoPendiente,
    };
  }, [previewData, ordenesAvanceAplicado, anticipoClienteAplicado, totalesSeleccion]);

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

  // Crear y Despachar Entrega Consolidada / Individual
  const handleCrearEntregaConsolidada = async () => {
    if (!clienteActivo) {
      setErrorMsg('Seleccione una orden o cliente para realizar la entrega.');
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

      setRemisionActiva(rem);
      setEntregaActivaClienteId(null);
      setSuccessMsg(
        `¡Entrega ${rem.numeroDocumento} despachada con éxito para ${clienteActivo.clienteNombre}!`
      );
      await cargarItemsListos();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al registrar la entrega.');
    } finally {
      setLoading(false);
    }
  };

  // Generar Remisión individual (soporte T044 y test unitario)
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

  // Modal pago remisión individual activa (T044)
  const handleAbrirPago = () => {
    if (!remisionActiva) return;
    setMontoPago(remisionActiva.saldoPendiente);
    setReferenciaPago('');
    if (!instrumentoSeleccionado && mediosPago.length > 0) {
      const def = mediosPago.find((m) => m.isDefault || m.esPorDefecto) ?? mediosPago[0];
      setInstrumentoSeleccionado(def.uuid);
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

  // Despachar remisión individual activa (T044)
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

  // Paginación de solicitudes para vista general
  const totalPaginas = Math.max(1, Math.ceil(solicitudesAgrupadas.length / itemsPorPagina));
  const solicitudesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return solicitudesAgrupadas.slice(inicio, inicio + itemsPorPagina);
  }, [solicitudesAgrupadas, paginaActual, itemsPorPagina]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* BARRA SUPERIOR UNIFICADA DE BÚSQUEDA Y CONTROL */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl shadow-xl backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Buscador inteligente universal */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por número de solicitud (SOL-...), cliente o cédula..."
            className="w-full bg-slate-950/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros visuales rápidos y actualización */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/80 p-1 rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFiltroAgrupacion('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroAgrupacion === 'todas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({solicitudesAgrupadas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroAgrupacion('solicitudes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroAgrupacion === 'solicitudes'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Solicitud
            </button>
            <button
              type="button"
              onClick={() => setFiltroAgrupacion('clientes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroAgrupacion === 'clientes'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Cliente ({clientesAgrupados.length})
            </button>
          </div>

          <button
            type="button"
            onClick={cargarItemsListos}
            disabled={loading}
            title="Sincronizar órdenes listas"
            className="p-2 rounded-2xl border border-white/10 bg-slate-950/80 text-slate-300 hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ALERTAS */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold p-1">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold p-1">✕</button>
        </div>
      )}

      {/* COMPROBANTE DE ENTREGA O REMISIÓN ACTIVA (ESTILO VOUCHER / ASENTADO) */}
      {remisionActiva && (
        <Card className="p-6 border border-indigo-500/40 bg-slate-900/90 backdrop-blur-2xl rounded-3xl space-y-6 shadow-2xl ring-1 ring-indigo-500/20 animate-fade-in">
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

          {/* Resumen Financiero Compacto */}
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

          {/* Formulario de Cobro y Despacho Individual (T044) */}
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
                  <CheckCircle2 className="w-5 h-5" /> Saldo 100% liquidado. La remisión está lista para asentar y despachar al cliente.
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
                <Package className="w-4 h-4" /> Remisión Finalizada y Despachada
              </div>
              <div>Recibido por: <strong className="text-white">{remisionActiva.recibidoPorNombre}</strong> (Doc: {remisionActiva.recibidoPorDocumento})</div>
              <div className="text-xs text-slate-400">Fecha de entrega: {new Date(remisionActiva.fechaEmision).toLocaleString('es-CO')}</div>
            </div>
          )}
        </Card>
      )}

      {/* VISTA DETALLADA DE ATENCIÓN DE ENTREGA (ESTILO SOLICITUD - PÁGINA FLUIDA) */}
      {entregaActivaClienteId && clienteActivo && !remisionActiva && (
        <Card className="p-6 bg-slate-900/90 border border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-2xl space-y-6 animate-fade-in ring-1 ring-indigo-500/10">
          {/* Cabecera del Cliente y Volver */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEntregaActivaClienteId(null)}
                className="p-2 rounded-xl border border-white/10 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  {clienteActivo.clienteNombre}
                </h2>
                <p className="text-xs text-slate-400">
                  Doc: <span className="font-mono text-white">{clienteActivo.clienteDocumento}</span>
                  {clienteActivo.clienteTelefono && ` · Tel: ${clienteActivo.clienteTelefono}`}
                  {' · '}
                  Solicitudes: <span className="font-mono text-indigo-400">{Array.from(clienteActivo.solicitudesNumeros).join(', ')}</span>
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={seleccionarTodosLosItems}
            >
              {itemsSeleccionadosIds.length === clienteActivo.items.length
                ? 'Deseleccionar Todos'
                : 'Seleccionar Todos'}
            </Button>
          </div>

          {/* Tabla Interactiva de Ítems Listos para Entrega */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              Ítems Listos para Despacho ({itemsClienteMarcados.length} de {clienteActivo.items.length} seleccionados)
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60">
              <table className="min-w-full divide-y divide-white/10 text-xs">
                <thead className="bg-white/[0.02]">
                  <tr>
                    <th className="px-3 py-2.5 text-center font-semibold text-slate-300 w-10">Despachar</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-300">Ítem / Descripción</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-300">Orden / OT</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-slate-300">Cant.</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-300">Precio Unit.</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-300">Subtotal</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-300">Anticipo</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-300">Saldo Ítem</th>
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
                          marcado ? 'bg-indigo-950/30 hover:bg-indigo-950/40' : 'hover:bg-white/[0.02] opacity-60'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => toggleSeleccionItem(it.itemPublicId)}
                            className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-white">{it.descripcion}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{it.itemCodigo}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/30">
                            {it.documentoSolicitudNumero}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-white">
                          {it.cantidad}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                          ${it.precioUnitario.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                          ${it.subtotal.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
                          ${it.anticipoDirectoImputado.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-400">
                          ${it.saldoPendienteItem.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Financiero Dinámico (4 Métricas Clave) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/70 rounded-2xl border border-white/5">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total a Despachar</span>
              <div className="text-xl font-bold text-white font-mono">
                ${resumenFinanciero.totalEntregar.toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Anticipos Aplicados</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                -${resumenFinanciero.totalAnticipos.toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Anticipo Libre Cliente</span>
              <div className="text-xl font-bold text-sky-400 font-mono">
                ${(previewData?.availableCustomerAdvance || 0).toLocaleString('es-CO')}
              </div>
            </div>
            <div className="border-l pl-4 border-white/10">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Saldo por Cobrar</span>
              <div className={`text-2xl font-black font-mono ${
                resumenFinanciero.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                ${resumenFinanciero.saldoPendiente.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          {/* Panel de Cobro y Liquidación (en la misma vista, estilo Solicitud) */}
          <div className="space-y-4 p-5 bg-slate-950/80 rounded-2xl border border-white/10">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Liquidación y Medio de Pago en Mostrador
            </h4>

            {resumenFinanciero.saldoPendiente > 0 ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                  <span className="font-bold">⚠️ Liquidación de Saldo (RF-5.4):</span> Para despachar, registre el pago del saldo pendiente de <strong className="font-mono text-white">${resumenFinanciero.saldoPendiente.toLocaleString('es-CO')}</strong>.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Medio de Pago *
                    </label>
                    <select
                      value={metodoPagoConsolidado}
                      onChange={(e) => setMetodoPagoConsolidado(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {mediosPago.map((m) => (
                        <option key={m.uuid} value={m.uuid}>
                          {m.nombre} {m.isDefault || m.esPorDefecto ? '(Por Defecto)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Monto a Recaudar (COP) *
                    </label>
                    <input
                      type="number"
                      value={montoPagoConsolidado}
                      onChange={(e) => setMontoPagoConsolidado(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Referencia / Comprobante (opcional)
                    </label>
                    <input
                      type="text"
                      value={referenciaPagoConsolidado}
                      onChange={(e) => setReferenciaPagoConsolidado(e.target.value)}
                      placeholder="Ej: Aprobación / Transacción"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Esta entrega se encuentra 100% cubierta con los anticipos previos. No requiere cobro adicional.
              </div>
            )}

            {/* Datos del Receptor del Despacho (RF-5.5) */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Entregado a (Nombre Completo) *"
                  value={receptorNombre}
                  onChange={(e) => setReceptorNombre(e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  required
                  fullWidth
                />
              </div>
              <div>
                <Input
                  label="Cédula / Documento Identidad *"
                  value={receptorDocumento}
                  onChange={(e) => setReceptorDocumento(e.target.value)}
                  placeholder="Ej: 1098765432"
                  required
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Observaciones del Despacho (opcional)
              </label>
              <input
                type="text"
                value={observacionEntrega}
                onChange={(e) => setObservacionEntrega(e.target.value)}
                placeholder="Notas adicionales..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Botón Principal de Acción */}
            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                onClick={() => setEntregaActivaClienteId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={
                  loading ||
                  itemsClienteMarcados.length === 0 ||
                  !receptorNombre.trim() ||
                  !receptorDocumento.trim() ||
                  (resumenFinanciero.saldoPendiente > 0 && montoPagoConsolidado < resumenFinanciero.saldoPendiente)
                }
                onClick={handleCrearEntregaConsolidada}
              >
                {loading ? 'Procesando Despacho...' : '🚀 Liquidar y Despachar al Cliente'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* LISTADO PRINCIPAL UNIFICADO DE ENTREGAS PENDIENTES */}
      {!entregaActivaClienteId && !remisionActiva && (
        <Card className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-3xl shadow-xl">
          <div className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Órdenes Listas para Entrega
              </h2>
              <p className="text-xs text-slate-400">
                Seleccione una orden o cliente para liquidar saldo y despachar los ítems terminados.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
              <span className="px-3 py-1.5 rounded-full bg-slate-800 border border-white/10">
                {solicitudesAgrupadas.length} órdenes pendientes
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
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
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400 italic">
                      {loading ? 'Cargando órdenes listas...' : 'No hay órdenes pendientes para entrega en mostrador.'}
                    </td>
                  </tr>
                ) : (
                  solicitudesPaginadas.map((sol) => (
                    <tr
                      key={sol.solicitudPublicId}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 font-bold font-mono text-white">
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-700/30">
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
                              <Badge variant="success">Listo para Entrega</Badge>
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Directo estilo amigable */}
                          <button
                            type="button"
                            onClick={() => handleSeleccionarEntrega(sol.clienteId, sol.items)}
                            className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <span>⚡ Despachar</span>
                          </button>

                          {/* Botón compatible con test unitario */}
                          <button
                            type="button"
                            onClick={() => handleGenerarRemision(sol.solicitudPublicId)}
                            disabled={loading}
                            title="Generar remisión de entrega y despacho"
                            className="p-1.5 rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="w-3.5 h-3.5" />
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
                  {solicitudesAgrupadas.length > 0 ? (paginaActual - 1) * itemsPorPagina + 1 : 0}
                </strong>{' '}
                a{' '}
                <strong className="text-white">
                  {Math.min(paginaActual * itemsPorPagina, solicitudesAgrupadas.length)}
                </strong>{' '}
                de <strong className="text-white">{solicitudesAgrupadas.length}</strong> órdenes
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
      )}

      {/* MODAL DE PAGO PARA REMISIÓN BORRADOR (T044) */}
      <Modal
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        title="Registrar Cobro de Saldo de Entrega"
      >
        <div className="space-y-4 p-2 text-sm text-slate-200">
          <p className="text-xs text-slate-400">
            Remisión: <strong className="text-white">{remisionActiva?.numeroDocumento}</strong>. Saldo pendiente:{' '}
            <strong className="text-rose-400 font-mono">${remisionActiva?.saldoPendiente.toLocaleString('es-CO')}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Monto a Cobrar *</label>
            <input
              type="number"
              value={montoPago}
              onChange={(e) => setMontoPago(Number(e.target.value))}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Medio de Pago *</label>
            <select
              value={instrumentoSeleccionado}
              onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white"
            >
              {mediosPago.map((m) => (
                <option key={m.uuid} value={m.uuid}>
                  {m.nombre} {m.isDefault || m.esPorDefecto ? '(Por Defecto)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Referencia Transacción</label>
            <input
              type="text"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Número de aprobación / voucher"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsPagoModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmarPago}>
              Confirmar Recaudo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
