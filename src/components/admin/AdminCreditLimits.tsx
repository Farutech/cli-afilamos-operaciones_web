import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Eye,
  Pencil,
  Power,
  Search,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';

export interface CreditPolicyItem {
  id: string;
  clienteCodigo: string;
  clienteNombre: string;
  limiteCredito: number;
  saldoUtilizado: number;
  diasPlazo: number;
  bloqueadoPorMora: boolean;
  activo: boolean;
}

const FALLBACK_CREDITS: CreditPolicyItem[] = [
  { id: 'crd-1', clienteCodigo: 'CLI-001', clienteNombre: 'María Fernanda López', limiteCredito: 2500000, saldoUtilizado: 450000, diasPlazo: 15, bloqueadoPorMora: false, activo: true },
  { id: 'crd-2', clienteCodigo: 'CLI-002', clienteNombre: 'Restaurante La Casona', limiteCredito: 8000000, saldoUtilizado: 3200000, diasPlazo: 30, bloqueadoPorMora: false, activo: true },
  { id: 'crd-3', clienteCodigo: 'CLI-004', clienteNombre: 'Hotel Casa Real', limiteCredito: 12000000, saldoUtilizado: 11400000, diasPlazo: 45, bloqueadoPorMora: true, activo: true },
  { id: 'crd-4', clienteCodigo: 'CLI-005', clienteNombre: 'Comercializadora Norte', limiteCredito: 5000000, saldoUtilizado: 0, diasPlazo: 30, bloqueadoPorMora: false, activo: false },
  { id: 'crd-5', clienteCodigo: 'CLI-006', clienteNombre: 'Maderas y Muebles del Valle', limiteCredito: 4500000, saldoUtilizado: 1800000, diasPlazo: 20, bloqueadoPorMora: false, activo: true },
];

export default function AdminCreditLimits({ token: _token }: { token?: string }) {
  const [credits, setCredits] = useState<CreditPolicyItem[]>(FALLBACK_CREDITS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<CreditPolicyItem | 'new' | null>(null);
  const [viewCredit, setViewCredit] = useState<CreditPolicyItem | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(credits.length / pageSize));

  function saveCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      clienteCodigo: String(data.get('clienteCodigo') || '').trim(),
      clienteNombre: String(data.get('clienteNombre') || '').trim(),
      limiteCredito: Number(data.get('limiteCredito') || 0),
      diasPlazo: Number(data.get('diasPlazo') || 0),
    };

    if (modal === 'new') {
      const newCred: CreditPolicyItem = {
        id: `crd-${Date.now()}`,
        ...body,
        saldoUtilizado: 0,
        bloqueadoPorMora: false,
        activo: true,
      };
      setCredits((prev) => [newCred, ...prev]);
      toast.success('Límite de crédito asignado con éxito');
    } else {
      setCredits((prev) =>
        prev.map((c) => (c.id === modal.id ? { ...c, ...body } : c))
      );
      toast.success('Condición de crédito actualizada');
    }
    setSaving(false);
    setModal(null);
  }

  function toggleCreditStatus(item: CreditPolicyItem) {
    const nextStatus = !item.activo;
    setCredits((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, activo: nextStatus } : c))
    );
    toast.success(nextStatus ? 'Crédito activado para el cliente' : 'Crédito suspendido para el cliente');
  }

  const visible = useMemo(
    () =>
      credits.filter((c) =>
        `${c.clienteNombre} ${c.clienteCodigo}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [credits, query]
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CLIENTES</p>
          <h1>Crédito y límites comerciales</h1>
          <p className="heading-copy">
            Políticas de cupo autorizado, exposición de riesgo y días de crédito por cliente.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <CreditCard className="w-4 h-4 mr-2 inline" /> Asignar cupo
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Límites de Crédito</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por cliente o código"
              aria-label="Buscar límites"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>CLIENTE</span>
          <span>CUPO ASIGNADO</span>
          <span>SALDO PENDIENTE</span>
          <span>ESTADO CRÉDITO</span>
          <span>ACCIONES</span>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">No hay registros de crédito configurados.</div>
        ) : (
          <div className="client-list">
            {visible.map((item) => {
              const porcentajeUso = Math.min(100, Math.round((item.saldoUtilizado / (item.limiteCredito || 1)) * 100));

              return (
                <div className="client-row" key={item.id}>
                  <div className="client-avatar">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="client-main">
                    <strong>{item.clienteNombre}</strong>
                    <span>{item.clienteCodigo} · {item.diasPlazo} días de plazo</span>
                  </div>
                  <span className="client-contact font-bold text-slate-100">
                    ${item.limiteCredito.toLocaleString('es-CO')}
                  </span>
                  <span className="client-orders font-bold text-amber-400">
                    ${item.saldoUtilizado.toLocaleString('es-CO')} ({porcentajeUso}%)
                  </span>
                  <span className={`client-status ${item.bloqueadoPorMora || !item.activo ? 'is-pending' : ''}`}>
                    {!item.activo ? 'Suspendido' : item.bloqueadoPorMora ? 'Bloqueado x Mora' : 'Al día'}
                  </span>
                  <div className="client-actions">
                    <button
                      className="icon-action"
                      onClick={() => setViewCredit(item)}
                      aria-label={`Ver crédito de ${item.clienteNombre}`}
                      title="Ver detalle de crédito"
                    >
                      <Eye className="w-4 h-4 text-violet-400" />
                    </button>
                    <button
                      className="icon-action"
                      onClick={() => setModal(item)}
                      aria-label={`Editar límite de ${item.clienteNombre}`}
                      title="Editar cupo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="icon-action"
                      onClick={() => toggleCreditStatus(item)}
                      aria-label={`Cambiar estado de crédito de ${item.clienteNombre}`}
                      title="Suspender o activar crédito"
                    >
                      <Power className="w-4 h-4" />
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
            </select>
          </label>
          <span className="pagination-summary">
            Página {page} de {totalPages} · {pageSize} elementos por página
          </span>
          <div className="pagination-controls" aria-label="Paginación de créditos">
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

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewCredit}
        onClose={() => setViewCredit(null)}
        title="Ficha Financiera y Límites de Crédito"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewCredit(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewCredit;
                setViewCredit(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Ajustar cupo
            </Button>
          </>
        }
      >
        {viewCredit && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <CreditCard className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewCredit.clienteNombre}</h4>
                <span>Código: {viewCredit.clienteCodigo}</span>
              </div>
              <Badge variant={!viewCredit.activo ? 'neutral' : viewCredit.bloqueadoPorMora ? 'danger' : 'success'}>
                {!viewCredit.activo ? 'Crédito Inactivo' : viewCredit.bloqueadoPorMora ? 'Bloqueado por Mora' : 'Línea de Crédito Habilitada'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-violet-400" /> Cupo Total Autorizado
                </span>
                <span className="item-value font-bold text-slate-100">
                  ${viewCredit.limiteCredito.toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <AlertTriangle className="w-3 h-3 mr-1 inline text-amber-400" /> Saldo Adeudado Actual
                </span>
                <span className="item-value font-bold text-amber-400">
                  ${viewCredit.saldoUtilizado.toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <CheckCircle className="w-3 h-3 mr-1 inline text-emerald-400" /> Cupo Disponible
                </span>
                <span className="item-value font-bold text-emerald-400">
                  ${Math.max(0, viewCredit.limiteCredito - viewCredit.saldoUtilizado).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Calendar className="w-3 h-3 mr-1 inline text-violet-400" /> Plazo Máximo de Pago
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewCredit.diasPlazo} días calendario
                </span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Evaluación de Riesgo</span>
                <span className="item-value">
                  {viewCredit.bloqueadoPorMora
                    ? 'Requiere autorización de gerencia o pago previo para generar nuevas órdenes de trabajo.'
                    : 'Cliente calificado con comportamiento de pago regular y cupo activo.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: AJUSTAR LÍMITE (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Asignar Nuevo Cupo de Crédito' : 'Modificar Cupo y Plazo'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="credit-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cupo'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="credit-form" onSubmit={saveCredit}>
            <div className="client-modal-grid">
              <label className="floating-field">
                <input
                  name="clienteCodigo"
                  defaultValue={modal === 'new' ? '' : modal.clienteCodigo}
                  placeholder=" "
                  required
                />
                <span>Código del cliente (ej: CLI-001)</span>
              </label>

              <label className="floating-field">
                <input
                  name="clienteNombre"
                  defaultValue={modal === 'new' ? '' : modal.clienteNombre}
                  placeholder=" "
                  required
                />
                <span>Nombre del cliente</span>
              </label>

              <label className="floating-field">
                <input
                  name="limiteCredito"
                  type="number"
                  min="0"
                  step="50000"
                  defaultValue={modal === 'new' ? 1000000 : modal.limiteCredito}
                  placeholder=" "
                  required
                />
                <span>Límite de crédito autorizado (COP)</span>
              </label>

              <label className="floating-field">
                <input
                  name="diasPlazo"
                  type="number"
                  min="0"
                  max="120"
                  defaultValue={modal === 'new' ? 15 : modal.diasPlazo}
                  placeholder=" "
                  required
                />
                <span>Días de plazo de pago</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
