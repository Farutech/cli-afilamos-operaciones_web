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
  Users2,
  Percent,
  Calendar,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';

export interface CustomerSegment {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  descuentoPorcentaje: number;
  plazoDias: number;
  clientesCount: number;
  activo: boolean;
}

const FALLBACK_SEGMENTS: CustomerSegment[] = [
  { id: 'seg-1', codigo: 'SEG-IND', nombre: 'Industrias y Fábricas de Madera', descripcion: 'Grandes consumidores con líneas automáticas de aserrío y afilado continuo.', descuentoPorcentaje: 15, plazoDias: 30, clientesCount: 18, activo: true },
  { id: 'seg-2', codigo: 'SEG-TAL', nombre: 'Talleres de Carpintería y Ebanistería', descripcion: 'Talleres medianos y profesionales con pedidos semanales de afilado.', descuentoPorcentaje: 10, plazoDias: 15, clientesCount: 42, activo: true },
  { id: 'seg-3', codigo: 'SEG-RET', nombre: 'Clientes Minoristas y Particulares', descripcion: 'Atención directa en mostrador con pago de contado sin plazo.', descuentoPorcentaje: 0, plazoDias: 0, clientesCount: 125, activo: true },
  { id: 'seg-4', codigo: 'SEG-VIP', nombre: 'Cuentas Estratégicas y Convenios', descripcion: 'Contratos con acuerdos de nivel de servicio (SLA) de 24 horas y recogida en sitio.', descuentoPorcentaje: 20, plazoDias: 45, clientesCount: 6, activo: true },
  { id: 'seg-5', codigo: 'SEG-DIS', nombre: 'Distribuidores y Ferreterías', descripcion: 'Reventa de productos terminados, cuchillas nuevas y sierras circulares.', descuentoPorcentaje: 18, plazoDias: 30, clientesCount: 9, activo: false },
];

export default function AdminSegments({ token: _token }: { token?: string }) {
  const [segments, setSegments] = useState<CustomerSegment[]>(FALLBACK_SEGMENTS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<CustomerSegment | 'new' | null>(null);
  const [viewSegment, setViewSegment] = useState<CustomerSegment | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(segments.length / pageSize));

  function saveSegment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      codigo: String(data.get('codigo') || '').trim(),
      nombre: String(data.get('nombre') || '').trim(),
      descripcion: String(data.get('descripcion') || '').trim(),
      descuentoPorcentaje: Number(data.get('descuentoPorcentaje') || 0),
      plazoDias: Number(data.get('plazoDias') || 0),
    };

    if (modal === 'new') {
      const newSeg: CustomerSegment = {
        id: `seg-${Date.now()}`,
        ...body,
        clientesCount: 0,
        activo: true,
      };
      setSegments((prev) => [newSeg, ...prev]);
      toast.success('Segmento comercial creado con éxito');
    } else {
      setSegments((prev) =>
        prev.map((s) => (s.id === modal.id ? { ...s, ...body } : s))
      );
      toast.success('Segmento comercial actualizado');
    }
    setSaving(false);
    setModal(null);
  }

  function toggleStatus(segment: CustomerSegment) {
    const nextStatus = !segment.activo;
    setSegments((prev) =>
      prev.map((s) => (s.id === segment.id ? { ...s, activo: nextStatus } : s))
    );
    toast.success('Estado del segmento actualizado');
  }

  const visible = useMemo(
    () =>
      segments.filter((s) =>
        `${s.nombre} ${s.codigo} ${s.descripcion}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [segments, query]
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CLIENTES</p>
          <h1>Segmentos de clientes</h1>
          <p className="heading-copy">
            Estratificación comercial, condiciones de crédito y descuentos por perfil de cliente.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <Users2 className="w-4 h-4 mr-2 inline" /> Nuevo segmento
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Segmentos Comerciales</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar segmento por código o nombre"
              aria-label="Buscar segmentos"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>SEGMENTO</span>
          <span>CÓDIGO</span>
          <span>DESCUENTO / PLAZO</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">No hay segmentos registrados.</div>
        ) : (
          <div className="client-list">
            {visible.map((seg) => (
              <div className="client-row" key={seg.id}>
                <div className="client-avatar">
                  <Users2 className="w-4 h-4" />
                </div>
                <div className="client-main">
                  <strong>{seg.nombre}</strong>
                  <span>{seg.descripcion}</span>
                </div>
                <span className="client-contact font-mono text-xs">{seg.codigo}</span>
                <span className="client-orders text-violet-300 font-bold">
                  {seg.descuentoPorcentaje}% desc · {seg.plazoDias} días
                </span>
                <span className={`client-status ${!seg.activo ? 'is-pending' : ''}`}>
                  {seg.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewSegment(seg)}
                    aria-label={`Ver detalle de ${seg.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(seg)}
                    aria-label={`Editar ${seg.nombre}`}
                    title="Editar segmento"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => toggleStatus(seg)}
                    aria-label={`Cambiar estado de ${seg.nombre}`}
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
          <div className="pagination-controls" aria-label="Paginación de segmentos">
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
        isOpen={!!viewSegment}
        onClose={() => setViewSegment(null)}
        title="Detalle del Segmento Comercial"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewSegment(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewSegment;
                setViewSegment(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar segmento
            </Button>
          </>
        }
      >
        {viewSegment && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <Users2 className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewSegment.nombre}</h4>
                <span>{viewSegment.codigo}</span>
              </div>
              <Badge variant={viewSegment.activo ? 'success' : 'warning'}>
                {viewSegment.activo ? 'Segmento Vigente' : 'Inactivo'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Percent className="w-3 h-3 mr-1 inline text-violet-400" /> Descuento Comercial
                </span>
                <span className="item-value font-bold text-emerald-400">
                  {viewSegment.descuentoPorcentaje}% sobre tarifa base
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Calendar className="w-3 h-3 mr-1 inline text-violet-400" /> Plazo Máximo de Pago
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewSegment.plazoDias} días calendario
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Layers className="w-3 h-3 mr-1 inline text-violet-400" /> Clientes Asociados
                </span>
                <span className="item-value">{viewSegment.clientesCount} clientes vinculados</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">ID Sistema</span>
                <span className="item-value font-mono text-xs">{viewSegment.id}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Criterios de Pertenencia</span>
                <span className="item-value leading-relaxed">{viewSegment.descripcion}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR SEGMENTO (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo Segmento Comercial' : 'Editar Segmento Comercial'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="segment-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar segmento'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="segment-form" onSubmit={saveSegment}>
            <div className="client-modal-grid">
              <label className="floating-field">
                <input
                  name="codigo"
                  defaultValue={modal === 'new' ? '' : modal.codigo}
                  placeholder=" "
                  required
                />
                <span>Código de segmento (ej: SEG-IND)</span>
              </label>

              <label className="floating-field">
                <input
                  name="nombre"
                  defaultValue={modal === 'new' ? '' : modal.nombre}
                  placeholder=" "
                  required
                />
                <span>Nombre del segmento</span>
              </label>

              <label className="floating-field">
                <input
                  name="descuentoPorcentaje"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={modal === 'new' ? 0 : modal.descuentoPorcentaje}
                  placeholder=" "
                  required
                />
                <span>Descuento autorizado (%)</span>
              </label>

              <label className="floating-field">
                <input
                  name="plazoDias"
                  type="number"
                  min="0"
                  max="180"
                  defaultValue={modal === 'new' ? 0 : modal.plazoDias}
                  placeholder=" "
                  required
                />
                <span>Días de plazo de crédito</span>
              </label>

              <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
                <input
                  name="descripcion"
                  defaultValue={modal === 'new' ? '' : modal.descripcion}
                  placeholder=" "
                />
                <span>Descripción y criterios comerciales</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
