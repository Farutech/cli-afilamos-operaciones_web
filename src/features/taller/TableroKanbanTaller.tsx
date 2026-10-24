import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge, Button, EmptyState, Alert, Modal } from '@farutech/design-system';
import {
  Activity,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRight,
  Eye,
  Check,
  User,
} from 'lucide-react';
import { api } from '../../services/api';

export interface KanbanCardData {
  workOrderItemId: string;
  workOrderId: string;
  workOrderNumber: string;
  requestNumber: string;
  itemId?: string;
  itemName: string;
  customerId?: string;
  customerName: string;
  currentStepId?: string;
  currentStepName: string;
  currentStepCode: string;
  quantity: number;
  promisedDeliveryAt?: string;
  currentOperatorName?: string | null;
  technicalObservation?: string | null;
  photoUrls?: string[];
  isCompleted?: boolean;
}

export interface KanbanColumnData {
  stepId: string;
  stepCode: string;
  stepName: string;
  sequenceOrder: number;
  cards: KanbanCardData[];
}

export function TableroKanbanTaller() {
  const [columns, setColumns] = useState<KanbanColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avanzandoId, setAvanzandoId] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [cardDetalle, setCardDetalle] = useState<KanbanCardData | null>(null);

  const cargarTablero = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any[]>('/work-orders/kanban');
      if (Array.isArray(data) && data.length > 0) {
        setColumns(
          data.map((col) => ({
            stepId: col.stepId || col.stepCode,
            stepCode: col.stepCode,
            stepName: col.stepName,
            sequenceOrder: col.sequenceOrder ?? 1,
            cards: (col.cards || []).map((c: any) => ({
              workOrderItemId: c.workOrderItemId || c.id,
              workOrderId: c.workOrderId,
              workOrderNumber: c.workOrderNumber || 'OT-0000',
              requestNumber: c.requestNumber || 'SOL-0000',
              itemId: c.itemId,
              itemName: c.itemName || 'Servicio Técnico',
              customerId: c.customerId,
              customerName: c.customerName || 'Cliente General',
              currentStepId: c.currentStepId,
              currentStepName: c.currentStepName || col.stepName,
              currentStepCode: c.currentStepCode || col.stepCode,
              quantity: c.quantity ?? 1,
              promisedDeliveryAt: c.promisedDeliveryAt,
              currentOperatorName: c.currentOperatorName,
              technicalObservation: c.technicalObservation,
              photoUrls: c.photoUrls || [],
              isCompleted: c.isCompleted ?? false,
            })),
          }))
        );
      } else {
        // Estructura por defecto estándar del workflow de taller si aún no hay OTs en la BD
        setColumns([
          { stepId: 'step-rec', stepCode: 'RECEPCION_TECNICA', stepName: 'Recepción Técnica', sequenceOrder: 1, cards: [] },
          { stepId: 'step-proc', stepCode: 'EN_PROCESO', stepName: 'En Proceso', sequenceOrder: 2, cards: [] },
          { stepId: 'step-ctrl', stepCode: 'CONTROL_CALIDAD', stepName: 'Control de Calidad', sequenceOrder: 3, cards: [] },
          { stepId: 'step-listo', stepCode: 'LISTO_ENTREGA', stepName: 'Listo en Mostrador', sequenceOrder: 4, cards: [] },
        ]);
      }
    } catch (err) {
      setError((err as Error).message || 'Error al consultar el tablero Kanban desde el servidor.');
      setColumns([
        { stepId: 'step-rec', stepCode: 'RECEPCION_TECNICA', stepName: 'Recepción Técnica', sequenceOrder: 1, cards: [] },
        { stepId: 'step-proc', stepCode: 'EN_PROCESO', stepName: 'En Proceso', sequenceOrder: 2, cards: [] },
        { stepId: 'step-ctrl', stepCode: 'CONTROL_CALIDAD', stepName: 'Control de Calidad', sequenceOrder: 3, cards: [] },
        { stepId: 'step-listo', stepCode: 'LISTO_ENTREGA', stepName: 'Listo en Mostrador', sequenceOrder: 4, cards: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTablero();
  }, [cargarTablero]);

  const handleAvanzarPaso = async (card: KanbanCardData, colActualIndex: number) => {
    const nextCol = columns[colActualIndex + 1];
    if (!nextCol || card.isCompleted) return;

    setAvanzandoId(card.workOrderItemId);
    try {
      await api.post(`/work-orders/items/${card.workOrderItemId}/advance`, {
        targetStepId: nextCol.stepId,
        technicalNotes: 'Paso avanzado desde el tablero Kanban de taller',
      });
      await cargarTablero();
    } catch {
      // Transición optimista en estado si la API no responde en modo offline
      setColumns((prev) =>
        prev.map((col, idx) => {
          if (idx === colActualIndex) {
            return {
              ...col,
              cards: col.cards.filter((c) => c.workOrderItemId !== card.workOrderItemId),
            };
          }
          if (idx === colActualIndex + 1) {
            return {
              ...col,
              cards: [
                ...col.cards,
                { ...card, currentStepCode: col.stepCode, currentStepName: col.stepName },
              ],
            };
          }
          return col;
        })
      );
    } finally {
      setAvanzandoId(null);
    }
  };

  // Métricas calculadas en tiempo real
  const totalCards = useMemo(
    () => columns.reduce((acc, col) => acc + col.cards.length, 0),
    [columns]
  );

  const totalTerminadas = useMemo(() => {
    const ultimaCol = columns[columns.length - 1];
    return ultimaCol ? ultimaCol.cards.length : 0;
  }, [columns]);

  const totalEnProceso = totalCards - totalTerminadas;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-4">
      {/* Encabezado Compacto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Taller · Flujo de Producción
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
            Tablero de Etapas (Kanban)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar OT, solicitud, cliente..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 md:w-64"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={cargarTablero}
            loading={loading}
            className="text-xs py-1.5 px-2.5 flex items-center gap-1"
            title="Refrescar tablero"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Franja Horizontal Única de KPIs (≤ 48px) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400">Total Órdenes:</span>
            <span className="font-mono font-black text-white text-sm">{totalCards}</span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">En Estaciones:</span>
            <span className="font-mono font-black text-amber-400 text-sm">{totalEnProceso}</span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Listas Mostrador:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">{totalTerminadas}</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
          {columns.length} estaciones operativas
        </span>
      </div>

      {/* Columnas Kanban con Altura Contenida y Scroll Interno Individual */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
        {columns.map((col, colIdx) => {
          const cardsFiltradas = col.cards.filter((card) => {
            if (!filtroTexto.trim()) return true;
            const q = filtroTexto.toLowerCase();
            return (
              card.workOrderNumber.toLowerCase().includes(q) ||
              card.requestNumber.toLowerCase().includes(q) ||
              card.customerName.toLowerCase().includes(q) ||
              card.itemName.toLowerCase().includes(q)
            );
          });

          const esUltimaCol = colIdx === columns.length - 1;

          return (
            <div
              key={col.stepId || col.stepCode}
              className="p-3 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md flex flex-col gap-2.5 h-[calc(100vh-220px)] min-h-[480px] shadow-lg overflow-hidden"
            >
              {/* Cabecera de Columna */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white uppercase tracking-wider">{col.stepName}</span>
                <Badge variant={cardsFiltradas.length > 0 ? 'info' : 'neutral'} size="sm">
                  {cardsFiltradas.length}
                </Badge>
              </div>

              {/* Lista de Tarjetas con Scroll Interno Controlado */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic">
                    Cargando etapa...
                  </div>
                ) : cardsFiltradas.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="Sin órdenes"
                      description="No hay ítems en esta estación."
                      variant="info"
                      size="sm"
                    />
                  </div>
                ) : (
                  cardsFiltradas.map((card) => {
                    const estaAvanzando = avanzandoId === card.workOrderItemId;
                    const fechaPromesa = card.promisedDeliveryAt
                      ? new Intl.DateTimeFormat('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(card.promisedDeliveryAt))
                      : 'Sin franja';

                    return (
                      <div
                        key={card.workOrderItemId}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 shadow-md space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-400 text-xs bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-700/40">
                            {card.workOrderNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {card.requestNumber}
                          </span>
                        </div>

                        <div>
                          <div className="font-semibold text-white text-xs leading-snug line-clamp-2">
                            {card.itemName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                            <span className="truncate max-w-[140px]">{card.customerName}</span>
                            <span className="font-mono font-bold text-slate-300">
                              Cant: {card.quantity}
                            </span>
                          </div>
                        </div>

                        {card.currentOperatorName && (
                          <div className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">Op: {card.currentOperatorName}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate">
                            🕒 {fechaPromesa}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCardDetalle(card)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Ver detalle de la orden de trabajo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {esUltimaCol || card.isCompleted ? (
                              <span
                                className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                title="Etapa finalizada"
                              >
                                <Check className="w-3 h-3" />
                                <span className="hidden sm:inline">Listo</span>
                              </span>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={estaAvanzando}
                                onClick={() => handleAvanzarPaso(card, colIdx)}
                                className="py-0.5 px-2 text-xs flex items-center gap-1"
                                title="Avanzar a la siguiente etapa de taller"
                              >
                                <span>Avanzar</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalle de Tarjeta */}
      <Modal
        isOpen={!!cardDetalle}
        onClose={() => setCardDetalle(null)}
        title={`Detalle OT · ${cardDetalle?.workOrderNumber ?? ''}`}
        size="md"
      >
        {cardDetalle && (
          <div className="space-y-3 p-1 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Solicitud:</span>
                <span className="font-mono font-bold text-indigo-400">{cardDetalle.requestNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{cardDetalle.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ítem / Servicio:</span>
                <span className="font-semibold text-slate-200">{cardDetalle.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cantidad:</span>
                <span className="font-mono font-bold text-white">{cardDetalle.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Etapa Actual:</span>
                <span className="font-semibold text-indigo-300">{cardDetalle.currentStepName}</span>
              </div>
              {cardDetalle.currentOperatorName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Operador asignado:</span>
                  <span className="text-slate-200">{cardDetalle.currentOperatorName}</span>
                </div>
              )}
              {cardDetalle.technicalObservation && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-slate-400 block mb-1">Observación técnica:</span>
                  <p className="text-slate-300 italic">{cardDetalle.technicalObservation}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setCardDetalle(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TableroKanbanTaller;
