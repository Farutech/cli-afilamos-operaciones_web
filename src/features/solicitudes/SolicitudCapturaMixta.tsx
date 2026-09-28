import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Input, Modal, Alert } from '@farutech/design-system';
import { ItemSelector } from '../catalogos/ItemSelector';
import { RegistroClienteModal } from '../clientes/RegistroClienteModal';
import { catalogosApi } from '../../services/catalogosApi';
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
}

export interface PagoDistribucionLocal {
  idTemp: string;
  instrumentoUuid: string;
  instrumentoCodigo: string;
  instrumentoNombre: string;
  monto: number;
  referencia: string;
}

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

  // Subtipos de Documento y Consecutivos (Tipo Novasoft)
  const [subtipoDoc, setSubtipoDoc] = useState<string>('SOL-GEN');
  const [subtipoPersonalizado, setSubtipoPersonalizado] = useState<string>('');
  const [plantillaFormato, setPlantillaFormato] = useState<'TIRILLA' | 'MEDIA_CARTA' | 'CARTA'>('TIRILLA');
  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);

  // Fecha y hora del documento (datetime-local picker estilo Novasoft)
  const [fechaDocumento, setFechaDocumento] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Fecha y hora prometida de entrega
  const [fechaEntrega, setFechaEntrega] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });


  const textoFechaEntrega = useMemo(() => {
    if (!fechaEntrega) return 'No especificada';
    try {
      const d = new Date(fechaEntrega);
      return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return fechaEntrega;
    }
  }, [fechaEntrega]);

  const [sufijoDoc, setSufijoDoc] = useState<string>('');
  const [numeroDocManual, setNumeroDocManual] = useState<string>('');

  const infoConsecutivo = useMemo(() => {
    switch (subtipoDoc) {
      case 'SOL-PREF':
        return {
          prefijo: 'SP',
          subtipoNombre: 'Solicitud Prioritaria / VIP',
          siguienteNumero: 'SP-0001',
          longitud: 4,
          tipoImpresion: 'Carta Completa / Formato Especial',
        };
      case 'SOL-GAR':
        return {
          prefijo: 'GA',
          subtipoNombre: 'Garantía Técnica de Afilado',
          siguienteNumero: 'GA-0001',
          longitud: 4,
          tipoImpresion: 'Tirilla POS 80mm / Media Carta',
        };
      case 'SOL-EXP':
        return {
          prefijo: 'SX',
          subtipoNombre: 'Servicio Exprés en Mostrador',
          siguienteNumero: 'SX-0001',
          longitud: 4,
          tipoImpresion: 'Tirilla POS 80mm',
        };
      case 'SOL-MAY':
        return {
          prefijo: 'SM',
          subtipoNombre: 'Distribuidor / Mayorista',
          siguienteNumero: 'SM-0001',
          longitud: 4,
          tipoImpresion: 'Carta Completa (Factura/OT)',
        };
      case 'OTRO':
        return {
          prefijo: (subtipoPersonalizado || 'SO').slice(0, 3).toUpperCase(),
          subtipoNombre: subtipoPersonalizado || 'Solicitud Personalizada',
          siguienteNumero: `${(subtipoPersonalizado || 'SO').slice(0, 2).toUpperCase()}-0001`,
          longitud: 4,
          tipoImpresion: 'Tirilla POS 80mm',
        };
      case 'SOL-GEN':
      default:
        return {
          prefijo: 'SG',
          subtipoNombre: 'Solicitud General de Taller e Inventario',
          siguienteNumero: 'SG-0003',
          longitud: 4,
          tipoImpresion: 'Tirilla POS 80mm / Media Carta',
        };
    }
  }, [subtipoDoc, subtipoPersonalizado]);

  // Folio visible por defecto con el prefijo y sufijo
  const folioCompletoVisible = useMemo(() => {
    const base = numeroDocManual || infoConsecutivo.siguienteNumero;
    return sufijoDoc ? `${base}-${sufijoDoc}` : base;
  }, [numeroDocManual, infoConsecutivo.siguienteNumero, sufijoDoc]);

  const [lineas, setLineas] = useState<LineaDetalleLocal[]>([]);
  const [totalPagadoInventario, setTotalPagadoInventario] = useState<number>(0);
  const [voboAutorizado, setVoboAutorizado] = useState(false);
  // Aviso de la política de precios (bloqueo/tolerancia) al agregar una línea.
  const [alertaPolitica, setAlertaPolitica] = useState<string | null>(null);

  // Política de precios en mostrador (orquestada desde el catálogo maestro).
  const [politicaPrecios, setPoliticaPrecios] = useState<PoliticaPrecios>({
    permiteModificarPrecio: false,
    maxDiferenciaPorcentaje: 0,
    requiereVoBoSuperaTolerancia: true,
    permitirMultiplicadorLista: false,
  });
  const [politicaCargando, setPoliticaCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const cargarPolitica = async () => {
      try {
        const politica = await catalogosApi.getPoliticaPrecios();
        if (!cancelado) setPoliticaPrecios(politica);
      } catch {
        if (!cancelado) {
          setPoliticaPrecios({
            permiteModificarPrecio: false,
            maxDiferenciaPorcentaje: 0,
            requiereVoBoSuperaTolerancia: true,
            permitirMultiplicadorLista: false,
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

  // Ítem cargado desde el catálogo (autocompletado o lupa modal)
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const [precioBaseRef, setPrecioBaseRef] = useState<number>(0);
  const [listaPrecioSeleccionada, setListaPrecioSeleccionada] = useState<string>('');
  // Listas de precios paramétricas desde el catálogo maestro (no hardcoded).
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
          // La lista predeterminada (o la primera) queda seleccionada por defecto.
          const predeterminada = activas.find((l) => l.esPredeterminada) || activas[0];
          setListaPrecioSeleccionada((actual) =>
            actual && activas.some((l) => l.uuid === actual) ? actual : predeterminada.uuid
          );
        }
      } catch {
        // Sin listas del servidor no se ofrece selector; el precio base manda.
        if (!cancelado) setListasPrecio([]);
      }
    };
    cargarListas();
    return () => {
      cancelado = true;
    };
  }, []);

  // Listado de medios de pago para abonos
  const [mediosPago, setMediosPago] = useState<MedioPagoInstrumento[]>([]);
  const [pagosAbono, setPagosAbono] = useState<PagoDistribucionLocal[]>([]);
  const [medioSeleccionadoUuid, setMedioSeleccionadoUuid] = useState<string>('');
  const [montoAbonoInput, setMontoAbonoInput] = useState<number | ''>('');
  const [referenciaAbonoInput, setReferenciaAbonoInput] = useState<string>('');
  const [observacionesDocumento, setObservacionesDocumento] = useState<string>('');

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
  const [franjaCompromiso, setFranjaCompromiso] = useState('HOY TARDE');
  const [stockRefActual, setStockRefActual] = useState<number | null>(null);
  const [itemCatIdActual, setItemCatIdActual] = useState<string | undefined>(undefined);

  // Modal VoBo Supervisor y excepciones
  const [isVoBoModalOpen, setIsVoBoModalOpen] = useState(false);
  const [supervisorCodigo, setSupervisorCodigo] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [justificacionVoBo, setJustificacionVoBo] = useState('');
  const [voboError, setVoboError] = useState<string | null>(null);
  const [voboExcepcionAnticipo, setVoboExcepcionAnticipo] = useState(false);
  const [voboExcepcionInventario, setVoboExcepcionInventario] = useState(false);
  const [voboSelectAnticipoCheck, setVoboSelectAnticipoCheck] = useState(true);
  const [voboSelectInventarioCheck, setVoboSelectInventarioCheck] = useState(true);

  // Cálculos de totales y distribución de abono
  const totalAbonado = useMemo(
    () => pagosAbono.reduce((acc, p) => acc + p.monto, 0),
    [pagosAbono]
  );

  const totalInventario = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'INVENTARIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  const totalServicios = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  // Abonos aplicados primero a inventario (exige 100%), el resto a servicios
  const cobroInventarioEfectivo = useMemo(
    () => Math.max(totalPagadoInventario, Math.min(totalAbonado, totalInventario)),
    [totalPagadoInventario, totalAbonado, totalInventario]
  );

  const abonoRestanteParaServicios = useMemo(
    () => Math.max(0, totalAbonado - Math.min(totalAbonado, totalInventario)),
    [totalAbonado, totalInventario]
  );

  const totalAnticipos = useMemo(
    () => {
      const anticiposManuales = lineas
        .filter((l) => l.naturaleza === 'SERVICIO')
        .reduce((acc, l) => acc + l.anticipoImputado, 0);
      return Math.max(anticiposManuales, abonoRestanteParaServicios);
    },
    [lineas, abonoRestanteParaServicios],
  );

  const totalMinimoAnticiposExigido = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO' && l.exigeAnticipo)
        .reduce((acc, l) => acc + l.anticipoMinimo, 0),
    [lineas],
  );

  const totalNeto = totalInventario + totalServicios;
  const saldoPendiente = Math.max(0, totalNeto - (cobroInventarioEfectivo + totalAnticipos));

  // Invariantes
  const inventarioImpago = totalInventario > 0 && cobroInventarioEfectivo < totalInventario && !voboExcepcionInventario;
  const anticipoInsuficiente = totalMinimoAnticiposExigido > 0 && totalAnticipos < totalMinimoAnticiposExigido && !voboExcepcionAnticipo && !voboAutorizado;

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
  };

  const handleEliminarPagoAbono = (idTemp: string) => {
    setPagosAbono((prev) => prev.filter((p) => p.idTemp !== idTemp));
  };

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
    // La lista por defecto es la asignada al ítem (si existe en el catálogo cargado).
    if (item.listaPrecioUuid && listasPrecio.some((l) => l.uuid === item.listaPrecioUuid)) {
      setListaPrecioSeleccionada(item.listaPrecioUuid);
    }
  };

  const handleCancelarItemSeleccionado = () => {
    setItemSeleccionado(null);
    setItemCatIdActual(undefined);
    setDescripcionManual('');
    setCantidadManual(1);
    setPrecioManual(0);
    setPrecioBaseRef(0);
    setStockRefActual(null);
    setAlertaPolitica(null);
  };

  const handleAgregarLinea = () => {
    if (!itemSeleccionado || !descripcionManual.trim() || cantidadManual <= 0 || precioManual < 0) return;

    // ─── Validación de la Política de Precios (definición del backend, no regla local) ───
    const referenciaPrecio = precioBaseRef;
    const precioAlterado = referenciaPrecio > 0 && precioManual !== referenciaPrecio;
    const porcentajeDiferencia =
      referenciaPrecio > 0 ? (Math.abs(precioManual - referenciaPrecio) / referenciaPrecio) * 100 : 0;
    const excedeTolerancia = porcentajeDiferencia > politicaPrecios.maxDiferenciaPorcentaje;

    if (precioAlterado && !politicaPrecios.permiteModificarPrecio) {
      setAlertaPolitica(
        `⛔ La política global de precios no permite modificar el precio unitario desde mostrador (diferencia de ${porcentajeDiferencia.toFixed(2)}% vs. catálogo).`
      );
      return;
    }

    if (precioAlterado && excedeTolerancia && politicaPrecios.requiereVoBoSuperaTolerancia && !voboAutorizado) {
      setAlertaPolitica(
        `⚠️ La diferencia de ${porcentajeDiferencia.toFixed(2)}% supera la tolerancia de la política (${politicaPrecios.maxDiferenciaPorcentaje}%). Requiere VoBo de supervisor antes de asentar.`
      );
      return;
    }

    setAlertaPolitica(null);

    const subtotal = cantidadManual * precioManual;
    const esServicio = naturalezaManual === 'SERVICIO';
    const porcentajeMin = esServicio ? 40 : 0;
    const minAnticipo = esServicio ? Math.round(subtotal * (porcentajeMin / 100)) : 0;

    const nuevaLinea: LineaDetalleLocal = {
      idTemp: `linea-${Date.now()}-${Math.random()}`,
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
      franjaCompromiso: esServicio ? franjaCompromiso.trim() : '',
    };

    setLineas((prev) => [...prev, nuevaLinea]);

    // Reset formulario línea
    setItemSeleccionado(null);
    setDescripcionManual('');
    setCantidadManual(1);
    setPrecioManual(0);
    setPrecioBaseRef(0);
    setStockRefActual(null);
    setItemCatIdActual(undefined);
    setFranjaCompromiso('HOY TARDE');
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
      }),
    );
  };

  const handleClienteCreado = (nuevo: Cliente) => {
    setClientes((prev) => [...prev, nuevo]);
    setSelectedCliente(nuevo.uuid);
  };

  const handleAprobarVoBo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorCodigo.trim() || !supervisorPin.trim() || !justificacionVoBo.trim()) {
      setVoboError('Todos los campos son obligatorios para el VoBo de excepción.');
      return;
    }
    if (!voboSelectAnticipoCheck && !voboSelectInventarioCheck) {
      setVoboError('Debe seleccionar al menos una excepción a autorizar (anticipo o inventario).');
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
      alert('Invariante #1: No se puede asentar la solicitud. El inventario debe estar cubierto al 100%.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Cabecera de Solicitud (Control Documental Estilo Novasoft) */}
      <Card>
        {/* Barra de Subtipo de Documento & Plantilla */}
        <div className="mb-4 pb-4 border-b border-gray-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Tipo / Subtipo de Solicitud:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subtipoDoc}
                  onChange={(e) => {
                    setSubtipoDoc(e.target.value);
                    setNumeroDocManual('');
                  }}
                  style={{
                    padding: '0.45rem 0.75rem',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="SOL-GEN">📄 SOL-GEN · Solicitud Estándar (General Taller)</option>
                  <option value="SOL-PREF">⭐ SOL-PREF · Solicitud Prioritaria / VIP</option>
                  <option value="SOL-GAR">🛡️ SOL-GAR · Garantía Técnica de Afilado</option>
                  <option value="SOL-EXP">⚡ SOL-EXP · Servicio Exprés en Mostrador</option>
                  <option value="SOL-MAY">🏢 SOL-MAY · Distribuidor / Mayorista</option>
                  <option value="OTRO">✏️ Otro (Subtipo Personalizado)</option>
                </select>

                {subtipoDoc === 'OTRO' && (
                  <input
                    type="text"
                    placeholder="Escriba código o subtipo..."
                    value={subtipoPersonalizado}
                    onChange={(e) => setSubtipoPersonalizado(e.target.value.toUpperCase())}
                    style={{
                      padding: '0.45rem 0.75rem',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #6366f1',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem',
                    }}
                  />
                )}

                <Badge variant={subtipoDoc === 'SOL-PREF' ? 'warning' : subtipoDoc === 'SOL-EXP' ? 'danger' : 'info'}>
                  {infoConsecutivo.subtipoNombre}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] text-gray-400 block font-semibold mb-1">
                  Plantilla de Salida:
                </label>
                <select
                  value={plantillaFormato}
                  onChange={(e) => setPlantillaFormato(e.target.value as any)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="TIRILLA">🧾 Tirilla POS 80mm</option>
                  <option value="MEDIA_CARTA">📋 Media Carta (Talón Taller)</option>
                  <option value="CARTA">📄 Carta Completa (Factura/OT)</option>
                </select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsPlantillaModalOpen(true)}
                style={{ marginTop: '1.25rem' }}
              >
                👁️ Ver Formato
              </Button>
            </div>
          </div>

          {/* Grilla Documental: Prefijo + Consecutivo + Sufijo + Fecha Documento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            padding: '0.875rem',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Prefijo Documento
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '0.9rem',
                }}>
                  {infoConsecutivo.prefijo}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Long: {infoConsecutivo.longitud} dígitos</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Número / Consecutivo *
              </label>
              <input
                type="text"
                value={numeroDocManual || infoConsecutivo.siguienteNumero}
                onChange={(e) => setNumeroDocManual(e.target.value)}
                placeholder={infoConsecutivo.siguienteNumero}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: '#020617',
                  border: '1px solid #475569',
                  borderRadius: '0.375rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#34d399',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Sufijo Opcional
              </label>
              <input
                type="text"
                value={sufijoDoc}
                onChange={(e) => setSufijoDoc(e.target.value.toUpperCase())}
                placeholder="Ej: 2026 o B"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: '#020617',
                  border: '1px solid #475569',
                  borderRadius: '0.375rem',
                  fontFamily: 'monospace',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Fecha / Hora Documento *
              </label>
              <input
                type="datetime-local"
                value={fechaDocumento}
                onChange={(e) => setFechaDocumento(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: '#020617',
                  border: '1px solid #475569',
                  borderRadius: '0.375rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Sección de Fecha Prometida de Entrega con Formato */}
          <div style={{
            padding: '0.875rem',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid #3b82f6',
            borderRadius: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📅 Fecha y Franja Prometida de Entrega (Taller)
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                * Requerida para compromisos de servicio técnico
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="datetime-local"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#020617',
                  border: '1px solid #3b82f6',
                  borderRadius: '0.375rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>
                  🕒 Compromiso:{' '}
                  <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>
                    {textoFechaEntrega}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '0 0.25rem' }}>
            <span>
              Identificador Completo a Asentar:{' '}
              <strong style={{ fontFamily: 'monospace', color: '#ffffff', fontSize: '0.85rem' }}>{folioCompletoVisible}</strong>
            </span>
            <Badge variant="success">Consecutivo Activo</Badge>
          </div>
        </div>

        {/* Canal y Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="select-canal" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Canal de Origen *
            </label>
            <select
              id="select-canal"
              value={selectedCanal}
              onChange={(e) => setSelectedCanal(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: '#020617',
                color: '#f8fafc',
              }}
            >
              {(canales || []).map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label htmlFor="select-cliente" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setIsClienteModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                + Nuevo Cliente
              </button>
            </div>
            <select
              id="select-cliente"
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '0.875rem',
                background: '#020617',
                color: '#f8fafc',
              }}
            >
              {(clientes || []).map((cli) => (
                <option key={cli.uuid} value={cli.uuid}>
                  {cli.nombreRazonSocial} ({cli.numeroDocumento})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Observaciones Generales del Documento */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
          <label htmlFor="observaciones-doc" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: '#e2e8f0' }}>
            📝 Observaciones Generales del Documento & Recepción de Herramientas
          </label>
          <textarea
            id="observaciones-doc"
            rows={2}
            value={observacionesDocumento}
            onChange={(e) => setObservacionesDocumento(e.target.value)}
            placeholder="Ingrese notas sobre el estado inicial de la herramienta, filos dañados, indicaciones especiales del cliente..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              background: '#020617',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.875rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </Card>

      {/* 2. Captura de Línea (Exclusiva por Catálogo: Autocompletado + Lupa 🔍 Especializada) */}
      <Card>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }} className="text-white">
          Agregar Ítems a la Solicitud
        </h4>

        {!itemSeleccionado ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              Seleccione un ítem del catálogo maestro usando el buscador predictivo o la <strong>lupa 🔍</strong> especializada.
            </p>
            <ItemSelector onSelectItem={handleSelectItemCatalogo} />
            {politicaCargando && (
              <p className="text-[11px] text-amber-300">Cargando política de precios…</p>
            )}
          </div>
        ) : (
          <div style={{
            padding: '1.25rem',
            borderRadius: '0.75rem',
            background: '#090d16',
            border: '1px solid #6366f1',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          }}>
            {/* Cabecera del Ítem Seleccionado */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.85rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}>
                  {itemSeleccionado.codigoReferencia}
                </span>
                <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>
                  {itemSeleccionado.nombre}
                </span>
                {itemSeleccionado.categoria?.nombre && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    📁 {itemSeleccionado.categoria.rutaCompleta || itemSeleccionado.categoria.nombre}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  ✓ Datos cargados desde catálogo
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge variant={itemSeleccionado.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                  {itemSeleccionado.naturaleza === 'INVENTARIO' ? 'PRODUCTO (Inventario)' : 'SERVICIO (Taller / OT)'}
                </Badge>
                <button
                  type="button"
                  onClick={handleCancelarItemSeleccionado}
                  style={{
                    fontSize: '0.8rem',
                    color: '#f87171',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ✖ Cambiar ítem
                </button>
              </div>
            </div>

            {/* Campos Estructurados del Ítem con Valores Visibles y de Alto Contraste */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label htmlFor="input-cantidad-item" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                    Cantidad *
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>Unidades</span>
                </div>
                <input
                  id="input-cantidad-item"
                  aria-label="Cantidad"
                  type="number"
                  min={1}
                  value={cantidadManual}
                  onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: '#020617',
                    border: '1px solid #6366f1',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                    Lista de Precios
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 600 }}>Tarifa</span>
                </div>
                {listasPrecio.length > 0 ? (
                  <select
                    value={listaPrecioSeleccionada}
                    onChange={(e) => {
                      const listaUuid = e.target.value;
                      setListaPrecioSeleccionada(listaUuid);
                      const lista = listasPrecio.find((l) => l.uuid === listaUuid);
                      if (lista) {
                        const precioConLista = Math.round(
                          precioBaseRef * (1 + lista.porcentajeAjuste / 100)
                        );
                        setPrecioManual(Math.max(0, precioConLista));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: '#020617',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(listasPrecio || []).map((l) => (
                      <option key={l.uuid} value={l.uuid}>
                        {l.nombre}
                        {l.esPredeterminada ? ' (Base)' : ''} ({l.porcentajeAjuste >= 0 ? '+' : ''}
                        {l.porcentajeAjuste}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '0.55rem 0.75rem', background: '#020617', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Precio Base del Catálogo
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                    Precio Unit. (COP) *
                  </label>
                  {!politicaPrecios.permiteModificarPrecio ? (
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>🔒 Bloqueado</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>✏️ Modificable</span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  step={500}
                  disabled={!politicaPrecios.permiteModificarPrecio}
                  value={precioManual}
                  onChange={(e) => setPrecioManual(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: '#020617',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: !politicaPrecios.permiteModificarPrecio ? 0.85 : 1,
                  }}
                />
              </div>

              {itemSeleccionado.naturaleza === 'SERVICIO' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                      Compromiso Taller
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>Franja</span>
                  </div>
                  <select
                    value={franjaCompromiso}
                    onChange={(e) => setFranjaCompromiso(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: '#020617',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="HOY TARDE">Hoy en la Tarde</option>
                    <option value="MAÑANA">Mañana</option>
                    <option value="24 HORAS">En 24 Horas</option>
                    <option value="48 HORAS">En 48 Horas</option>
                    <option value="URGENTE">Urgente (Prioritario)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                      Stock Referencial
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Bodega</span>
                  </div>
                  <div style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    background: '#020617',
                    border: '1px solid #475569',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    boxSizing: 'border-box',
                  }}>
                    {stockRefActual != null ? `${stockRefActual} disponibles` : 'N/A'}
                  </div>
                </div>
              )}

              <div>
                <Button type="button" variant="primary" onClick={handleAgregarLinea} fullWidth style={{ height: '42px', fontWeight: 700, fontSize: '0.85rem' }}>
                  + Agregar Línea
                </Button>
              </div>
            </div>

            {/* Alerta de Política de Precios (definición orquestada por el backend) */}
            {alertaPolitica && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 flex items-center gap-2">
                <span>🛡️</span>
                <span>{alertaPolitica}</span>
                <button
                  type="button"
                  onClick={() => setAlertaPolitica(null)}
                  className="ml-auto text-amber-400 hover:text-amber-200 font-bold cursor-pointer"
                >
                  ✖
                </button>
              </div>
            )}

            {/* Alerta de Política de Precios si la variación supera el límite */}
            {precioBaseRef > 0 && Math.abs(precioManual - precioBaseRef) / precioBaseRef * 100 > politicaPrecios.maxDiferenciaPorcentaje && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  <strong>Alerta de Precio:</strong> La variación sobre el precio base ({new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precioBaseRef)}) supera la tolerancia máxima autorizada ({politicaPrecios.maxDiferenciaPorcentaje}%). Requiere autorización VoBo al asentar la orden.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400">
              <span>
                Subtotal Línea:{' '}
                <strong className="text-emerald-400 font-mono text-sm">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cantidadManual * precioManual)}
                </strong>
              </span>
              <span>
                Base Catálogo: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precioBaseRef)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Tabla de Líneas Mixtas */}
      <Card>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Líneas del Documento ({lineas.length})</h4>

        {lineas.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '2rem 0' }}>
            No hay ítems agregados. Utilice el buscador de catálogo o el formulario superior.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.5rem' }}>Descripción</th>
                  <th style={{ padding: '0.5rem' }}>Cant.</th>
                  <th style={{ padding: '0.5rem' }}>Precio Unit.</th>
                  <th style={{ padding: '0.5rem' }}>Subtotal</th>
                  <th style={{ padding: '0.5rem' }}>Anticipo Imputado</th>
                  <th style={{ padding: '0.5rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(lineas || []).map((linea) => {
                  const stockInsuficiente =
                    linea.naturaleza === 'INVENTARIO' &&
                    linea.stockReferencial != null &&
                    linea.cantidad > linea.stockReferencial;

                  return (
                    <tr key={linea.idTemp} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Badge variant={linea.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                          {linea.naturaleza === 'INVENTARIO' ? 'PRODUCTO' : 'SERVICIO'}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div>{linea.descripcion}</div>
                        {stockInsuficiente && (
                          <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
                            ⚠️ Cantidad ({linea.cantidad}) supera el stock referencial ({linea.stockReferencial})
                          </span>
                        )}
                        {linea.franjaCompromiso && (
                          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                            📅 Compromiso: {linea.franjaCompromiso}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>{linea.cantidad}</td>
                      <td style={{ padding: '0.5rem' }}>${linea.precioUnitario.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>${linea.subtotal.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {linea.naturaleza === 'SERVICIO' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input
                              type="number"
                              aria-label={`Anticipo para ${linea.descripcion}`}
                              value={linea.anticipoImputado || ''}
                              placeholder={`Mín: $${linea.anticipoMinimo.toLocaleString()}`}
                              onChange={(e) =>
                                handleActualizarAnticipoLinea(linea.idTemp, Number(e.target.value))
                              }
                              style={{
                                width: '110px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.8125rem',
                              }}
                            />
                            {linea.anticipoImputado < linea.anticipoMinimo && (
                              <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                Mín. 40%: ${linea.anticipoMinimo.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>N/A (Pago 100%)</span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleEliminarLinea(linea.idTemp)}
                        >
                          Quitar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3B. Distribución de Formas de Pago para Abonos y Anticipos */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              💳 Forma de Pago del Abono / Anticipo
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Distribuya el monto que el cliente abona hoy entre los diferentes medios de pago configurados en tesorería (Efectivo, Transferencia, Datáfono, etc.).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', background: '#020617', border: '1px solid #334155', padding: '0.35rem 0.75rem', borderRadius: '6px', color: '#e2e8f0' }}>
              Total Abonado: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>${totalAbonado.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Formulario para agregar una línea de medio de pago */}
        <div style={{
          padding: '1rem',
          background: '#090d16',
          borderRadius: '0.5rem',
          border: '1px solid #334155',
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
              Medio de Pago *
            </label>
            <select
              value={medioSeleccionadoUuid}
              onChange={(e) => setMedioSeleccionadoUuid(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#020617',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {mediosPago.length > 0 ? (
                mediosPago.map((mp) => (
                  <option key={mp.uuid} value={mp.uuid}>
                    {mp.nombre} ({mp.categoria || 'GENERAL'})
                  </option>
                ))
              ) : (
                <>
                  <option value="EFECTIVO-01">Efectivo Caja Mostrador</option>
                  <option value="BANCO-01">Transferencia Bancaria (Bancolombia)</option>
                  <option value="POS-01">Datáfono / Tarjeta Débito-Crédito</option>
                  <option value="DIGITAL-01">Billetera Digital (Nequi / Daviplata)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
              Monto a Abonar (COP) *
            </label>
            <input
              type="number"
              min={1}
              step={1000}
              placeholder="Ej: 50000"
              value={montoAbonoInput}
              onChange={(e) => setMontoAbonoInput(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#020617',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>
              Comprobante / Referencia (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Aprobación #123456"
              value={referenciaAbonoInput}
              onChange={(e) => setReferenciaAbonoInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#020617',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleAgregarPagoAbono}
              disabled={!montoAbonoInput || Number(montoAbonoInput) <= 0}
              style={{ height: '40px', fontWeight: 700, fontSize: '0.85rem' }}
            >
              + Agregar Forma de Pago
            </Button>
          </div>
        </div>

        {/* Tabla de Pagos de Abono Agregados */}
        {pagosAbono.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', background: '#020617', borderRadius: '6px', border: '1px dashed #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
            No se han registrado pagos específicos de abono. Si el cliente efectúa un pago parcial o anticipo, regístrelo seleccionando el medio y monto.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.5rem' }}>Instrumento de Pago</th>
                  <th style={{ padding: '0.5rem' }}>Referencia / Soporte</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto Abonado</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pagosAbono.map((pago) => (
                  <tr key={pago.idTemp} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>
                      {pago.instrumentoNombre}
                    </td>
                    <td style={{ padding: '0.5rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {pago.referencia || '— (Cobro directo)'}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                      ${pago.monto.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarPagoAbono(pago.idTemp)}
                      >
                        ✕ Quitar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Resumen Financiero e Invariantes */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Bloque de advertencias e invariantes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
            {inventarioImpago && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  background: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#991b1b',
                }}
              >
                <strong>Invariante #1:</strong> El inventario (${totalInventario.toLocaleString()}) debe estar
                pagado al 100% para asentar la solicitud. Actualmente pagado: ${cobroInventarioEfectivo.toLocaleString()}.
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalPagadoInventario(totalInventario)}
                  >
                    Simular Cobro Total de Inventario ($ {totalInventario.toLocaleString()})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVoboSelectInventarioCheck(true);
                      setVoboSelectAnticipoCheck(false);
                      setIsVoBoModalOpen(true);
                    }}
                  >
                    Solicitar VoBo Supervisor (Excepción)
                  </Button>
                </div>
              </div>
            )}

            {anticipoInsuficiente && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  background: '#fffbeb',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#92400e',
                }}
              >
                <strong>Anticipo Insuficiente:</strong> Los servicios exigen un anticipo mínimo de $
                {totalMinimoAnticiposExigido.toLocaleString()} (actual: ${totalAnticipos.toLocaleString()}).
                <div style={{ marginTop: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVoboSelectAnticipoCheck(true);
                      setVoboSelectInventarioCheck(false);
                      setIsVoBoModalOpen(true);
                    }}
                  >
                    Solicitar VoBo Supervisor (Excepción)
                  </Button>
                </div>
              </div>
            )}

            {(voboAutorizado || voboExcepcionAnticipo) && (
              <div
                style={{
                  padding: '0.5rem',
                  background: '#ecfdf5',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#065f46',
                }}
              >
                ✓ Excepción de anticipo autorizada por Supervisor.
              </div>
            )}

            {voboExcepcionInventario && (
              <div
                style={{
                  padding: '0.5rem',
                  background: '#eff6ff',
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#1e40af',
                }}
              >
                ✓ Excepción de entrega de inventario sin pago 100% autorizada por Supervisor.
              </div>
            )}
          </div>

          {/* Totales */}
          <div style={{ minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Inventario:</span>
              <strong>${totalInventario.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Servicios:</span>
              <strong>${totalServicios.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Anticipos Imputados:</span>
              <strong style={{ color: '#16a34a' }}>-${totalAnticipos.toLocaleString()}</strong>
            </div>
            {totalPagadoInventario > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Pago Directo Inventario:</span>
                <strong style={{ color: '#16a34a' }}>-${totalPagadoInventario.toLocaleString()}</strong>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
              <span>Total Neto:</span>
              <span>${totalNeto.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
              <span>Saldo Pendiente:</span>
              <span>${saldoPendiente.toLocaleString()}</span>
            </div>

            <div style={{ marginTop: '1rem' }}>
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

      {/* Modal Reutilizable Registro de Cliente */}
      <RegistroClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onClienteCreado={handleClienteCreado}
        tiposDocumento={tiposDocumento}
      />

      {/* Modal Vista Previa de Plantilla / Formato de Documento HTML */}
      <Modal
        isOpen={isPlantillaModalOpen}
        onClose={() => setIsPlantillaModalOpen(false)}
        title={`Vista Previa de Documento: ${infoConsecutivo.siguienteNumero} (${plantillaFormato})`}
        size="lg"
      >
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex justify-between items-center bg-gray-900/60 p-3 rounded-xl border border-white/10 text-xs">
            <div>
              <span className="text-gray-400">Subtipo Configurado: </span>
              <span className="font-bold text-white">{infoConsecutivo.subtipoNombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{plantillaFormato}</Badge>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                🖨️ Imprimir
              </Button>
            </div>
          </div>

          {/* Contenedor del documento HTML según formato */}
          <div
            className={`mx-auto bg-white text-gray-900 rounded-lg shadow-2xl p-6 font-sans transition-all ${
              plantillaFormato === 'TIRILLA'
                ? 'max-w-[320px] text-xs'
                : plantillaFormato === 'MEDIA_CARTA'
                ? 'max-w-[550px] text-sm'
                : 'max-w-full text-sm'
            }`}
          >
            {/* Encabezado del documento */}
            <div className="text-center border-b border-gray-300 pb-3 mb-3">
              <h2 className="text-base font-black tracking-wider uppercase m-0">ORDEON POS & TALLER</h2>
              <p className="text-[11px] text-gray-600 m-0 font-medium">Afilamos Operaciones S.A.S.</p>
              <p className="text-[10px] text-gray-500 m-0">NIT: 900.123.456-7 · Régimen Responsable de IVA</p>
              <p className="text-[10px] text-gray-500 m-0">Carrera 15 # 45-67, Bogotá D.C. · Tel: (601) 321 4567</p>

              <div className="mt-2.5 inline-block px-3 py-1 bg-gray-100 rounded border border-gray-300">
                <span className="font-mono font-bold text-sm tracking-widest text-gray-800">
                  {infoConsecutivo.siguienteNumero}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {subtipoDoc === 'SOL-GEN' ? 'ORDEN DE SERVICIO & TALLER' : 'ORDEN PRIORITARIA / PREFERENCIAL'}
              </div>
            </div>

            {/* Datos del Cliente y Emisión */}
            <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-gray-200 pb-2.5 mb-3">
              <div>
                <span className="text-gray-500 block">Cliente:</span>
                <strong className="block text-gray-900">
                  {clientes.find((c) => c.uuid === selectedCliente)?.nombreRazonSocial || 'Consumidor Final'}
                </strong>
                <span className="text-gray-600">
                  Doc: {clientes.find((c) => c.uuid === selectedCliente)?.numeroDocumento || '22222222'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Fecha Emisión:</span>
                <span className="text-gray-800 font-medium">{new Date().toLocaleDateString('es-CO')}</span>
                <span className="text-gray-500 block mt-0.5">Canal:</span>
                <span className="text-gray-800 font-medium">
                  {canales.find((c) => c.uuid === selectedCanal)?.nombre || 'Mostrador'}
                </span>
              </div>
            </div>

            {/* Tabla de Líneas */}
            <div className="mb-3">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600">
                    <th className="py-1">Cant</th>
                    <th className="py-1">Descripción</th>
                    <th className="py-1 text-right">V. Unit</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400 italic">
                        (Sin ítems aún agregados en la solicitud)
                      </td>
                    </tr>
                  ) : (
                    (lineas || []).map((l, i) => (
                      <tr key={i}>
                        <td className="py-1 font-mono">{l.cantidad}</td>
                        <td className="py-1">
                          <div className="font-medium text-gray-900">{l.descripcion}</div>
                          {l.naturaleza === 'SERVICIO' && l.franjaCompromiso && (
                            <div className="text-[9px] text-blue-600 font-semibold">
                              Compromiso: {l.franjaCompromiso}
                            </div>
                          )}
                        </td>
                        <td className="py-1 text-right font-mono">${l.precioUnitario.toLocaleString()}</td>
                        <td className="py-1 text-right font-mono font-bold">${l.subtotal.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales y Liquidación */}
            <div className="border-t border-gray-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Total Inventario:</span>
                <span className="font-mono font-medium">${totalInventario.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Servicios:</span>
                <span className="font-mono font-medium">${totalServicios.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Anticipos Aplicados:</span>
                <span className="font-mono">-${totalAnticipos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Neto:</span>
                <span className="font-mono">${totalNeto.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-red-600">
                <span>Saldo Pendiente:</span>
                <span className="font-mono">${saldoPendiente.toLocaleString()}</span>
              </div>
            </div>

            {/* Código de barras simulado y política */}
            <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-center">
              <div className="font-mono tracking-[0.3em] font-bold text-xs py-1 text-gray-800 bg-gray-50 border border-gray-200 rounded">
                * {infoConsecutivo.siguienteNumero} *
              </div>
              <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">
                Garantía técnica de afilado: 3 días hábiles a partir de la entrega. Conserve este comprobante para reclamar su herramienta en taller.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setIsPlantillaModalOpen(false)}>
              Cerrar Vista Previa
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
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-300">
            Autorización de supervisor para asentar solicitud con excepciones comerciales. Seleccione cuáles condiciones autoriza con su clave:
          </p>
          {voboError && <Alert variant="danger">{voboError}</Alert>}
          <form onSubmit={handleAprobarVoBo} className="space-y-4">
            <div style={{ padding: '0.75rem', background: '#090d16', borderRadius: '8px', border: '1px solid #334155' }} className="space-y-2">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                <input
                  type="checkbox"
                  checked={voboSelectAnticipoCheck}
                  onChange={(e) => setVoboSelectAnticipoCheck(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <span><strong>Excepción Anticipo Servicios:</strong> Autorizar anticipo menor al mínimo requerido (40%)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                <input
                  type="checkbox"
                  checked={voboSelectInventarioCheck}
                  onChange={(e) => setVoboSelectInventarioCheck(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
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
              placeholder="Ej: Cliente frecuente / Convenio corporativo"
              required
              fullWidth
            />
            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsVoBoModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Autorizar VoBo
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
