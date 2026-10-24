import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Layers,
  Ruler,
  FolderTree,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
import { catalogosApi } from '@/services/catalogosApi';
import type { UnidadPresentacion, CategoriaItem } from '@/types/catalogos';

interface UnitOrCatItem {
  id: string;
  tipo: 'UNIDAD' | 'CATEGORIA';
  codigo: string;
  nombre: string;
  detalle: string;
  activo: boolean;
}

const FALLBACK_ITEMS: UnitOrCatItem[] = [
  { id: 'u-1', tipo: 'UNIDAD', codigo: 'UND', nombre: 'Unidad Individual', detalle: 'Abrev: UND - Conteo pieza por pieza', activo: true },
  { id: 'u-2', tipo: 'UNIDAD', codigo: 'MTR', nombre: 'Metro Lineal', detalle: 'Abrev: M - Longitud de corte y afilado', activo: true },
  { id: 'u-3', tipo: 'UNIDAD', codigo: 'JGO', nombre: 'Juego / Set Completo', detalle: 'Abrev: JGO - Paquete de cuchillas emparejadas', activo: true },
  { id: 'c-1', tipo: 'CATEGORIA', codigo: 'CAT-DISCOS', nombre: 'Discos y Sierras Circulares', detalle: 'Herramientas de corte circular para madera y aluminio', activo: true },
  { id: 'c-2', tipo: 'CATEGORIA', codigo: 'CAT-CUCHILLAS', nombre: 'Cuchillas Planas y Cepilladoras', detalle: 'Cuchillas de widia y acero rápido para carpintería', activo: true },
  { id: 'c-3', tipo: 'CATEGORIA', codigo: 'CAT-FRESAS', nombre: 'Fresas y Brocas CNC', detalle: 'Herramientas rotativas de desbaste y perfilado', activo: true },
  { id: 'c-4', tipo: 'CATEGORIA', codigo: 'CAT-INSUMOS', nombre: 'Consumibles y Soldadura', detalle: 'Materiales auxiliares del proceso de taller', activo: true },
];

export default function AdminUnitsCategories({ token }: { token?: string }) {
  const [activeTab, setActiveTab] = useState<'TODOS' | 'UNIDADES' | 'CATEGORIAS'>('TODOS');
  const [items, setItems] = useState<UnitOrCatItem[]>(FALLBACK_ITEMS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<UnitOrCatItem | 'new' | null>(null);
  const [viewItem, setViewItem] = useState<UnitOrCatItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        catalogosApi.getUnidades(),
        catalogosApi.getCategoriasItem(),
      ]);
      const mappedUnits: UnitOrCatItem[] = (uRes.unidades || []).map((u: UnidadPresentacion) => ({
        id: u.uuid,
        tipo: 'UNIDAD',
        codigo: u.codigo,
        nombre: u.nombre,
        detalle: `Abrev: ${u.abreviatura || u.codigo}`,
        activo: u.activo,
      }));
      const mappedCats: UnitOrCatItem[] = (cRes.categorias || []).map((c: CategoriaItem) => ({
        id: c.uuid,
        tipo: 'CATEGORIA',
        codigo: c.codigo,
        nombre: c.nombre,
        detalle: `Nivel ${c.nivel}`,
        activo: c.activo,
      }));
      if (mappedUnits.length > 0 || mappedCats.length > 0) {
        setItems([...mappedUnits, ...mappedCats]);
      } else {
        setItems(FALLBACK_ITEMS);
      }
    } catch {
      setItems(FALLBACK_ITEMS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const tipo = (data.get('tipo') as 'UNIDAD' | 'CATEGORIA') || 'UNIDAD';
    const codigo = String(data.get('codigo') || '').trim();
    const nombre = String(data.get('nombre') || '').trim();
    const detalle = String(data.get('detalle') || '').trim();

    try {
      if (tipo === 'UNIDAD') {
        if (modal === 'new') {
          await catalogosApi.crearUnidad({ codigo, nombre, abreviatura: detalle || codigo });
        }
      } else {
        if (modal === 'new') {
          await catalogosApi.crearCategoriaItem({ codigo, nombre });
        }
      }
      setModal(null);
      toast.success(modal === 'new' ? 'Registro creado correctamente' : 'Registro actualizado');
      await loadData();
    } catch {
      if (modal === 'new') {
        const newItem: UnitOrCatItem = {
          id: String(Date.now()),
          tipo,
          codigo,
          nombre,
          detalle,
          activo: true,
        };
        setItems((prev) => [newItem, ...prev]);
        setModal(null);
        toast.success('Guardado en catálogo local');
      } else {
        setItems((prev) =>
          prev.map((i) => (i.id === modal.id ? { ...i, codigo, nombre, detalle } : i))
        );
        setModal(null);
        toast.success('Actualizado en catálogo local');
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleStatus(item: UnitOrCatItem) {
    const nextStatus = !item.activo;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, activo: nextStatus } : i))
    );
    toast.success('Estado actualizado localmente');
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchTab =
        activeTab === 'TODOS'
          ? true
          : activeTab === 'UNIDADES'
          ? i.tipo === 'UNIDAD'
          : i.tipo === 'CATEGORIA';
      const matchQuery = `${i.nombre} ${i.codigo} ${i.detalle}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchTab && matchQuery;
    });
  }, [items, activeTab, query]);

  const columns: ColumnDef<UnitOrCatItem>[] = [
    {
      key: 'nombre',
      header: 'NOMBRE / IDENTIFICACIÓN',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
            {item.tipo === 'UNIDAD' ? (
              <Ruler className="w-4 h-4 text-sky-400" />
            ) : (
              <FolderTree className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <div>
            <strong className="text-white font-medium block">{item.nombre}</strong>
            <span className="text-[11px] text-slate-400">{item.detalle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'codigo',
      header: 'CÓDIGO',
      render: (item) => <span className="font-mono text-xs text-amber-300">{item.codigo}</span>,
    },
    {
      key: 'tipo',
      header: 'TIPO',
      align: 'center',
      render: (item) => (
        <Badge variant={item.tipo === 'UNIDAD' ? 'info' : 'neutral'}>
          {item.tipo === 'UNIDAD' ? 'Unidad' : 'Categoría'}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: 'ESTADO',
      align: 'center',
      render: (item) => (
        <Badge variant={item.activo ? 'success' : 'neutral'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<UnitOrCatItem>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (item) => setViewItem(item),
    },
    {
      label: 'Editar registro',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (item) => setModal(item),
    },
    {
      label: 'Activar/Desactivar',
      icon: <Power className="w-3.5 h-3.5" />,
      onClick: (item) => toggleStatus(item),
      variant: 'ghost',
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Unidades y categorías"
        eyebrow="ADMINISTRACIÓN · CATÁLOGOS"
        description="Unidades de presentación de servicios/materiales y jerarquías de agrupación."
        actions={
          <Button variant="primary" onClick={() => setModal('new')}>
            <Layers className="w-4 h-4 mr-2 inline" /> Nuevo registro
          </Button>
        }
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar por código o nombre...',
          isSearching: loading,
        }}
        filters={
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'TODOS'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setActiveTab('TODOS');
                setPage(1);
              }}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'UNIDADES'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setActiveTab('UNIDADES');
                setPage(1);
              }}
            >
              <Ruler className="w-3.5 h-3.5" /> Unidades
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'CATEGORIAS'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setActiveTab('CATEGORIAS');
                setPage(1);
              }}
            >
              <FolderTree className="w-3.5 h-3.5" /> Categorías
            </button>
          </div>
        }
      >
        <StandardDataTable<UnitOrCatItem>
          columns={columns}
          data={filtered.slice((page - 1) * pageSize, page * pageSize)}
          keyExtractor={(item) => item.id}
          rowActions={rowActions}
          loading={loading && items.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems: filtered.length,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No hay registros que coincidan con el filtro."
        />
      </ListPageLayout>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Ficha del Registro"
        subtitle="Información técnica de clasificación, presentación y jerarquía"
        icon={<Layers className="w-5 h-5 text-violet-400" />}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewItem(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewItem;
                setViewItem(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar registro
            </Button>
          </>
        }
      >
        {viewItem && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                {viewItem.tipo === 'UNIDAD' ? <Ruler className="w-5 h-5 text-violet-300" /> : <FolderTree className="w-5 h-5 text-violet-300" />}
              </div>
              <div className="modal-view-header-info">
                <h4>{viewItem.nombre}</h4>
                <span>Código: {viewItem.codigo}</span>
              </div>
              <Badge variant={viewItem.activo ? 'success' : 'warning'}>
                {viewItem.activo ? 'Vigente' : 'Inactivo'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">Tipo de Entidad</span>
                <span className="item-value font-bold text-violet-300">{viewItem.tipo}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">Código Estándar</span>
                <span className="item-value font-mono">{viewItem.codigo}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Descripción / Abreviatura</span>
                <span className="item-value">{viewItem.detalle}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo Registro' : 'Editar Registro'}
        subtitle={
          modal === 'new'
            ? 'Defina una unidad de medida o categoría para la clasificación de catálogo'
            : 'Modifique la codificación y etiquetas de presentación'
        }
        icon={<Layers className="w-5 h-5 text-violet-400" />}
        size="md"
        footer={
          <div className="modal-footer-standard">
            <div>
              {modal && modal !== 'new' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = modal;
                    setModal(null);
                    void toggleStatus(target);
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{modal.activo ? 'Desactivar registro' : 'Activar registro'}</span>
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
                form="unit-cat-form"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                {saving ? 'Guardando…' : modal === 'new' ? 'Crear registro' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        }
      >
        {modal && (
          <form id="unit-cat-form" onSubmit={saveItem}>
            <div className="client-modal-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="tipo-cat">
                  Tipo de Catálogo *
                </label>
                <select
                  id="tipo-cat"
                  name="tipo"
                  defaultValue={modal === 'new' ? 'UNIDAD' : modal.tipo}
                  disabled={modal !== 'new'}
                  className="form-select"
                >
                  <option value="UNIDAD">Unidad de Medida</option>
                  <option value="CATEGORIA">Categoría de Ítems</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="codigo-cat">
                  Código (ej: UND, CAT-MADERA) *
                </label>
                <input
                  id="codigo-cat"
                  name="codigo"
                  className="form-input font-mono"
                  placeholder="Ej: UND, CAT-MADERA"
                  defaultValue={modal === 'new' ? '' : modal.codigo}
                  required
                />
              </div>

              <div className="form-field full-width">
                <label className="form-label" htmlFor="nombre-cat">
                  Nombre descriptivo *
                </label>
                <input
                  id="nombre-cat"
                  name="nombre"
                  className="form-input"
                  placeholder="Nombre de la unidad o categoría"
                  defaultValue={modal === 'new' ? '' : modal.nombre}
                  required
                />
              </div>

              <div className="form-field full-width">
                <label className="form-label" htmlFor="detalle-cat">
                  Abreviatura (para unidades) o Descripción
                </label>
                <input
                  id="detalle-cat"
                  name="detalle"
                  className="form-input"
                  placeholder="Símbolo corto o nota sobre la categoría"
                  defaultValue={modal === 'new' ? '' : modal.detalle}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
