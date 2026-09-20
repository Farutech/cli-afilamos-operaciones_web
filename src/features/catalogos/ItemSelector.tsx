import React, { useState, useEffect, useRef } from 'react';
import type { ItemCatalogo } from '../../types/catalogos';
import { catalogosApi } from '../../services/catalogosApi';
import { Badge } from '@farutech/design-system';

export interface ItemSelectorProps {
  onSelectItem: (item: ItemCatalogo) => void;
  naturalezaFiltro?: 'INVENTARIO' | 'SERVICIO';
  placeholder?: string;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({
  onSelectItem,
  naturalezaFiltro,
  placeholder = 'Buscar por código o nombre (ej: INV-001, Cuchillo)...',
}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setItems([]);
      setIsOpen(false);
    }
  };

  // Debounced search (350ms >= 300ms required)
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await catalogosApi.getItems({
          q: query.trim(),
          naturaleza: naturalezaFiltro,
          activo: true,
        });
        setItems(res.items || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Error al buscar ítems en el catálogo:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, naturalezaFiltro]);

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
  };

  const formatPrice = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => {
            if (items.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Buscar ítem"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <span
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Buscando...
          </span>
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
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.375rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            listStyle: 'none',
            margin: '0.25rem 0 0 0',
            padding: 0,
          }}
        >
          {items.length === 0 ? (
            <li
              style={{
                padding: '0.75rem 1rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              No se encontraron ítems para "{query}"
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.uuid}
                role="option"
                aria-selected="false"
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.875rem' }}>
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
        </ul>
      )}
    </div>
  );
};
