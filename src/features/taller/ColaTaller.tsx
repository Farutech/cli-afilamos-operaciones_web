import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Badge, Input } from '@farutech/design-system';
import {
  Eye,
  Zap,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { ListPageLayout, StandardDataTable, type ColumnDef } from '../../components/ui';
import { tallerApi } from '../../services/tallerApi';
import type {
  ItemTaller,
  TransicionDisponible,
  ConfirmarRecepcionRequest,
  EjecutarTransicionRequest,
  CancelarItemRequest,
  RegistrarActividadRequest,
} from '../../types/taller';

interface ColaTallerProps {
  token?: string;
  usuarioActual?: {
    id?: number;
    publicId?: string;
    codigo: string;
    rol: string;
  };
  vistaSwitch?: React.ReactNode;
}

const ETAPAS_FILTRO = [
  { codigo: '', label: 'Todas las etapas' },
  { codigo: 'RECEPCION_TECNICA', label: 'Recepción Técnica' },
  { codigo: 'EN_PROCESO', label: 'En Proceso' },
  { codigo: 'FINALIZADO_TALLER', label: 'Finalizado Taller' },
  { codigo: 'RECEPCION_MOSTRADOR', label: 'Recepción Mostrador' },
  { codigo: 'LISTO_ENTREGA', label: 'Listo Entrega' },
  { codigo: 'DESPACHADO', label: 'Despachado' },
  { codigo: 'CANCELADO', label: 'Cancelado' },
];

export const ColaTaller: React.FC<ColaTallerProps> = ({
  token,
  usuarioActual = { codigo: 'OP-01', rol: 'OPERARIO' },
  vistaSwitch,
}) => {
  const [items, setItems] = useState<ItemTaller[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [busqueda, setBusqueda] = useState('');
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

  // Paginación estándar
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Modales
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemTaller | null>(null);
  const [transicionSeleccionada, setTransicionSeleccionada] = useState<TransicionDisponible | null>(null);
  const [isTransicionModalOpen, setIsTransicionModalOpen] = useState(false);
  const [isActividadModalOpen, setIsActividadModalOpen] = useState(false);
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);

  // Estados de inputs de modales
  const [transicionNotas, setTransicionNotas] = useState('');
  const [transicionInsumos, setTransicionInsumos] = useState('');
  const [supervisorCodigo, setSupervisorCodigo] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [supervisorJustificacion, setSupervisorJustificacion] = useState('');

  // Actividad técnica
  const [actividadNombre, setActividadNombre] = useState('');
  const [subactividades, setSubactividades] = useState('');
  const [insumosUtilizados, setInsumosUtilizados] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');

  // Cancelación
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  const cargarCola = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await tallerApi.getCola(filtroEtapa || undefined, token);
      setItems(data);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando la cola de taller');
    } finally {
      setLoading(false);
    }
  }, [filtroEtapa, token]);

  useEffect(() => {
    let activo = true;
    const fetchCola = async () => {
      try {
        const data = await tallerApi.getCola(filtroEtapa || undefined, token);
        if (activo) setItems(data);
      } catch (err: unknown) {
        if (activo) setErrorMsg((err as { message?: string }).message || 'Error cargando la cola de taller');
      }
    };
    fetchCola();
    return () => {
      activo = false;
    };
  }, [filtroEtapa, token]);

  const itemsFiltrados = useMemo(() => {
    return items.filter((it) => {
      const query = busqueda.toLowerCase().trim();
      if (!query) return true;
      return (
        it.itemCodigo.toLowerCase().includes(query) ||
        it.descripcion.toLowerCase().includes(query) ||
        it.documentoOtNumero.toLowerCase().includes(query) ||
        it.documentoSolicitudNumero.toLowerCase().includes(query) ||
        it.clienteNombre.toLowerCase().includes(query)
      );
    });
  }, [items, busqueda]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEtapa, busqueda, itemsPorPagina]);

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return itemsFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [itemsFiltrados, paginaActual, itemsPorPagina]);

  // T032: Recepción Rápida (< 500ms)
  const handleRecepcionRapida = async (item: ItemTaller) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const req: ConfirmarRecepcionRequest = {
        operarioId: usuarioActual.id,
        operarioCodigo: usuarioActual.codigo,
        notas: 'Recepción rápida en taller',
      };
      await tallerApi.confirmarRecepcion(item.itemPublicId, req, token);
      setSuccessMsg(`Ítem ${item.itemCodigo} recibido en taller y en proceso.`);
      cargarCola();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error en recepción rápida');
    }
  };

  // Abrir Modal de Transición
  const handleAbrirTransicion = (item: ItemTaller, transicion: TransicionDisponible) => {
    setItemSeleccionado(item);
    setTransicionSeleccionada(transicion);
    setTransicionNotas('');
    setTransicionInsumos('');
    setSupervisorCodigo('');
    setSupervisorPin('');
    setSupervisorJustificacion('');
    setIsTransicionModalOpen(true);
  };

  // Ejecutar Transición
  const handleEjecutarTransicion = async () => {
    if (!itemSeleccionado || !transicionSeleccionada) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const req: EjecutarTransicionRequest = {
      codigoTransicion: transicionSeleccionada.codigo,
      notas: transicionNotas,
      insumosDetalle: transicionInsumos,
      supervisorCodigo: transicionSeleccionada.requiereAprobacion ? supervisorCodigo : undefined,
      supervisorPin: transicionSeleccionada.requiereAprobacion ? supervisorPin : undefined,
      justificacionSupervisor: transicionSeleccionada.requiereAprobacion ? supervisorJustificacion : undefined,
    };

    try {
      await tallerApi.ejecutarTransicion(itemSeleccionado.itemPublicId, req, token);
      setSuccessMsg(`Transición '${transicionSeleccionada.nombre}' aplicada con éxito.`);
      setIsTransicionModalOpen(false);
      cargarCola();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error ejecutando transición');
    }
  };

  // Abrir Modal Actividad
  const handleAbrirActividad = (item: ItemTaller) => {
    setItemSeleccionado(item);
    setActividadNombre('');
    setSubactividades('');
    setInsumosUtilizados('');
    setEvidenciaUrl('');
    setIsActividadModalOpen(true);
  };

  // Registrar Actividad
  const handleGuardarActividad = async () => {
    if (!itemSeleccionado || !actividadNombre.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const req: RegistrarActividadRequest = {
      actividadNombre,
      subactividades,
      insumosUtilizados,
      evidenciaUrl,
    };

    try {
      await tallerApi.registrarActividad(itemSeleccionado.itemPublicId, req, token);
      setSuccessMsg(`Actividad registrada para el ítem ${itemSeleccionado.itemCodigo}.`);
      setIsActividadModalOpen(false);
      cargarCola();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error registrando actividad');
    }
  };

  // Abrir Cancelación
  const handleAbrirCancelar = (item: ItemTaller) => {
    setItemSeleccionado(item);
    setMotivoCancelacion('');
    setSupervisorCodigo('');
    setSupervisorPin('');
    setSupervisorJustificacion('');
    setIsCancelarModalOpen(true);
  };

  // Cancelar Ítem (Invariante #8)
  const handleCancelarItem = async () => {
    if (!itemSeleccionado || !motivoCancelacion.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const req: CancelarItemRequest = {
      motivo: motivoCancelacion,
      supervisorCodigo: !itemSeleccionado.permiteCancelacionDirecta ? supervisorCodigo : undefined,
      supervisorPin: !itemSeleccionado.permiteCancelacionDirecta ? supervisorPin : undefined,
      justificacionSupervisor: !itemSeleccionado.permiteCancelacionDirecta ? supervisorJustificacion : undefined,
    };

    try {
      await tallerApi.cancelarItem(itemSeleccionado.itemPublicId, req, token);
      setSuccessMsg(`Ítem ${itemSeleccionado.itemCodigo} cancelado.`);
      setIsCancelarModalOpen(false);
      cargarCola();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cancelando el ítem');
    }
  };

  const getBadgeVariant = (etapaCodigo: string): 'neutral' | 'danger' | 'success' | 'warning' | 'info' => {
    switch (etapaCodigo) {
      case 'RECEPCION_TECNICA':
        return 'warning';
      case 'EN_PROCESO':
        return 'info';
      case 'FINALIZADO_TALLER':
      case 'RECEPCION_MOSTRADOR':
      case 'LISTO_ENTREGA':
        return 'success';
      case 'DESPACHADO':
        return 'neutral';
      case 'CANCELADO':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const columns: ColumnDef<ItemTaller>[] = useMemo(
    () => [
      {
        key: 'ot',
        header: 'OT / Solicitud',
        render: (item: ItemTaller) => (
          <div>
            <div className="font-bold text-white">{item.documentoOtNumero}</div>
            <div className="text-xs text-slate-400">Sol: {item.documentoSolicitudNumero}</div>
          </div>
        ),
      },
      {
        key: 'item',
        header: 'Ítem & Detalle',
        render: (item: ItemTaller) => (
          <div>
            <div className="font-medium text-white">{item.descripcion}</div>
            <div className="text-xs text-slate-400">
              Cód: {item.itemCodigo} | Cant: {item.cantidad}
            </div>
          </div>
        ),
      },
      {
        key: 'cliente',
        header: 'Cliente',
        render: (item: ItemTaller) => (
          <div>
            <div className="text-white font-medium">{item.clienteNombre}</div>
            <div className="text-xs text-slate-400">{item.clienteTelefono}</div>
          </div>
        ),
      },
      {
        key: 'franja',
        header: 'Franja Compromiso',
        render: (item: ItemTaller) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
            ⏱ {item.franjaCompromiso || 'Sin Franja'}
          </span>
        ),
      },
      {
        key: 'etapa',
        header: 'Etapa Actual',
        render: (item: ItemTaller) => (
          <Badge variant={getBadgeVariant(item.etapaActualCodigo)}>
            {item.etapaActualNombre}
          </Badge>
        ),
      },
      {
        key: 'acciones',
        header: 'Acciones Técnicas',
        align: 'right',
        render: (item: ItemTaller) => (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {item.etapaActualCodigo === 'RECEPCION_TECNICA' && (
              <button
                type="button"
                onClick={() => handleRecepcionRapida(item)}
                disabled={loading}
                title="Recibir en Taller"
                className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-600/50 text-amber-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">⚡ Recibir en Taller</span>
              </button>
            )}

            {item.transicionesPermitidas.map((tr: TransicionDisponible) => (
              <button
                key={tr.transicionPublicId}
                type="button"
                onClick={() => handleAbrirTransicion(item, tr)}
                disabled={loading}
                title={`Avanzar a: ${tr.nombre}`}
                className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-600/50 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold max-w-[120px] truncate">{tr.nombre}</span>
                {tr.requiereAprobacion && <ShieldCheck className="w-3 h-3 text-amber-400" />}
              </button>
            ))}

            {item.esFinal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Finalizado
              </span>
            )}

            {!item.esFinal && (
              <button
                type="button"
                onClick={() => handleAbrirActividad(item)}
                disabled={loading}
                title="Registrar bitácora / actividad técnica"
                className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="text-[11px]">Actividad</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setItemSeleccionado(item);
                setIsHistorialModalOpen(true);
              }}
              title="Ver detalle e historial de la orden de trabajo"
              className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Ver</span>
            </button>

            {!item.esFinal && (
              <button
                type="button"
                onClick={() => handleAbrirCancelar(item)}
                disabled={loading}
                title="Cancelar orden de ítem (Invariante #8)"
                className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-600/60 text-rose-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                <span>✕</span>
              </button>
            )}
          </div>
        ),
      },
    ],
    [loading]
  );

  return (
    <div className="space-y-4">
      <ListPageLayout
        title="Cola de Trabajo de Taller"
        eyebrow="OPERACIÓN · TALLER"
        description="Control de procesos, cola de afilado y asignación técnica en tiempo real."
        actions={
          <div className="flex items-center gap-2">
            {vistaSwitch}
            <Button variant="secondary" size="sm" onClick={cargarCola} disabled={loading} className="cursor-pointer">
              {loading ? 'Actualizando...' : 'Refrescar'}
            </Button>
          </div>
        }
        search={{
          value: busqueda,
          onChange: (val) => {
            setBusqueda(val);
            setPaginaActual(1);
          },
          placeholder: 'Buscar por OT, solicitud, cliente o código...',
          isSearching: loading,
        }}
        filters={
          <select
            value={filtroEtapa}
            onChange={(e) => {
              setFiltroEtapa(e.target.value);
              setPaginaActual(1);
            }}
            className="h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {ETAPAS_FILTRO.map((et) => (
              <option key={et.codigo} value={et.codigo}>
                {et.label}
              </option>
            ))}
          </select>
        }
        onRefresh={cargarCola}
        isRefreshing={loading}
      >
        {(errorMsg || successMsg) && (
          <div
            className={`mb-3 flex items-center justify-between gap-3 p-3 rounded-lg border text-xs shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 ${
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

        <StandardDataTable<ItemTaller>
          columns={columns}
          data={itemsPaginados}
          keyExtractor={(item) => item.itemPublicId}
          loading={loading && items.length === 0}
          pagination={{
            currentPage: paginaActual,
            pageSize: itemsPorPagina,
            totalItems: itemsFiltrados.length,
            onPageChange: (p) => setPaginaActual(p),
            onPageSizeChange: (s) => {
              setItemsPorPagina(s);
              setPaginaActual(1);
            },
          }}
          emptyMessage="No hay ítems en la cola de taller para los criterios seleccionados."
        />
      </ListPageLayout>

      {/* MODAL TRANSICIÓN */}
      {isTransicionModalOpen && itemSeleccionado && transicionSeleccionada && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Ejecutar Transición: {transicionSeleccionada.nombre}
            </h3>
            <p className="text-sm text-slate-400">
              Ítem: <span className="font-semibold">{itemSeleccionado.descripcion}</span> ({itemSeleccionado.itemCodigo})<br />
              Destino: <span className="font-semibold text-blue-600">{transicionSeleccionada.etapaDestinoNombre}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas técnicas</label>
                <Input
                  value={transicionNotas}
                  onChange={(e) => setTransicionNotas(e.target.value)}
                  placeholder="Detalles sobre el avance técnico..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Insumos / Materiales</label>
                <Input
                  value={transicionInsumos}
                  onChange={(e) => setTransicionInsumos(e.target.value)}
                  placeholder="Ej: Pasta pulidora, disco diamantado..."
                />
              </div>

              {/* VoBo Supervisor requerido */}
              {transicionSeleccionada.requiereAprobacion && (
                <div className="p-3 bg-amber-950/50 border border-amber-700/50 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🔒</span> Esta transición requiere VoBo de Supervisor
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Código Supervisor</label>
                      <Input
                        value={supervisorCodigo}
                        onChange={(e) => setSupervisorCodigo(e.target.value)}
                        placeholder="SUP-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">PIN Supervisor</label>
                      <Input
                        type="password"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Justificación</label>
                    <Input
                      value={supervisorJustificacion}
                      onChange={(e) => setSupervisorJustificacion(e.target.value)}
                      placeholder="Motivo de la aprobación..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsTransicionModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleEjecutarTransicion}>
                Confirmar Transición
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL REGISTRAR ACTIVIDAD TÉCNICA (T034) */}
      {isActividadModalOpen && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-white">Registrar Actividad Técnica</h3>
            <p className="text-sm text-slate-400">
              Ítem: <span className="font-semibold">{itemSeleccionado.descripcion}</span> ({itemSeleccionado.itemCodigo})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Actividad *</label>
                <Input
                  value={actividadNombre}
                  onChange={(e) => setActividadNombre(e.target.value)}
                  placeholder="Ej: Afilado de cuchillas industriales"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subactividades</label>
                <Input
                  value={subactividades}
                  onChange={(e) => setSubactividades(e.target.value)}
                  placeholder="Ej: Desbaste grueso, alineación de ángulo, rectificado"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Insumos Utilizados</label>
                <Input
                  value={insumosUtilizados}
                  onChange={(e) => setInsumosUtilizados(e.target.value)}
                  placeholder="Ej: Piedra de grano 1000, lubricante refrigerante"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Evidencia Fotográfica</label>
                <Input
                  value={evidenciaUrl}
                  onChange={(e) => setEvidenciaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsActividadModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleGuardarActividad} disabled={!actividadNombre.trim()}>
                Guardar Actividad
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL CANCELAR ÍTEM (Invariante #8) */}
      {isCancelarModalOpen && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-rose-400">Cancelar Ítem de Taller</h3>
            <p className="text-sm text-slate-400">
              Se cancelará el ítem <span className="font-semibold">{itemSeleccionado.descripcion}</span> en la OT {itemSeleccionado.documentoOtNumero}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo de Cancelación *</label>
                <Input
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Describa la razón técnica del descarte o cancelación..."
                  required
                />
              </div>

              {!itemSeleccionado.permiteCancelacionDirecta && (
                <div className="p-3 bg-rose-950/50 border border-rose-700/50 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-rose-300">
                    ⚠️ Invariante #8: El ítem se encuentra en una etapa técnica avanzada ({itemSeleccionado.etapaActualNombre}). Requiere VoBo de Supervisor.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Código Supervisor</label>
                      <Input
                        value={supervisorCodigo}
                        onChange={(e) => setSupervisorCodigo(e.target.value)}
                        placeholder="SUP-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">PIN Supervisor</label>
                      <Input
                        type="password"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Justificación Supervisor</label>
                    <Input
                      value={supervisorJustificacion}
                      onChange={(e) => setSupervisorJustificacion(e.target.value)}
                      placeholder="Justificación para anular en etapa avanzada..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsCancelarModalOpen(false)}>
                Volver
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelarItem}
                disabled={!motivoCancelacion.trim() || (!itemSeleccionado.permiteCancelacionDirecta && (!supervisorCodigo || !supervisorPin))}
              >
                Confirmar Cancelación
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL HISTORIAL / BITÁCORA */}
      {isHistorialModalOpen && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6 space-y-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Historial Técnico: {itemSeleccionado.itemCodigo}
              </h3>
              <button
                onClick={() => setIsHistorialModalOpen(false)}
                className="text-gray-400 hover:text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {itemSeleccionado.historial.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin eventos registrados aún.</div>
              ) : (
                itemSeleccionado.historial.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-gray-700">
                      <span>{ev.accion} ({ev.etapaNombre})</span>
                      <span className="text-gray-400">{new Date(ev.fechaHoraUtc).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400">{ev.detalle}</div>
                    {ev.usuarioCodigo && (
                      <div className="text-gray-400">Usuario: {ev.usuarioCodigo}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsHistorialModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
