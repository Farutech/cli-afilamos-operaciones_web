import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Users2,
  Percent,
  Calendar,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';

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

  const columns: ColumnDef<CustomerSegment>[] = [
    {
      key: 'nombre',
      header: 'SEGMENTO',
      render: (seg) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
            <Users2 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <strong className="text-white font-medium block">{seg.nombre}</strong>
            <span className="text-[11px] text-slate-400 block truncate max-w-[280px]">
              {seg.descripcion}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'codigo',
      header: 'CÓDIGO',
      render: (seg) => <span className="font-mono text-xs text-amber-300">{seg.codigo}</span>,
    },
    {
      key: 'condiciones',
      header: 'CONDICIONES',
      render: (seg) => (
        <span className="font-mono text-xs font-bold text-violet-300">
          {seg.descuentoPorcentaje}% desc · {seg.plazoDias} días
        </span>
      ),
    },
    {
      key: 'clientes',
      header: 'CLIENTES',
      align: 'center',
      render: (seg) => (
        <span className="font-mono text-xs text-slate-300 font-semibold">
          {seg.clientesCount ?? 0}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'ESTADO',
      align: 'center',
      render: (seg) => (
        <Badge variant={seg.activo ? 'success' : 'neutral'}>
          {seg.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<CustomerSegment>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (seg) => setViewSegment(seg),
    },
    {
      label: 'Editar segmento',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (seg) => setModal(seg),
    },
    {
      label: 'Activar/Desactivar',
      icon: <Power className="w-3.5 h-3.5" />,
      onClick: (seg) => toggleStatus(seg),
      variant: 'ghost',
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Segmentos de clientes"
        eyebrow="ADMINISTRACIÓN · CLIENTES"
        description="Estratificación comercial, condiciones de crédito y descuentos por perfil de cliente."
        actions={
          <Button
            variant="primary"
            onClick={() => setModal('new')}
          >
            <Users2 className="w-4 h-4 mr-2 inline" /> Nuevo segmento
          </Button>
        }
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar segmento por código o nombre...',
        }}
      >
        <StandardDataTable<CustomerSegment>
          columns={columns}
          data={visible.slice((page - 1) * pageSize, page * pageSize)}
          keyExtractor={(seg) => seg.id}
          rowActions={rowActions}
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
          emptyMessage="No se encontraron segmentos comerciales registrados."
        />
      </ListPageLayout>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewSegment}
        onClose={() => setViewSegment(null)}
        title="Ficha del Segmento Comercial"
        subtitle="Criterios comerciales, porcentaje de descuento y plazos de crédito"
        icon={<Users2 className="w-5 h-5 text-violet-400" />}
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
        subtitle={
          modal === 'new'
            ? 'Defina las condiciones de descuento y plazo para un grupo de clientes'
            : 'Modifique las reglas y parámetros de facturación para este segmento'
        }
        icon={<Users2 className="w-5 h-5 text-violet-400" />}
        size="md"
        extraActions={
          modal && modal !== 'new' ? (
            <Button
              variant="outline"
              onClick={() => {
                const target = modal;
                setModal(null);
                toggleStatus(target);
              }}
              disabled={saving}
            >
              <Power className="w-4 h-4 mr-2" />
              {modal.activo ? 'Desactivar segmento' : 'Activar segmento'}
            </Button>
          ) : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="segment-form" disabled={saving}>
              {saving ? 'Guardando…' : modal === 'new' ? 'Crear segmento' : 'Guardar segmento'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="segment-form" onSubmit={saveSegment}>
            <div className="client-modal-grid">
              <FloatingInput
                name="codigo"
                label="Código de segmento (ej: SEG-IND)"
                defaultValue={modal === 'new' ? '' : modal.codigo}
                tooltip="Identificador alfanumérico para asociar clientes a este grupo."
                required
              />

              <FloatingInput
                name="nombre"
                label="Nombre del segmento"
                defaultValue={modal === 'new' ? '' : modal.nombre}
                tooltip="Nombre comercial o categoría del segmento de clientes."
                required
              />

              <FloatingInput
                name="descuentoPorcentaje"
                type="number"
                min="0"
                max="100"
                label="Descuento autorizado (%)"
                defaultValue={modal === 'new' ? 0 : modal.descuentoPorcentaje}
                tooltip="Porcentaje automático de rebaja sobre los precios de catálogo."
                required
              />

              <FloatingInput
                name="plazoDias"
                type="number"
                min="0"
                max="180"
                label="Días de plazo de crédito"
                defaultValue={modal === 'new' ? 0 : modal.plazoDias}
                tooltip="Días calendario permitidos para el pago antes de bloqueo."
                required
              />

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="descripcion"
                  label="Descripción y criterios comerciales"
                  defaultValue={modal === 'new' ? '' : modal.descripcion}
                  tooltip="Detalle de condiciones y perfil de clientes asignables."
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
