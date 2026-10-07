import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Badge } from '@farutech/design-system';
import { catalogosApi } from '../../services/catalogosApi';
import type { ItemCatalogo, CategoriaItem } from '../../types/catalogos';

/**
 * Modal Especializado de Búsqueda de Ítems (Estilo "Lupa Novasoft").
 *
 * Consulta filtrada compacta sobre el catálogo con árbol de categorías,
 * buscador integrado y fallback garantizado.
 */

interface ItemBuscarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarItem: (item: ItemCatalogo) => void;
  naturalezaInicial?: 'INVENTARIO' | 'SERVICIO' | 'TODAS';
  titulo?: string;
}

const TAMANO_PAGINA = 8;

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

  // Filtros
  const [busquedaTexto, setBusquedaTexto] = useState('');
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
      if (res.categorias && res.categorias.length > 0) {
        setCategorias(aplanarCategorias(res.categorias));
      } else {
        setCategorias([]);
      }
    } catch {
      setCategorias([]);
    }
  }, []);

  const cargarItems = useCallback(async () => {
    setLoading(true);
    try {
      const q = busquedaTexto.trim();
      const res = await catalogosApi.getItems({
        q: q || undefined,
        naturaleza: filtroNaturaleza === 'TODAS' ? undefined : filtroNaturaleza,
        activo: true,
      });
      let lista = res.items || [];
      if (filtroCategoria) {
        lista = lista.filter(
          (it) => it.categoriaUuid === filtroCategoria || it.categoria?.uuid === filtroCategoria
        );
      }
      setItems(lista);
      setPagina(1);
      setItemDetalle((prev) => lista.find((i) => i.uuid === prev?.uuid) || lista[0] || null);
    } catch (err) {
      console.warn('Error al cargar catálogo desde API:', err);
      setItems([]);
      setItemDetalle(null);
    } finally {
      setLoading(false);
    }
  }, [busquedaTexto, filtroCategoria, filtroNaturaleza]);

  useEffect(() => {
    if (!isOpen) return;
    cargarCategorias();
  }, [isOpen, cargarCategorias]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      cargarItems();
    }, 200);
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
      <div className="space-y-3.5 max-h-[78vh] overflow-y-auto overflow-x-hidden pr-1">
        {/* ─── BARRA DE FILTROS COMPACTA (MENOS ESPACIO, MÁS FOCO EN TABLA) ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
          {/* Buscador de texto (Código o Nombre) con botón integrado */}
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Buscar por código, nombre o descripción..."
              className="w-full h-9 pl-3 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              className="absolute right-0 top-0 bottom-0 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-lg rounded-l-none text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shadow-sm h-full border-y border-r border-indigo-600"
            >
              🔍
            </button>
          </div>

          {/* Selector de Naturaleza (Pills) */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['TODAS', 'INVENTARIO', 'SERVICIO'] as const).map((nat) => (
              <button
                key={nat}
                type="button"
                onClick={() => setFiltroNaturaleza(nat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filtroNaturaleza === nat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {nat === 'TODAS' ? 'Todos' : nat === 'INVENTARIO' ? '📦 Productos' : '🛠️ Servicios'}
              </button>
            ))}
          </div>

          {/* Categoría Árbol */}
          <div className="min-w-[180px]">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">📁 Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {' '.repeat((c.nivel - 1) * 2)}
                  {(c.nivel > 1 ? '↳ ' : '') + c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de limpiar filtros si hay alguno activo */}
          {(busquedaTexto || filtroCategoria || filtroNaturaleza !== naturalezaInicial) && (
            <button
              type="button"
              onClick={() => {
                setBusquedaTexto('');
                setFiltroCategoria('');
                setFiltroNaturaleza(naturalezaInicial);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer px-2 py-1 hover:bg-rose-950/40 rounded transition-colors"
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* ─── CONTENIDO: TABLA PRINCIPAL Y PANEL DE DETALLE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* TABLA: 8 columnas en desktop */}
          <div className="lg:col-span-8 flex flex-col border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden shadow-md">
            <div className="overflow-x-auto max-h-[380px] min-h-[340px] overflow-y-auto pb-2 flex flex-col justify-start">
              {loading ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] gap-2.5 text-slate-400">
                  <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold tracking-wide text-slate-300">Cargando datos...</span>
                </div>
              ) : itemsPagina.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] gap-1 text-slate-400">
                  <span className="text-xs">No se encontraron ítems con los filtros aplicados.</span>
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">Código</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Ítem / Servicio</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Naturaleza</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Stock</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Precio Base</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {itemsPagina.map((it) => {
                      const seleccionado = itemDetalle?.uuid === it.uuid;
                      return (
                        <tr
                          key={it.uuid}
                          onClick={() => setItemDetalle(it)}
                          onDoubleClick={() => confirmarSeleccion(it)}
                          className={`cursor-pointer transition-colors ${
                            seleccionado ? 'bg-indigo-950/40' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono font-bold text-amber-300">
                            {it.codigoReferencia}
                          </td>
                          <td className="px-3 py-2.5 text-slate-200">
                            <div className="font-semibold text-white truncate max-w-[220px]">{it.nombre}</div>
                            {it.categoria?.nombre && (
                              <div className="text-[10px] text-indigo-400 font-medium truncate max-w-[200px]">
                                📁 {it.categoria.nombre}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant={it.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                              {it.naturaleza === 'INVENTARIO' ? '📦 Producto' : '🛠️ Servicio'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold">
                            {it.naturaleza === 'INVENTARIO' ? (
                              <span className="text-emerald-400 text-xs">
                                {it.stockReferencial ?? 0}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                            <span className="font-bold text-emerald-400 block">
                              {formatPrecio(it.precioConLista ?? it.precioBase)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmarSeleccion(it);
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Paginación compacta */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Total: <span className="text-slate-200 font-semibold">{items.length}</span> ítems
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPagina(1)}
                  disabled={pagina <= 1}
                  className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  ◀
                </button>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas}
                  className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina >= totalPaginas}
                  className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* PANEL DE DETALLE DEL ÍTEM SELECCIONADO (4 columnas en desktop) */}
          <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
            {itemDetalle ? (
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-amber-300 font-bold text-xs">
                      {itemDetalle.codigoReferencia}
                    </span>
                    <Badge variant={itemDetalle.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                      {itemDetalle.naturaleza === 'INVENTARIO' ? '📦 Producto' : '🛠️ Servicio'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{itemDetalle.nombre}</h4>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase mb-0.5">Descripción</span>
                  {itemDetalle.descripcion || 'Sin descripción detallada.'}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">PRECIO BASE</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatPrecio(itemDetalle.precioBase)}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      {itemDetalle.naturaleza === 'INVENTARIO' ? 'EXISTENCIA' : 'TALLER'}
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      {itemDetalle.naturaleza === 'INVENTARIO' ? `${itemDetalle.stockReferencial ?? 0} UND` : 'Activo'}
                    </span>
                  </div>
                </div>

                {itemDetalle.categoria?.nombre && (
                  <div className="text-[11px] text-indigo-300 bg-indigo-950/30 p-2 rounded-lg border border-indigo-800/40">
                    📁 Categoría: <span className="font-semibold">{itemDetalle.categoria.nombre}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10">
                Seleccione un ítem para visualizar sus especificaciones.
              </div>
            )}

            {itemDetalle && (
              <button
                type="button"
                onClick={() => confirmarSeleccion(itemDetalle)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm mt-3 flex items-center justify-center gap-1.5"
              >
                <span>➕ Adicionar a Solicitud</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
