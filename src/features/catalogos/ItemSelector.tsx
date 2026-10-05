import React, { useState, useEffect, useRef } from 'react';
import type { ItemCatalogo } from '../../types/catalogos';
import { catalogosApi } from '../../services/catalogosApi';
import { Badge } from '@farutech/design-system';
import { ItemBuscarModal } from './ItemBuscarModal';

export interface ItemSelectorProps {
  onSelectItem: (item: ItemCatalogo) => void;
  naturalezaFiltro?: 'INVENTARIO' | 'SERVICIO';
  placeholder?: string;
  /** Permite elegir el ítem desde el modal especializado con filtros (lupa). */
  habilitarModalBusqueda?: boolean;
  /** Mínimo de caracteres para desplegar el listado rápido (por defecto 3). */
  minimoCaracteres?: number;
  /** Tamaño de página del listado rápido desplegable (por defecto 10). */
  tamanoListado?: number;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({
  onSelectItem,
  naturalezaFiltro,
  placeholder = 'Buscar por código o nombre (ej: INV-001, Cuchillo)...',
  habilitarModalBusqueda = true,
  minimoCaracteres = 3,
  tamanoListado = 10,
}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paginaListado, setPaginaListado] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchItems = async (searchTerm = '') => {
    setLoading(true);
    try {
      const res = await catalogosApi.getItems({
        q: searchTerm.trim() || undefined,
        naturaleza: naturalezaFiltro,
        activo: true,
      });
      setItems(res?.items || []);
      setPaginaListado(1);
      setIsOpen(true);
    } catch (err) {
      console.error('Error al buscar ítems en el catálogo:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
  };

  // Búsqueda desplegable automática (debounce 250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= minimoCaracteres) {
        fetchItems(query);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, naturalezaFiltro, minimoCaracteres]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: ItemCatalogo) => {
    onSelectItem(item);
    setQuery('');
    setIsOpen(false);
    setItems([]);
    setPaginaListado(1);
  };

  const handleSeleccionDesdeModal = (item: ItemCatalogo) => {
    onSelectItem(item);
    setQuery('');
    setIsOpen(false);
  };

  const formatPrice = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const totalPaginas = Math.max(1, Math.ceil(items.length / tamanoListado));
  const itemsPagina = items.slice(
    (paginaListado - 1) * tamanoListado,
    paginaListado * tamanoListado
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      <div className="item-selector__toolbar">
        <div className="item-selector__input-wrap">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => {
              if (items.length === 0) {
                fetchItems(query);
              } else {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            aria-label="Buscar ítem"
            className="item-selector__input"
          />
          {loading && (
            <span
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.8rem',
                color: '#94a3b8',
              }}
            >
              Buscando...
            </span>
          )}
        </div>

        {/* Botón Lupa: abre el modal especializado con filtros y detalle del ítem */}
        {habilitarModalBusqueda && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsModalOpen(true);
            }}
            title="Búsqueda especializada con filtros (código, nombre, categoría, naturaleza)"
            aria-label="Abrir búsqueda especializada de ítems"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0 0.85rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--color-border)',
              background: 'var(--color-primary, #4f46e5)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1rem' }}>🔍</span>
            <span>Buscar</span>
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '0.25rem',
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '0.5rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            listStyle: 'none',
            margin: '0.25rem 0 0 0',
            padding: 0,
          }}
        >
          {items.length === 0 ? (
            <li
              style={{
                padding: '0.75rem 1rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              No se encontraron ítems para "{query}"
            </li>
          ) : (
            itemsPagina.map((item) => (
              <li
                key={item.uuid}
                role="option"
                aria-selected="false"
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #334155',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  background: '#1e293b',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#312e81';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1e293b';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                      {item.codigoReferencia}
                    </span>
                    <span style={{ color: 'var(--color-text)', fontSize: '0.875rem' }}>{item.nombre}</span>
                    <Badge variant={item.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                      {item.naturaleza}
                    </Badge>
                  </div>
                  {item.descripcion && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                      {item.descripcion}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: '0.875rem' }}>
                    {formatPrice(item.precioBase)}
                  </div>
                  {item.naturaleza === 'INVENTARIO' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Stock ref: {item.stockReferencial ?? 0} {item.unidadPresentacion?.abreviatura || 'und'}
                    </div>
                  )}
                </div>
              </li>
            ))
          )}

          {/* Paginación del listado rápido (10 por página) */}
          {items.length > tamanoListado && (
            <li
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(15,23,42,0.9)',
                borderTop: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>
                Página {paginaListado} de {totalPaginas} · {items.length} resultados
              </span>
              <span style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaginaListado(1);
                  }}
                  disabled={paginaListado <= 1}
                  title="Primera página"
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: paginaListado <= 1 ? 'not-allowed' : 'pointer',
                    opacity: paginaListado <= 1 ? 0.4 : 1,
                  }}
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaginaListado((p) => Math.max(1, p - 1));
                  }}
                  disabled={paginaListado <= 1}
                  title="Página anterior"
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: paginaListado <= 1 ? 'not-allowed' : 'pointer',
                    opacity: paginaListado <= 1 ? 0.4 : 1,
                  }}
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaginaListado((p) => Math.min(totalPaginas, p + 1));
                  }}
                  disabled={paginaListado >= totalPaginas}
                  title="Página siguiente"
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: paginaListado >= totalPaginas ? 'not-allowed' : 'pointer',
                    opacity: paginaListado >= totalPaginas ? 0.4 : 1,
                  }}
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaginaListado(totalPaginas);
                  }}
                  disabled={paginaListado >= totalPaginas}
                  title="Última página"
                  style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: paginaListado >= totalPaginas ? 'not-allowed' : 'pointer',
                    opacity: paginaListado >= totalPaginas ? 0.4 : 1,
                  }}
                >
                  ⏭
                </button>
              </span>
            </li>
          )}
        </ul>
      )}

      {/* Modal Especializado (Lupa): filtros por código, nombre, categoría multinivel */}
      {habilitarModalBusqueda && (
        <ItemBuscarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSeleccionarItem={handleSeleccionDesdeModal}
          naturalezaInicial={naturalezaFiltro ?? 'TODAS'}
        />
      )}
    </div>
  );
};
