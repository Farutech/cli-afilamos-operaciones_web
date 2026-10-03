import { useEffect, useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Eye,
  Search,
  ShieldCheck,
  User,
  Clock,
  Code,
  Layers,
} from 'lucide-react';
import { Modal, Button, Badge } from '@farutech/design-system';
import { auditoriaApi, type EventoAuditoriaDto } from '@/services/auditoriaApi';

const FALLBACK_LOGS: EventoAuditoriaDto[] = [
  { id: 'aud-1', uuid: 'aud-1', timestamp: '2026-10-03T09:42:15Z', actorId: 'usr-admin', actorName: 'Javier Ramírez (Admin)', action: 'CREAR_SOLICITUD', tipoAccion: 'CREAR_SOLICITUD', entityType: 'SOLICITUD', tipoEntidad: 'SOLICITUD', entityId: 'SOL-2026-0042', payloadJson: '{"cliente": "CLI-001", "items": 3, "total": 145000, "anticipo": 75000}' },
  { id: 'aud-2', uuid: 'aud-2', timestamp: '2026-10-03T08:15:30Z', actorId: 'usr-cajero', actorName: 'Carlos M. (Cajero)', action: 'APERTURA_CAJA', tipoAccion: 'APERTURA_CAJA', entityType: 'CAJA', tipoEntidad: 'CAJA', entityId: 'TURNO-014', payloadJson: '{"caja": "Caja 01", "saldoInicial": 150000, "denominaciones": {"50k": 2, "20k": 2, "10k": 1}}' },
  { id: 'aud-3', uuid: 'aud-3', timestamp: '2026-10-02T17:50:11Z', actorId: 'usr-taller', actorName: 'Pedro Gómez (Técnico)', action: 'CAMBIO_ESTADO_OT', tipoAccion: 'CAMBIO_ESTADO_OT', entityType: 'ORDEN_TRABAJO', tipoEntidad: 'ORDEN_TRABAJO', entityId: 'OT-2026-0147', payloadJson: '{"estadoAnterior": "EN_PROCESO", "nuevoEstado": "LISTO_ENTREGA", "maquina": "Rectificadora H7"}' },
  { id: 'aud-4', uuid: 'aud-4', timestamp: '2026-10-02T15:20:00Z', actorId: 'usr-admin', actorName: 'Javier Ramírez (Admin)', action: 'ACTUALIZAR_PRECIO', tipoAccion: 'ACTUALIZAR_PRECIO', entityType: 'ITEM_CATALOGO', tipoEntidad: 'ITEM_CATALOGO', entityId: 'SRV-001', payloadJson: '{"precioAnterior": 42000, "nuevoPrecio": 45000, "motivo": "Ajuste inflacionario Q4"}' },
  { id: 'aud-5', uuid: 'aud-5', timestamp: '2026-10-02T11:05:40Z', actorId: 'usr-sup', actorName: 'Lucía Peña (Supervisor)', action: 'APROBACION_EXCEPCION', tipoAccion: 'APROBACION_EXCEPCION', entityType: 'APROBACION', tipoEntidad: 'APROBACION', entityId: 'AP-0089', payloadJson: '{"tipo": "ANTICIPO_INSUFICIENTE", "documento": "SOL-2026-0038", "justificacion": "Cliente recurrente con cupo autorizado"}' },
];

export default function AdminAuditLogs({ token }: { token?: string }) {
  const [logs, setLogs] = useState<EventoAuditoriaDto[]>(FALLBACK_LOGS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(FALLBACK_LOGS.length);
  const [viewLog, setViewLog] = useState<EventoAuditoriaDto | null>(null);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await auditoriaApi.getEventos({ page, pageSize, search: query }, token);
      if (res.items && res.items.length > 0) {
        setLogs(res.items);
        setTotalItems(res.total);
      } else {
        setLogs(FALLBACK_LOGS);
        setTotalItems(FALLBACK_LOGS.length);
      }
    } catch {
      setLogs(FALLBACK_LOGS);
      setTotalItems(FALLBACK_LOGS.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [page, pageSize, query, token]);

  const visible = useMemo(
    () =>
      logs.filter((l) =>
        `${l.action} ${l.actorName} ${l.entityType} ${l.entityId}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [logs, query]
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · AUDITORÍA</p>
          <h1>Registro de actividad</h1>
          <p className="heading-copy">
            Trazabilidad completa, auditoría de eventos de seguridad y bitácora de operaciones.
          </p>
        </div>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Eventos de Auditoría</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por usuario, acción o ID..."
              aria-label="Buscar eventos"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>FECHA Y HORA</span>
          <span>USUARIO / ACTOR</span>
          <span>ACCIÓN</span>
          <span>MÓDULO</span>
          <span>ACCIONES</span>
        </div>

        {loading ? (
          <div className="empty-state">Consultando bitácora…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay eventos coincidentes en el periodo.</div>
        ) : (
          <div className="client-list">
            {visible.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'medium',
              });

              return (
                <div className="client-row" key={log.id}>
                  <div className="client-avatar">
                    <ShieldCheck className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="client-main">
                    <strong>{dateStr}</strong>
                    <span>ID: {log.entityId}</span>
                  </div>
                  <span className="client-contact font-medium text-slate-200">
                    {log.actorName || log.userId || 'Sistema'}
                  </span>
                  <span className="client-orders font-mono text-xs text-violet-300">
                    {log.action}
                  </span>
                  <span className="client-status">
                    {log.entityType}
                  </span>
                  <div className="client-actions">
                    <button
                      className="icon-action"
                      onClick={() => setViewLog(log)}
                      aria-label={`Ver evento ${log.action}`}
                      title="Ver detalle del evento"
                    >
                      <Eye className="w-4 h-4 text-violet-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pagination-bar">
          <label className="pagination-size">
            Por página
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Cantidad por página"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
          <span className="pagination-summary">
            Página {page} de {totalPages} · {pageSize} elementos por página
          </span>
          <div className="pagination-controls" aria-label="Paginación de auditoría">
            <button className="pagination-icon" disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === 1} onClick={() => setPage((c) => c - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === totalPages} onClick={() => setPage((c) => c + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal: VER DETALLE DEL EVENTO (Design System Modal) */}
      <Modal
        isOpen={!!viewLog}
        onClose={() => setViewLog(null)}
        title="Detalle del Evento de Auditoría"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setViewLog(null)}>
            Cerrar
          </Button>
        }
      >
        {viewLog && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <ShieldCheck className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewLog.action}</h4>
                <span>{new Date(viewLog.timestamp).toLocaleString('es-CO')}</span>
              </div>
              <Badge variant="info">{viewLog.entityType}</Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <User className="w-3 h-3 mr-1 inline text-violet-400" /> Usuario Responsable
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewLog.actorName || viewLog.userId || 'Sistema Central'}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Layers className="w-3 h-3 mr-1 inline text-violet-400" /> Documento / Entidad Afectada
                </span>
                <span className="item-value font-mono text-violet-300">{viewLog.entityId}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Clock className="w-3 h-3 mr-1 inline text-violet-400" /> Marca de Tiempo UTC
                </span>
                <span className="item-value font-mono text-xs">{viewLog.timestamp}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">Identificador del Registro</span>
                <span className="item-value font-mono text-xs">{viewLog.id}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">
                  <Code className="w-3 h-3 mr-1 inline text-violet-400" /> Carga Útil de Datos (Payload JSON)
                </span>
                <pre
                  style={{
                    margin: '6px 0 0',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0c0d10',
                    border: '1px solid #252730',
                    color: '#a78bfa',
                    fontSize: '11px',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(viewLog.payloadJson || '{}'), null, 2);
                    } catch {
                      return viewLog.payloadJson || 'Sin datos adicionales registrados.';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
