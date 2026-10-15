import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Check,
  X,
  ShieldAlert,
  User,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
import { aprobacionesApi, type AprobacionDto } from '@/services/aprobacionesApi';

const FALLBACK_APPROVALS: AprobacionDto[] = [
  { id: 'ap-1', uuid: 'ap-1', documentId: 'doc-1', documentNumber: 'SOL-2026-0045', approvalType: 'ANTICIPO_MENOR_50', tipoAprobacion: 'Excepción de Anticipo Comercial', requestedBy: 'usr-cajero', requestedByName: 'Carlos M. (Cajero)', customerName: 'Restaurante La Casona', totalAmount: 350000, paidAmount: 100000, balanceDue: 250000, reason: 'Cliente recurrente solicitó dejar 30% de anticipo por entrega en 24h.', isApproved: false, isRejected: false, status: 'PENDIENTE', createdAt: '2026-10-03T09:10:00Z' },
  { id: 'ap-2', uuid: 'ap-2', documentId: 'doc-2', documentNumber: 'SOL-2026-0041', approvalType: 'DESCUENTO_ESPECIAL', tipoAprobacion: 'Descuento por Volumen Extraordinario', requestedBy: 'usr-asesor', requestedByName: 'Andrés V. (Asesor)', customerName: 'Hotel Casa Real', totalAmount: 1200000, paidAmount: 600000, balanceDue: 600000, reason: 'Solicitud de 15% de descuento por paquete de 40 cuchillas.', isApproved: false, isRejected: false, status: 'PENDIENTE', createdAt: '2026-10-03T08:30:00Z' },
  { id: 'ap-3', uuid: 'ap-3', documentId: 'doc-3', documentNumber: 'ENT-2026-0012', approvalType: 'ENTREGA_CON_SALDO', tipoAprobacion: 'Despacho con Saldo Pendiente', requestedBy: 'usr-entrega', requestedByName: 'Mariana S. (Entregas)', customerName: 'María Fernanda López', totalAmount: 180000, paidAmount: 90000, balanceDue: 90000, reason: 'Cliente autoriza transferencia bancaria a 48 horas contra entrega.', isApproved: false, isRejected: false, status: 'PENDIENTE', createdAt: '2026-10-02T16:45:00Z' },
];

export default function AdminApprovals({ token }: { token?: string }) {
  const [approvals, setApprovals] = useState<AprobacionDto[]>(FALLBACK_APPROVALS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewApproval, setViewApproval] = useState<AprobacionDto | null>(null);
  const [actionModal, setActionModal] = useState<{ item: AprobacionDto; type: 'APROBAR' | 'RECHAZAR' } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await aprobacionesApi.getPendientes(token);
      if (res && res.length > 0) {
        setApprovals(res);
      } else {
        setApprovals(FALLBACK_APPROVALS);
      }
    } catch {
      setApprovals(FALLBACK_APPROVALS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, [token]);

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionModal) return;
    setProcessing(true);
    const data = new FormData(event.currentTarget);
    const reason = String(data.get('reason') || '').trim();
    const pin = String(data.get('pin') || '').trim();

    try {
      if (actionModal.type === 'APROBAR') {
        await aprobacionesApi.aprobar(actionModal.item.id, pin || '1234', reason, token);
        toast.success(`Solicitud ${actionModal.item.documentNumber} aprobada con éxito`);
      } else {
        await aprobacionesApi.rechazar(actionModal.item.id, reason || 'Rechazado por supervisor', token);
        toast.info(`Solicitud ${actionModal.item.documentNumber} rechazada`);
      }
      setApprovals((prev) => prev.filter((a) => a.id !== actionModal.item.id));
      setActionModal(null);
      await loadApprovals();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'La solicitud de aprobación ya no está disponible o fue modificada.';
      toast.error(msg);
      setActionModal(null);
      await loadApprovals();
    } finally {
      setProcessing(false);
    }
  }

  const visible = useMemo(
    () =>
      approvals.filter((a) =>
        `${a.documentNumber} ${a.customerName} ${a.tipoAprobacion} ${a.requestedByName}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [approvals, query]
  );

  const columns: ColumnDef<AprobacionDto>[] = [
    {
      key: 'documento',
      header: 'DOCUMENTO / CLIENTE',
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <strong className="text-white font-medium block">{a.documentNumber}</strong>
            <span className="text-[11px] text-slate-400">{a.customerName || 'Cliente mostrador'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'solicitante',
      header: 'SOLICITANTE',
      render: (a) => <span className="font-medium text-slate-200">{a.requestedByName}</span>,
    },
    {
      key: 'tipoExcepcion',
      header: 'TIPO EXCEPCIÓN',
      render: (a) => (
        <span className="text-xs text-amber-300 font-semibold">{a.tipoAprobacion}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'MONTO TOTAL',
      align: 'right',
      render: (a) => (
        <span className="font-mono font-bold text-xs text-slate-100">
          ${(a.totalAmount || 0).toLocaleString('es-CO')} COP
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'ESTADO',
      align: 'center',
      render: (a) => (
        <Badge variant="warning">{a.status || 'PENDIENTE'}</Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<AprobacionDto>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (a) => setViewApproval(a),
    },
    {
      label: 'Aprobar',
      icon: <Check className="w-3.5 h-3.5" />,
      onClick: (a) => setActionModal({ item: a, type: 'APROBAR' }),
      variant: 'success',
    },
    {
      label: 'Rechazar',
      icon: <X className="w-3.5 h-3.5" />,
      onClick: (a) => setActionModal({ item: a, type: 'RECHAZAR' }),
      variant: 'danger',
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Aprobaciones y excepciones"
        eyebrow="ADMINISTRACIÓN · AUDITORÍA"
        description="Autorización de dispensas de anticipo, descuentos extraordinarios y excepciones de despacho."
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar por documento o cliente...',
          isSearching: loading,
        }}
      >
        <StandardDataTable<AprobacionDto>
          columns={columns}
          data={visible.slice((page - 1) * pageSize, page * pageSize)}
          keyExtractor={(a) => a.id}
          rowActions={rowActions}
          loading={loading && approvals.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems: visible.length,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No hay aprobaciones pendientes en este momento."
        />
      </ListPageLayout>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewApproval}
        onClose={() => setViewApproval(null)}
        title="Detalle de la Solicitud de Excepción"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewApproval(null)}>
              Cerrar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (viewApproval) {
                  const target = viewApproval;
                  setViewApproval(null);
                  setActionModal({ item: target, type: 'RECHAZAR' });
                }
              }}
            >
              <X className="w-4 h-4 mr-2" /> Rechazar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (viewApproval) {
                  const target = viewApproval;
                  setViewApproval(null);
                  setActionModal({ item: target, type: 'APROBAR' });
                }
              }}
            >
              <Check className="w-4 h-4 mr-2" /> Aprobar excepción
            </Button>
          </>
        }
      >
        {viewApproval && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewApproval.documentNumber}</h4>
                <span>{viewApproval.tipoAprobacion}</span>
              </div>
              <Badge variant="warning">Pendiente de Firma</Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <User className="w-3 h-3 mr-1 inline text-violet-400" /> Solicitado Por
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewApproval.requestedByName}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <FileText className="w-3 h-3 mr-1 inline text-violet-400" /> Cliente Beneficiario
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewApproval.customerName || 'Cliente mostrador'}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-violet-400" /> Monto Total Liquidado
                </span>
                <span className="item-value font-bold text-emerald-400">
                  ${(viewApproval.totalAmount || 0).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-amber-400" /> Anticipo / Saldo Pendiente
                </span>
                <span className="item-value font-bold text-amber-400">
                  Pagado: ${(viewApproval.paidAmount || 0).toLocaleString('es-CO')} · Saldo: ${(viewApproval.balanceDue || 0).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">
                  <AlertCircle className="w-3 h-3 mr-1 inline text-violet-400" /> Justificación o Motivo
                </span>
                <span className="item-value leading-relaxed">
                  {viewApproval.reason || 'Sin justificación escrita ingresada.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: FIRMAR APROBACIÓN O RECHAZO (Design System Modal) */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'APROBAR' ? 'Autorizar Excepción Comercial' : 'Rechazar Solicitud'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionModal(null)} disabled={processing}>
              Cancelar
            </Button>
            <Button
              variant={actionModal?.type === 'APROBAR' ? 'primary' : 'danger'}
              type="submit"
              form="approval-action-form"
              disabled={processing}
            >
              {processing
                ? 'Procesando…'
                : actionModal?.type === 'APROBAR'
                ? 'Confirmar aprobación'
                : 'Confirmar rechazo'}
            </Button>
          </>
        }
      >
        {actionModal && (
          <form id="approval-action-form" onSubmit={handleActionSubmit}>
            <div className="client-modal-grid">
              <div className="modal-form-full">
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {actionModal.type === 'APROBAR'
                    ? `Estás a punto de autorizar la excepción para el documento ${actionModal.item.documentNumber}. Ingresa tu PIN de supervisor para validar el registro.`
                    : `Estás rechazando la excepción para el documento ${actionModal.item.documentNumber}. El cajero deberá requerir el pago correspondiente.`}
                </p>
              </div>

              {actionModal.type === 'APROBAR' && (
                <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
                  <input
                    name="pin"
                    type="password"
                    maxLength={6}
                    placeholder=" "
                    required
                  />
                  <span>PIN de autorización de supervisor (4 dígitos)</span>
                </label>
              )}

              <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
                <input
                  name="reason"
                  placeholder=" "
                  defaultValue={actionModal.type === 'APROBAR' ? 'Autorizado por supervisor en turno' : ''}
                  required
                />
                <span>Observación o motivo de decisión</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
