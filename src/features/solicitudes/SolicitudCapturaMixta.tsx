import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Badge, Input, Modal, Alert } from '@farutech/design-system';
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

interface SubtipoDocOpcion {
  uuid: string;
  codigoSubtipo: string;
  nombre: string;
  prefijo: string;
  folioActual: number;
  formatoPlantilla: 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA';
}

const SUBTIPOS_PREDETERMINADOS: SubtipoDocOpcion[] = [
  { uuid: 'sub-sol', codigoSubtipo: 'SOL', nombre: 'SOLICITUD DE SERVICIOS Y AFILADO', prefijo: 'SOL', folioActual: 597, formatoPlantilla: 'TIRILLA' },
  { uuid: 'sub-rem', codigoSubtipo: 'REM', nombre: 'REMISIÓN DE ENTREGA Y DESPACHO', prefijo: 'REM', folioActual: 102, formatoPlantilla: 'MEDIA_CARTA' },
  { uuid: 'sub-cot', codigoSubtipo: 'COT', nombre: 'COTIZACIÓN TÉCNICA DE TALLER', prefijo: 'COT', folioActual: 340, formatoPlantilla: 'CARTA' },
  { uuid: 'sub-fac', codigoSubtipo: 'FAC', nombre: 'COMPROBANTE DE PAGO / FACTURA POS', prefijo: 'FE', folioActual: 1850, formatoPlantilla: 'TIRILLA' },
  { uuid: 'sub-gar', codigoSubtipo: 'GAR', nombre: 'GARANTÍA / RE-PROCESO DE TALLER', prefijo: 'GAR', folioActual: 45, formatoPlantilla: 'TIRILLA' },
];

interface SolicitudCapturaMixtaProps {
  canales: CanalOrigen[];
  tiposDocumento: TipoDocumentoIdentidad[];
  clientes: Cliente[];
  onAsentarSolicitud: (solicitud: {
    canalUuid: string;
    clienteUuid: string;
    lineas: LineaDetalleLocal[];
    totalPagadoInventario: number;
    anticipoVoBoAutorizado: boolean;
    observaciones?: string;
    pagosAbono?: PagoDistribucionLocal[];
  }) => Promise<void>;
  loading?: boolean;
}

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

  // Autocompletado / buscador predictivo de cliente
  const [clienteSearchQuery, setClienteSearchQuery] = useState('');
  const [isClienteDropdownOpen, setIsClienteDropdownOpen] = useState(false);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setIsClienteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cliente seleccionado actual
  const clienteSeleccionadoObj = useMemo(() => {
    return clientes.find((c) => c.uuid === selectedCliente) || clientes[0] || null;
  }, [clientes, selectedCliente]);

  // Lista predictiva de clientes filtrados (máximo 10 primeros)
  const clientesPredictivos = useMemo(() => {
    if (!clienteSearchQuery.trim()) return clientes.slice(0, 10);
    const q = clienteSearchQuery.toLowerCase();
    return clientes
      .filter((c) => c.nombreRazonSocial.toLowerCase().includes(q) || c.numeroDocumento.toLowerCase().includes(q))
      .slice(0, 10);
  }, [clientes, clienteSearchQuery]);

  // =========================================================================
  // CONTROL DOCUMENTAL (Tipo dado por Subcategorías, Número al final y Fecha sin hora)
  // =========================================================================
  const [subtiposDisponibles, setSubtiposDisponibles] = useState<SubtipoDocOpcion[]>(SUBTIPOS_PREDETERMINADOS);
  const [subtipoSeleccionadoUuid, setSubtipoSeleccionadoUuid] = useState<string>('sub-sol');

  // Intentar cargar subtipos adicionales desde el backend si existen
  useEffect(() => {
    let cancelado = false;
    const fetchSubtipos = async () => {
      try {
        const res = await catalogosApi.getTiposDocumento();
        if (cancelado || !res?.tipos) return;
        const extraSubtipos: SubtipoDocOpcion[] = [];
        res.tipos.forEach((tb) => {
          (tb.subtipos || []).forEach((st) => {
            extraSubtipos.push({
              uuid: st.uuid,
              codigoSubtipo: st.codigoSubtipo,
              nombre: st.nombre || tb.nombre,
              prefijo: st.prefijo || tb.codigoBase,
              folioActual: st.folioActual || 1,
              formatoPlantilla: (st.formatoPlantilla as 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA') || 'TIRILLA',
            });
          });
        });
        if (extraSubtipos.length > 0) {
          setSubtiposDisponibles((prev) => {
            const combinados = [...prev];
            extraSubtipos.forEach((es) => {
              if (!combinados.some((c) => c.codigoSubtipo === es.codigoSubtipo)) {
                combinados.push(es);
              }
            });
            return combinados;
          });
        }
      } catch {
        // Mantiene SUBTIPOS_PREDETERMINADOS
      }
    };
    fetchSubtipos();
    return () => {
      cancelado = true;
    };
  }, []);

  const subtipoActual = useMemo(() => {
    return subtiposDisponibles.find((s) => s.uuid === subtipoSeleccionadoUuid) || subtiposDisponibles[0];
  }, [subtiposDisponibles, subtipoSeleccionadoUuid]);

  const [modoNumeracion, setModoNumeracion] = useState<'AUTOMATICO' | 'MANUAL'>('AUTOMATICO');
  const [consecutivoNumero, setConsecutivoNumero] = useState<number>(subtipoActual.folioActual);
  const [numeroDocManual, setNumeroDocManual] = useState<string>('');
  const [plantillaFormato, setPlantillaFormato] = useState<'TIRILLA' | 'MEDIA_CARTA' | 'CARTA'>('TIRILLA');
  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);

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
    return d.toISOString().slice(0, 10);
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
  const [totalPagadoInventario, setTotalPagadoInventario] = useState<number>(0);
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
  const [voboError, setVoboError] = useState<string | null>(null);
  const [voboExcepcionAnticipo, setVoboExcepcionAnticipo] = useState(false);
  const [voboExcepcionInventario, setVoboExcepcionInventario] = useState(false);
  const [voboSelectAnticipoCheck, setVoboSelectAnticipoCheck] = useState(true);
  const [voboSelectInventarioCheck, setVoboSelectInventarioCheck] = useState(true);

  // Totales
  const totalAbonado = useMemo(() => pagosAbono.reduce((acc, p) => acc + p.monto, 0), [pagosAbono]);
  const totalInventario = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'INVENTARIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas]
  );
  const totalServicios = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas]
  );
  const cobroInventarioEfectivo = useMemo(
    () => Math.max(totalPagadoInventario, Math.min(totalAbonado, totalInventario)),
    [totalPagadoInventario, totalAbonado, totalInventario]
  );
  const abonoRestanteParaServicios = useMemo(
    () => Math.max(0, totalAbonado - Math.min(totalAbonado, totalInventario)),
    [totalAbonado, totalInventario]
  );
  const totalAnticipos = useMemo(() => {
    const anticiposManuales = lineas
      .filter((l) => l.naturaleza === 'SERVICIO')
      .reduce((acc, l) => acc + l.anticipoImputado, 0);
    return Math.max(anticiposManuales, abonoRestanteParaServicios);
  }, [lineas, abonoRestanteParaServicios]);
  const totalMinimoAnticiposExigido = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO' && l.exigeAnticipo)
        .reduce((acc, l) => acc + l.anticipoMinimo, 0),
    [lineas]
  );
  const totalNeto = totalInventario + totalServicios;
  const saldoPendiente = Math.max(0, totalNeto - (cobroInventarioEfectivo + totalAnticipos));

  const inventarioImpago = totalInventario > 0 && cobroInventarioEfectivo < totalInventario && !voboExcepcionInventario;
  const anticipoInsuficiente =
    totalMinimoAnticiposExigido > 0 &&
    totalAnticipos < totalMinimoAnticiposExigido &&
    !voboExcepcionAnticipo &&
    !voboAutorizado;

  // Manejador de abonos
  const handleAgregarPagoAbono = () => {
    const monto = Number(montoAbonoInput);
    if (!medioSeleccionadoUuid || !monto || monto <= 0) return;
    const medio = mediosPago.find((m) => m.uuid === medioSeleccionadoUuid);
    if (!medio) return;

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

    // Asegurar que el modal esté abierto para ver y confirmar detalles
    setIsModalLineaOpen(true);
    setIsItemBuscarModalOpen(false);
  };

  const handleCancelarItemSeleccionado = () => {
    setItemSeleccionado(null);
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

    if (precioAlterado && excedeTolerancia && politicaPrecios.requiereVoBoSuperaTolerancia && !voboAutorizado) {
      setAlertaPolitica(
        `⚠️ Variación de ${porcentajeDiferencia.toFixed(1)}% excede la tolerancia (${politicaPrecios.maxDiferenciaPorcentaje}%). Requiere VoBo.`
      );
      return;
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
    if (!voboSelectAnticipoCheck && !voboSelectInventarioCheck) {
      setVoboError('Debe seleccionar al menos una excepción a autorizar.');
      return;
    }
    if (voboSelectAnticipoCheck) {
      setVoboExcepcionAnticipo(true);
      setVoboAutorizado(true);
    }
    if (voboSelectInventarioCheck) {
      setVoboExcepcionInventario(true);
    }
    setIsVoBoModalOpen(false);
    setVoboError(null);
  };

  const handleAsentar = async () => {
    if (lineas.length === 0) return;
    if (inventarioImpago) {
      alert('Invariante #1: El inventario debe estar cubierto al 100% para asentar.');
      return;
    }
    if (anticipoInsuficiente) {
      alert('Se requiere el anticipo mínimo requerido o VoBo de Supervisor para continuar.');
      return;
    }

    await onAsentarSolicitud({
      canalUuid: selectedCanal || canales[0]?.uuid,
      clienteUuid: selectedCliente || clientes[0]?.uuid,
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
      {/* 1. CABECERA DOCUMENTAL (WIREFRAME 1: TIPO, NÚMERO, FECHA, DETALLE, CANAL/CLIENTE) */}
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

          {/* FILA 1: TIPO DOCUMENTO (DADO POR SUBCATEGORÍAS) | NÚMERO | FECHA (SOLO FECHA, NO HORA) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            {/* TIPO DOCUMENTO: Seleccionable desde Subcategorías de documento */}
            <div className="sm:col-span-6 lg:col-span-6">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                Tipo documento
              </label>
              <select
                value={subtipoSeleccionadoUuid}
                onChange={(e) => handleCambiarSubtipo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-semibold text-amber-300 cursor-pointer focus:border-indigo-500"
              >
                {subtiposDisponibles.map((sub) => (
                  <option key={sub.uuid} value={sub.uuid}>
                    {sub.codigoSubtipo} - {sub.nombre} ({sub.prefijo})
                  </option>
                ))}
              </select>
            </div>

            {/* NÚMERO: Muestra únicamente el número que le corresponde */}
            <div className="sm:col-span-3 lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Numero
                </label>
                <button
                  type="button"
                  onClick={() => setModoNumeracion(modoNumeracion === 'AUTOMATICO' ? 'MANUAL' : 'AUTOMATICO')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  {modoNumeracion === 'AUTOMATICO' ? 'Auto' : 'Manual'}
                </button>
              </div>
              {modoNumeracion === 'AUTOMATICO' ? (
                <div className="px-3 py-1.5 bg-[#020617] border border-emerald-500/50 rounded font-mono font-black text-sm text-emerald-400 text-center shadow-inner tracking-wider">
                  {consecutivoNumero}
                </div>
              ) : (
                <input
                  type="text"
                  value={numeroDocManual}
                  onChange={(e) => setNumeroDocManual(e.target.value.toUpperCase())}
                  placeholder={String(consecutivoNumero)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-indigo-500 rounded font-mono font-black text-sm text-emerald-300 text-center tracking-wider"
                />
              )}
            </div>

            {/* FECHA: Solo Fecha, no hora */}
            <div className="sm:col-span-3 lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                value={fechaDocumento}
                onChange={(e) => setFechaDocumento(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white cursor-pointer focus:border-indigo-500"
              />
            </div>
          </div>

          {/* FILA 2: DETALLE GENERAL */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
              Detalle
            </label>
            <input
              type="text"
              value={observacionesDocumento}
              onChange={(e) => setObservacionesDocumento(e.target.value)}
              placeholder="Detalle o concepto general de la solicitud..."
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* FILA 3: CANAL ORIGEN Y CLIENTE EN LA MISMA LÍNEA (CON BOTÓN LUPA 🔍 INCLUIDO A LA DERECHA) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-1">
            {/* Canal de Origen */}
            <div className="md:col-span-4">
              <label htmlFor="canal-origen" className="block text-xs font-semibold text-slate-300 mb-1">
                Canal Origen *
              </label>
              <select
                id="canal-origen"
                aria-label="Canal de Origen"
                value={selectedCanal}
                onChange={(e) => setSelectedCanal(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium focus:border-indigo-500"
              >
                {(canales || []).map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Cliente con input que tiene el botón lupa a la derecha */}
            <div className="md:col-span-8 relative" ref={clienteDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="cliente-search" className="text-xs font-semibold text-slate-300">
                  Cliente *
                </label>
                <div className="flex items-center gap-2">
                  {clienteSeleccionadoObj && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800 truncate max-w-[220px]">
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
              <div className="relative">
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
                  className="w-full pl-3 pr-11 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setIsClienteBuscarModalOpen(true)}
                  title="Búsqueda avanzada de clientes (Filtros por Documento, Nombre, Teléfono)"
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                >
                  🔍
                </button>
              </div>

              {/* Listbox Predictivo de Clientes */}
              {isClienteDropdownOpen && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl divide-y divide-slate-800 list-none p-0">
                  {clientesPredictivos.length === 0 ? (
                    <li className="p-3 text-xs text-slate-400 text-center">
                      No se encontraron clientes para "{clienteSearchQuery}".
                    </li>
                  ) : (
                    clientesPredictivos.map((cli) => (
                      <li
                        key={cli.uuid}
                        onClick={() => {
                          setSelectedCliente(cli.uuid);
                          setClienteSearchQuery('');
                          setIsClienteDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-indigo-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-300 font-semibold">{cli.numeroDocumento}</span>
                          <span className="text-white font-medium">{cli.nombreRazonSocial}</span>
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">{cli.telefono || 'Sin tel'}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
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

        {lineas.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <p className="text-slate-400 text-xs mb-3">
              No hay registros en el documento. Haga clic en <strong>"+ Adicionar Linea"</strong> para cargar productos o servicios.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAbrirNuevoRegistro}
            >
              + Adicionar Linea
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 font-semibold">
                  <th className="py-2 px-2.5">Tipo</th>
                  <th className="py-2 px-2.5">Descripción del Ítem</th>
                  <th className="py-2 px-2.5">📅 Fecha Entrega</th>
                  <th className="py-2 px-2.5 text-center">Cant.</th>
                  <th className="py-2 px-2.5 text-right">Precio Unit.</th>
                  <th className="py-2 px-2.5 text-right">Subtotal</th>
                  <th className="py-2 px-2.5 text-right">Anticipo Mín.</th>
                  <th className="py-2 px-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lineas.map((linea) => (
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
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-white">
                      {linea.cantidad}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                      ${linea.precioUnitario.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">
                      ${linea.subtotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-amber-300">
                      {linea.naturaleza === 'SERVICIO' ? (
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            aria-label={`Anticipo para ${linea.descripcion}`}
                            value={linea.anticipoImputado || ''}
                            placeholder={`Mín: ${linea.anticipoMinimo.toLocaleString()}`}
                            onChange={(e) =>
                              handleActualizarAnticipoLinea(linea.idTemp, Number(e.target.value))
                            }
                            className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right text-xs font-mono text-emerald-300"
                          />
                          {linea.anticipoImputado < linea.anticipoMinimo && (
                            <span className="text-[10px] text-amber-400">
                              Mín: ${linea.anticipoMinimo.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">N/A</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          {/* FILA 1: ITEM con LUPA 🔍 | FECHA ENTREGA 📅 */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* ITEM */}
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Item *
              </label>
              {itemSeleccionado ? (
                <div className="flex items-center justify-between p-2 bg-slate-900 border border-indigo-500/60 rounded-lg">
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
                    className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-xs font-semibold cursor-pointer shrink-0"
                    title="Cambiar ítem"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    onClick={() => setIsItemBuscarModalOpen(true)}
                    placeholder="Haga clic para buscar o seleccionar ítem..."
                    className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 cursor-pointer focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsItemBuscarModalOpen(true)}
                    title="Abrir buscador especializado de catálogo"
                    className="absolute right-1 top-1 bottom-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    🔍
                  </button>
                </div>
              )}
            </div>

            {/* FECHA ENTREGA con icono 📅 */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Fecha entrega 📅
              </label>
              <input
                type="date"
                value={fechaCompromisoLinea}
                onChange={(e) => setFechaCompromisoLinea(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white cursor-pointer focus:border-indigo-500"
              />
            </div>
          </div>

          {/* FILA 2: CANTIDAD | VALOR (PRECIO) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Cantidad */}
            <div className="sm:col-span-4">
              <label htmlFor="input-cantidad" className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Cantidad
              </label>
              <input
                id="input-cantidad"
                aria-label="Cantidad"
                type="number"
                min={1}
                value={cantidadManual}
                onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono font-bold text-white text-center focus:border-indigo-500"
              />
            </div>

            {/* Valor */}
            <div className="sm:col-span-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LADO IZQUIERDO: MEDIOS DE PAGO Y ABONOS */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wide m-0">
              Medios de Pago y Abonos de la Solicitud
            </h4>

            {/* Fila: Instrumento de Pago | Monto */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Instrumento de pago
                </label>
                <select
                  value={medioSeleccionadoUuid}
                  onChange={(e) => setMedioSeleccionadoUuid(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                >
                  {mediosPago.map((m) => (
                    <option key={m.uuid} value={m.uuid}>
                      {m.codigo} - {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Monto
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={montoAbonoInput}
                    onChange={(e) =>
                      setMontoAbonoInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="0"
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-emerald-300"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAgregarPagoAbono}
                    disabled={!montoAbonoInput || Number(montoAbonoInput) <= 0}
                  >
                    + Registrar
                  </Button>
                </div>
              </div>
            </div>

            {/* Fila: Referencia / Comprobante */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Referencia / Compoante
              </label>
              <input
                type="text"
                value={referenciaAbonoInput}
                onChange={(e) => setReferenciaAbonoInput(e.target.value)}
                placeholder="Ej: Aprobación Voucher #123456 o Transf. Bancolombia..."
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500"
              />
            </div>

            {/* Fila: Observaciones de Pago */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={observacionesPagoInput}
                onChange={(e) => setObservacionesPagoInput(e.target.value)}
                placeholder="Observación del recaudo o entrega..."
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500"
              />
            </div>

            {/* Lista de abonos registrados */}
            {pagosAbono.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Abonos Registrados ({pagosAbono.length}):
                </span>
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
                        className="text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                        title="Eliminar abono"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulador rápido de cobro total de inventario (compatibilidad y agilidad) */}
            {totalInventario > 0 && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTotalPagadoInventario(totalInventario)}
                  className="text-indigo-400 hover:text-indigo-300 text-xs"
                >
                  ⚡ Simular Cobro Total de Inventario
                </Button>
              </div>
            )}

            {/* Alertas de invariantes y políticas */}
            {inventarioImpago && (
              <div
                role="alert"
                className="p-2.5 bg-rose-950/40 border-l-4 border-rose-500 rounded-lg text-xs text-rose-200"
              >
                <strong>Invariante #1:</strong> El inventario debe estar pagado al 100% para asentar la solicitud.
              </div>
            )}

            {anticipoInsuficiente && (
              <div
                role="alert"
                className="p-2.5 bg-amber-950/40 border-l-4 border-amber-500 rounded-lg text-xs text-amber-200"
              >
                <strong>Anticipo Insuficiente:</strong> Los servicios exigen un anticipo mínimo de ${totalMinimoAnticiposExigido.toLocaleString()} (actual: ${totalAnticipos.toLocaleString()}).
                <div className="mt-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsVoBoModalOpen(true)}
                  >
                    Solicitar VoBo Supervisor (Excepción)
                  </Button>
                </div>
              </div>
            )}

            {voboAutorizado && (
              <div className="p-2 bg-emerald-950/40 border-l-4 border-emerald-500 rounded text-xs text-emerald-200">
                ✓ Excepción de anticipo autorizada por Supervisor.
              </div>
            )}
          </div>

          {/* LADO DERECHO: RESUMEN DE TOTALES (FORMATO WIREFRAME 1) */}
          <div className="lg:col-span-5 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
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

            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Total Abonado:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-400 text-right w-32">
                -${totalAbonado.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Total Pagado:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-300 text-right w-32">
                ${(cobroInventarioEfectivo + totalAnticipos).toLocaleString()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-white font-bold">
              <span>Total Neto:</span>
              <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-emerald-400 font-bold text-sm text-right w-32">
                ${totalNeto.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-rose-300 font-bold">
              <span>Saldo Pendiente:</span>
              <div className="px-3 py-1 bg-slate-900 border border-rose-900/50 rounded font-mono text-rose-400 font-bold text-sm text-right w-32">
                ${saldoPendiente.toLocaleString()}
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                fullWidth
                disabled={loading || lineas.length === 0 || inventarioImpago || anticipoInsuficiente}
                onClick={handleAsentar}
              >
                {loading ? 'Asentando...' : 'Asentar Solicitud'}
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
            Autorización de supervisor para asentar solicitud con excepciones comerciales.
          </p>
          {voboError && <Alert variant="danger">{voboError}</Alert>}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={voboSelectAnticipoCheck}
                onChange={(e) => setVoboSelectAnticipoCheck(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span><strong>Excepción Anticipo Servicios:</strong> Autorizar anticipo menor al mínimo requerido (40%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={voboSelectInventarioCheck}
                onChange={(e) => setVoboSelectInventarioCheck(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span><strong>Excepción Pago Total Inventario:</strong> Autorizar entrega sin cubrir el 100% de productos</span>
            </label>
          </div>

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
            placeholder="Ej: Cliente VIP corporativo"
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
