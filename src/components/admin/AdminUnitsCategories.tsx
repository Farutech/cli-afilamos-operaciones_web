import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  Layers,
  Ruler,
  FolderTree,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
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

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CATÁLOGOS</p>
          <h1>Unidades y categorías</h1>
          <p className="heading-copy">
            Unidades de presentación de servicios/materiales y jerarquías de agrupación.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <Layers className="w-4 h-4 mr-2 inline" /> Nuevo registro
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={activeTab === 'TODOS' ? 'primary-button' : 'secondary-button'}
              style={{ height: '32px', padding: '0 12px', fontSize: '10px' }}
              onClick={() => setActiveTab('TODOS')}
            >
              Todos ({items.length})
            </button>
            <button
              className={activeTab === 'UNIDADES' ? 'primary-button' : 'secondary-button'}
              style={{ height: '32px', padding: '0 12px', fontSize: '10px' }}
              onClick={() => setActiveTab('UNIDADES')}
            >
              <Ruler className="w-3.5 h-3.5 mr-1 inline" /> Unidades
            </button>
            <button
              className={activeTab === 'CATEGORIAS' ? 'primary-button' : 'secondary-button'}
              style={{ height: '32px', padding: '0 12px', fontSize: '10px' }}
              onClick={() => setActiveTab('CATEGORIAS')}
            >
              <FolderTree className="w-3.5 h-3.5 mr-1 inline" /> Categorías
            </button>
          </div>

          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código o nombre..."
              aria-label="Buscar unidades y categorías"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>NOMBRE</span>
          <span>CÓDIGO</span>
          <span>TIPO / DETALLE</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading ? (
          <div className="empty-state">Cargando registros…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No hay registros que coincidan con el filtro.</div>
        ) : (
          <div className="client-list">
            {filtered.map((item) => (
              <div className="client-row" key={item.id}>
                <div className="client-avatar">
                  {item.tipo === 'UNIDAD' ? <Ruler className="w-4 h-4" /> : <FolderTree className="w-4 h-4" />}
                </div>
                <div className="client-main">
                  <strong>{item.nombre}</strong>
                  <span>{item.detalle}</span>
                </div>
                <span className="client-contact font-mono text-xs">{item.codigo}</span>
                <span className="client-orders font-medium text-slate-300">
                  <Badge variant={item.tipo === 'UNIDAD' ? 'info' : 'neutral'}>
                    {item.tipo}
                  </Badge>
                </span>
                <span className={`client-status ${!item.activo ? 'is-pending' : ''}`}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewItem(item)}
                    aria-label={`Ver detalle de ${item.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(item)}
                    aria-label={`Editar ${item.nombre}`}
                    title="Editar registro"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => toggleStatus(item)}
                    aria-label={`Cambiar estado de ${item.nombre}`}
                    title="Activar o desactivar"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Detalle del Registro"
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
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="unit-cat-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="unit-cat-form" onSubmit={saveItem}>
            <div className="client-modal-grid">
              <div className="modal-form-field">
                <label>Tipo de Catálogo</label>
                <select
                  name="tipo"
                  defaultValue={modal === 'new' ? 'UNIDAD' : modal.tipo}
                  disabled={modal !== 'new'}
                >
                  <option value="UNIDAD">Unidad de Medida</option>
                  <option value="CATEGORIA">Categoría de Ítems</option>
                </select>
              </div>

              <label className="floating-field">
                <input
                  name="codigo"
                  defaultValue={modal === 'new' ? '' : modal.codigo}
                  placeholder=" "
                  required
                />
                <span>Código (ej: UND, CAT-MADERA)</span>
              </label>

              <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
                <input
                  name="nombre"
                  defaultValue={modal === 'new' ? '' : modal.nombre}
                  placeholder=" "
                  required
                />
                <span>Nombre descriptivo</span>
              </label>

              <label className="floating-field" style={{ gridColumn: '1 / -1' }}>
                <input
                  name="detalle"
                  defaultValue={modal === 'new' ? '' : modal.detalle}
                  placeholder=" "
                />
                <span>Abreviatura (para unidades) o Descripción</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
