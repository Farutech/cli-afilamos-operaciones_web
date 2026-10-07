import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  Package,
  Wrench,
  Boxes,
  DollarSign,
  Barcode,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Badge, CrudPagination } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { ItemCatalogo } from '@/types/catalogos';

const FALLBACK_ITEMS: ItemCatalogo[] = [
  { uuid: 'prd-1', codigoReferencia: 'MAT-001', nombre: 'Diente Widia K20 4.2mm', descripcion: 'Plaquita de carburo de tungsteno grano medio para discos de corte de madera.', naturaleza: 'INVENTARIO', precioBase: 12500, stockReferencial: 140, activo: true, categoriaUuid: 'cat-mat', categoria: { uuid: 'cat-mat', codigo: 'MAT', nombre: 'Materiales & Plaquitas', activo: true, nivel: 1 } },
  { uuid: 'prd-2', codigoReferencia: 'MAT-002', nombre: 'Muela Diamantada Resinoide 125mm', descripcion: 'Disco abrasivo de acabado para afilado de herramientas en húmedo.', naturaleza: 'INVENTARIO', precioBase: 185000, stockReferencial: 8, activo: true, categoriaUuid: 'cat-her', categoria: { uuid: 'cat-her', codigo: 'HER', nombre: 'Herramientas y Discos', activo: true, nivel: 1 } },
  { uuid: 'prd-3', codigoReferencia: 'MAT-003', nombre: 'Soldadura de Plata 45% (Tira)', descripcion: 'Varilla para brasaje fuerte de plaquitas de corte con decapante incorporado.', naturaleza: 'INVENTARIO', precioBase: 35000, stockReferencial: 45, activo: true, categoriaUuid: 'cat-mat', categoria: { uuid: 'cat-mat', codigo: 'MAT', nombre: 'Materiales & Plaquitas', activo: true, nivel: 1 } },
  { uuid: 'prd-4', codigoReferencia: 'MAT-004', nombre: 'Refrigerante Sintético Taladrina (Galón)', descripcion: 'Fluido anticorrosivo emulsionable para rectificadoras de precisión.', naturaleza: 'INVENTARIO', precioBase: 92000, stockReferencial: 12, activo: true, categoriaUuid: 'cat-ins', categoria: { uuid: 'cat-ins', codigo: 'INS', nombre: 'Insumos Líquidos', activo: true, nivel: 1 } },
  { uuid: 'prd-5', codigoReferencia: 'MAT-005', nombre: 'Cuchilla Cepillo HSS 300x30x3mm', descripcion: 'Cuchilla de repuesto acero rápido de alta resistencia térmica.', naturaleza: 'INVENTARIO', precioBase: 78000, stockReferencial: 22, activo: true, categoriaUuid: 'cat-cuc', categoria: { uuid: 'cat-cuc', codigo: 'CUC', nombre: 'Cuchillas y Repuestos', activo: true, nivel: 1 } },
  { uuid: 'srv-1', codigoReferencia: 'SRV-001', nombre: 'Afilado Sierra Circular Carburo', descripcion: 'Afilado integral de dientes de carburo de tungsteno con refrigeración asistida.', naturaleza: 'SERVICIO', precioBase: 45000, stockReferencial: null, activo: true, categoriaUuid: 'cat-afi', categoria: { uuid: 'cat-afi', codigo: 'AFI', nombre: 'Afilado Especializado', activo: true, nivel: 1 } },
  { uuid: 'srv-2', codigoReferencia: 'SRV-002', nombre: 'Rectificado Cuchilla Cepillo 30cm', descripcion: 'Rectificado plano de cuchillas industriales con tolerancias H7.', naturaleza: 'SERVICIO', precioBase: 32000, stockReferencial: null, activo: true, categoriaUuid: 'cat-afi', categoria: { uuid: 'cat-afi', codigo: 'AFI', nombre: 'Afilado Especializado', activo: true, nivel: 1 } },
  { uuid: 'srv-3', codigoReferencia: 'SRV-003', nombre: 'Vaciado y Calibración Fresas CNC', descripcion: 'Tratamiento de perfilado de filos helicoidales para centros de mecanizado.', naturaleza: 'SERVICIO', precioBase: 68000, stockReferencial: null, activo: true, categoriaUuid: 'cat-mec', categoria: { uuid: 'cat-mec', codigo: 'MEC', nombre: 'Mecanizado & Fresado', activo: true, nivel: 1 } },
  { uuid: 'srv-4', codigoReferencia: 'SRV-004', nombre: 'Soldadura y Reposición Diente Widia', descripcion: 'Soldadura de plata para plaquitas de metal duro fracturadas.', naturaleza: 'SERVICIO', precioBase: 25000, stockReferencial: null, activo: true, categoriaUuid: 'cat-rep', categoria: { uuid: 'cat-rep', codigo: 'REP', nombre: 'Reparación & Soldadura', activo: true, nivel: 1 } },
  { uuid: 'srv-5', codigoReferencia: 'SRV-005', nombre: 'Mantenimiento Cabezal Portacuchillas', descripcion: 'Limpieza ultrasónica, lubricación y ajuste dinamométrico de fijaciones.', naturaleza: 'SERVICIO', precioBase: 55000, stockReferencial: null, activo: true, categoriaUuid: 'cat-mec', categoria: { uuid: 'cat-mec', codigo: 'MEC', nombre: 'Mecanizado & Fresado', activo: true, nivel: 1 } },
];

export default function AdminItems({ token }: { token?: string }) {
  const [items, setItems] = useState<ItemCatalogo[]>(FALLBACK_ITEMS);
  const [query, setQuery] = useState('');
  const [filtroNaturaleza, setFiltroNaturaleza] = useState<'TODOS' | 'INVENTARIO' | 'SERVICIO'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<ItemCatalogo | 'new' | null>(null);
  const [modalTipo, setModalTipo] = useState<'INVENTARIO' | 'SERVICIO'>('INVENTARIO');
  const [viewItem, setViewItem] = useState<ItemCatalogo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await catalogosApi.getItems({
        q: query || undefined,
        naturaleza: filtroNaturaleza === 'TODOS' ? undefined : filtroNaturaleza,
      });
      if (res.items && res.items.length > 0) {
        setItems(res.items);
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
    void loadItems();
  }, [token]);

  // Filtrado reactivo en cliente para búsqueda instantánea
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchQ =
        !q ||
        it.nombre.toLowerCase().includes(q) ||
        it.codigoReferencia.toLowerCase().includes(q) ||
        (it.descripcion || '').toLowerCase().includes(q);
      const matchNat = filtroNaturaleza === 'TODOS' || it.naturaleza === filtroNaturaleza;
      const matchCat =
        !filtroCategoria ||
        it.categoriaUuid === filtroCategoria ||
        it.categoria?.uuid === filtroCategoria;
      return matchQ && matchNat && matchCat;
    });
  }, [items, query, filtroNaturaleza, filtroCategoria]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visible = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Lista única de categorías existentes
  const categoriasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (it.categoria?.uuid && it.categoria?.nombre) {
        map.set(it.categoria.uuid, it.categoria.nombre);
      }
    });
    return Array.from(map.entries()).map(([uuid, nombre]) => ({ uuid, nombre }));
  }, [items]);

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const naturaleza = (data.get('naturaleza') as 'INVENTARIO' | 'SERVICIO') || modalTipo;
    const body = {
      codigoReferencia: String(data.get('codigoReferencia') || '').trim().toUpperCase(),
      nombre: String(data.get('nombre') || '').trim(),
      descripcion: String(data.get('descripcion') || '').trim(),
      precioBase: Number(data.get('precioBase') || 0),
      stockReferencial: naturaleza === 'INVENTARIO' ? Number(data.get('stockReferencial') || 0) : undefined,
      categoriaUuid: String(data.get('categoriaUuid') || '').trim() || undefined,
      naturaleza,
      uuidUnidadPresentacion: 'und-base',
    };

    try {
      if (modal === 'new') {
        const created = await catalogosApi.crearItem({
          ...body,
          categoriaUuid: body.categoriaUuid || 'cat-gen',
        });
        setItems((prev) => [created, ...prev]);
        toast.success(`${naturaleza === 'INVENTARIO' ? 'Producto' : 'Servicio'} creado con éxito`);
      } else {
        const updated = await catalogosApi.actualizarItem(modal.uuid, {
          ...body,
          categoriaUuid: body.categoriaUuid || null,
        });
        setItems((prev) => prev.map((it) => (it.uuid === modal.uuid ? updated : it)));
        toast.success('Registro actualizado con éxito');
      }
      setModal(null);
    } catch {
      // Fallback local
      if (modal === 'new') {
        const localItem: ItemCatalogo = {
          uuid: `item-${Date.now()}`,
          codigoReferencia: body.codigoReferencia,
          nombre: body.nombre,
          descripcion: body.descripcion,
          naturaleza: body.naturaleza,
          precioBase: body.precioBase,
          stockReferencial: body.stockReferencial ?? null,
          activo: true,
          categoriaUuid: body.categoriaUuid,
          categoria: body.categoriaUuid
            ? { uuid: body.categoriaUuid, codigo: 'CAT', nombre: 'Categoría Asignada', activo: true, nivel: 1 }
            : undefined,
        };
        setItems((prev) => [localItem, ...prev]);
        toast.success(`${naturaleza === 'INVENTARIO' ? 'Producto' : 'Servicio'} registrado localmente`);
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.uuid === modal.uuid
              ? {
                  ...it,
                  codigoReferencia: body.codigoReferencia,
                  nombre: body.nombre,
                  descripcion: body.descripcion,
                  naturaleza: body.naturaleza,
                  precioBase: body.precioBase,
                  stockReferencial: body.stockReferencial ?? null,
                }
              : it
          )
        );
        toast.success('Cambios guardados localmente');
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: ItemCatalogo) {
    const next = !item.activo;
    try {
      await catalogosApi.setItemActivo(item.uuid, next);
      setItems((prev) => prev.map((it) => (it.uuid === item.uuid ? { ...it, activo: next } : it)));
      toast.success(next ? 'Ítem activado' : 'Ítem desactivado');
    } catch {
      setItems((prev) => prev.map((it) => (it.uuid === item.uuid ? { ...it, activo: next } : it)));
      toast.success('Estado actualizado localmente');
    }
  }

  return (
    <div className="page-content">
      {/* Encabezado Principal */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">CATÁLOGOS · ÍTEMS</p>
          <h1>Productos y Servicios</h1>
          <p className="heading-copy">
            Gestión unificada de materiales de inventario, insumos y servicios de taller.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setModalTipo('INVENTARIO');
            setModal('new');
          }}
        >
          <Package className="w-4 h-4 mr-2 inline" /> + Nuevo Ítem
        </button>
      </div>

      {/* Panel Principal */}
      <section className="panel clients-panel">
        <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex items-center gap-2">
            <h2>Catálogo de Ítems</h2>
            <span className="text-xs text-slate-400 font-mono">({filteredItems.length} registros)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Naturaleza */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(['TODOS', 'INVENTARIO', 'SERVICIO'] as const).map((nat) => (
                <button
                  key={nat}
                  type="button"
                  onClick={() => {
                    setFiltroNaturaleza(nat);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filtroNaturaleza === nat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {nat === 'TODOS' ? 'Todos' : nat === 'INVENTARIO' ? '📦 Productos' : '🛠️ Servicios'}
                </button>
              ))}
            </div>

            {/* Filtro Categoría */}
            {categoriasDisponibles.length > 0 && (
              <select
                value={filtroCategoria}
                onChange={(e) => {
                  setFiltroCategoria(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">📁 Todas las categorías</option>
                {categoriasDisponibles.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* Buscador de texto */}
            <div className="client-search" style={{ minWidth: '220px' }}>
              <Search className="w-4 h-4" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por código, nombre o descripción..."
                aria-label="Buscar ítems"
              />
            </div>
          </div>
        </div>

        {/* Encabezado de Columnas (5 columnas exactas alineadas) */}
        <div className="client-table-head">
          <span>ÍTEM / SERVICIO</span>
          <span>NATURALEZA & CATEGORÍA</span>
          <span>EXISTENCIA</span>
          <span>PRECIO BASE</span>
          <span>ACCIONES</span>
        </div>

        {/* Lista de Registros */}
        {loading ? (
          <div className="empty-state">
            <span className="spinner-sm inline-block mr-2" /> Cargando catálogo de ítems…
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            {query.trim() || filtroNaturaleza !== 'TODOS' || filtroCategoria
              ? 'No se encontraron ítems que coincidan con los filtros aplicados.'
              : 'No hay ítems registrados en el catálogo.'}
          </div>
        ) : (
          <div className="client-list">
            {visible.map((it) => (
              <div className="client-row" key={it.uuid}>
                {/* Columna 1: Avatar badge + Nombre + Código */}
                <div className="client-cell-main">
                  <div className="client-avatar">
                    {it.naturaleza === 'INVENTARIO' ? (
                      <Package className="w-4 h-4 text-indigo-300" />
                    ) : (
                      <Wrench className="w-4 h-4 text-emerald-300" />
                    )}
                  </div>
                  <div className="client-main">
                    <strong>{it.nombre}</strong>
                    <span className="font-mono text-amber-300">{it.codigoReferencia}</span>
                  </div>
                </div>

                {/* Columna 2: Naturaleza & Categoría */}
                <div className="client-contact flex items-center gap-1.5">
                  <Badge variant={it.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                    {it.naturaleza === 'INVENTARIO' ? '📦 Producto' : '🛠️ Servicio'}
                  </Badge>
                  {it.categoria?.nombre && (
                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                      {it.categoria.nombre}
                    </span>
                  )}
                </div>

                {/* Columna 3: Existencia / Stock */}
                <span className="client-orders font-mono">
                  {it.naturaleza === 'INVENTARIO' ? (
                    <span className="text-emerald-400 font-bold">{it.stockReferencial ?? 0} UND</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </span>

                {/* Columna 4: Precio Base */}
                <span className="font-mono font-bold text-white text-xs">
                  ${(it.precioBase || 0).toLocaleString('es-CO')}
                </span>

                {/* Columna 5: Acciones alineadas a la derecha */}
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewItem(it)}
                    aria-label={`Ver detalle de ${it.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => {
                      setModalTipo(it.naturaleza);
                      setModal(it);
                    }}
                    aria-label={`Editar ${it.nombre}`}
                    title="Editar ítem"
                  >
                    <Pencil className="w-4 h-4 text-indigo-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => void toggleStatus(it)}
                    aria-label={it.activo ? `Desactivar ${it.nombre}` : `Activar ${it.nombre}`}
                    title={it.activo ? 'Desactivar ítem' : 'Activar ítem'}
                  >
                    <Power className={`w-4 h-4 ${it.activo ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación Estandarizada Design System */}
        {filteredItems.length > 0 && (
          <CrudPagination
            currentPage={page}
            totalPages={totalPages}
            perPage={pageSize}
            total={filteredItems.length}
            onPageChange={(newPage) => setPage(newPage)}
            onPerPageChange={(newSize: number) => {
              setPageSize(newSize);
              setPage(1);
            }}
            variant="dark"
          />
        )}
      </section>

      {/* Modal 1: VER DETALLE DEL ÍTEM */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.naturaleza === 'INVENTARIO' ? 'Ficha de Producto / Material' : 'Ficha de Servicio'}
        subtitle="Especificaciones técnicas, tarifas comerciales y existencias"
        icon={viewItem?.naturaleza === 'INVENTARIO' ? <Package className="w-5 h-5 text-indigo-400" /> : <Wrench className="w-5 h-5 text-emerald-400" />}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setViewItem(null)}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                const target = viewItem;
                setViewItem(null);
                if (target) {
                  setModalTipo(target.naturaleza);
                  setModal(target);
                }
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap transition-colors inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar ítem</span>
            </button>
          </div>
        }
      >
        {viewItem && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                {viewItem.naturaleza === 'INVENTARIO' ? <Package className="w-5 h-5 text-indigo-300" /> : <Wrench className="w-5 h-5 text-emerald-300" />}
              </div>
              <div className="modal-view-header-info">
                <h4>{viewItem.nombre}</h4>
                <span className="font-mono">{viewItem.codigoReferencia}</span>
              </div>
              <Badge variant={viewItem.activo ? 'success' : 'warning'}>
                {viewItem.activo ? 'En Catálogo' : 'Desactivado'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Tag className="w-3 h-3 mr-1 inline text-violet-400" /> Naturaleza
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewItem.naturaleza === 'INVENTARIO' ? '📦 Producto de Inventario' : '🛠️ Servicio de Taller'}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-violet-400" /> Precio Venta Base
                </span>
                <span className="item-value text-emerald-400 font-bold">
                  ${(viewItem.precioBase || 0).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Barcode className="w-3 h-3 mr-1 inline text-violet-400" /> Código Interno
                </span>
                <span className="item-value font-mono">{viewItem.codigoReferencia}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Boxes className="w-3 h-3 mr-1 inline text-violet-400" /> Existencia / Stock
                </span>
                <span className="item-value">
                  {viewItem.naturaleza === 'INVENTARIO' ? `${viewItem.stockReferencial ?? 0} unidades` : 'Servicio Operativo'}
                </span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Descripción Técnica</span>
                <span className="item-value leading-relaxed">
                  {viewItem.descripcion || 'Sin descripción técnica registrada.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR ÍTEM CON ESTÁNDAR OSCURO Y LABELS EXTERNOS */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Registro de Producto / Servicio' : 'Editar Producto / Servicio'}
        subtitle="Defina las existencias, categoría, precio y código de referencia del catálogo"
        icon={<Package className="w-5 h-5 text-indigo-400" />}
        size="lg"
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
                  <span>{modal.activo ? 'Desactivar ítem' : 'Activar ítem'}</span>
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
                form="item-form"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                {saving ? 'Guardando…' : modal === 'new' ? 'Crear ítem' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        }
      >
        {modal && (
          <form id="item-form" onSubmit={saveItem}>
            <div className="client-modal-grid">
              {/* Naturaleza */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-naturaleza">
                  Tipo de Ítem *
                </label>
                <select
                  id="item-naturaleza"
                  name="naturaleza"
                  value={modalTipo}
                  onChange={(e) => setModalTipo(e.target.value as any)}
                  className="form-select"
                  disabled={modal !== 'new'}
                >
                  <option value="INVENTARIO">📦 Producto de Inventario</option>
                  <option value="SERVICIO">🛠️ Servicio de Taller</option>
                </select>
              </div>

              {/* Categoría */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-categoria">
                  Categoría Asignada *
                </label>
                <select
                  id="item-categoria"
                  name="categoriaUuid"
                  defaultValue={modal === 'new' ? '' : modal.categoriaUuid || ''}
                  className="form-select"
                >
                  <option value="">— Seleccionar Categoría —</option>
                  {categoriasDisponibles.map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.nombre}
                    </option>
                  ))}
                  <option value="cat-gen">📁 General / Otra</option>
                </select>
              </div>

              {/* Código */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-codigo">
                  Código de Referencia *
                </label>
                <input
                  id="item-codigo"
                  name="codigoReferencia"
                  type="text"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  spellCheck={false}
                  className="form-input font-mono"
                  placeholder={modalTipo === 'INVENTARIO' ? 'Ej: MAT-010' : 'Ej: SRV-010'}
                  defaultValue={modal === 'new' ? '' : modal.codigoReferencia}
                  required
                />
              </div>

              {/* Nombre */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-nombre">
                  Nombre descriptivo *
                </label>
                <input
                  id="item-nombre"
                  name="nombre"
                  type="text"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="form-input"
                  placeholder="Ej: Diente Widia K20 o Afilado Circular"
                  defaultValue={modal === 'new' ? '' : modal.nombre}
                  required
                />
              </div>

              {/* Precio Base */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-precio">
                  Precio Unitario Base (COP) *
                </label>
                <input
                  id="item-precio"
                  name="precioBase"
                  type="number"
                  min="0"
                  step="100"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="form-input font-mono"
                  placeholder="0"
                  defaultValue={modal === 'new' ? '' : modal.precioBase}
                  required
                />
              </div>

              {/* Stock Referencial (solo inventario) */}
              <div className="form-field">
                <label className="form-label" htmlFor="item-stock">
                  Stock Referencial
                </label>
                <input
                  id="item-stock"
                  name="stockReferencial"
                  type="number"
                  min="0"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="form-input font-mono"
                  placeholder={modalTipo === 'INVENTARIO' ? '0' : 'No aplica (Servicio)'}
                  defaultValue={
                    modal === 'new'
                      ? modalTipo === 'INVENTARIO'
                        ? 0
                        : ''
                      : modal.stockReferencial ?? (modalTipo === 'INVENTARIO' ? 0 : '')
                  }
                  disabled={modalTipo === 'SERVICIO'}
                  required={modalTipo === 'INVENTARIO'}
                />
              </div>

              {/* Descripción */}
              <div className="form-field full-width">
                <label className="form-label" htmlFor="item-descripcion">
                  Descripción Técnica o Especificación
                </label>
                <textarea
                  id="item-descripcion"
                  name="descripcion"
                  rows={2}
                  className="form-textarea"
                  placeholder="Notas adicionales, compatibilidad o detalle del proceso..."
                  defaultValue={modal === 'new' ? '' : modal.descripcion}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
