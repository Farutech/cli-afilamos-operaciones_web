import React, { useState, useMemo } from 'react';
import { Card, Button, Badge, Input, Modal, Alert } from '@farutech/design-system';
import { ItemSelector } from '../catalogos/ItemSelector';
import { RegistroClienteModal } from '../clientes/RegistroClienteModal';
import type { ItemCatalogo, Cliente, CanalOrigen, TipoDocumentoIdentidad } from '../../types/catalogos';
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
  const [subtipoDoc, setSubtipoDoc] = useState<'SOL-GEN' | 'SOL-PREF'>('SOL-GEN');
  const [plantillaFormato, setPlantillaFormato] = useState<'TIRILLA' | 'MEDIA_CARTA' | 'CARTA'>('TIRILLA');
  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);

  // Fecha y hora del documento (datetime-local picker estilo Novasoft)
  const [fechaDocumento, setFechaDocumento] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [sufijoDoc, setSufijoDoc] = useState<string>('');
  const [numeroDocManual, setNumeroDocManual] = useState<string>('');

  const infoConsecutivo = useMemo(() => {
    if (subtipoDoc === 'SOL-GEN') {
      return {
        prefijo: 'SG',
        subtipoNombre: 'Solicitud General de Taller e Inventario',
        folioActual: 2,
        siguienteNumero: 'SG-0003',
        longitud: 4,
        tipoImpresion: 'Tirilla POS 80mm / Media Carta',
      };
    } else {
      return {
        prefijo: 'SP',
        subtipoNombre: 'Solicitud Preferencial / Prioritaria',
        folioActual: 0,
        siguienteNumero: 'SP-0001',
        longitud: 4,
        tipoImpresion: 'Carta Completa / Formato Especial',
      };
    }
  }, [subtipoDoc]);

  // Folio visible por defecto con el prefijo y sufijo
  const folioCompletoVisible = useMemo(() => {
    const base = numeroDocManual || infoConsecutivo.siguienteNumero;
    return sufijoDoc ? `${base}-${sufijoDoc}` : base;
  }, [numeroDocManual, infoConsecutivo.siguienteNumero, sufijoDoc]);

  const [lineas, setLineas] = useState<LineaDetalleLocal[]>([]);
  const [totalPagadoInventario, setTotalPagadoInventario] = useState<number>(0);
  const [voboAutorizado, setVoboAutorizado] = useState(false);

  // Política de precios en mostrador
  const [politicaPrecios] = useState({
    permiteModificarPrecio: true,
    maxDiferenciaPorcentaje: 15,
    requiereVoBoSuperaTolerancia: true,
  });

  // Ítem cargado desde el catálogo (autocompletado o lupa modal)
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const [precioBaseRef, setPrecioBaseRef] = useState<number>(0);
  const [listaPrecioSeleccionada, setListaPrecioSeleccionada] = useState<string>('BASE');

  // Formulario de nueva línea
  const [naturalezaManual, setNaturalezaManual] = useState<NaturalezaItem>('SERVICIO');
  const [descripcionManual, setDescripcionManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);
  const [precioManual, setPrecioManual] = useState(0);
  const [franjaCompromiso, setFranjaCompromiso] = useState('HOY TARDE');
  const [stockRefActual, setStockRefActual] = useState<number | null>(null);
  const [itemCatIdActual, setItemCatIdActual] = useState<string | undefined>(undefined);

  // Modal VoBo Supervisor
  const [isVoBoModalOpen, setIsVoBoModalOpen] = useState(false);
  const [supervisorCodigo, setSupervisorCodigo] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [justificacionVoBo, setJustificacionVoBo] = useState('');
  const [voboError, setVoboError] = useState<string | null>(null);

  // Cálculos de totales
  const totalInventario = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'INVENTARIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  const totalServicios = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  const totalAnticipos = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.anticipoImputado, 0),
    [lineas],
  );

  const totalMinimoAnticiposExigido = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO' && l.exigeAnticipo)
        .reduce((acc, l) => acc + l.anticipoMinimo, 0),
    [lineas],
  );

  const totalNeto = totalInventario + totalServicios;
  const saldoPendiente = Math.max(0, totalNeto - (totalPagadoInventario + totalAnticipos));

  // Invariantes
  const inventarioImpago = totalInventario > 0 && totalPagadoInventario < totalInventario;
  const anticipoInsuficiente = totalAnticipos < totalMinimoAnticiposExigido && !voboAutorizado;

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
    setListaPrecioSeleccionada(item.listaPrecioNombre || 'BASE');
  };

  const handleCancelarItemSeleccionado = () => {
    setItemSeleccionado(null);
    setItemCatIdActual(undefined);
    setDescripcionManual('');
    setCantidadManual(1);
    setPrecioManual(0);
    setPrecioBaseRef(0);
    setStockRefActual(null);
  };

  const handleAgregarLinea = () => {
    if (!itemSeleccionado || !descripcionManual.trim() || cantidadManual <= 0 || precioManual < 0) return;

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

    setVoboAutorizado(true);
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
      totalPagadoInventario,
      anticipoVoBoAutorizado: voboAutorizado,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Cabecera de Solicitud (Control Documental Estilo Novasoft) */}
      <Card>
        {/* Barra de Subtipo de Documento & Plantilla */}
        <div className="mb-4 pb-4 border-b border-gray-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Subtipo de Solicitud (Novasoft Document Control):
              </span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSubtipoDoc('SOL-GEN');
                    setNumeroDocManual('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    subtipoDoc === 'SOL-GEN'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  📄 SOL-GEN · Solicitud Estándar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubtipoDoc('SOL-PREF');
                    setNumeroDocManual('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    subtipoDoc === 'SOL-PREF'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ⭐ SOL-PREF · Preferencial / VIP
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-[11px] text-gray-400">Plantilla de Salida:</div>
                <select
                  value={plantillaFormato}
                  onChange={(e) => setPlantillaFormato(e.target.value as any)}
                  className="bg-gray-800 text-white text-xs border border-white/10 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="TIRILLA">Tirilla POS 80mm</option>
                  <option value="MEDIA_CARTA">Media Carta (Talón Taller)</option>
                  <option value="CARTA">Carta Completa (Factura/OT)</option>
                </select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsPlantillaModalOpen(true)}
                className="mt-3 text-xs"
              >
                👁️ Ver Formato
              </Button>
            </div>
          </div>

          {/* Grilla Documental: Prefijo + Folio + Sufijo + Fecha/Hora Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-xl bg-gray-900/90 border border-white/10 text-xs">
            <div>
              <label className="text-[11px] text-gray-400 block font-semibold mb-1">
                Prefijo Documento
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 text-sm">
                  {infoConsecutivo.prefijo}
                </span>
                <span className="text-[10px] text-gray-400">Pad: {infoConsecutivo.longitud} ceros</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block font-semibold mb-1">
                Número / Consecutivo *
              </label>
              <input
                type="text"
                value={numeroDocManual || infoConsecutivo.siguienteNumero}
                onChange={(e) => setNumeroDocManual(e.target.value)}
                placeholder={infoConsecutivo.siguienteNumero}
                className="w-full px-2.5 py-1.5 bg-gray-950 border border-slate-700 rounded-lg font-mono font-bold text-emerald-400 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block font-semibold mb-1">
                Sufijo Opcional
              </label>
              <input
                type="text"
                value={sufijoDoc}
                onChange={(e) => setSufijoDoc(e.target.value.toUpperCase())}
                placeholder="Ej: 2026 o B"
                className="w-full px-2.5 py-1.5 bg-gray-950 border border-slate-700 rounded-lg font-mono text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block font-semibold mb-1">
                Fecha / Hora Documento (Año-Mes-Día) *
              </label>
              <input
                type="datetime-local"
                value={fechaDocumento}
                onChange={(e) => setFechaDocumento(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>
              Identificador Completo a Asentar:{' '}
              <strong className="font-mono text-white">{folioCompletoVisible}</strong>
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
              {canales.map((c) => (
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
              {clientes.map((cli) => (
                <option key={cli.uuid} value={cli.uuid}>
                  {cli.nombreRazonSocial} ({cli.numeroDocumento})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 2. Captura de Línea (Exclusiva por Catálogo: Autocompletado + Lupa 🔍 Especializada) */}
      <Card>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }} className="text-white">
          Agregar Ítems a la Solicitud
        </h4>

        {!itemSeleccionado ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Seleccione un ítem o servicio del catálogo para agregarlo a la orden. Ingrese mínimo 3
              dígitos en el buscador rápido o haga clic en la <strong className="text-indigo-400">lupa 🔍</strong> para
              consultar por categorías multinivel.
            </p>
            <ItemSelector onSelectItem={handleSelectItemCatalogo} />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 space-y-4 shadow-lg">
            {/* Cabecera del Ítem Seleccionado */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded text-xs border border-amber-500/20">
                  {itemSeleccionado.codigoReferencia}
                </span>
                <span className="font-semibold text-white text-sm">
                  {itemSeleccionado.nombre}
                </span>
                {itemSeleccionado.categoria?.nombre && (
                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    📁 {itemSeleccionado.categoria.rutaCompleta || itemSeleccionado.categoria.nombre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={itemSeleccionado.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                  {itemSeleccionado.naturaleza === 'INVENTARIO' ? 'PRODUCTO (Inventario)' : 'SERVICIO (Taller / OT)'}
                </Badge>
                <button
                  type="button"
                  onClick={handleCancelarItemSeleccionado}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-900"
                >
                  ✖ Elegir otro ítem
                </button>
              </div>
            </div>

            {/* Campos Estructurados del Ítem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label htmlFor="input-cantidad-item" className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Cantidad *
                </label>
                <input
                  id="input-cantidad-item"
                  aria-label="Cantidad"
                  type="number"
                  min={1}
                  value={cantidadManual}
                  onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Lista de Precios
                </label>
                <select
                  value={listaPrecioSeleccionada}
                  onChange={(e) => {
                    const l = e.target.value;
                    setListaPrecioSeleccionada(l);
                    if (l === 'BASE') setPrecioManual(precioBaseRef);
                    else if (l === 'MAYORISTA') setPrecioManual(Math.round(precioBaseRef * 0.9));
                    else if (l === 'DISTRIBUIDOR') setPrecioManual(Math.round(precioBaseRef * 0.85));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="BASE">Lista Base (Precio Estándar)</option>
                  <option value="MAYORISTA">Mayorista (-10%)</option>
                  <option value="DISTRIBUIDOR">Distribuidor (-15%)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Precio Unit. (COP) *
                  </label>
                  {!politicaPrecios.permiteModificarPrecio && (
                    <span className="text-[10px] text-amber-400">Bloqueado</span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  step={500}
                  disabled={!politicaPrecios.permiteModificarPrecio}
                  value={precioManual}
                  onChange={(e) => setPrecioManual(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {itemSeleccionado.naturaleza === 'SERVICIO' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Compromiso Taller
                  </label>
                  <select
                    value={franjaCompromiso}
                    onChange={(e) => setFranjaCompromiso(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Stock Referencial
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-200">
                    {stockRefActual != null ? `${stockRefActual} disponibles` : 'N/A'}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button type="button" variant="primary" onClick={handleAgregarLinea} className="w-full py-2 text-xs font-bold">
                  + Agregar Línea
                </Button>
              </div>
            </div>

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
                {lineas.map((linea) => {
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
                pagado al 100% para asentar la solicitud. Actualmente pagado: ${totalPagadoInventario.toLocaleString()}.
                <div style={{ marginTop: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalPagadoInventario(totalInventario)}
                  >
                    Simular Cobro Total de Inventario ($ {totalInventario.toLocaleString()})
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
                    onClick={() => setIsVoBoModalOpen(true)}
                  >
                    Solicitar VoBo Supervisor (Excepción)
                  </Button>
                </div>
              </div>
            )}

            {voboAutorizado && (
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
                    lineas.map((l, i) => (
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
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-400">
            Autorización de supervisor para asentar solicitud de servicio con anticipo menor al mínimo requerido (40%).
          </p>
          {voboError && <Alert variant="danger">{voboError}</Alert>}
          <form onSubmit={handleAprobarVoBo} className="space-y-4">
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
