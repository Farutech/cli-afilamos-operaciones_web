import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button, Badge } from '@farutech/design-system';
import { catalogosApi } from '../../services/catalogosApi';
import type { ItemCatalogo, CategoriaItem } from '../../types/catalogos';

/**
 * Modal Especializado de Búsqueda de Ítems (Estilo "Lupa Novasoft").
 *
 * Sustituye el CRUD completo por una vista de CONSULTA FILTRADA sobre el catálogo:
 *  - Filtro por código, por nombre/descripción y por categoría MULTINIVEL (árbol).
 *  - Filtro opcional por naturaleza (INVENTARIO / SERVICIO).
 *  - Paginación de 10 registros por página con totales visibles.
 *  - Panel de detalle del ítem seleccionado (stock, unidad, lista de precios, workflow).
 *
 * A diferencia del CRUD administrativo, aquí NO se crean ni editan ítems: solo se
 * seleccionan para cargarlos en el formulario de captura correspondiente.
 */

interface ItemBuscarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarItem: (item: ItemCatalogo) => void;
  naturalezaInicial?: 'INVENTARIO' | 'SERVICIO' | 'TODAS';
  titulo?: string;
}

const TAMANO_PAGINA = 10;

function aplanarCategorias(cats: CategoriaItem[], nivel = 1): CategoriaItem[] {
  const resultado: CategoriaItem[] = [];
  cats.forEach((c) => {
    resultado.push({ ...c, nivel });
    if (c.hijos && c.hijos.length > 0) {
      resultado.push(...aplanarCategorias(c.hijos, nivel + 1));
    }
  });
  return resultado;
}

export function ItemBuscarModal({
  isOpen,
  onClose,
  onSeleccionarItem,
  naturalezaInicial = 'TODAS',
  titulo = '🔍 Búsqueda Especializada de Ítems & Servicios',
}: ItemBuscarModalProps) {
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroNaturaleza, setFiltroNaturaleza] = useState<'INVENTARIO' | 'SERVICIO' | 'TODAS'>(
    naturalezaInicial
  );

  // Selección y paginación
  const [itemDetalle, setItemDetalle] = useState<ItemCatalogo | null>(null);
  const [pagina, setPagina] = useState(1);

  const cargarCategorias = useCallback(async () => {
    try {
      const res = await catalogosApi.getCategoriasItem();
      setCategorias(aplanarCategorias(res.categorias || []));
    } catch {
      // El árbol de categorías aún no está sembrado: el filtro queda deshabilitado.
      setCategorias([]);
    }
  }, []);

  const cargarItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = [filtroCodigo.trim(), filtroNombre.trim()].filter(Boolean).join(' ');
      const res = await catalogosApi.getItems({
        q: q || undefined,
        naturaleza: filtroNaturaleza === 'TODAS' ? undefined : filtroNaturaleza,
        activo: true,
      });
      let lista = res.items || [];
      if (filtroCategoria) {
        lista = lista.filter(
          (it) =>
            it.categoriaUuid === filtroCategoria ||
            it.categoria?.uuid === filtroCategoria
        );
      }
      setItems(lista);
      setPagina(1);
      setItemDetalle((prev) => lista.find((i) => i.uuid === prev?.uuid) || lista[0] || null);
    } catch (err: any) {
      setError(err?.message || 'Error al consultar el catálogo de ítems');
      setItems([]);
      setItemDetalle(null);
    } finally {
      setLoading(false);
    }
  }, [filtroCodigo, filtroNombre, filtroNaturaleza, filtroCategoria]);

  useEffect(() => {
    if (!isOpen) return;
    cargarCategorias();
  }, [isOpen, cargarCategorias]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      cargarItems();
    }, 350);
    return () => clearTimeout(timer);
  }, [isOpen, cargarItems]);

  const totalPaginas = Math.max(1, Math.ceil(items.length / TAMANO_PAGINA));
  const itemsPagina = useMemo(
    () => items.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA),
    [items, pagina]
  );

  const formatPrecio = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const confirmarSeleccion = (item: ItemCatalogo) => {
    onSeleccionarItem(item);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} size="full">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* ─── PANEL DE FILTROS (EQUIVALENTE AL FILTRO DEL CRUD) ─────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Código Referencia
            </label>
            <input
              type="text"
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value)}
              placeholder="Ej: INV-001"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Nombre / Descripción
            </label>
            <input
              type="text"
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              placeholder="Ej: Cuchillo chef"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Categoría (Multinivel)
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">— Todas las categorías —</option>
              {categorias.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {'\u00A0'.repeat((c.nivel - 1) * 3)}
                  {(c.nivel > 1 ? '↳ ' : '📁 ') + c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Naturaleza
            </label>
            <select
              value={filtroNaturaleza}
              onChange={(e) => setFiltroNaturaleza(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="TODAS">Todas</option>
              <option value="INVENTARIO">Productos de Inventario</option>
              <option value="SERVICIO">Servicios de Taller</option>
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* ─── CONTENIDO PRINCIPAL: LISTA + DETALLE ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista paginada */}
          <div className="lg:col-span-2 space-y-3">
            <div className="overflow-hidden border border-slate-800 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">Código</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Ítem / Servicio</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Naturaleza</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Precio</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                        Consultando catálogo...
                      </td>
                    </tr>
                  ) : itemsPagina.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No se encontraron ítems con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    itemsPagina.map((it) => {
                      const seleccionado = itemDetalle?.uuid === it.uuid;
                      return (
                        <tr
                          key={it.uuid}
                          onClick={() => setItemDetalle(it)}
                          onDoubleClick={() => confirmarSeleccion(it)}
                          className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                            seleccionado ? 'bg-indigo-950/40' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono font-bold text-amber-300">
                            {it.codigoReferencia}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200">
                            <div className="font-medium">{it.nombre}</div>
                            {it.categoria?.nombre && (
                              <div className="text-[10px] text-slate-500">
                                {it.categoria.rutaCompleta || it.categoria.nombre}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant={it.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                              {it.naturaleza}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                            {formatPrecio(it.precioConLista ?? it.precioBase)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmarSeleccion(it);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación completa: |⏮| ◀ | Página X de Y | ▶ |⏭| */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Mostrando{' '}
                <span className="text-slate-200 font-semibold">
                  {items.length === 0 ? 0 : (pagina - 1) * TAMANO_PAGINA + 1}-
                  {Math.min(pagina * TAMANO_PAGINA, items.length)}
                </span>{' '}
                de <span className="text-slate-200 font-semibold">{items.length}</span> ítems
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPagina(1)}
                  disabled={pagina <= 1}
                  title="Primera página"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  title="Página anterior"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ◀
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  Página <span className="font-bold text-white">{pagina}</span> de{' '}
                  <span className="font-bold text-white">{totalPaginas}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas}
                  title="Página siguiente"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina >= totalPaginas}
                  title="Última página"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Detalle del Ítem Seleccionado */}
          <div className="space-y-3">
            {itemDetalle ? (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-amber-300 text-sm block">
                      {itemDetalle.codigoReferencia}
                    </span>
                    <h4 className="text-white font-semibold text-sm mt-0.5">{itemDetalle.nombre}</h4>
                  </div>
                  <Badge variant={itemDetalle.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                    {itemDetalle.naturaleza}
                  </Badge>
                </div>

                {itemDetalle.descripcion && (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {itemDetalle.descripcion}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Precio Base</span>
                    <span className="font-mono font-bold text-slate-200">
                      {formatPrecio(itemDetalle.precioBase)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Precio con Lista</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatPrecio(itemDetalle.precioConLista ?? itemDetalle.precioBase)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Unidad</span>
                    <span className="text-slate-200">
                      {itemDetalle.unidadPresentacion?.abreviatura || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Stock Referencial</span>
                    <span className="font-mono text-slate-200">
                      {itemDetalle.naturaleza === 'INVENTARIO'
                        ? itemDetalle.stockReferencial ?? 0
                        : 'N/A'}
                    </span>
                  </div>
                  {itemDetalle.listaPrecioNombre && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Lista de Precios</span>
                      <span className="text-slate-200">{itemDetalle.listaPrecioNombre}</span>
                    </div>
                  )}
                  {itemDetalle.categoria?.nombre && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Categoría</span>
                      <span className="text-slate-200">
                        {itemDetalle.categoria.rutaCompleta || itemDetalle.categoria.nombre}
                      </span>
                    </div>
                  )}
                  {itemDetalle.workflowDefinicionNombre && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Workflow de Taller</span>
                      <span className="text-slate-200">{itemDetalle.workflowDefinicionNombre}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={() => confirmarSeleccion(itemDetalle)}
                  className="w-full"
                >
                  ✓ Cargar este Ítem en el Formulario
                </Button>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-500">
                Seleccione un ítem de la lista para ver su detalle completo.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            Doble clic sobre una fila para cargarla directamente en el formulario.
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ItemBuscarModal;
