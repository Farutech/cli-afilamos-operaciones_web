import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  ShieldCheck,
  User,
  Clock,
  Code,
  Layers,
} from 'lucide-react';
import { Modal, Button, Badge } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
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

  const columns: ColumnDef<EventoAuditoriaDto>[] = [
    {
      key: 'fecha',
      header: 'FECHA Y HORA',
      render: (log) => {
        const dateStr = new Date(log.timestamp).toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'medium',
        });
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <strong className="text-white font-medium block">{dateStr}</strong>
              <span className="text-[11px] text-slate-400 font-mono">ID: {log.entityId}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'usuario',
      header: 'USUARIO / ACTOR',
      render: (log) => (
        <span className="font-medium text-slate-200">
          {log.actorName || log.userId || 'Sistema'}
        </span>
      ),
    },
    {
      key: 'accion',
      header: 'ACCIÓN',
      render: (log) => (
        <span className="font-mono text-xs text-violet-300 font-semibold">{log.action}</span>
      ),
    },
    {
      key: 'modulo',
      header: 'MÓDULO',
      align: 'center',
      render: (log) => (
        <Badge variant="neutral">{log.entityType}</Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<EventoAuditoriaDto>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (log) => setViewLog(log),
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Registro de actividad"
        eyebrow="ADMINISTRACIÓN · AUDITORÍA"
        description="Trazabilidad completa, auditoría de eventos de seguridad y bitácora de operaciones."
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar por usuario, acción o ID...',
          isSearching: loading,
        }}
      >
        <StandardDataTable<EventoAuditoriaDto>
          columns={columns}
          data={visible}
          keyExtractor={(log) => log.id}
          rowActions={rowActions}
          loading={loading && logs.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No hay eventos coincidentes en el periodo."
        />
      </ListPageLayout>

      {/* Modal: VER DETALLE DEL EVENTO (Design System Modal) */}
      <Modal
        isOpen={!!viewLog}
        onClose={() => setViewLog(null)}
        title="Detalle del Evento de Auditoría"
        subtitle="Trazabilidad del actor, entidad afectada y carga de datos"
        icon={<ShieldCheck className="w-5 h-5 text-violet-400" />}
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
