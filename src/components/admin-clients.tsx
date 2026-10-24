import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Users,
  Mail,
  Phone,
  FileText,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
import { RegistroClienteModal } from '@/features/clientes/RegistroClienteModal';
import type { Cliente } from '@/types/catalogos';
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

  useEffect(() => {
    if (error || notice) {
      const timer = setTimeout(() => {
        setError('');
        setNotice('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, notice]);

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

  const handleNuevoClienteCreado = (nuevo: Cliente) => {
    const newCustomer: Customer = {
      id: nuevo.uuid,
      code: nuevo.numeroDocumento,
      name: nuevo.nombreRazonSocial,
      phone: nuevo.telefono || null,
      email: nuevo.email || null,
      isActive: nuevo.activo,
      ordersCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setTotalItems((prev) => prev + 1);
    setModal(null);
    toast.success('Cliente creado correctamente', {
      description: `${nuevo.nombreRazonSocial} ha sido dado de alta en Ordeon.`,
    });
    void loadCustomers();
  };

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

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        key: 'cliente',
        header: 'CLIENTE',
        sortable: true,
        render: (customer) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
              {(customer.name || customer.code || '?')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <strong className="text-white block font-medium">{customer.name || 'Sin nombre'}</strong>
              <span className="text-slate-400 text-xs block font-mono">
                {customer.phone || customer.code || 'Sin teléfono'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'contacto',
        header: 'CONTACTO',
        render: (customer) => <span className="text-slate-300 text-xs">{customer.email || 'Sin correo'}</span>,
      },
      {
        key: 'ordenes',
        header: 'ÓRDENES',
        align: 'center',
        render: (customer) => <span className="font-mono text-slate-300 text-xs">{customer.ordersCount ?? '—'}</span>,
      },
      {
        key: 'estado',
        header: 'ESTADO',
        render: (customer) => (
          <Badge variant={customer.isActive === false ? 'warning' : 'success'}>
            {customer.isActive === false ? 'Inactivo' : 'Activo'}
          </Badge>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<StandardRowAction<Customer>[]>(
    () => [
      {
        label: 'Ver Ficha',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: (customer) => setViewCustomer(customer),
      },
      {
        label: 'Editar',
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: (customer) => setModal(customer),
      },
      {
        label: 'Cambiar Estado',
        icon: <Power className="w-3.5 h-3.5" />,
        onClick: (customer) => void toggleStatus(customer),
      },
    ],
    []
  );

  return (
    <div className="page-content">
      <ListPageLayout
        title="Directorio de clientes"
        eyebrow="ADMINISTRACIÓN · CLIENTES"
        description="Consulta y administra clientes mediante el servicio de Ordeon."
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar por nombre, teléfono o correo',
          isSearching: isRefreshing,
        }}
        actions={
          <Button
            variant="primary"
            onClick={() => setModal('new')}
            className="whitespace-nowrap flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 mr-1.5" />
            <span>Nuevo cliente</span>
          </Button>
        }
        onRefresh={loadCustomers}
        isRefreshing={isRefreshing}
      >
        {(error || notice) && (
          <div className="mb-3 flex items-center justify-between gap-3 p-3 rounded-lg border text-xs animate-in fade-in slide-in-from-top-2 duration-300 shadow-md backdrop-blur-md bg-rose-950/40 border-rose-800/40 text-rose-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{error ? '⚠️ Error:' : 'ℹ️ Aviso:'}</span>
              <span>{error || notice}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
              }}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              title="Cerrar alerta"
            >
              ✕
            </button>
          </div>
        )}

        <StandardDataTable
          columns={columns}
          data={visible}
          keyExtractor={(c) => c.id}
          loading={isInitialLoading}
          rowActions={rowActions}
          emptyMessage={
            query.trim()
              ? 'No se encontraron clientes que coincidan con la búsqueda.'
              : 'No hay clientes para mostrar.'
          }
          pagination={{
            page,
            pageSize,
            totalItems: query.trim() ? visible.length : (totalItems || visible.length),
            onPageChange: (newPage) => setPage(newPage),
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
          }}
        />
      </ListPageLayout>

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

      {/* Modal 2: NUEVO CLIENTE (Reutiliza exactamente el mismo componente que Solicitudes) */}
      <RegistroClienteModal
        isOpen={modal === 'new'}
        onClose={() => setModal(null)}
        onClienteCreado={handleNuevoClienteCreado}
        title="Nuevo cliente"
        subtitle="Diligencie los campos requeridos para dar de alta un cliente en Ordeon"
        submitLabel="Crear cliente"
      />

      {/* Modal 3: EDITAR CLIENTE EXISTENTE */}
      <Modal
        isOpen={!!modal && modal !== 'new'}
        onClose={() => setModal(null)}
        title="Editar cliente"
        subtitle={modal && modal !== 'new' ? `Modificando información de ${modal.name || 'cliente'}` : ''}
        icon={<Users className="w-5 h-5 text-violet-400" />}
        size="md"
        footer={
          <div className="modal-footer-standard">
            <div>
              {modal && modal !== 'new' && (
                <button
                  type="button"
                  onClick={() => void toggleStatus(modal)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{modal.isActive === false ? 'Activar cliente' : 'Desactivar cliente'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="customer-edit-form"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        }
      >
        {modal && modal !== 'new' && (
          <form id="customer-edit-form" onSubmit={saveCustomer}>
            <div className="client-modal-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="cli-code">
                  Código o Documento (NIT / C.C.) *
                </label>
                <input
                  id="cli-code"
                  name="code"
                  className="form-input font-mono"
                  placeholder="Ej: 900123456-1 o 1020304050"
                  defaultValue={modal.code || ''}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cli-name">
                  Nombre completo o Razón Social *
                </label>
                <input
                  id="cli-name"
                  name="name"
                  className="form-input"
                  placeholder="Ej: Afilados del Valle S.A.S."
                  defaultValue={modal.name || ''}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cli-phone">
                  Teléfono de contacto
                </label>
                <input
                  id="cli-phone"
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="Ej: +57 300 123 4567"
                  defaultValue={modal.phone || ''}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cli-email">
                  Correo electrónico
                </label>
                <input
                  id="cli-email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Ej: contacto@empresa.com"
                  defaultValue={modal.email || ''}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
