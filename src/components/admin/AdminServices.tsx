import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Eye,
  Pencil,
  Power,
  Search,
  Wrench,
  DollarSign,
  Tag,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { ItemCatalogo } from '@/types/catalogos';

const FALLBACK_SERVICES: ItemCatalogo[] = [
  { uuid: 'srv-1', codigoReferencia: 'SRV-001', nombre: 'Afilado Sierra Circular Carburo', descripcion: 'Afilado integral de dientes de carburo de tungsteno con refrigeración asistida.', naturaleza: 'SERVICIO', precioBase: 45000, stockReferencial: null, activo: true },
  { uuid: 'srv-2', codigoReferencia: 'SRV-002', nombre: 'Rectificado Cuchilla Cepillo 30cm', descripcion: 'Rectificado plano de cuchillas industriales con tolerancias H7.', naturaleza: 'SERVICIO', precioBase: 32000, stockReferencial: null, activo: true },
  { uuid: 'srv-3', codigoReferencia: 'SRV-003', nombre: 'Vaciado y Calibración Fresas CNC', descripcion: 'Tratamiento de perfilado de filos helicoidales para centros de mecanizado.', naturaleza: 'SERVICIO', precioBase: 68000, stockReferencial: null, activo: true },
  { uuid: 'srv-4', codigoReferencia: 'SRV-004', nombre: 'Soldadura y Reposición Diente Widia', descripcion: 'Soldadura de plata para plaquitas de metal duro fracturadas.', naturaleza: 'SERVICIO', precioBase: 25000, stockReferencial: null, activo: true },
  { uuid: 'srv-5', codigoReferencia: 'SRV-005', nombre: 'Mantenimiento Cabezal Portacuchillas', descripcion: 'Limpieza ultrasónica, lubricación y ajuste dinamométrico de fijaciones.', naturaleza: 'SERVICIO', precioBase: 55000, stockReferencial: null, activo: false },
];

export default function AdminServices({ token }: { token?: string }) {
  const [services, setServices] = useState<ItemCatalogo[]>(FALLBACK_SERVICES);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(FALLBACK_SERVICES.length);
  const [modal, setModal] = useState<ItemCatalogo | 'new' | null>(null);
  const [viewService, setViewService] = useState<ItemCatalogo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  async function loadServices() {
    setLoading(true);
    try {
      const res = await catalogosApi.getItems({ q: query, naturaleza: 'SERVICIO' });
      if (res.items && res.items.length > 0) {
        setServices(res.items);
        setTotalItems(res.total);
      } else {
        setServices([]);
        setTotalItems(0);
      }
    } catch {
      // Fallback a catálogo demo local
      setServices(FALLBACK_SERVICES);
      setTotalItems(FALLBACK_SERVICES.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, [page, pageSize, query, token]);

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      codigoReferencia: String(data.get('codigoReferencia') || '').trim(),
      nombre: String(data.get('nombre') || '').trim(),
      descripcion: String(data.get('descripcion') || '').trim(),
      precioBase: Number(data.get('precioBase') || 0),
    };

    try {
      if (modal === 'new') {
        await catalogosApi.crearItem({
          codigoReferencia: body.codigoReferencia,
          nombre: body.nombre,
          descripcion: body.descripcion,
          naturaleza: 'SERVICIO',
          precioBase: body.precioBase,
          uuidUnidadPresentacion: 'und-1',
          categoriaUuid: 'cat-1',
        });
      } else {
        await catalogosApi.actualizarItem(modal.uuid, {
          nombre: body.nombre,
          descripcion: body.descripcion,
          precioBase: body.precioBase,
          uuidUnidadPresentacion: 'und-1',
        });
      }
      setModal(null);
      toast.success(modal === 'new' ? 'Servicio creado correctamente' : 'Servicio actualizado');
      await loadServices();
    } catch {
      // Optimistic update
      if (modal === 'new') {
        const newSrv: ItemCatalogo = {
          uuid: String(Date.now()),
          codigoReferencia: body.codigoReferencia,
          nombre: body.nombre,
          descripcion: body.descripcion,
          naturaleza: 'SERVICIO',
          precioBase: body.precioBase,
          stockReferencial: null,
          activo: true,
        };
        setServices((prev) => [newSrv, ...prev]);
        setTotalItems((prev) => prev + 1);
        setModal(null);
        toast.success('Servicio guardado en catálogo local');
      } else {
        setServices((prev) =>
          prev.map((s) => (s.uuid === modal.uuid ? { ...s, ...body } : s))
        );
        setModal(null);
        toast.success('Servicio actualizado en catálogo local');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(service: ItemCatalogo) {
    const nextStatus = !service.activo;
    try {
      await catalogosApi.setItemActivo(service.uuid, nextStatus);
      toast.success('Estado del servicio actualizado');
      await loadServices();
    } catch {
      setServices((prev) =>
        prev.map((s) => (s.uuid === service.uuid ? { ...s, activo: nextStatus } : s))
      );
      toast.success('Estado actualizado localmente');
    }
  }

  const visible = useMemo(
    () =>
      services.filter((s) =>
        `${s.nombre || ''} ${s.codigoReferencia || ''} ${s.descripcion || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [services, query]
  );

  return (
    <div className="page-content">
      {/* Encabezado Estándar Ordeon */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CATÁLOGOS</p>
          <h1>Catálogo de servicios</h1>
          <p className="heading-copy">
            Servicios técnicos de afilado, rectificado y mantenimiento de herramientas de corte.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <Wrench className="w-4 h-4 mr-2 inline" /> Nuevo servicio
        </button>
      </div>

      {/* Panel Principal Sobrio */}
      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Servicios Registrados</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar servicio por código o nombre"
              aria-label="Buscar servicios"
            />
          </div>
        </div>

        {/* Columnas Básicas y Necesarias */}
        <div className="client-table-head">
          <span>SERVICIO</span>
          <span>CÓDIGO</span>
          <span>PRECIO BASE</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading ? (
          <div className="empty-state">Cargando servicios…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay servicios que coincidan con la búsqueda.</div>
        ) : (
          <div className="client-list">
            {visible.map((service) => (
              <div className="client-row" key={service.uuid}>
                <div className="client-avatar">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="client-main">
                  <strong>{service.nombre}</strong>
                  <span>{service.descripcion || 'Sin descripción adicional'}</span>
                </div>
                <span className="client-contact font-mono text-xs">{service.codigoReferencia}</span>
                <span className="client-orders text-emerald-400 font-bold">
                  ${(service.precioBase || 0).toLocaleString('es-CO')}
                </span>
                <span className={`client-status ${!service.activo ? 'is-pending' : ''}`}>
                  {service.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewService(service)}
                    aria-label={`Ver detalle de ${service.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(service)}
                    aria-label={`Editar ${service.nombre}`}
                    title="Editar servicio"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => void toggleStatus(service)}
                    aria-label={`Cambiar estado de ${service.nombre}`}
                    title="Activar o desactivar"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barra de Paginación Estándar */}
        <div className="pagination-bar">
          <label className="pagination-size">
            Por página
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Cantidad de servicios por página"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
          <span className="pagination-summary">
            Página {page} de {totalPages} · {pageSize} elementos por página
          </span>
          <div className="pagination-controls" aria-label="Paginación de servicios">
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
              onClick={() => setPage((c) => c - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="pagination-icon"
              disabled={page === totalPages}
              onClick={() => setPage((c) => c + 1)}
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

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewService}
        onClose={() => setViewService(null)}
        title="Detalle del Servicio"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewService(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewService;
                setViewService(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar servicio
            </Button>
          </>
        }
      >
        {viewService && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <Wrench className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewService.nombre}</h4>
                <span>{viewService.codigoReferencia}</span>
              </div>
              <Badge variant={viewService.activo ? 'success' : 'warning'}>
                {viewService.activo ? 'Servicio Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-violet-400" /> Precio Base Unitario
                </span>
                <span className="item-value text-emerald-400 font-bold">
                  ${(viewService.precioBase || 0).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Tag className="w-3 h-3 mr-1 inline text-violet-400" /> Tipo / Naturaleza
                </span>
                <span className="item-value">{viewService.naturaleza}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Layers className="w-3 h-3 mr-1 inline text-violet-400" /> Unidad de Medida
                </span>
                <span className="item-value">{viewService.unidadPresentacion?.nombre || 'Unidad (UND)'}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Clock className="w-3 h-3 mr-1 inline text-violet-400" /> Tiempo Estimado Taller
                </span>
                <span className="item-value">24 - 48 horas operativas</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Descripción Técnica y Alcance</span>
                <span className="item-value leading-relaxed">
                  {viewService.descripcion || 'Sin descripción técnica especificada.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR SERVICIO (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo Servicio' : 'Editar Servicio'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="service-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar servicio'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="service-form" onSubmit={saveService}>
            <div className="client-modal-grid">
              <label className="floating-field">
                <input
                  name="codigoReferencia"
                  defaultValue={modal === 'new' ? '' : modal.codigoReferencia}
                  placeholder=" "
                  required
                />
                <span>Código de referencia (ej: SRV-010)</span>
              </label>

              <label className="floating-field">
                <input
                  name="nombre"
                  defaultValue={modal === 'new' ? '' : modal.nombre}
                  placeholder=" "
                  required
                />
                <span>Nombre del servicio</span>
              </label>

              <label className="floating-field">
                <input
                  name="precioBase"
                  type="number"
                  min="0"
                  defaultValue={modal === 'new' ? '' : modal.precioBase}
                  placeholder=" "
                  required
                />
                <span>Precio base (COP)</span>
              </label>

              <label className="floating-field">
                <input
                  name="descripcion"
                  defaultValue={modal === 'new' ? '' : modal.descripcion || ''}
                  placeholder=" "
                />
                <span>Descripción o especificación</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
