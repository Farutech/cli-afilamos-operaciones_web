import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Modal,
  Button,
  Badge,
  FloatingInput,
  CrudPagination,
  LookupInput,
  type LookupOption,
} from '@farutech/design-system';
import { ordeonRequest } from '@/lib/api-client';

export interface CreditPolicyItem {
  id: string;
  clienteId?: string;
  clienteCodigo: string;
  clienteNombre: string;
  limiteCredito: number;
  saldoUtilizado: number;
  diasPlazo: number;
  bloqueadoPorMora: boolean;
  activo: boolean;
}

interface RawCustomer {
  id: string;
  code?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  creditEnabled?: boolean;
  creditLimit?: number;
  isActive?: boolean;
}

export default function AdminCreditLimits({ token }: { token?: string }) {
  const [credits, setCredits] = useState<CreditPolicyItem[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [modal, setModal] = useState<CreditPolicyItem | 'new' | null>(null);
  const [viewCredit, setViewCredit] = useState<CreditPolicyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para el Lookup y la Búsqueda Avanzada de Clientes
  const [selectedClientOption, setSelectedClientOption] = useState<LookupOption | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advQuery, setAdvQuery] = useState('');
  const [advResults, setAdvResults] = useState<RawCustomer[]>([]);
  const [advLoading, setAdvLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Carga inicial y por paginación desde el API de Ordeon
  async function loadCredits() {
    setLoading(true);
    try {
      if (token) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (query.trim()) params.set('search', query.trim());

        const res = await ordeonRequest<{ items?: RawCustomer[]; data?: RawCustomer[]; totalCount?: number; total?: number }>(
          `/api/v1/customers?${params}`,
          token
        );
        const list: RawCustomer[] = Array.isArray(res) ? res : res?.items || res?.data || [];
        const mapped: CreditPolicyItem[] = list.map((c) => ({
          id: c.id,
          clienteId: c.id,
          clienteCodigo: c.code || 'SIN-COD',
          clienteNombre: c.name || 'Cliente sin nombre',
          limiteCredito: Number(c.creditLimit || 0),
          saldoUtilizado: 0,
          diasPlazo: 30,
          bloqueadoPorMora: false,
          activo: Boolean(c.creditEnabled ?? c.isActive ?? true),
        }));
        setCredits(mapped);
        setTotalItems(res?.totalCount ?? res?.total ?? mapped.length);
      } else {
        setCredits([]);
        setTotalItems(0);
      }
    } catch {
      // Fallback limpio local sin parpadeo de datos ficticios desfasados
      setCredits([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCredits();
  }, [page, pageSize, query, token]);

  // Proveedor de autocompletado para LookupInput
  async function handleSearchCustomer(text: string): Promise<LookupOption[]> {
    if (!token) return [];
    try {
      const res = await ordeonRequest<{ items?: RawCustomer[]; data?: RawCustomer[] }>(
        `/api/v1/customers?search=${encodeURIComponent(text)}&pageSize=8`,
        token
      );
      const items = Array.isArray(res) ? res : res?.items || res?.data || [];
      return items.map((c) => ({
        value: c.id,
        label: `${c.name || 'Sin nombre'} (${c.code || 'S/C'})`,
        description: `Tel: ${c.phone || 'S/T'} · Correo: ${c.email || 'S/C'}`,
        data: c,
      }));
    } catch {
      return [];
    }
  }

  // Búsqueda avanzada de clientes por múltiples criterios
  async function runAdvancedSearch() {
    if (!token) return;
    setAdvLoading(true);
    try {
      const res = await ordeonRequest<{ items?: RawCustomer[]; data?: RawCustomer[] }>(
        `/api/v1/customers?search=${encodeURIComponent(advQuery)}&pageSize=15`,
        token
      );
      const items = Array.isArray(res) ? res : res?.items || res?.data || [];
      setAdvResults(items);
    } catch {
      setAdvResults([]);
    } finally {
      setAdvLoading(false);
    }
  }

  function handleSelectFromAdvanced(c: RawCustomer) {
    setSelectedClientOption({
      value: c.id,
      label: `${c.name || 'Sin nombre'} (${c.code || 'S/C'})`,
      description: `Tel: ${c.phone || 'S/T'} · Correo: ${c.email || 'S/C'}`,
      data: c,
    });
    setIsAdvancedSearchOpen(false);
  }

  // Guardar límite / cupo
  async function saveCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const limiteCredito = Number(data.get('limiteCredito') || 0);
    const diasPlazo = Number(data.get('diasPlazo') || 30);

    const clientRaw = selectedClientOption?.data as RawCustomer | undefined;
    const clienteId = selectedClientOption?.value || (modal !== 'new' ? modal.clienteId : '');
    const clienteCodigo = clientRaw?.code || (modal !== 'new' ? modal.clienteCodigo : '');
    const clienteNombre = clientRaw?.name || (modal !== 'new' ? modal.clienteNombre : '');

    try {
      if (token && clienteId) {
        await ordeonRequest(`/api/v1/customers/${clienteId}`, token, {
          method: 'PUT',
          body: JSON.stringify({
            creditEnabled: true,
            creditLimit: limiteCredito,
          }),
        });
      }
      toast.success(modal === 'new' ? 'Cupo de crédito asignado con éxito' : 'Condición de crédito actualizada');
      setModal(null);
      setSelectedClientOption(null);
      await loadCredits();
    } catch {
      // Guardado local optimista
      if (modal === 'new') {
        const newCred: CreditPolicyItem = {
          id: `crd-${Date.now()}`,
          clienteId,
          clienteCodigo: clienteCodigo || 'CLI-NEW',
          clienteNombre: clienteNombre || 'Cliente Asignado',
          limiteCredito,
          saldoUtilizado: 0,
          diasPlazo,
          bloqueadoPorMora: false,
          activo: true,
        };
        setCredits((prev) => [newCred, ...prev]);
        setTotalItems((prev) => prev + 1);
      } else {
        setCredits((prev) =>
          prev.map((c) => (c.id === modal.id ? { ...c, limiteCredito, diasPlazo } : c))
        );
      }
      toast.success('Cupo registrado localmente');
      setModal(null);
      setSelectedClientOption(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleCreditStatus(item: CreditPolicyItem) {
    const nextStatus = !item.activo;
    try {
      if (token && item.clienteId) {
        await ordeonRequest(`/api/v1/customers/${item.clienteId}`, token, {
          method: 'PUT',
          body: JSON.stringify({
            creditEnabled: nextStatus,
          }),
        });
      }
      toast.success(nextStatus ? 'Línea de crédito activada' : 'Línea de crédito suspendida');
      await loadCredits();
    } catch {
      setCredits((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, activo: nextStatus } : c))
      );
      toast.success('Estado actualizado localmente');
    }
  }

  const visible = useMemo(() => {
    return credits.filter((c) =>
      `${c.clienteNombre} ${c.clienteCodigo}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [credits, query]);

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CLIENTES</p>
          <h1>Crédito y límites comerciales</h1>
          <p className="heading-copy">
            Políticas de cupo autorizado, exposición de riesgo y días de crédito por cliente en Ordeon.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setSelectedClientOption(null);
            setModal('new');
          }}
        >
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
              placeholder="Buscar por cliente o código..."
              aria-label="Buscar límites"
            />
          </div>
        </div>

        {/* Encabezado fijo de columnas */}
        <div className="client-table-head">
          <span>CLIENTE</span>
          <span>CUPO ASIGNADO</span>
          <span>SALDO PENDIENTE</span>
          <span>ESTADO CRÉDITO</span>
          <span>ACCIONES</span>
        </div>

        {loading && credits.length === 0 ? (
          <div className="empty-state">
            <span className="spinner-sm inline-block mr-2" /> Cargando límites de crédito…
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            {query.trim()
              ? 'No hay registros de crédito que coincidan con la búsqueda.'
              : 'No hay cupos de crédito asignados actualmente.'}
          </div>
        ) : (
          <div className="client-list">
            {visible.map((item) => {
              const porcentajeUso = Math.min(
                100,
                Math.round((item.saldoUtilizado / (item.limiteCredito || 1)) * 100)
              );

              return (
                <div className="client-row" key={item.id}>
                  <div className="client-cell-main">

                    <div className="client-avatar">
                    <CreditCard className="w-4 h-4" />
                  </div>

                    <div className="client-main">
                    <strong>{item.clienteNombre}</strong>
                    <span>{item.clienteCodigo} · {item.diasPlazo} días de plazo</span>
                  </div>

                  </div>
                  <span className="client-contact font-bold text-slate-100">
                    ${item.limiteCredito.toLocaleString('es-CO')} COP
                  </span>
                  <span className="client-orders font-bold text-amber-400">
                    ${item.saldoUtilizado.toLocaleString('es-CO')} ({porcentajeUso}%)
                  </span>
                  <span className={`client-status ${item.bloqueadoPorMora || !item.activo ? 'is-pending' : ''}`}>
                    {!item.activo ? 'Suspendido' : item.bloqueadoPorMora ? 'Bloqueado x Mora' : 'Habilitado'}
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
                      onClick={() => {
                        setSelectedClientOption({
                          value: item.clienteId || item.id,
                          label: `${item.clienteNombre} (${item.clienteCodigo})`,
                          description: `Código: ${item.clienteCodigo}`,
                        });
                        setModal(item);
                      }}
                      aria-label={`Editar límite de ${item.clienteNombre}`}
                      title="Editar cupo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="icon-action"
                      onClick={() => void toggleCreditStatus(item)}
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

        {/* Paginación Estandarizada Design System (3 Columnas Equilibradas) */}
        <CrudPagination
          currentPage={page}
          totalPages={totalPages}
          perPage={pageSize}
          total={totalItems}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          variant="dark"
        />
      </section>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewCredit}
        onClose={() => setViewCredit(null)}
        title="Ficha Financiera y Límites de Crédito"
        subtitle="Línea de crédito autorizada, exposición de riesgo y política de plazos"
        icon={<CreditCard className="w-5 h-5 text-violet-400" />}
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
                if (target) {
                  setSelectedClientOption({
                    value: target.clienteId || target.id,
                    label: `${target.clienteNombre} (${target.clienteCodigo})`,
                    description: `Código: ${target.clienteCodigo}`,
                  });
                  setModal(target);
                }
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
                {!viewCredit.activo ? 'Crédito Suspendido' : viewCredit.bloqueadoPorMora ? 'Bloqueado por Mora' : 'Línea de Crédito Activa'}
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
                <span className="item-label">Evaluación de Riesgo y Regla de Negocio</span>
                <span className="item-value">
                  {viewCredit.bloqueadoPorMora
                    ? 'Requiere autorización de gerencia o cancelación de mora previa para asentar nuevas órdenes.'
                    : 'Cliente autorizado para facturación a crédito y entregas con saldo diferido según política.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: ASIGNAR / MODIFICAR CUPO (Design System Modal con LookupInput) */}
      <Modal
        isOpen={!!modal}
        onClose={() => {
          setModal(null);
          setSelectedClientOption(null);
        }}
        title={modal === 'new' ? 'Asignar Cupo de Crédito' : 'Modificar Cupo y Condiciones'}
        subtitle="Seleccione el cliente mediante el buscador o aplique criterios avanzados para encontrarlo"
        icon={<CreditCard className="w-5 h-5 text-violet-400" />}
        size="md"
        extraActions={
          modal && modal !== 'new' ? (
            <Button
              variant="outline"
              onClick={() => {
                const target = modal;
                setModal(null);
                setSelectedClientOption(null);
                void toggleCreditStatus(target);
              }}
              disabled={saving}
            >
              <Power className="w-4 h-4 mr-2" />
              {modal.activo ? 'Suspender crédito' : 'Reactivar crédito'}
            </Button>
          ) : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setModal(null);
                setSelectedClientOption(null);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="credit-form" disabled={saving}>
              {saving ? 'Guardando…' : modal === 'new' ? 'Asignar cupo' : 'Guardar cupo'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="credit-form" onSubmit={saveCredit}>
            <div className="client-modal-grid">
              {/* LookupInput con buscador inmediato y botón de búsqueda avanzada a la derecha */}
              <div style={{ gridColumn: '1 / -1' }}>
                <LookupInput
                  label="Cliente (digite nombre o código)"
                  tooltip="Busque el cliente por su nombre o código. Si no lo encuentra, use el botón de la derecha para más criterios."
                  value={selectedClientOption}
                  onChange={(opt) => setSelectedClientOption(opt)}
                  onSearch={handleSearchCustomer}
                  onAdvancedSearch={() => {
                    setAdvQuery('');
                    setAdvResults([]);
                    setIsAdvancedSearchOpen(true);
                  }}
                  advancedSearchLabel="Abrir búsqueda avanzada de clientes"
                  required
                  disabled={modal !== 'new'}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="limiteCredito"
                  type="number"
                  min="0"
                  step="50000"
                  label="Límite de crédito autorizado (COP)"
                  defaultValue={modal === 'new' ? 1000000 : modal.limiteCredito}
                  tooltip="Monto máximo en COP que el cliente puede adeudar simultáneamente en órdenes pendientes."
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="diasPlazo"
                  type="number"
                  min="1"
                  max="120"
                  label="Días de plazo de pago"
                  defaultValue={modal === 'new' ? 30 : modal.diasPlazo}
                  tooltip="Cantidad de días calendario otorgados antes de considerar la factura en mora."
                  required
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 3: BÚSQUEDA AVANZADA DE CLIENTES (Submodal auxiliar) */}
      <Modal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        title="Búsqueda Avanzada de Clientes"
        subtitle="Encuentre clientes por documento, teléfono, nombre o razón social"
        icon={<Search className="w-5 h-5 text-violet-400" />}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setIsAdvancedSearchOpen(false)}>
            Cerrar búsqueda
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <FloatingInput
                label="Criterio de búsqueda (Nombre, NIT, Teléfono, Correo)"
                value={advQuery}
                onValueChange={(val) => setAdvQuery(val)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runAdvancedSearch();
                  }
                }}
                tooltip="Presione Enter o el botón Buscar para consultar la base de datos de Ordeon."
              />
            </div>
            <Button
              variant="primary"
              onClick={() => void runAdvancedSearch()}
              disabled={advLoading || !advQuery.trim()}
              style={{ height: '52px', minWidth: '110px' }}
            >
              {advLoading ? <span className="spinner-sm" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar
            </Button>
          </div>

          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              border: '1px solid #282a36',
              borderRadius: '12px',
              background: '#13141a',
            }}
          >
            {advLoading ? (
              <div className="empty-state">
                <span className="spinner-sm inline-block mr-2" /> Consultando clientes en Ordeon…
              </div>
            ) : advResults.length === 0 ? (
              <div className="empty-state">
                {advQuery.trim()
                  ? 'No se encontraron clientes con esos criterios.'
                  : 'Ingrese un término y haga clic en Buscar para consultar.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {advResults.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid #1f212b',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>
                        {c.name || 'Sin nombre'}
                      </strong>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                        Código: <strong className="text-violet-300 font-mono">{c.code || 'S/C'}</strong> · Tel: {c.phone || 'S/T'} · Email: {c.email || 'S/C'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectFromAdvanced(c)}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Seleccionar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
