import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  Package,
  Boxes,
  DollarSign,
  Barcode,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput, CrudPagination } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { ItemCatalogo } from '@/types/catalogos';

const FALLBACK_PRODUCTS: ItemCatalogo[] = [
  { uuid: 'prd-1', codigoReferencia: 'MAT-001', nombre: 'Diente Widia K20 4.2mm', descripcion: 'Plaquita de carburo de tungsteno grano medio para discos de corte de madera.', naturaleza: 'INVENTARIO', precioBase: 12500, stockReferencial: 140, activo: true },
  { uuid: 'prd-2', codigoReferencia: 'MAT-002', nombre: 'Muela Diamantada Resinoide 125mm', descripcion: 'Disco abrasivo de acabado para afilado de herramientas en húmedo.', naturaleza: 'INVENTARIO', precioBase: 185000, stockReferencial: 8, activo: true },
  { uuid: 'prd-3', codigoReferencia: 'MAT-003', nombre: 'Soldadura de Plata 45% (Tira)', descripcion: 'Varilla para brasaje fuerte de plaquitas de corte con decapante incorporado.', naturaleza: 'INVENTARIO', precioBase: 35000, stockReferencial: 45, activo: true },
  { uuid: 'prd-4', codigoReferencia: 'MAT-004', nombre: 'Refrigerante Sintético Taladrina (Galón)', descripcion: 'Fluido anticorrosivo emulsionable para rectificadoras de precisión.', naturaleza: 'INVENTARIO', precioBase: 92000, stockReferencial: 12, activo: true },
  { uuid: 'prd-5', codigoReferencia: 'MAT-005', nombre: 'Cuchilla Cepillo HSS 300x30x3mm', descripcion: 'Cuchilla de repuesto acero rápido de alta resistencia térmica.', naturaleza: 'INVENTARIO', precioBase: 78000, stockReferencial: 0, activo: false },
];

export default function AdminProducts({ token }: { token?: string }) {
  const [products, setProducts] = useState<ItemCatalogo[]>(FALLBACK_PRODUCTS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(FALLBACK_PRODUCTS.length);
  const [modal, setModal] = useState<ItemCatalogo | 'new' | null>(null);
  const [viewProduct, setViewProduct] = useState<ItemCatalogo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await catalogosApi.getItems({ q: query, naturaleza: 'INVENTARIO' });
      if (res.items && res.items.length > 0) {
        setProducts(res.items);
        setTotalItems(res.total);
      } else {
        setProducts([]);
        setTotalItems(0);
      }
    } catch {
      setProducts(FALLBACK_PRODUCTS);
      setTotalItems(FALLBACK_PRODUCTS.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, [page, pageSize, query, token]);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      codigoReferencia: String(data.get('codigoReferencia') || '').trim(),
      nombre: String(data.get('nombre') || '').trim(),
      descripcion: String(data.get('descripcion') || '').trim(),
      precioBase: Number(data.get('precioBase') || 0),
      stockReferencial: Number(data.get('stockReferencial') || 0),
    };

    try {
      if (modal === 'new') {
        await catalogosApi.crearItem({
          codigoReferencia: body.codigoReferencia,
          nombre: body.nombre,
          descripcion: body.descripcion,
          naturaleza: 'INVENTARIO',
          precioBase: body.precioBase,
          stockReferencial: body.stockReferencial,
          uuidUnidadPresentacion: 'und-1',
          categoriaUuid: 'cat-2',
        });
      } else {
        await catalogosApi.actualizarItem(modal.uuid, {
          nombre: body.nombre,
          descripcion: body.descripcion,
          precioBase: body.precioBase,
          stockReferencial: body.stockReferencial,
          uuidUnidadPresentacion: 'und-1',
        });
      }
      setModal(null);
      toast.success(modal === 'new' ? 'Producto registrado correctamente' : 'Producto actualizado');
      await loadProducts();
    } catch {
      if (modal === 'new') {
        const newPrd: ItemCatalogo = {
          uuid: String(Date.now()),
          ...body,
          naturaleza: 'INVENTARIO',
          activo: true,
        };
        setProducts((prev) => [newPrd, ...prev]);
        setTotalItems((prev) => prev + 1);
        setModal(null);
        toast.success('Producto guardado en inventario local');
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.uuid === modal.uuid ? { ...p, ...body } : p))
        );
        setModal(null);
        toast.success('Producto actualizado en inventario local');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(product: ItemCatalogo) {
    const nextStatus = !product.activo;
    try {
      await catalogosApi.setItemActivo(product.uuid, nextStatus);
      toast.success('Estado del producto actualizado');
      await loadProducts();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.uuid === product.uuid ? { ...p, activo: nextStatus } : p))
      );
      toast.success('Estado actualizado localmente');
    }
  }

  const visible = useMemo(
    () =>
      products.filter((p) =>
        `${p.nombre || ''} ${p.codigoReferencia || ''} ${p.descripcion || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [products, query]
  );

  return (
    <div className="page-content">
      {/* Encabezado Estándar Ordeon */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CATÁLOGOS</p>
          <h1>Productos y materiales</h1>
          <p className="heading-copy">
            Control de inventario, consumibles de taller y repuestos para comercialización.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <Package className="w-4 h-4 mr-2 inline" /> Nuevo producto
        </button>
      </div>

      {/* Panel Principal */}
      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Inventario de Productos</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar producto por código o descripción"
              aria-label="Buscar productos"
            />
          </div>
        </div>

        {/* Columnas Básicas y Necesarias */}
        <div className="client-table-head">
          <span>PRODUCTO</span>
          <span>CÓDIGO</span>
          <span>STOCK REF.</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading && products.length === 0 ? (
          <div className="empty-state">Cargando inventario…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay productos que coincidan con la búsqueda.</div>
        ) : (
          <div className="client-list">
            {visible.map((product) => (
              <div className="client-row" key={product.uuid}>
                <div className="client-avatar">
                  <Boxes className="w-4 h-4" />
                </div>
                <div className="client-main">
                  <strong>{product.nombre}</strong>
                  <span>{product.descripcion || 'Sin descripción adicional'}</span>
                </div>
                <span className="client-contact font-mono text-xs">{product.codigoReferencia}</span>
                <span className={`client-orders font-bold ${(product.stockReferencial || 0) > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {product.stockReferencial ?? 0} unid.
                </span>
                <span className={`client-status ${!product.activo ? 'is-pending' : ''}`}>
                  {product.activo ? 'Disponible' : 'Inactivo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewProduct(product)}
                    aria-label={`Ver detalle de ${product.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(product)}
                    aria-label={`Editar ${product.nombre}`}
                    title="Editar producto"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => void toggleStatus(product)}
                    aria-label={`Cambiar estado de ${product.nombre}`}
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

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        title="Ficha del Producto"
        subtitle="Especificaciones técnicas, inventario y datos comerciales"
        icon={<Package className="w-5 h-5 text-violet-400" />}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewProduct(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewProduct;
                setViewProduct(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar producto
            </Button>
          </>
        }
      >
        {viewProduct && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <Package className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewProduct.nombre}</h4>
                <span>{viewProduct.codigoReferencia}</span>
              </div>
              <Badge variant={viewProduct.activo ? 'success' : 'warning'}>
                {viewProduct.activo ? 'En Catálogo' : 'Desactivado'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Boxes className="w-3 h-3 mr-1 inline text-violet-400" /> Stock Referencial
                </span>
                <span className="item-value font-bold text-slate-100">
                  {viewProduct.stockReferencial ?? 0} unidades
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <DollarSign className="w-3 h-3 mr-1 inline text-violet-400" /> Precio Venta Base
                </span>
                <span className="item-value text-emerald-400 font-bold">
                  ${(viewProduct.precioBase || 0).toLocaleString('es-CO')} COP
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Barcode className="w-3 h-3 mr-1 inline text-violet-400" /> Código Interno
                </span>
                <span className="item-value font-mono">{viewProduct.codigoReferencia}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Layers className="w-3 h-3 mr-1 inline text-violet-400" /> Unidad
                </span>
                <span className="item-value">Unidad / Pieza (UND)</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Descripción Técnica y Uso</span>
                <span className="item-value leading-relaxed">
                  {viewProduct.descripcion || 'Sin notas descriptivas registradas.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR PRODUCTO (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nuevo Producto / Material' : 'Editar Producto'}
        subtitle={
          modal === 'new'
            ? 'Defina las existencias, precios y código de referencia para el inventario'
            : 'Modifique las referencias y parámetros comerciales del producto'
        }
        icon={<Package className="w-5 h-5 text-violet-400" />}
        size="md"
        extraActions={
          modal && modal !== 'new' ? (
            <Button
              variant="outline"
              onClick={() => {
                const target = modal;
                setModal(null);
                void toggleStatus(target);
              }}
              disabled={saving}
            >
              <Power className="w-4 h-4 mr-2" />
              {modal.activo ? 'Desactivar producto' : 'Activar producto'}
            </Button>
          ) : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="product-form" disabled={saving}>
              {saving ? 'Guardando…' : modal === 'new' ? 'Crear producto' : 'Guardar producto'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="product-form" onSubmit={saveProduct}>
            <div className="client-modal-grid">
              <FloatingInput
                name="codigoReferencia"
                label="Código de referencia (ej: MAT-010)"
                defaultValue={modal === 'new' ? '' : modal.codigoReferencia}
                tooltip="Código de barra o referencia de inventario interna."
                required
              />

              <FloatingInput
                name="nombre"
                label="Nombre del producto / material"
                defaultValue={modal === 'new' ? '' : modal.nombre}
                tooltip="Descripción comercial del material, repuesto o accesorio."
                required
              />

              <FloatingInput
                name="stockReferencial"
                type="number"
                min="0"
                label="Stock referencial"
                defaultValue={modal === 'new' ? '' : modal.stockReferencial ?? 0}
                tooltip="Cantidad física o proyectada disponible en almacén."
                required
              />

              <FloatingInput
                name="precioBase"
                type="number"
                min="0"
                label="Precio unitario base (COP)"
                defaultValue={modal === 'new' ? '' : modal.precioBase}
                tooltip="Precio de venta unitario al público sin aplicar descuentos."
                required
              />

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="descripcion"
                  label="Descripción detallada o especificación"
                  defaultValue={modal === 'new' ? '' : modal.descripcion || ''}
                  tooltip="Especificaciones de dimensiones, grados de aleación o uso."
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
