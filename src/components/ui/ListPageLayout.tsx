import React from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import { Button } from '@farutech/design-system';

export type TableDensity = 'compact' | 'standard' | 'comfortable';

export interface ListPageBreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface ListPageLayoutProps {
  /** Contexto o módulo superior (ej: "Operaciones / Taller") */
  eyebrow?: string;
  /** Título principal de la pantalla */
  title: string;
  /** Descripción clara del propósito de la entidad o proceso */
  description?: string;
  /** Migas de pan opcionales para jerarquías profundas */
  breadcrumbs?: ListPageBreadcrumbItem[];
  /** Acciones principales (Botones primarios/secundarios en fila única horizontal) */
  actions?: React.ReactNode;
  /** Configuración del buscador unificado */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isSearching?: boolean;
    onClear?: () => void;
  };
  /** Filtros de negocio compactos (Selects, comboboxes o botones desplegables) */
  filters?: React.ReactNode;
  /** Herramientas adicionales para la barra (ej: selector de columnas) */
  extraTools?: React.ReactNode;
  /** Control de densidad de tabla (Compacta / Estándar / Cómoda) */
  density?: {
    value: TableDensity;
    onChange: (density: TableDensity) => void;
  };
  /** Callback para refrescar datos */
  onRefresh?: () => void;
  /** Indicador de si se está refrescando */
  isRefreshing?: boolean;
  /** Contenido principal (StandardDataTable, Grid, etc.) */
  children: React.ReactNode;
  /** Pie o barra de estado inferior */
  footer?: React.ReactNode;
}

/**
 * ListPageLayout
 * Patrón transversal canónico para pantallas de consulta, gestión y maestros.
 * Garantiza una jerarquía visual limpia y prohíbe terminantemente controles amontonados en varias filas.
 */
export const ListPageLayout: React.FC<ListPageLayoutProps> = ({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  search,
  filters,
  extraTools,
  density,
  onRefresh,
  isRefreshing = false,
  children,
  footer,
}) => {
  return (
    <div className="list-page-layout w-full space-y-4 px-6 md:px-9 py-6 max-w-[1720px] mx-auto">
      {/* 1. Encabezado de Página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-600">/</span>}
                  {b.onClick ? (
                    <button
                      type="button"
                      onClick={b.onClick}
                      className={`hover:text-primary-400 transition-colors ${b.active ? 'text-slate-200 font-medium' : ''}`}
                    >
                      {b.label}
                    </button>
                  ) : (
                    <span className={b.active ? 'text-slate-200 font-medium' : ''}>{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary-400">
              {eyebrow}
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            {title}
          </h1>

          {description && (
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Acciones principales en fila única (sin wrap de texto) */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap [&_button]:whitespace-nowrap [&_a]:whitespace-nowrap">
            {actions}
          </div>
        )}
      </div>

      {/* 2. Barra de Herramientas Consistente (Fila Única en Desktop) */}
      {(search || filters || density || onRefresh || extraTools) && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Izquierda: Buscador + Filtros de Negocio */}
            <div className="flex flex-1 items-center gap-2.5 flex-wrap">
              {search && (
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    placeholder={search.placeholder || 'Buscar registros...'}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                  />
                  {search.value && (
                    <button
                      type="button"
                      onClick={() => {
                        search.onChange('');
                        search.onClear?.();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Filtros compactos */}
              {filters && (
                <div className="flex items-center gap-2 flex-wrap">
                  {filters}
                </div>
              )}
            </div>

            {/* Derecha: Preferencias de Visualización y Utilidades */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              {extraTools}

              {/* Selector de Densidad */}
              {density && (
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => density.onChange('compact')}
                    title="Densidad Compacta (36px)"
                    className={`px-2 py-1 rounded-md transition-colors ${
                      density.value === 'compact'
                        ? 'bg-slate-800 text-primary-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compacta
                  </button>
                  <button
                    type="button"
                    onClick={() => density.onChange('standard')}
                    title="Densidad Estándar (48px)"
                    className={`px-2 py-1 rounded-md transition-colors ${
                      density.value === 'standard'
                        ? 'bg-slate-800 text-primary-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Estándar
                  </button>
                  <button
                    type="button"
                    onClick={() => density.onChange('comfortable')}
                    title="Densidad Cómoda (60px)"
                    className={`px-2 py-1 rounded-md transition-colors ${
                      density.value === 'comfortable'
                        ? 'bg-slate-800 text-primary-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cómoda
                  </button>
                </div>
              )}

              {/* Botón de Refresco */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-8 px-2.5 border-slate-700/80 bg-slate-950 text-slate-300 hover:text-white"
                  title="Refrescar datos"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Contenedor del Contenido Principal (Tabla / Grid) */}
      <div className="w-full">
        {children}
      </div>

      {/* 4. Pie de Pantalla / Barra de Estado */}
      {footer && (
        <div className="pt-2">
          {footer}
        </div>
      )}
    </div>
  );
};
