import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  Users,
  Mail,
  Phone,
  FileText,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput, CrudPagination } from '@farutech/design-system';
import { ordeonRequest } from '@/lib/api-client';

export type Customer = {
  id: string;
  code?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  ordersCount?: number;
  createdAt?: string | null;
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


export default function AdminClients({ token }: { token: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [modal, setModal] = useState<Customer | 'new' | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  async function loadCustomers() {
    if (!hasInitialLoaded) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
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
        setCustomers([]);
        setTotalItems(0);
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No fue posible cargar clientes.';
      setError(message);
      setNotice('Error de conexión al cargar directorio.');
      toast.error('Aviso de conexión con clientes', { description: message });
      setCustomers([]);
      setTotalItems(0);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setHasInitialLoaded(true);
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
          createdAt: new Date().toISOString().split('T')[0],
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
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
      );
      toast.success('Estado actualizado localmente');
    }
  }

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
      {/* Encabezado Estándar Ordeon */}
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

      {/* Panel Principal */}
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
            {isRefreshing && (
              <span
                className="spinner-sm"
                title="Actualizando directorio..."
                style={{ width: '13px', height: '13px', borderTopColor: '#a78bfa' }}
              />
            )}
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

        {/* Encabezado de Columnas Básicas y Necesarias (Siempre visible) */}
        <div className="client-table-head">
          <span>CLIENTE</span>
          <span>CONTACTO</span>
          <span>ÓRDENES</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {isInitialLoading ? (
          <div className="empty-state">
            <span className="spinner-sm inline-block mr-2" /> Cargando clientes…
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            {query.trim()
              ? 'No se encontraron clientes que coincidan con la búsqueda.'
              : 'No hay clientes para mostrar.'}
          </div>
        ) : (
          <div
            className="client-list"
            style={{
              opacity: isRefreshing ? 0.65 : 1,
              transition: 'opacity 0.16s ease',
              pointerEvents: isRefreshing ? 'none' : 'auto',
            }}
          >
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
                  {/* Opción "Ver": Abre modal de detalle completo */}
                  <button
                    className="icon-action"
                    onClick={() => setViewCustomer(customer)}
                    aria-label={`Ver detalle de ${customer.name}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  {/* Opción "Editar": Abre modal de edición */}
                  <button
                    className="icon-action"
                    onClick={() => setModal(customer)}
                    aria-label={`Editar ${customer.name}`}
                    title="Editar cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Opción "Activar / Desactivar" */}
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

      {/* Modal 1: VER DETALLE COMPLETO (Usando Modal del Design System) */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title="Ficha del Cliente"
        subtitle="Consulta de información general, contacto y parámetros en Ordeon"
        icon={<Users className="w-5 h-5 text-violet-400" />}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setViewCustomer(null)}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewCustomer;
                setViewCustomer(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar cliente
            </Button>
          </>
        }
      >
        {viewCustomer && (
          <div className="modal-view-container">
            {/* Tarjeta de Identificación */}
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                {(viewCustomer.name || viewCustomer.code || '?')
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="modal-view-header-info">
                <h4>{viewCustomer.name || 'Sin nombre asignado'}</h4>
                <span>Código: {viewCustomer.code || 'SIN CÓDIGO'}</span>
              </div>
              <Badge variant={viewCustomer.isActive === false ? 'warning' : 'success'}>
                {viewCustomer.isActive === false ? 'Inactivo' : 'Activo'}
              </Badge>
            </div>

            {/* Grid de Atributos */}
            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Phone className="w-3 h-3 mr-1 inline text-violet-400" /> Teléfono
                </span>
                <span className="item-value">{viewCustomer.phone || 'No registrado'}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Mail className="w-3 h-3 mr-1 inline text-violet-400" /> Correo Electrónico
                </span>
                <span className="item-value">{viewCustomer.email || 'No registrado'}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <FileText className="w-3 h-3 mr-1 inline text-violet-400" /> Órdenes Realizadas
                </span>
                <span className="item-value">{viewCustomer.ordersCount ?? 0} órdenes registradas</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Calendar className="w-3 h-3 mr-1 inline text-violet-400" /> Fecha de Registro
                </span>
                <span className="item-value">{viewCustomer.createdAt || 'Registrado en sistema'}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Identificador Único (ID)</span>
                <span className="item-value font-mono text-xs text-slate-400">{viewCustomer.id}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR CLIENTE (Usando Modal del Design System) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo cliente' : 'Editar cliente'}
        subtitle={
          modal === 'new'
            ? 'Diligencie los campos requeridos para dar de alta un cliente en Ordeon'
            : `Modificando información de ${modal?.name || 'cliente'}`
        }
        icon={<Users className="w-5 h-5 text-violet-400" />}
        size="md"
        extraActions={
          modal && modal !== 'new' ? (
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => void toggleStatus(modal)}
            >
              <Power className="w-3.5 h-3.5 mr-1.5" />
              {modal.isActive === false ? 'Activar cliente' : 'Desactivar cliente'}
            </Button>
          ) : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModal(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="customer-edit-form"
              disabled={saving}
            >
              {saving ? 'Guardando…' : modal === 'new' ? 'Crear cliente' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="customer-edit-form" onSubmit={saveCustomer}>
            <div className="client-modal-grid">
              <FloatingInput
                label="Código o documento"
                name="code"
                defaultValue={modal === 'new' ? '' : modal.code || ''}
                required
                tooltip="NIT, Cédula de ciudadanía o identificación fiscal del cliente"
              />
              <FloatingInput
                label="Nombre completo o Razón Social"
                name="name"
                defaultValue={modal === 'new' ? '' : modal.name || ''}
                required
                tooltip="Nombre comercial o razón social completa"
              />
              <FloatingInput
                label="Teléfono de contacto"
                name="phone"
                type="tel"
                defaultValue={modal === 'new' ? '' : modal.phone || ''}
                tooltip="Teléfono fijo o móvil para coordinar entregas y avisos"
              />
              <FloatingInput
                label="Correo electrónico"
                name="email"
                type="email"
                defaultValue={modal === 'new' ? '' : modal.email || ''}
                tooltip="Correo electrónico para facturas y cotizaciones"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
