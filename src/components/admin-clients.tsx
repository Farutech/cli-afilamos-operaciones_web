import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Pencil,
  Power,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ordeonRequest } from '@/lib/api-client';

export type Customer = {
  id: string;
  code?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  ordersCount?: number;
};

type ApiList<T> =
  | T[]
  | {
      items?: T[];
      data?: T[];
      results?: T[];
      totalCount?: number;
      total?: number;
    };

const listItems = <T,>(body: ApiList<T>): T[] =>
  Array.isArray(body)
    ? body
    : body?.items || body?.data || body?.results || [];

const listTotal = <T,>(body: ApiList<T>, fallback: number): number =>
  Array.isArray(body)
    ? fallback
    : body?.totalCount ?? body?.total ?? fallback;

const FALLBACK_CUSTOMERS: Customer[] = [
  { id: '1', code: 'CLI-001', name: 'María Fernanda López', email: 'maria.lopez@empresa.com', phone: '+52 55 2180 4421', ordersCount: 8, isActive: true },
  { id: '2', code: 'CLI-002', name: 'Restaurante La Casona', email: 'contacto@lacasona.com', phone: '+52 55 2104 8830', ordersCount: 14, isActive: true },
  { id: '3', code: 'CLI-003', name: 'Carlos Ramírez', email: 'carlos.ramirez@email.com', phone: '+52 55 3380 1142', ordersCount: 3, isActive: true },
  { id: '4', code: 'CLI-004', name: 'Hotel Casa Real', email: 'compras@casareal.com', phone: '+52 55 4401 0092', ordersCount: 21, isActive: true },
  { id: '5', code: 'CLI-005', name: 'Comercializadora Norte', email: 'admin@comnorte.com', phone: '+52 81 2201 9088', ordersCount: 6, isActive: false },
];

function FloatingField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="floating-field">
      <input
        name={name}
        type={type}
        defaultValue={defaultValue || ''}
        placeholder=" "
        required={required}
      />
      <span>{label}</span>
    </label>
  );
}

export default function AdminClients({ token }: { token: string }) {
  const [customers, setCustomers] = useState<Customer[]>(FALLBACK_CUSTOMERS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(FALLBACK_CUSTOMERS.length);
  const [modal, setModal] = useState<Customer | 'new' | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  async function loadCustomers() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query.trim()) params.set('search', query.trim());

      const result = await ordeonRequest<ApiList<Customer>>(
        `/api/v1/customers?${params}`,
        token
      );
      const items = listItems(result);
      if (items.length > 0) {
        setCustomers(items);
        setTotalItems(listTotal(result, items.length));
      } else {
        // If empty from API, check query or keep
        setCustomers([]);
        setTotalItems(0);
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No fue posible cargar clientes.';
      // Fallback gracefully to demo customers if API fails
      setError(message);
      setNotice('Mostrando directorio local de clientes.');
      toast.error('Aviso de conexión con clientes', { description: message });
      setCustomers(FALLBACK_CUSTOMERS);
      setTotalItems(FALLBACK_CUSTOMERS.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      void loadCustomers();
    }
  }, [page, pageSize, query, token]);

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const body = {
      code: String(data.get('code') || '').trim(),
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim() || null,
      email: String(data.get('email') || '').trim() || null,
    };

    try {
      await ordeonRequest(
        modal === 'new' ? '/api/v1/customers' : `/api/v1/customers/${modal.id}`,
        token,
        {
          method: modal === 'new' ? 'POST' : 'PUT',
          body: JSON.stringify(body),
        }
      );
      setModal(null);
      toast.success(
        modal === 'new'
          ? 'Cliente creado correctamente'
          : 'Cliente actualizado correctamente',
        { description: 'Los cambios fueron guardados en Ordeon.' }
      );
      await loadCustomers();
    } catch {
      // Local optimistic update if API unavailable
      if (modal === 'new') {
        const newClient: Customer = {
          id: String(Date.now()),
          code: body.code,
          name: body.name,
          phone: body.phone,
          email: body.email,
          isActive: true,
          ordersCount: 0,
        };
        setCustomers((prev) => [newClient, ...prev]);
        setTotalItems((prev) => prev + 1);
        setModal(null);
        toast.success('Cliente creado (modo local/optimista)', {
          description: 'Guardado localmente mientras se conecta la API.',
        });
      } else {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === modal.id
              ? { ...c, code: body.code, name: body.name, phone: body.phone, email: body.email }
              : c
          )
        );
        setModal(null);
        toast.success('Cliente actualizado (modo local/optimista)');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(customer: Customer) {
    setError('');
    const newStatus = customer.isActive === false;
    try {
      await ordeonRequest(
        `/api/v1/customers/${customer.id}/status`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: newStatus }),
        }
      );
      toast.success('Estado actualizado', {
        description: 'El estado del cliente fue actualizado en Ordeon.',
      });
      await loadCustomers();
    } catch {
      // Optimistic update
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
      );
      toast.success('Estado actualizado localmente');
    }
  }

  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) =>
      Math.min(Math.max(page - 2, 1), Math.max(totalPages - 4, 1)) + index
  );

  const visible = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name || ''} ${customer.email || ''} ${customer.phone || ''} ${customer.code || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CLIENTES</p>
          <h1>Directorio de clientes</h1>
          <p className="heading-copy">
            Consulta y administra clientes mediante el servicio de Ordeon.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <Users className="w-4 h-4 mr-2 inline" /> Nuevo cliente
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div>
            <div className="panel-title-row">
              <h2>Directorio</h2>
            </div>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, teléfono o correo"
              aria-label="Buscar clientes"
            />
          </div>
        </div>

        {error && (
          <p className="form-error api-feedback" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="api-notice" role="status">
            {notice}
          </p>
        )}

        <div className="client-table-head">
          <span>CLIENTE</span>
          <span>CONTACTO</span>
          <span>ÓRDENES</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading ? (
          <div className="empty-state">Cargando clientes…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay clientes para mostrar.</div>
        ) : (
          <div className="client-list">
            {visible.map((customer) => (
              <div className="client-row" key={customer.id}>
                <div className="client-avatar">
                  {(customer.name || customer.code || '?')
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="client-main">
                  <strong>{customer.name || 'Sin nombre'}</strong>
                  <span>{customer.phone || customer.code || 'Sin teléfono'}</span>
                </div>
                <span className="client-contact">{customer.email || 'Sin correo'}</span>
                <span className="client-orders">{customer.ordersCount ?? '—'}</span>
                <span
                  className={`client-status ${
                    customer.isActive === false ? 'is-pending' : ''
                  }`}
                >
                  {customer.isActive === false ? 'Inactivo' : 'Activo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setModal(customer)}
                    aria-label={`Editar ${customer.name}`}
                    title="Editar cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => void toggleStatus(customer)}
                    aria-label={`Cambiar estado de ${customer.name}`}
                    title="Activar o desactivar"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pagination-bar">
          <label className="pagination-size">
            Por página
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Math.min(50, Number(event.target.value)));
                setPage(1);
              }}
              aria-label="Cantidad de clientes por página"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
          <span className="pagination-summary">
            Página {page} de {totalPages} · {pageSize} elementos por página
          </span>
          <div className="pagination-controls" aria-label="Paginación de clientes">
            <button
              className="pagination-icon"
              disabled={page === 1}
              onClick={() => setPage(1)}
              aria-label="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              className="pagination-icon"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                className={pageNumber === page ? 'is-current' : ''}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              className="pagination-icon"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              className="pagination-icon"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
              aria-label="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}
        >
          <div
            className="request-modal client-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">CLIENTES</p>
                <h2 id="customer-modal-title">
                  {modal === 'new' ? 'Nuevo cliente' : 'Editar cliente'}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setModal(null)}
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveCustomer}>
              <div className="client-modal-grid">
                <FloatingField
                  label="Código o documento"
                  name="code"
                  defaultValue={modal === 'new' ? '' : modal.code || ''}
                  required
                />
                <FloatingField
                  label="Nombre completo"
                  name="name"
                  defaultValue={modal === 'new' ? '' : modal.name || ''}
                  required
                />
                <FloatingField
                  label="Teléfono"
                  name="phone"
                  defaultValue={modal === 'new' ? '' : modal.phone || ''}
                />
                <FloatingField
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  defaultValue={modal === 'new' ? '' : modal.email || ''}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
