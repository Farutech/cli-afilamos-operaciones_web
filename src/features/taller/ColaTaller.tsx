import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
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
}) => {
  const [items, setItems] = useState<ItemTaller[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cola de Trabajo de Taller</h1>
          <p className="text-sm text-gray-500">
            Control técnico de ítems de servicio, órdenes de trabajo (OT) y transiciones de workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={cargarCola} disabled={loading}>
            {loading ? 'Actualizando...' : 'Refrescar'}
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por Etapa</label>
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              {ETAPAS_FILTRO.map((et) => (
                <option key={et.codigo} value={et.codigo}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar OT / Solicitud / Cliente / Ítem</label>
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código de ítem, OT, solicitud o cliente..."
            />
          </div>
        </div>
      </Card>

      {/* Tabla de la Cola */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">OT / Solicitud</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ítem & Detalle</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Franja Compromiso</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Etapa Actual</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones Técnicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Cargando cola de taller...' : 'No hay ítems en la cola de taller para los criterios seleccionados.'}
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={item.itemPublicId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{item.documentoOtNumero}</div>
                      <div className="text-xs text-gray-500">Sol: {item.documentoSolicitudNumero}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.descripcion}</div>
                      <div className="text-xs text-gray-400">
                        Cód: {item.itemCodigo} | Cant: {item.cantidad}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{item.clienteNombre}</div>
                      <div className="text-xs text-gray-400">{item.clienteTelefono}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                        ⏱ {item.franjaCompromiso || 'Sin Franja'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getBadgeVariant(item.etapaActualCodigo)}>
                        {item.etapaActualNombre}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {/* Botón Recepción Rápida (T032) */}
                      {item.etapaActualCodigo === 'RECEPCION_TECNICA' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleRecepcionRapida(item)}
                          disabled={loading}
                        >
                          ⚡ Recibir en Taller
                        </Button>
                      )}

                      {/* Transiciones permitidas */}
                      {item.transicionesPermitidas.map((tr) => (
                        <Button
                          key={tr.transicionPublicId}
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAbrirTransicion(item, tr)}
                          disabled={loading}
                        >
                          {tr.nombre}
                          {tr.requiereAprobacion && ' 🔒'}
                        </Button>
                      ))}

                      {/* Registrar Actividad (T034) */}
                      {!item.esFinal && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAbrirActividad(item)}
                          disabled={loading}
                        >
                          📝 Actividad
                        </Button>
                      )}

                      {/* Historial */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setItemSeleccionado(item);
                          setIsHistorialModalOpen(true);
                        }}
                      >
                        👁 Ver
                      </Button>

                      {/* Cancelar ítem (Invariante #8) */}
                      {!item.esFinal && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleAbrirCancelar(item)}
                          disabled={loading}
                        >
                          ✕
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL TRANSICIÓN */}
      {isTransicionModalOpen && itemSeleccionado && transicionSeleccionada && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Ejecutar Transición: {transicionSeleccionada.nombre}
            </h3>
            <p className="text-sm text-gray-500">
              Ítem: <span className="font-semibold">{itemSeleccionado.descripcion}</span> ({itemSeleccionado.itemCodigo})<br />
              Destino: <span className="font-semibold text-blue-600">{transicionSeleccionada.etapaDestinoNombre}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notas técnicas</label>
                <Input
                  value={transicionNotas}
                  onChange={(e) => setTransicionNotas(e.target.value)}
                  placeholder="Detalles sobre el avance técnico..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Insumos / Materiales</label>
                <Input
                  value={transicionInsumos}
                  onChange={(e) => setTransicionInsumos(e.target.value)}
                  placeholder="Ej: Pasta pulidora, disco diamantado..."
                />
              </div>

              {/* VoBo Supervisor requerido */}
              {transicionSeleccionada.requiereAprobacion && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <span>🔒</span> Esta transición requiere VoBo de Supervisor
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Código Supervisor</label>
                      <Input
                        value={supervisorCodigo}
                        onChange={(e) => setSupervisorCodigo(e.target.value)}
                        placeholder="SUP-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">PIN Supervisor</label>
                      <Input
                        type="password"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Justificación</label>
                    <Input
                      value={supervisorJustificacion}
                      onChange={(e) => setSupervisorJustificacion(e.target.value)}
                      placeholder="Motivo de la aprobación..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Registrar Actividad Técnica</h3>
            <p className="text-sm text-gray-500">
              Ítem: <span className="font-semibold">{itemSeleccionado.descripcion}</span> ({itemSeleccionado.itemCodigo})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Actividad *</label>
                <Input
                  value={actividadNombre}
                  onChange={(e) => setActividadNombre(e.target.value)}
                  placeholder="Ej: Afilado de cuchillas industriales"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subactividades</label>
                <Input
                  value={subactividades}
                  onChange={(e) => setSubactividades(e.target.value)}
                  placeholder="Ej: Desbaste grueso, alineación de ángulo, rectificado"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Insumos Utilizados</label>
                <Input
                  value={insumosUtilizados}
                  onChange={(e) => setInsumosUtilizados(e.target.value)}
                  placeholder="Ej: Piedra de grano 1000, lubricante refrigerante"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">URL Evidencia Fotográfica</label>
                <Input
                  value={evidenciaUrl}
                  onChange={(e) => setEvidenciaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-600">Cancelar Ítem de Taller</h3>
            <p className="text-sm text-gray-500">
              Se cancelará el ítem <span className="font-semibold">{itemSeleccionado.descripcion}</span> en la OT {itemSeleccionado.documentoOtNumero}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de Cancelación *</label>
                <Input
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Describa la razón técnica del descarte o cancelación..."
                  required
                />
              </div>

              {!itemSeleccionado.permiteCancelacionDirecta && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                  <div className="text-xs font-bold text-red-800">
                    ⚠️ Invariante #8: El ítem se encuentra en una etapa técnica avanzada ({itemSeleccionado.etapaActualNombre}). Requiere VoBo de Supervisor.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Código Supervisor</label>
                      <Input
                        value={supervisorCodigo}
                        onChange={(e) => setSupervisorCodigo(e.target.value)}
                        placeholder="SUP-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">PIN Supervisor</label>
                      <Input
                        type="password"
                        value={supervisorPin}
                        onChange={(e) => setSupervisorPin(e.target.value)}
                        placeholder="••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Justificación Supervisor</label>
                    <Input
                      value={supervisorJustificacion}
                      onChange={(e) => setSupervisorJustificacion(e.target.value)}
                      placeholder="Justificación para anular en etapa avanzada..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Historial Técnico: {itemSeleccionado.itemCodigo}
              </h3>
              <button
                onClick={() => setIsHistorialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {itemSeleccionado.historial.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin eventos registrados aún.</div>
              ) : (
                itemSeleccionado.historial.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-gray-700">
                      <span>{ev.accion} ({ev.etapaNombre})</span>
                      <span className="text-gray-400">{new Date(ev.fechaHoraUtc).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-600">{ev.detalle}</div>
                    {ev.usuarioCodigo && (
                      <div className="text-gray-400">Usuario: {ev.usuarioCodigo}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
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
