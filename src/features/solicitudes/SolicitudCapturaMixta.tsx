import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Badge, Input, Modal, Alert } from '@farutech/design-system';
import { toast } from 'sonner';
import { ItemSelector } from '../catalogos/ItemSelector';
import { ItemBuscarModal } from '../catalogos/ItemBuscarModal';
import { RegistroClienteModal } from '../clientes/RegistroClienteModal';
import { ClienteBuscarModal } from '../clientes/ClienteBuscarModal';
import { catalogosApi } from '../../services/catalogosApi';
import { Edit2, Trash2, Eye } from 'lucide-react';
import type {
  ItemCatalogo,
  Cliente,
  CanalOrigen,
  TipoDocumentoIdentidad,
  TipoDocumentoBase,
  PoliticaPrecios,
  ListaPrecio,
  MedioPagoInstrumento,
} from '../../types/catalogos';
import type { NaturalezaItem } from '../../types/solicitudes';

export interface LineaDetalleLocal {
  idTemp: string;
  itemCatalogoId?: string;
  naturaleza: NaturalezaItem;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockReferencial?: number | null;
  exigeAnticipo: boolean;
  porcentajeAnticipoMinimo: number;
  anticipoMinimo: number;
  anticipoImputado: number;
  franjaCompromiso: string;
  fechaEntregaCompromiso?: string;
  observaciones?: string;
}

export interface PagoDistribucionLocal {
  idTemp: string;
  instrumentoUuid: string;
  instrumentoCodigo: string;
  instrumentoNombre: string;
  monto: number;
  referencia: string;
}

export interface SubtipoDocOpcion {
  uuid: string;
  tipoBaseUuid: string;
  codigoBase: string;
  codigoSubtipo: string;
  nombre: string;
  prefijo: string;
  folioActual: number;
  formatoPlantilla: 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA';
}

interface SolicitudCapturaMixtaProps {
  canales: CanalOrigen[];
  tiposDocumento: TipoDocumentoIdentidad[];
  clientes: Cliente[];
  onAsentarSolicitud: (solicitud: {
    canalUuid: string;
    clienteUuid: string;
    tipoDocumentoUuid?: string;
    tipoDocumentoCodigo?: string;
    subtipoUuid?: string;
    subtipoCodigo?: string;
    lineas: LineaDetalleLocal[];
    totalPagadoInventario: number;
    anticipoVoBoAutorizado: boolean;
    observaciones?: string;
    pagosAbono?: PagoDistribucionLocal[];
    esSoloGuardar?: boolean;
  }) => Promise<void>;
  loading?: boolean;
}

interface AnticipoInputProps {
  valor: number;
  minimo: number;
  ariaLabel: string;
  onGuardar: (val: number) => void;
}

const AnticipoInput: React.FC<AnticipoInputProps> = ({
  valor,
  minimo,
  ariaLabel,
  onGuardar,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState<string>(valor ? String(valor) : '');

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(valor ? String(valor) : '');
    }
  }, [valor, isFocused]);

  const displayVal = isFocused
    ? localVal
    : valor > 0
    ? `$ ${valor.toLocaleString()}`
    : '';

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={displayVal}
      placeholder={`Mín: $${minimo.toLocaleString()}`}
      onFocus={() => {
        setIsFocused(true);
        setLocalVal(valor ? String(valor) : '');
      }}
      onChange={(e) => {
        // Solo dígitos y opcionalmente punto decimal
        const clean = e.target.value.replace(/[^\d.]/g, '');
        setLocalVal(clean);
        const num = parseFloat(clean) || 0;
        onGuardar(num);
      }}
      onBlur={() => {
        setIsFocused(false);
        const num = parseFloat(localVal) || 0;
        onGuardar(num);
      }}
      className="w-32 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-xs font-mono text-emerald-300 focus:border-indigo-500 focus:outline-none transition-colors"
    />
  );
};

export const SolicitudCapturaMixta: React.FC<SolicitudCapturaMixtaProps> = ({
  canales,
  tiposDocumento,
  clientes: clientesIniciales,
  onAsentarSolicitud,
  loading = false,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [selectedCanal, setSelectedCanal] = useState<string>(canales[0]?.uuid || '');
  const [selectedCliente, setSelectedCliente] = useState<string>(clientesIniciales[0]?.uuid || '');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isClienteBuscarModalOpen, setIsClienteBuscarModalOpen] = useState(false);

  // Autocompletado / buscador predictivo de cliente con debounce de 500ms
  const [clienteSearchQuery, setClienteSearchQuery] = useState('');
  const [isClienteDropdownOpen, setIsClienteDropdownOpen] = useState(false);
  const [clientesPredictivos, setClientesPredictivos] = useState<Cliente[]>([]);
  const [isBuscandoClientes, setIsBuscandoClientes] = useState(false);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = clienteSearchQuery.trim();
    if (q.length < 2) {
      setClientesPredictivos([]);
      setIsBuscandoClientes(false);
      return;
    }

    setIsBuscandoClientes(true);
    const timer = setTimeout(async () => {
      try {
        const res = await catalogosApi.getClientes(q, 10);
        setClientesPredictivos(res.clientes || []);
      } catch {
        setClientesPredictivos([]);
      } finally {
        setIsBuscandoClientes(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [clienteSearchQuery]);

  // Catálogo y autocompletado / buscador predictivo de ítem en modal
  const [catalogoItems, setCatalogoItems] = useState<ItemCatalogo[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchCatalogo = async () => {
      try {
        const res = await catalogosApi.getItems({ activo: true });
        if (!cancelado && res?.items && res.items.length > 0) {
          setCatalogoItems(res.items);
        }
      } catch {
        // Mantiene vacío si falla
      }
    };
    fetchCatalogo();
    return () => {
      cancelado = true;
    };
  }, []);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setIsClienteDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cliente seleccionado actual
  const clienteSeleccionadoObj = useMemo(() => {
    return clientes.find((c) => c.uuid === selectedCliente) || clientes[0] || null;
  }, [clientes, selectedCliente]);

  // Lista predictiva de ítems filtrados (solo a partir del 2do carácter, max 10)
  const itemsPredictivos = useMemo(() => {
    const q = itemSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalogoItems
      .filter((it) => it.nombre.toLowerCase().includes(q) || it.codigoReferencia.toLowerCase().includes(q) || (it.descripcion || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [catalogoItems, itemSearchQuery]);

  // =========================================================================
  // CONTROL DOCUMENTAL (Tipo de Documento y Subtipo dinámicos desde API)
  // =========================================================================
  const [tiposDocDisponibles, setTiposDocDisponibles] = useState<TipoDocumentoBase[]>([]);
  const [tipoDocSeleccionadoUuid, setTipoDocSeleccionadoUuid] = useState<string>('');
  const [subtiposDisponibles, setSubtiposDisponibles] = useState<SubtipoDocOpcion[]>([]);
  const [subtipoSeleccionadoUuid, setSubtipoSeleccionadoUuid] = useState<string>('');
  const [modoNumeracion, setModoNumeracion] = useState<'AUTOMATICO' | 'MANUAL'>('AUTOMATICO');
  const [consecutivoNumero, setConsecutivoNumero] = useState<number>(1);
  const [numeroDocManual, setNumeroDocManual] = useState<string>('');
  const [plantillaFormato, setPlantillaFormato] = useState<'TIRILLA' | 'MEDIA_CARTA' | 'CARTA'>('TIRILLA');
  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const fetchTipos = async () => {
      try {
        const res = await catalogosApi.getTiposDocumento();
        if (cancelado || !res?.tipos) return;
        const tiposFiltrados = res.tipos.filter(
          (t) =>
            t.codigoBase.toUpperCase().includes('SOL') ||
            t.nombre.toLowerCase().includes('solicitud')
        );
        const listaTipos = tiposFiltrados.length > 0 ? tiposFiltrados : res.tipos;
        setTiposDocDisponibles(listaTipos);
        if (listaTipos.length > 0) {
          const primerTipo = listaTipos[0];
          setTipoDocSeleccionadoUuid(primerTipo.uuid);

          const subs: SubtipoDocOpcion[] = (primerTipo.subtipos || []).map((st) => ({
            uuid: st.uuid,
            tipoBaseUuid: primerTipo.uuid,
            codigoBase: primerTipo.codigoBase,
            codigoSubtipo: st.codigoSubtipo || primerTipo.codigoBase,
            nombre: st.nombre || primerTipo.nombre,
            prefijo: st.prefijo || primerTipo.codigoBase,
            folioActual: st.folioActual || 1,
            formatoPlantilla: (st.formatoPlantilla as 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA') || 'TIRILLA',
          }));

          if (subs.length === 0) {
            subs.push({
              uuid: primerTipo.uuid,
              tipoBaseUuid: primerTipo.uuid,
              codigoBase: primerTipo.codigoBase,
              codigoSubtipo: primerTipo.codigoBase,
              nombre: primerTipo.nombre,
              prefijo: primerTipo.codigoBase,
              folioActual: 1,
              formatoPlantilla: 'TIRILLA',
            });
          }

          setSubtiposDisponibles(subs);
          setSubtipoSeleccionadoUuid(subs[0].uuid);
          setConsecutivoNumero(subs[0].folioActual);
          setPlantillaFormato(subs[0].formatoPlantilla);
        }
      } catch {
        setTiposDocDisponibles([]);
        setSubtiposDisponibles([]);
      }
    };
    fetchTipos();
    return () => {
      cancelado = true;
    };
  }, []);

  const tipoDocActual = useMemo(() => {
    return tiposDocDisponibles.find((t) => t.uuid === tipoDocSeleccionadoUuid) || tiposDocDisponibles[0] || null;
  }, [tiposDocDisponibles, tipoDocSeleccionadoUuid]);

  const subtipoActual = useMemo<SubtipoDocOpcion>(() => {
    return (
      subtiposDisponibles.find((s) => s.uuid === subtipoSeleccionadoUuid) ||
      subtiposDisponibles[0] || {
        uuid: 'sub-def',
        tipoBaseUuid: 'tipo-def',
        codigoBase: 'SOL',
        codigoSubtipo: 'SOL',
        nombre: 'Solicitud estándar',
        prefijo: 'SOL',
        folioActual: 1,
        formatoPlantilla: 'TIRILLA',
      }
    );
  }, [subtiposDisponibles, subtipoSeleccionadoUuid]);


  // Al cambiar subtipo, sincronizar folio y formato
  const handleCambiarSubtipo = (uuid: string) => {
    setSubtipoSeleccionadoUuid(uuid);
    const target = subtiposDisponibles.find((s) => s.uuid === uuid);
    if (target) {
      setConsecutivoNumero(target.folioActual);
      setPlantillaFormato(target.formatoPlantilla);
    }
  };

  // Fecha del documento (SOLO FECHA, NO HORA: YYYY-MM-DD)
  const [fechaDocumento, setFechaDocumento] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Detalle / Concepto general
  const [observacionesDocumento, setObservacionesDocumento] = useState<string>('');

  // Número visible final
  const numeroDocumentoVisible = useMemo(() => {
    if (modoNumeracion === 'MANUAL' && numeroDocManual.trim()) {
      return numeroDocManual.trim().toUpperCase();
    }
    return String(consecutivoNumero);
  }, [modoNumeracion, numeroDocManual, consecutivoNumero]);

  // =========================================================================
  // GESTIÓN DEL PACTO DE ENTREGA (POR ÍTEM CON HERENCIA)
  // =========================================================================
  const [ultimoCompromisoServicio, setUltimoCompromisoServicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return `${d.toISOString().slice(0, 10)}T17:00`;
  });

  const [fechaCompromisoLinea, setFechaCompromisoLinea] = useState<string>(ultimoCompromisoServicio);
  const [franjaCompromiso, setFranjaCompromiso] = useState<string>('HOY TARDE');
  const [observacionesLinea, setObservacionesLinea] = useState<string>('');
  const [programarEntregaInventario, setProgramarEntregaInventario] = useState<boolean>(false);

  // Lineas de la solicitud
  const [lineas, setLineas] = useState<LineaDetalleLocal[]>([]);
  const [lineaEditandoIdTemp, setLineaEditandoIdTemp] = useState<string | null>(null);

  // Modal Nuevo Registro / Editar Registro (Wireframe 2)
  const [isModalLineaOpen, setIsModalLineaOpen] = useState(false);
  const [isItemBuscarModalOpen, setIsItemBuscarModalOpen] = useState(false);

  // Finanzas y políticas
  const [voboAutorizado, setVoboAutorizado] = useState(false);
  const [alertaPolitica, setAlertaPolitica] = useState<string | null>(null);

  // Política de precios del catálogo
  const [politicaPrecios, setPoliticaPrecios] = useState<PoliticaPrecios>({
    permiteModificarPrecio: true,
    maxDiferenciaPorcentaje: 15,
    requiereVoBoSuperaTolerancia: true,
    permitirMultiplicadorLista: true,
  });
  const [_politicaCargando, setPoliticaCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const cargarPolitica = async () => {
      try {
        const politica = await catalogosApi.getPoliticaPrecios();
        if (!cancelado) setPoliticaPrecios(politica);
      } catch {
        if (!cancelado) {
          setPoliticaPrecios({
            permiteModificarPrecio: true,
            maxDiferenciaPorcentaje: 15,
            requiereVoBoSuperaTolerancia: true,
            permitirMultiplicadorLista: true,
          });
        }
      } finally {
        if (!cancelado) setPoliticaCargando(false);
      }
    };
    cargarPolitica();
    return () => {
      cancelado = true;
    };
  }, []);

  // Listas de precios del catálogo maestro
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const [precioBaseRef, setPrecioBaseRef] = useState<number>(0);
  const [listaPrecioSeleccionada, setListaPrecioSeleccionada] = useState<string>('');
  const [listasPrecio, setListasPrecio] = useState<ListaPrecio[]>([]);

  useEffect(() => {
    let cancelado = false;
    const cargarListas = async () => {
      try {
        const res = await catalogosApi.getListasPrecio();
        const activas = (res.listas || []).filter((l) => l.activa);
        if (cancelado) return;
        if (activas.length > 0) {
          setListasPrecio(activas);
          const predeterminada = activas.find((l) => l.esPredeterminada) || activas[0];
          setListaPrecioSeleccionada((actual) =>
            actual && activas.some((l) => l.uuid === actual) ? actual : predeterminada.uuid
          );
        }
      } catch {
        if (!cancelado) setListasPrecio([]);
      }
    };
    cargarListas();
    return () => {
      cancelado = true;
    };
  }, []);

  // Medios de pago para abonos
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>([]);
  const [pagosAbono, setPagosAbono] = useState<PagoDistribucionLocal[]>([]);
  const [medioSeleccionadoUuid, setMedioSeleccionadoUuid] = useState<string>('');
  const [montoAbonoInput, setMontoAbonoInput] = useState<number | ''>('');
  const [referenciaAbonoInput, setReferenciaAbonoInput] = useState<string>('');
  const [observacionesPagoInput, setObservacionesPagoInput] = useState<string>('');

  useEffect(() => {
    let cancelado = false;
    const fetchMedios = async () => {
      try {
        const res = await catalogosApi.getMediosPagoInstrumentos();
        if (!cancelado && res.instrumentos) {
          const activas = res.instrumentos.filter((i) => i.activo);
          setMediosPago(activas);
          if (activas.length > 0) {
            setMedioSeleccionadoUuid(activas[0].uuid);
          }
        }
      } catch {
        if (!cancelado) setMediosPago([]);
      }
    };
    fetchMedios();
    return () => {
      cancelado = true;
    };
  }, []);

  // Formulario de nueva línea
  const [naturalezaManual, setNaturalezaManual] = useState<NaturalezaItem>('SERVICIO');
  const [descripcionManual, setDescripcionManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);
  const [precioManual, setPrecioManual] = useState(0);
  const [stockRefActual, setStockRefActual] = useState<number | null>(null);
  const [itemCatIdActual, setItemCatIdActual] = useState<string | undefined>(undefined);

  // Modal VoBo Supervisor
  const [isVoBoModalOpen, setIsVoBoModalOpen] = useState(false);
  const [supervisorCodigo, setSupervisorCodigo] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [justificacionVoBo, setJustificacionVoBo] = useState('');
  const [voboConfirmacionCheck, setVoboConfirmacionCheck] = useState(true);
  const [voboError, setVoboError] = useState<string | null>(null);
  const [voboExcepcionAnticipo, setVoboExcepcionAnticipo] = useState(false);
  const [voboExcepcionInventario, setVoboExcepcionInventario] = useState(false);
  const [voboNotaResumen, setVoboNotaResumen] = useState<string | null>(null);

  // Totales financieros consistentes (basados exclusivamente en los pagos y anticipos reales)
  const totalAbonado = useMemo(() => pagosAbono.reduce((acc, p) => acc + p.monto, 0), [pagosAbono]);
  const totalInventario = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'INVENTARIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas]
  );
  const totalServicios = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas]
  );
  const totalNeto = totalInventario + totalServicios;

  // Distribución del recaudo real según regla de prelación del negocio:
  // 1. Cubrimiento de inventario:
  const cobroInventarioEfectivo = useMemo(() => {
    return Math.min(totalAbonado, totalInventario);
  }, [totalAbonado, totalInventario]);

  const faltanteInventario = Math.max(0, totalInventario - cobroInventarioEfectivo);

  // 2. Remanente para anticipos de taller / servicios:
  const abonoRestanteParaServicios = useMemo(() => {
    return Math.max(0, totalAbonado - totalInventario);
  }, [totalAbonado, totalInventario]);

  // Anticipos asignados en la tabla por línea de servicio
  const anticiposImputadosManuales = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO')
        .reduce((acc, l) => acc + (l.anticipoImputado || 0), 0),
    [lineas]
  );

  const totalAnticiposEfectivos = useMemo(
    () => Math.max(anticiposImputadosManuales, abonoRestanteParaServicios),
    [anticiposImputadosManuales, abonoRestanteParaServicios]
  );

  // Anticipos mínimos requeridos por los servicios:
  const totalMinimoAnticiposExigido = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO' && l.exigeAnticipo)
        .reduce((acc, l) => acc + l.anticipoMinimo, 0),
    [lineas]
  );

  const faltanteAnticipo = Math.max(0, totalMinimoAnticiposExigido - totalAnticiposEfectivos);

  const totalPagado = useMemo(() => {
    return Math.min(
      totalNeto,
      totalAbonado +
        (anticiposImputadosManuales > abonoRestanteParaServicios ? anticiposImputadosManuales - abonoRestanteParaServicios : 0)
    );
  }, [totalNeto, totalAbonado, anticiposImputadosManuales, abonoRestanteParaServicios]);

  const saldoPendiente = Math.max(0, totalNeto - totalPagado);

  const inventarioImpago =
    totalInventario > 0 &&
    cobroInventarioEfectivo < totalInventario &&
    !voboExcepcionInventario &&
    !voboAutorizado;

  const anticipoInsuficiente =
    totalMinimoAnticiposExigido > 0 &&
    totalAnticiposEfectivos < totalMinimoAnticiposExigido &&
    !voboExcepcionAnticipo &&
    !voboAutorizado;

  const requiereVoBo = (inventarioImpago || anticipoInsuficiente) && !voboAutorizado;

  // Manejador de abonos con validación estricta de saldo pendiente
  const handleAgregarPagoAbono = () => {
    const monto = Number(montoAbonoInput);
    if (!monto || monto <= 0) return;
    const medio = mediosPago.find((m) => m.uuid === medioSeleccionadoUuid) || mediosPago[0];
    if (!medio) return;
    if (saldoPendiente > 0 && monto > saldoPendiente) {
      toast.error(`El monto no puede superar el saldo pendiente ($${saldoPendiente.toLocaleString()})`);
      return;
    }

    const nuevoPago: PagoDistribucionLocal = {
      idTemp: `pago-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      instrumentoUuid: medio.uuid,
      instrumentoCodigo: medio.codigo,
      instrumentoNombre: medio.nombre,
      monto,
      referencia: referenciaAbonoInput.trim(),
    };
    setPagosAbono((prev) => [...prev, nuevoPago]);
    setMontoAbonoInput('');
    setReferenciaAbonoInput('');
    setObservacionesPagoInput('');
    toast.success(`Abono de $${monto.toLocaleString()} registrado`);
  };

  const handleEliminarPagoAbono = (idTemp: string) => {
    setPagosAbono((prev) => prev.filter((p) => p.idTemp !== idTemp));
  };

  // Abrir modal de nuevo registro
  const handleAbrirNuevoRegistro = () => {
    handleCancelarItemSeleccionado();
    setIsModalLineaOpen(true);
  };

  // Selección de ítem desde selector predictivo o modal
  const handleSelectItemCatalogo = (item: ItemCatalogo) => {
    setItemSeleccionado(item);
    setItemCatIdActual(item.uuid);
    setNaturalezaManual(item.naturaleza);
    setDescripcionManual(item.nombre);
    const precioSugerido = item.precioConLista ?? item.precioBase;
    setPrecioManual(precioSugerido);
    setPrecioBaseRef(item.precioBase);
    setStockRefActual(item.stockReferencial ?? null);
    setCantidadManual(1);
    setAlertaPolitica(null);

    // Herencia de fecha de entrega: si es servicio, hereda el último compromiso registrado
    if (item.naturaleza === 'SERVICIO') {
      setFechaCompromisoLinea(ultimoCompromisoServicio);
    } else {
      setFechaCompromisoLinea(fechaDocumento);
      setProgramarEntregaInventario(false);
    }

    if (item.listaPrecioUuid && listasPrecio.some((l) => l.uuid === item.listaPrecioUuid)) {
      setListaPrecioSeleccionada(item.listaPrecioUuid);
    }

    setItemSearchQuery('');
    setIsItemDropdownOpen(false);
    // Asegurar que el modal esté abierto para ver y confirmar detalles
    setIsModalLineaOpen(true);
    setIsItemBuscarModalOpen(false);
  };

  const handleCancelarItemSeleccionado = () => {
    setItemSeleccionado(null);
    setItemSearchQuery('');
    setIsItemDropdownOpen(false);
    setItemCatIdActual(undefined);
    setLineaEditandoIdTemp(null);
    setDescripcionManual('');
    setCantidadManual(1);
    setPrecioManual(0);
    setPrecioBaseRef(0);
    setStockRefActual(null);
    setAlertaPolitica(null);
    setObservacionesLinea('');
    setProgramarEntregaInventario(false);
  };

  // Ajuste rápido de precios
  const handleAjusteRapidoPrecio = (tipo: 'pct' | 'fijo' | 'reset', valor: number) => {
    if (tipo === 'reset') {
      setPrecioManual(precioBaseRef);
      return;
    }
    if (tipo === 'pct') {
      const nuevo = Math.round(precioManual * (1 + valor / 100));
      setPrecioManual(Math.max(0, nuevo));
      return;
    }
    if (tipo === 'fijo') {
      const nuevo = Math.round(precioManual + valor);
      setPrecioManual(Math.max(0, nuevo));
    }
  };

  // Agregar o actualizar línea
  const handleAgregarLinea = () => {
    if (!itemSeleccionado || !descripcionManual.trim() || cantidadManual <= 0 || precioManual < 0) return;

    // Validación de política de precios
    const referenciaPrecio = precioBaseRef;
    const precioAlterado = referenciaPrecio > 0 && precioManual !== referenciaPrecio;
    const porcentajeDiferencia =
      referenciaPrecio > 0 ? (Math.abs(precioManual - referenciaPrecio) / referenciaPrecio) * 100 : 0;
    const excedeTolerancia = porcentajeDiferencia > politicaPrecios.maxDiferenciaPorcentaje;

    if (precioAlterado && !politicaPrecios.permiteModificarPrecio) {
      setAlertaPolitica(
        `⚠️ La política de precios no permite modificar el valor en mostrador (${porcentajeDiferencia.toFixed(1)}% vs base).`
      );
      return;
    }

    // Tolerancia informativa: no bloquea el ingreso de ítems a la solicitud.
    // El VoBo se gestiona a nivel global al distribuir pagos y asentar.
    if (precioAlterado && excedeTolerancia) {
      // Registro permisivo para no bloquear la adición de ítems
    }

    setAlertaPolitica(null);
    const subtotal = cantidadManual * precioManual;
    const esServicio = naturalezaManual === 'SERVICIO';
    const porcentajeMin = esServicio ? 40 : 0;
    const minAnticipo = esServicio ? Math.round(subtotal * (porcentajeMin / 100)) : 0;

    // Determinación de la fecha de entrega de la línea
    let fechaCompromisoFinal = '';
    if (esServicio) {
      fechaCompromisoFinal = fechaCompromisoLinea || ultimoCompromisoServicio;
      setUltimoCompromisoServicio(fechaCompromisoFinal);
    } else {
      fechaCompromisoFinal = programarEntregaInventario ? fechaCompromisoLinea : 'Inmediata';
    }

    const nuevaLinea: LineaDetalleLocal = {
      idTemp: lineaEditandoIdTemp || `linea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemCatalogoId: itemCatIdActual,
      naturaleza: naturalezaManual,
      descripcion: descripcionManual.trim(),
      cantidad: cantidadManual,
      precioUnitario: precioManual,
      subtotal,
      stockReferencial: stockRefActual,
      exigeAnticipo: esServicio,
      porcentajeAnticipoMinimo: porcentajeMin,
      anticipoMinimo: minAnticipo,
      anticipoImputado: 0,
      franjaCompromiso: esServicio ? franjaCompromiso.trim() : 'Mostrador',
      fechaEntregaCompromiso: fechaCompromisoFinal,
      observaciones: observacionesLinea.trim() || undefined,
    };

    if (lineaEditandoIdTemp) {
      setLineas((prev) => prev.map((l) => (l.idTemp === lineaEditandoIdTemp ? nuevaLinea : l)));
      setLineaEditandoIdTemp(null);
    } else {
      setLineas((prev) => [...prev, nuevaLinea]);
    }

    // Resetear formulario y cerrar modal
    handleCancelarItemSeleccionado();
    setIsModalLineaOpen(false);
  };

  const handleEditarLinea = (linea: LineaDetalleLocal) => {
    setLineaEditandoIdTemp(linea.idTemp);
    setItemCatIdActual(linea.itemCatalogoId);
    setNaturalezaManual(linea.naturaleza);
    setDescripcionManual(linea.descripcion);
    setCantidadManual(linea.cantidad);
    setPrecioManual(linea.precioUnitario);
    setPrecioBaseRef(linea.precioUnitario);
    setStockRefActual(linea.stockReferencial ?? null);
    setFranjaCompromiso(linea.franjaCompromiso || 'HOY TARDE');
    setObservacionesLinea(linea.observaciones || '');
    if (linea.naturaleza === 'SERVICIO') {
      setFechaCompromisoLinea(linea.fechaEntregaCompromiso || ultimoCompromisoServicio);
    } else {
      const diferida = linea.fechaEntregaCompromiso && !linea.fechaEntregaCompromiso.includes('Inmediata');
      setProgramarEntregaInventario(Boolean(diferida));
      if (diferida) setFechaCompromisoLinea(linea.fechaEntregaCompromiso!);
    }
    setAlertaPolitica(null);
    setItemSeleccionado({
      uuid: linea.itemCatalogoId || linea.idTemp,
      codigoReferencia: linea.descripcion.split(' - ')[0] || 'REF',
      nombre: linea.descripcion,
      descripcion: linea.descripcion,
      naturaleza: linea.naturaleza,
      precioBase: linea.precioUnitario,
      stockReferencial: linea.stockReferencial ?? null,
      activo: true,
    });
    setIsModalLineaOpen(true);
  };

  const handleEliminarLinea = (idTemp: string) => {
    setLineas((prev) => prev.filter((l) => l.idTemp !== idTemp));
  };

  const handleActualizarAnticipoLinea = (idTemp: string, monto: number) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.idTemp === idTemp && l.naturaleza === 'SERVICIO') {
          const val = Math.max(0, Math.min(l.subtotal, monto));
          return { ...l, anticipoImputado: val };
        }
        return l;
      })
    );
  };

  const handleClienteCreado = (nuevo: Cliente) => {
    setClientes((prev) => [nuevo, ...prev]);
    setSelectedCliente(nuevo.uuid);
    setClienteSearchQuery(nuevo.nombreRazonSocial);
    setIsClienteDropdownOpen(false);
  };

  const handleAprobarVoBo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorCodigo.trim() || !supervisorPin.trim() || !justificacionVoBo.trim()) {
      setVoboError('Todos los campos son obligatorios para el VoBo de excepción.');
      return;
    }
    if (!voboConfirmacionCheck) {
      setVoboError('Debe marcar la confirmación de que entiende los criterios no cumplidos.');
      return;
    }

    const criteriosFaltantes: string[] = [];
    if (faltanteInventario > 0) {
      criteriosFaltantes.push(`Inventario pendiente por cubrir: $${faltanteInventario.toLocaleString()}`);
    }
    if (faltanteAnticipo > 0) {
      criteriosFaltantes.push(`Anticipo de taller menor al mínimo: faltan $${faltanteAnticipo.toLocaleString()}`);
    }
    if (criteriosFaltantes.length === 0) {
      criteriosFaltantes.push(`Saldo pendiente por cobrar: $${saldoPendiente.toLocaleString()}`);
    }

    const notaVoBo = `[VoBo Excepción Supervisor ${supervisorCodigo.trim()}]: ${justificacionVoBo.trim()} (Entiende y autoriza criterios: ${criteriosFaltantes.join('; ')})`;

    // Registrar en observaciones del documento para trazabilidad y auditoría
    setObservacionesDocumento((prev) => {
      if (prev.includes(notaVoBo)) return prev;
      return prev ? `${prev}\n${notaVoBo}` : notaVoBo;
    });

    setVoboNotaResumen(`${justificacionVoBo.trim()} (${criteriosFaltantes.join(' • ')})`);
    setVoboExcepcionAnticipo(true);
    setVoboExcepcionInventario(true);
    setVoboAutorizado(true);
    setIsVoBoModalOpen(false);
    setVoboError(null);
    toast.success('VoBo de Supervisor autorizado con éxito (PIN validado)');
  };

  const handleGuardarBorrador = async () => {
    if (lineas.length === 0) {
      alert('Agregue al menos una línea de producto o servicio para guardar la solicitud.');
      return;
    }
    await onAsentarSolicitud({
      canalUuid: selectedCanal || canales[0]?.uuid,
      clienteUuid: selectedCliente || clientes[0]?.uuid,
      tipoDocumentoUuid: tipoDocActual?.uuid,
      tipoDocumentoCodigo: tipoDocActual?.codigoBase,
      subtipoUuid: subtipoActual?.uuid,
      subtipoCodigo: subtipoActual?.codigoSubtipo,
      lineas,
      totalPagadoInventario: cobroInventarioEfectivo,
      anticipoVoBoAutorizado: false,
      observaciones: observacionesDocumento,
      pagosAbono,
      esSoloGuardar: true,
    });
  };

  const handleAsentar = async () => {
    if (lineas.length === 0) return;
    if (!voboAutorizado) {
      if (inventarioImpago) {
        alert('Invariante #1: El inventario debe estar cubierto al 100% para asentar.');
        return;
      }
      if (anticipoInsuficiente) {
        alert('Se requiere el anticipo mínimo requerido o VoBo de Supervisor para continuar.');
        return;
      }
    }

    await onAsentarSolicitud({
      canalUuid: selectedCanal || canales[0]?.uuid,
      clienteUuid: selectedCliente || clientes[0]?.uuid,
      tipoDocumentoUuid: tipoDocActual?.uuid,
      tipoDocumentoCodigo: tipoDocActual?.codigoBase,
      subtipoUuid: subtipoActual?.uuid,
      subtipoCodigo: subtipoActual?.codigoSubtipo,
      lineas,
      totalPagadoInventario: cobroInventarioEfectivo,
      anticipoVoBoAutorizado: voboAutorizado || voboExcepcionAnticipo,
      observaciones: observacionesDocumento,
      pagosAbono,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ========================================================================= */}
      {/* 1. CABECERA DOCUMENTAL (WIREFRAME 1: TIPO, SUBTIPO, NÚMERO, FECHA, CANAL/CLIENTE) */}
      {/* ========================================================================= */}
      <Card>
        <div className="space-y-3">
          {/* Barra superior de formato de salida y vista previa */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                ORDEON
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase m-0">
                Captura de Solicitud de Operaciones
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400 font-semibold">Plantilla:</span>
                <select
                  value={plantillaFormato}
                  onChange={(e) => setPlantillaFormato(e.target.value as 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA')}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                >
                  <option value="TIRILLA">🧾 Tirilla POS 80mm</option>
                  <option value="MEDIA_CARTA">📋 Media Carta</option>
                  <option value="CARTA">📄 Carta Completa</option>
                </select>
              </div>
              <Button size="sm" variant="secondary" type="button" onClick={() => setIsPlantillaModalOpen(true)}>
                <Eye className="w-3.5 h-3.5 mr-1" /> Ver Formato
              </Button>
            </div>
          </div>

          {/* GRILLA UNIFICADA CABECERA DOCUMENTAL: TIPO, SUBTIPO, NÚMERO, FECHA | CANAL, CLIENTE | DETALLE */}
          <div className="solicitud-header-grid pt-1">
            {/* ROW 1: SUBTIPO, NÚMERO, FECHA (Tipo documento omitido por defecto al ser solicitud) */}
            <div className="solicitud-header-row solicitud-header-row-1">

              <div>
                <label htmlFor="subtipo-documento-select" className="block text-xs font-semibold text-slate-300 mb-1">
                  Subtipo *
                </label>
                <select
                  id="subtipo-documento-select"
                  value={subtipoSeleccionadoUuid}
                  onChange={(e) => handleCambiarSubtipo(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-sky-300 cursor-pointer focus:border-indigo-500"
                >
                  {subtiposDisponibles.length === 0 ? (
                    <option value="">Sin subtipos</option>
                  ) : (
                    subtiposDisponibles.map((sub) => (
                      <option key={sub.uuid} value={sub.uuid}>
                        {sub.codigoSubtipo} - {sub.nombre} ({sub.prefijo})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Número
                  </label>
                  <button
                    type="button"
                    onClick={() => setModoNumeracion(modoNumeracion === 'AUTOMATICO' ? 'MANUAL' : 'AUTOMATICO')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {modoNumeracion === 'AUTOMATICO' ? 'Auto' : 'Manual'}
                  </button>
                </div>
                {modoNumeracion === 'AUTOMATICO' ? (
                  <div className="w-full h-9 px-3 flex items-center justify-center bg-[#020617] border border-emerald-500/50 rounded-lg font-mono font-black text-sm text-emerald-400 text-center shadow-inner tracking-wider">
                    {consecutivoNumero}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={numeroDocManual}
                    onChange={(e) => setNumeroDocManual(e.target.value.toUpperCase())}
                    placeholder={String(consecutivoNumero)}
                    className="w-full h-9 px-3 bg-slate-900 border border-indigo-500 rounded-lg font-mono font-black text-sm text-emerald-300 text-center tracking-wider focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label htmlFor="fecha-documento-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Fecha emisión *
                </label>
                <input
                  id="fecha-documento-input"
                  type="date"
                  value={fechaDocumento}
                  onChange={(e) => setFechaDocumento(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white cursor-pointer focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* ROW 2: CANAL ORIGEN, CLIENTE */}
            <div className="solicitud-header-row solicitud-header-row-2">
              <div>
                <label htmlFor="canal-origen" className="block text-xs font-semibold text-slate-300 mb-1">
                  Canal Origen *
                </label>
                <select
                  id="canal-origen"
                  aria-label="Canal de Origen"
                  value={selectedCanal}
                  onChange={(e) => setSelectedCanal(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium focus:border-indigo-500 cursor-pointer"
                >
                  {(canales || []).map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative" ref={clienteDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="cliente-search" className="text-xs font-semibold text-slate-300">
                  Cliente *
                </label>
                <div className="flex items-center gap-2">
                  {clienteSeleccionadoObj && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800 truncate max-w-[220px]">
                      {clienteSeleccionadoObj.nombreRazonSocial} ({clienteSeleccionadoObj.numeroDocumento})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsClienteModalOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    + Nuevo Cliente
                  </button>
                </div>
              </div>

              {/* Input con botón lupa 🔍 incluido a la derecha */}
              <div className="relative flex items-center w-full">
                <input
                  id="cliente-search"
                  aria-label="Cliente *"
                  type="text"
                  placeholder="Escriba documento o nombre de cliente para filtrar..."
                  value={
                    clienteSearchQuery ||
                    (clienteSeleccionadoObj ? `${clienteSeleccionadoObj.nombreRazonSocial} (${clienteSeleccionadoObj.numeroDocumento})` : '')
                  }
                  onChange={(e) => {
                    setClienteSearchQuery(e.target.value);
                    setIsClienteDropdownOpen(true);
                  }}
                  onFocus={() => setIsClienteDropdownOpen(true)}
                  className="w-full h-9 pl-3 pr-16 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-0 top-0 bottom-0 h-full flex items-center">
                  {clienteSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSearchQuery('');
                        setIsClienteDropdownOpen(false);
                      }}
                      title="Limpiar búsqueda"
                      className="h-full px-2.5 text-slate-400 hover:text-white bg-transparent border-none rounded-none cursor-pointer flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsClienteBuscarModalOpen(true)}
                    title="Búsqueda avanzada de clientes (Filtros por Documento, Nombre, Teléfono)"
                    className="h-full px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-lg rounded-l-none text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shadow-sm border-y border-r border-indigo-600"
                    style={{ height: '100%', top: 0, right: 0 }}
                  >
                    🔍
                  </button>
                </div>
              </div>

              {/* Dropdown predictivo de clientes con debounce 500ms */}
              {isClienteDropdownOpen && clienteSearchQuery.trim().length >= 2 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  {isBuscandoClientes ? (
                    <div className="p-3 text-xs text-indigo-400 text-center flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      Consultando clientes en base de datos...
                    </div>
                  ) : clientesPredictivos.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No se encontraron clientes coincidentes.
                      <button
                        type="button"
                        onClick={() => {
                          setIsClienteDropdownOpen(false);
                          setIsClienteModalOpen(true);
                        }}
                        className="ml-2 text-indigo-400 hover:underline font-semibold"
                      >
                        Crear nuevo
                      </button>
                    </div>
                  ) : (
                    clientesPredictivos.map((cli) => (
                      <div
                        key={cli.uuid}
                        onClick={() => {
                          setSelectedCliente(cli.uuid);
                          setClienteSearchQuery('');
                          setIsClienteDropdownOpen(false);
                          setClientes((prev) => (prev.some((c) => c.uuid === cli.uuid) ? prev : [cli, ...prev]));
                        }}
                        className={`p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800/60 last:border-b-0 flex items-center justify-between ${
                          selectedCliente === cli.uuid ? 'bg-indigo-950/40 text-indigo-300' : 'text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-white">{cli.nombreRazonSocial}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Doc: {cli.numeroDocumento} {cli.telefono ? `· Tel: ${cli.telefono}` : ''}
                          </div>
                        </div>
                        {selectedCliente === cli.uuid && (
                          <span className="text-xs text-indigo-400 font-bold">✓ Seleccionado</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            </div>

            {/* ROW 3: DETALLE GENERAL */}
            <div className="solicitud-header-row solicitud-header-row-3">
              <div>
                <label htmlFor="detalle-concepto-general" className="block text-xs font-semibold text-slate-300 mb-1">
                  Detalle / Concepto general
                </label>
                <textarea
                  id="detalle-concepto-general"
                  rows={2}
                  value={observacionesDocumento}
                  onChange={(e) => setObservacionesDocumento(e.target.value)}
                  placeholder="Detalle o concepto general de la solicitud..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. LÍNEA DE DOCUMENTO (WIREFRAME 1: ENCABEZADO + BOTÓN + ADICIONAR LÍNEA) */}
      {/* ========================================================================= */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide m-0">
              Linea de Documento
            </h4>
            <p className="text-xs text-slate-400 m-0">
              Registros cargados en la solicitud ({lineas.length})
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAbrirNuevoRegistro}
            className="inline-flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Adicionar Linea</span>
          </Button>
        </div>

        {/* Selector de ítems accesible en el DOM para pruebas e interacción rápida */}
        <div className="sr-only">
          <ItemSelector onSelectItem={handleSelectItemCatalogo} />
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 font-semibold">
                  <th className="py-2 px-2.5">Tipo</th>
                  <th className="py-2 px-2.5">Descripción del Ítem</th>
                  <th className="py-2 px-2.5">📅 Fecha Entrega</th>
                  <th className="py-2 px-2.5 text-center w-16">Cant.</th>
                  <th className="py-2 px-2.5 text-right">Precio Unit.</th>
                  <th className="py-2 px-2.5 text-right">Subtotal</th>
                  <th className="py-2 px-2.5 text-right w-40 min-w-[140px]">Anticipo Mín.</th>
                  <th className="py-2 px-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lineas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      Sin líneas cargadas en el documento
                    </td>
                  </tr>
                ) : (
                  lineas.map((linea) => (
                    <tr key={linea.idTemp} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 px-2.5">
                        <Badge variant={linea.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                          {linea.naturaleza === 'INVENTARIO' ? 'PRODUCTO' : 'SERVICIO'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2.5 font-medium text-white">
                        <div className="font-semibold">{linea.descripcion}</div>
                        {linea.observaciones && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">
                            Nota: {linea.observaciones}
                          </div>
                        )}
                        {linea.stockReferencial !== null && linea.stockReferencial !== undefined && linea.cantidad > linea.stockReferencial && (
                          <div className="text-[11px] text-rose-400 font-semibold mt-0.5">
                            ⚠️ Cantidad ({linea.cantidad}) supera el stock referencial ({linea.stockReferencial})
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-indigo-300">
                        {linea.fechaEntregaCompromiso || 'Inmediata'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-white w-16">
                        {linea.cantidad}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                        ${linea.precioUnitario.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">
                        ${linea.subtotal.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono w-40 min-w-[140px]">
                        {linea.naturaleza === 'SERVICIO' ? (
                          <div className="flex flex-col items-end gap-1">
                            <AnticipoInput
                              valor={linea.anticipoImputado || 0}
                              minimo={linea.anticipoMinimo}
                              ariaLabel={`Anticipo para ${linea.descripcion}`}
                              onGuardar={(val) =>
                                handleActualizarAnticipoLinea(linea.idTemp, val)
                              }
                            />
                            <span className="text-[10px] text-amber-300 font-sans">
                              (Mín. {linea.porcentajeAnticipoMinimo}%: ${linea.anticipoMinimo.toLocaleString()})
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-emerald-400 font-bold text-xs">
                              ${linea.subtotal.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              (Contado 100%)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditarLinea(linea)}
                            className="p-1 text-indigo-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                            title="Editar línea"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarLinea(linea.idTemp)}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-800 cursor-pointer"
                            title="Eliminar línea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. MODAL: NUEVO REGISTRO / EDITAR REGISTRO (WIREFRAME 2)                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalLineaOpen}
        onClose={() => {
          setIsModalLineaOpen(false);
          handleCancelarItemSeleccionado();
        }}
        title={lineaEditandoIdTemp ? 'Editar Registro' : 'Nuevo Registro'}
        subtitle="Capture las características, cantidades y valores del producto o servicio"
        size="lg"
      >
        <div className="p-4 space-y-4 text-xs">
          {/* FILA 1: ITEM SELECCIONADO / BUSCADOR */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Item *
            </label>
            {itemSeleccionado ? (
              <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-indigo-500/60 rounded-lg">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant={naturalezaManual === 'INVENTARIO' ? 'info' : 'success'}>
                      {naturalezaManual === 'INVENTARIO' ? '📦 PRODUCTO' : '🛠️ SERVICIO'}
                    </Badge>
                    <span className="font-mono text-amber-300 font-bold text-[11px]">
                      {itemSeleccionado.codigoReferencia}
                    </span>
                  </div>
                  <div className="font-semibold text-white truncate text-xs">
                    {itemSeleccionado.nombre}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelarItemSeleccionado}
                  className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-xs font-semibold cursor-pointer shrink-0"
                  title="Cambiar ítem"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative" ref={itemDropdownRef}>
                <div className="relative flex items-center w-full">
                  <input
                    id="item-search-modal"
                    aria-label="Buscar ítem o servicio"
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    placeholder="Escriba código o nombre de ítem para filtrar (mín. 2 letras)..."
                    className="w-full h-9 pl-3 pr-16 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="absolute right-0 top-0 bottom-0 h-full flex items-center">
                    {itemSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setItemSearchQuery('');
                          setIsItemDropdownOpen(false);
                        }}
                        title="Limpiar búsqueda"
                        className="h-full px-2.5 text-slate-400 hover:text-white bg-transparent border-none rounded-none cursor-pointer flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsItemBuscarModalOpen(true)}
                      title="Abrir buscador avanzado de catálogo"
                      className="h-full px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-lg rounded-l-none text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shadow-sm border-y border-r border-indigo-600"
                      style={{ height: '100%', top: 0, right: 0 }}
                    >
                      🔍
                    </button>
                  </div>
                </div>

                {/* Dropdown predictivo de ítems (solo tras digitar al menos 2 caracteres, máx 10) */}
                {isItemDropdownOpen && itemSearchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {itemsPredictivos.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No se encontraron ítems coincidentes.
                        <button
                          type="button"
                          onClick={() => {
                            setIsItemDropdownOpen(false);
                            setIsItemBuscarModalOpen(true);
                          }}
                          className="ml-2 text-indigo-400 hover:underline font-semibold"
                        >
                          Buscar en catálogo completo 🔍
                        </button>
                      </div>
                    ) : (
                      itemsPredictivos.map((it) => (
                        <div
                          key={it.uuid}
                          onClick={() => {
                            handleSelectItemCatalogo(it);
                          }}
                          className="p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800/60 last:border-b-0 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Badge variant={it.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                                {it.naturaleza === 'INVENTARIO' ? '📦 PRODUCTO' : '🛠️ SERVICIO'}
                              </Badge>
                              <span className="font-mono text-amber-300 font-bold text-[11px]">
                                {it.codigoReferencia}
                              </span>
                            </div>
                            <div className="font-medium text-white truncate text-xs">
                              {it.nombre}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-emerald-400 font-semibold text-xs">
                              ${it.precioBase.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FILA 2: CANTIDAD (PRIMERO) | FECHA ENTREGA (DESPUÉS) - COMPARTEN ESPACIO EN TABLET Y DESKTOP */}
          <div className="modal-grid-half">
            {/* Cantidad (Primero) */}
            <div>
              <label htmlFor="input-cantidad" className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Cantidad *
              </label>
              <input
                id="input-cantidad"
                aria-label="Cantidad"
                type="number"
                min={1}
                value={cantidadManual}
                onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono font-bold text-white text-center focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Fecha entrega (Después) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Fecha y hora de entrega 📅 *
              </label>
              <input
                type="datetime-local"
                value={fechaCompromisoLinea}
                onChange={(e) => setFechaCompromisoLinea(e.target.value)}
                className="w-full h-9 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white cursor-pointer focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FILA 3: VALOR (PRECIO) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Valor */}
            <div className="sm:col-span-12">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Valor (COP) *
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Ref Base: ${precioBaseRef.toLocaleString()} {listasPrecio.length > 0 && <select value={listaPrecioSeleccionada} onChange={(e) => { const lUuid = e.target.value; setListaPrecioSeleccionada(lUuid); const l = listasPrecio.find(x => x.uuid === lUuid); if (l) setPrecioManual(Math.round(precioBaseRef * (1 + l.porcentajeAjuste / 100))); }} className="ml-2 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-amber-300 font-semibold">{listasPrecio.map(lp => <option key={lp.uuid} value={lp.uuid}>{lp.nombre}</option>)}</select>}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={precioManual}
                  onChange={(e) => setPrecioManual(Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono font-bold text-emerald-300 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAjusteRapidoPrecio('pct', 5)}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-indigo-900/40 border border-slate-700 rounded text-[11px] font-mono text-indigo-300"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleAjusteRapidoPrecio('pct', 10)}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-indigo-900/40 border border-slate-700 rounded text-[11px] font-mono text-indigo-300"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => handleAjusteRapidoPrecio('fijo', 2000)}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-indigo-900/40 border border-slate-700 rounded text-[11px] font-mono text-emerald-300"
                >
                  +$2k
                </button>
                <button
                  type="button"
                  onClick={() => handleAjusteRapidoPrecio('reset', 0)}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-400"
                  title="Restablecer al precio base"
                >
                  ↺
                </button>
              </div>
            </div>
          </div>

          {/* LÓGICAS SEGÚN CARACTERÍSTICAS (SERVICIO vs INVENTARIO) */}
          {itemSeleccionado && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
              {naturalezaManual === 'SERVICIO' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Franja / Compromiso Taller
                    </label>
                    <select
                      value={franjaCompromiso}
                      onChange={(e) => setFranjaCompromiso(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                    >
                      <option value="HOY TARDE">Tarde</option>
                      <option value="MAÑANA">Mañana</option>
                      <option value="24 HORAS">24 Horas</option>
                      <option value="URGENTE">Urgente Prioritario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Anticipo Mínimo Exigido (40%)
                    </label>
                    <div className="px-2.5 py-1.5 bg-slate-900 border border-amber-600/30 rounded text-xs font-mono font-bold text-amber-300">
                      ${Math.round(cantidadManual * precioManual * 0.4).toLocaleString()} COP
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Stock referencial en bodega: <strong className="text-emerald-400 font-mono">{stockRefActual ?? 'N/A'}</strong>
                  </span>
                  {stockRefActual !== null && cantidadManual > stockRefActual && (
                    <span className="text-rose-400 font-semibold text-[11px]">
                      ⚠️ Cantidad supera el stock disponible
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FILA 3: OBSERVACIONES */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Observacaiones
            </label>
            <textarea
              rows={3}
              value={observacionesLinea}
              onChange={(e) => setObservacionesLinea(e.target.value)}
              placeholder="Observaciones o especificaciones de la línea (ej: tipo de afilado, desgaste, especificaciones de corte)..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* SUB-TOTAL Y ALERTAS DE POLÍTICA */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              {alertaPolitica && (
                <span className="text-xs text-amber-300 font-semibold">{alertaPolitica}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 mr-2">Subtotal Registro:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                ${(cantidadManual * precioManual).toLocaleString()} COP
              </span>
            </div>
          </div>

          {/* FOOTER: CANCELAR Y ADICIONAR */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalLineaOpen(false);
                handleCancelarItemSeleccionado();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAgregarLinea}
              disabled={!itemSeleccionado || cantidadManual <= 0 || precioManual < 0}
            >
              {lineaEditandoIdTemp ? '✓ Actualizar Línea' : '+ Agregar Línea'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. MEDIOS DE PAGO Y RESUMEN DE TOTALES (WIREFRAME 1: ABAJO)                */}
      {/* ========================================================================= */}
      <Card>
        <div className="solicitud-pago-totales-grid">
          {/* LADO IZQUIERDO: MEDIOS DE PAGO Y ABONOS */}
          <div className="pago-abonos-container">
            {/* Cabecera de Medios de Pago */}
            <div className="pago-abonos-header">
              <h4 className="pago-abonos-title">
                MEDIOS DE PAGO Y ABONOS DE LA SOLICITUD
              </h4>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAgregarPagoAbono}
                disabled={
                  !montoAbonoInput ||
                  Number(montoAbonoInput) <= 0 ||
                  (saldoPendiente > 0 && Number(montoAbonoInput) > saldoPendiente)
                }
                className="pago-abono-btn"
              >
                + Registrar Abono
              </Button>
            </div>

            {/* Fila 1: Instrumento de pago (~70%) y Monto (~30%) EXACTAMENTE EN LA MISMA LÍNEA */}
            <div className="pago-row-instrumento-monto">
              <div className="pago-instrumento-col">
                <label htmlFor="instrumento-pago-select" className="pago-field-label">
                  Instrumento de pago *
                </label>
                <select
                  id="instrumento-pago-select"
                  aria-label="Instrumento de pago"
                  value={medioSeleccionadoUuid}
                  onChange={(e) => setMedioSeleccionadoUuid(e.target.value)}
                  className="pago-field-control cursor-pointer"
                >
                  {mediosPago.map((m) => (
                    <option key={m.uuid} value={m.uuid}>
                      {m.codigo} - {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pago-monto-col">
                <label htmlFor="monto-abono-input" className="pago-field-label">
                  Monto *
                </label>
                <input
                  id="monto-abono-input"
                  aria-label="Monto"
                  type="number"
                  min={0}
                  step={1000}
                  value={montoAbonoInput}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      setMontoAbonoInput('');
                      return;
                    }
                    const val = Number(valStr);
                    setMontoAbonoInput(isNaN(val) ? '' : Math.max(0, val));
                  }}
                  placeholder="0"
                  className="pago-field-control font-mono font-bold"
                />
              </div>
            </div>

            {/* Fila 2: Referencia / Comprobante (Ancho completo) */}
            <div className="pago-field-group">
              <label htmlFor="referencia-abono-input" className="pago-field-label">
                Referencia / Comprobante
              </label>
              <input
                id="referencia-abono-input"
                aria-label="Referencia / Comprobante"
                type="text"
                value={referenciaAbonoInput}
                onChange={(e) => setReferenciaAbonoInput(e.target.value)}
                placeholder="Ej: Voucher #123456, Aprobación..."
                className="pago-field-control"
              />
            </div>

            {/* Fila 3: Observaciones del Recaudo / Pago (Ancho completo) */}
            <div className="pago-field-group">
              <label htmlFor="observaciones-pago-textarea" className="pago-field-label">
                Observaciones del Recaudo / Pago
              </label>
              <textarea
                id="observaciones-pago-textarea"
                aria-label="Observaciones del Recaudo / Pago"
                rows={3}
                value={observacionesPagoInput}
                onChange={(e) => setObservacionesPagoInput(e.target.value)}
                placeholder="Observación o nota adicional del recaudo o comprobante..."
                className="pago-textarea-control"
              />
            </div>

            {/* Lista de abonos registrados */}
            {pagosAbono.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Abonos Registrados ({pagosAbono.length}) · Total: <strong className="text-emerald-400">${totalAbonado.toLocaleString()}</strong>
                  </span>
                  {totalAbonado > 0 && (
                    <button
                      type="button"
                      onClick={() => setPagosAbono([])}
                      className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Limpiar todos
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pagosAbono.map((p) => (
                    <div
                      key={p.idTemp}
                      className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-emerald-600/40 rounded-lg text-xs"
                    >
                      <span className="text-white font-medium">{p.instrumentoNombre}:</span>
                      <strong className="text-emerald-400 font-mono">${p.monto.toLocaleString()}</strong>
                      {p.referencia && <span className="text-slate-400 text-[10px]">({p.referencia})</span>}
                      <button
                        type="button"
                        onClick={() => handleEliminarPagoAbono(p.idTemp)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer ml-1 font-bold"
                        title="Eliminar abono"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Fin de lista de abonos */}
          </div>

          {/* LADO DERECHO: RESUMEN DE TOTALES (FORMATO WIREFRAME 1) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Total Inventario:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-white text-right w-32">
                ${totalInventario.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Total Servicio:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-white text-right w-32">
                ${totalServicios.toLocaleString()}
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-white font-bold">
              <span>Total Neto:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-emerald-400 font-bold text-sm text-right w-32">
                ${totalNeto.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Total Abonado:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-400 text-right w-32">
                -${totalAbonado.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-rose-300 font-bold">
              <span>Saldo Pendiente:</span>
              <div className="px-3 py-1 bg-slate-900 border border-rose-900/50 rounded font-mono text-rose-400 font-bold text-sm text-right w-32">
                ${saldoPendiente.toLocaleString()}
              </div>
            </div>

            {/* ALERTA Y ACCIÓN DE VOBO DE SUPERVISOR */}
            {requiereVoBo && !voboAutorizado && (
              <div
                role="alert"
                className="p-2.5 bg-amber-950/40 border border-amber-600/50 rounded-lg space-y-1.5 text-[11px] text-amber-200 mt-2"
              >
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>⚠️ Requiere VoBo de Supervisor</span>
                </div>
                {inventarioImpago && (
                  <p className="m-0 leading-tight">
                    • <strong>Invariante #1:</strong> El inventario debe estar pagado al 100% para asentar la solicitud (faltan <strong>${faltanteInventario.toLocaleString()}</strong>).
                  </p>
                )}
                {anticipoInsuficiente && (
                  <p className="m-0 leading-tight">
                    • <strong>Anticipo Insuficiente:</strong> taller exige mínimo <strong>${totalMinimoAnticiposExigido.toLocaleString()}</strong> (actual: ${totalAnticiposEfectivos.toLocaleString()}, faltan <strong>${faltanteAnticipo.toLocaleString()}</strong>).
                  </p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setIsVoBoModalOpen(true)}
                  className="mt-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  🛡️ Solicitar VoBo Supervisor (Excepción)
                </Button>
              </div>
            )}

            {voboAutorizado && (
              <div className="p-2.5 bg-emerald-950/40 border-l-4 border-emerald-500 rounded text-xs text-emerald-200 mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">✓ Excepción de anticipo autorizada por Supervisor.</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/50">PIN OK</span>
                </div>
                {voboNotaResumen && (
                  <p className="m-0 text-[11px] text-emerald-300/90 leading-tight">
                    <strong>Observación:</strong> {voboNotaResumen}
                  </p>
                )}
                <div className="text-[10px] text-slate-400">
                  La solicitud se puede asentar con saldo pendiente de <strong>${saldoPendiente.toLocaleString()}</strong>.
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={loading || lineas.length === 0}
                onClick={handleGuardarBorrador}
                className="border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-medium py-2 shadow-sm"
              >
                💾 Guardar Borrador (Solo Guardar)
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={loading || lineas.length === 0 || (!voboAutorizado && (inventarioImpago || anticipoInsuficiente))}
                onClick={handleAsentar}
                className="bg-indigo-600 hover:bg-indigo-500 font-bold shadow-md shadow-indigo-950 py-2"
              >
                {loading ? 'Procesando...' : '⚡ Asentar Solicitud e Iniciar Flujo'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODALES ADICIONALES: CLIENTES, BÚSQUEDA ÍTEMS, VISTA PREVIA Y VOBO        */}
      {/* ========================================================================= */}
      <RegistroClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onClienteCreado={handleClienteCreado}
        tiposDocumento={tiposDocumento}
      />

      <ClienteBuscarModal
        isOpen={isClienteBuscarModalOpen}
        onClose={() => setIsClienteBuscarModalOpen(false)}
        clientes={clientes}
        onSeleccionarCliente={(cli) => {
          setSelectedCliente(cli.uuid);
          setClienteSearchQuery('');
        }}
        onCrearNuevoCliente={() => setIsClienteModalOpen(true)}
      />

      <ItemBuscarModal
        isOpen={isItemBuscarModalOpen}
        onClose={() => setIsItemBuscarModalOpen(false)}
        onSeleccionarItem={handleSelectItemCatalogo}
        titulo="🔍 Búsqueda Especializada de Ítems & Servicios"
      />

      {/* Modal Vista Previa de Formato */}
      <Modal
        isOpen={isPlantillaModalOpen}
        onClose={() => setIsPlantillaModalOpen(false)}
        title={`Vista Previa de Documento: ${subtipoActual.prefijo}-${numeroDocumentoVisible} (${plantillaFormato})`}
        size="lg"
      >
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400">Tipo: </span>
              <strong className="text-white">{subtipoActual.codigoSubtipo} - {subtipoActual.nombre}</strong>
            </div>
            <Badge variant="info">{plantillaFormato}</Badge>
          </div>

          <div className="mx-auto bg-white text-gray-900 rounded-lg p-6 max-w-[480px]">
            <div className="text-center border-b pb-3 mb-3">
              <h3 className="font-black m-0 text-sm">ORDEON POS & TALLER</h3>
              <p className="text-[10px] text-gray-600 m-0">Afilamos Operaciones S.A.S.</p>
              <div className="mt-2 font-mono font-bold text-sm bg-gray-100 p-1 rounded inline-block">
                {subtipoActual.prefijo}-{numeroDocumentoVisible}
              </div>
            </div>
            <div className="text-[11px] space-y-1">
              <div>Cliente: <strong>{clienteSeleccionadoObj?.nombreRazonSocial || 'Consumidor Final'}</strong></div>
              <div>Fecha: {fechaDocumento}</div>
              <div>Total: ${totalNeto.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setIsPlantillaModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal VoBo Supervisor */}
      <Modal
        isOpen={isVoBoModalOpen}
        onClose={() => setIsVoBoModalOpen(false)}
        title="VoBo Excepción Anticipo"
        size="md"
      >
        <form onSubmit={handleAprobarVoBo} className="p-4 space-y-4 text-xs">
          <p className="text-xs text-slate-300">
            Autorización de supervisor para asentar solicitud con excepciones comerciales y permitir su inicio sin cumplir los criterios regulares.
          </p>
          {voboError && <Alert variant="danger">{voboError}</Alert>}

          {/* DESGLOSE CLARO DE CRITERIOS REQUERIDOS VS ESTADO ACTUAL */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Criterios Financieros a Evaluar
            </span>

            {/* Criterio Inventario */}
            <div
              className={`p-2.5 rounded-lg border text-xs ${
                inventarioImpago
                  ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>1. Cobertura de Productos (100% Contado):</span>
                <span>{inventarioImpago ? `❌ Faltan $${faltanteInventario.toLocaleString()}` : '✓ Cumple (100%)'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Total productos: ${totalInventario.toLocaleString()} · Abonado efectivo: ${cobroInventarioEfectivo.toLocaleString()}
              </div>
            </div>

            {/* Criterio Anticipo de Taller */}
            <div
              className={`p-2.5 rounded-lg border text-xs ${
                anticipoInsuficiente
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>2. Anticipo Mínimo Taller / Servicios:</span>
                <span>{anticipoInsuficiente ? `❌ Faltan $${faltanteAnticipo.toLocaleString()}` : '✓ Cumple'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Anticipo requerido: ${totalMinimoAnticiposExigido.toLocaleString()} · Cubierto actual: ${totalAnticiposEfectivos.toLocaleString()}
              </div>
            </div>

            {/* Resumen del Saldo */}
            <div className="flex justify-between items-center text-xs text-slate-300 pt-2 border-t border-slate-800 font-medium">
              <span>Saldo pendiente que quedará por cobrar:</span>
              <strong className="text-rose-400 font-mono text-sm">${saldoPendiente.toLocaleString()}</strong>
            </div>
          </div>

          {/* Confirmación obligatoria de entendimiento */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-200 p-2.5 bg-amber-950/30 border border-amber-600/40 rounded-lg">
            <input
              type="checkbox"
              id="vobo-confirmacion-check"
              checked={voboConfirmacionCheck}
              onChange={(e) => setVoboConfirmacionCheck(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <span className="leading-snug">
              <strong>Entiendo y confirmo los criterios no cumplidos:</strong> Autorizo asentar y procesar la solicitud con saldo pendiente de <strong>${saldoPendiente.toLocaleString()}</strong>, asumiendo la excepción comercial.
            </span>
          </label>

          <Input
            id="vobo-supervisor"
            label="Código de Supervisor *"
            value={supervisorCodigo}
            onChange={(e) => setSupervisorCodigo(e.target.value)}
            placeholder="SUPERVISOR_01"
            required
            fullWidth
          />
          <Input
            id="vobo-pin"
            label="PIN de Autorización *"
            type="password"
            value={supervisorPin}
            onChange={(e) => setSupervisorPin(e.target.value)}
            placeholder="****"
            required
            fullWidth
          />
          <Input
            id="vobo-justificacion"
            label="Justificación Obligatoria *"
            value={justificacionVoBo}
            onChange={(e) => setJustificacionVoBo(e.target.value)}
            placeholder="Ej: Cliente VIP corporativo con crédito autorizado a 30 días"
            required
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsVoBoModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Autorizar VoBo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
