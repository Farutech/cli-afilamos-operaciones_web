import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  RotateCcw,
  X,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  ArrowUpDown,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Edit2,
  Check,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Button } from '@farutech/design-system';

export interface ListadoCrudColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface ListadoCrudQuickFilter {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}

export interface ListadoCrudGlobalAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ListadoCrudRowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ListadoCrudBulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedKeys: string[], selectedItems: T[]) => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
}

export interface ListadoCrudProps<T> {
  /** Eyebrow o contexto superior (ej: "Operación > Taller") */
  eyebrow?: string;
  /** Título principal de la pantalla */
  title: string;
  /** Icono temático opcional al lado del título */
  icon?: React.ReactNode;
  /**
   * Slot de inserción configurable entre el Título y la Descripción.
   * Permite inyectar labels informativos, tarjetas con KPIs o métricas generales.
   */
  headerChild?: React.ReactNode;
  /** Descripción del propósito del listado */
  description?: string;

  /** Identificador para persistir preferencias en localStorage (ej: modo tarjetas vs tabla) */
  moduleId?: string;

  // 1. Acciones globales (Dropdown "... Más acciones" a la izquierda de + Nuevo)
  globalActions?: ListadoCrudGlobalAction[];

  // 2. Vista de presentación (Cards / Tabla con toggle)
  allowViewToggle?: boolean;
  defaultViewMode?: 'table' | 'cards';
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  renderCard?: (item: T, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;

  // 3. Acción principal (+ Nuevo)
  primaryAction?: {
    label?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
  onCreate?: () => void;
  createLabel?: string;

  // 4. Búsqueda global con debounce y botón limpiar
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    debounceMs?: number;
  };
  onClearSearch?: () => void;

  // 5. Filtros rápidos y filtros avanzados
  quickFilters?: ListadoCrudQuickFilter[];
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  onAdvancedFiltersClick?: () => void;
  advancedFiltersContent?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;

  // 6. Encabezado de tabla y datos
  columns: ListadoCrudColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };

  // Ordenamiento
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string, direction: 'asc' | 'desc' | undefined) => void;

  // Acciones en cada fila
  onViewItem?: (item: T) => void;
  onEditItem?: (item: T) => void;
  rowActions?: ListadoCrudRowAction<T>[];

  // 7. Acciones masivas
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  bulkActions?: ListadoCrudBulkAction<T>[];

  // 8 & 9. Paginación completa y Selector de filas por página
  pagination?: {
    page?: number;
    currentPage?: number;
    pageSize: number;
    totalItems: number;
    pageSizeOptions?: number[];
    onPageChange: (newPage: number) => void;
    onPageSizeChange?: (newPageSize: number) => void;
  };

  className?: string;
}

/**
 * ListadoCrud
 * Estándar canónico y transversal de pantallas CRUD para la aplicación.
 * Implementa estrictamente los 9 lineamientos del diseño de referencia:
 * (1) Acciones globales (... Más acciones)
 * (2) Vista de presentación (Cards / Tabla con persistencia)
 * (3) Acción principal (+ Nuevo)
 * (4) Búsqueda global con debounce y chips
 * (5) Filtros rápidos, avanzados y orden rápido
 * (6) Encabezado ordenable con selección y acciones fijas
 * (7) Acciones masivas contextuales
 * (8) Paginación completa en una sola fila en desktop
 * (9) Selector de filas por página
 * + Slot headerChild entre título y descripción
 */
export function ListadoCrud<T>({
  eyebrow,
  title,
  icon,
  headerChild,
  description,
  moduleId,
  globalActions,
  allowViewToggle = true,
  defaultViewMode = 'table',
  viewMode: controlledViewMode,
  onViewModeChange,
  renderCard,
  primaryAction,
  onCreate,
  createLabel = '+ Nuevo',
  search,
  onClearSearch,
  quickFilters,
  activeFiltersCount,
  onClearFilters,
  onAdvancedFiltersClick,
  advancedFiltersContent,
  onRefresh,
  isRefreshing = false,
  columns,
  data,
  keyExtractor,
  loading = false,
  loadingMessage = 'Cargando registros...',
  emptyTitle = 'No hay datos disponibles',
  emptyDescription = 'No se encontraron registros para mostrar con los filtros aplicados.',
  emptyAction,
  sortColumn,
  sortDirection,
  onSort,
  onViewItem,
  onEditItem,
  rowActions,
  selectable = true,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
  bulkActions,
  pagination,
  className = '',
}: ListadoCrudProps<T>): React.ReactElement {
  // --- View Mode (Cards vs Tabla) with localStorage persistence ---
  const storageKey = moduleId ? `ordeon_view_pref_${moduleId}` : 'ordeon_view_pref_crud';
  const [internalViewMode, setInternalViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'cards' || saved === 'table') return saved;
    }
    return defaultViewMode;
  });

  const effectiveViewMode = controlledViewMode ?? internalViewMode;

  const handleToggleViewMode = (mode: 'table' | 'cards') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, mode);
      }
    }
  };

  // --- Menu states ---
  const [isGlobalActionsOpen, setIsGlobalActionsOpen] = useState(false);
  const [openRowMenuKey, setOpenRowMenuKey] = useState<string | null>(null);
  const [isBulkMoreOpen, setIsBulkMoreOpen] = useState(false);

  // --- Selection State ---
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());
  const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys;

  const handleToggleSelectAll = () => {
    if (selectedKeys.size === data.length && data.length > 0) {
      const empty = new Set<string>();
      onSelectionChange ? onSelectionChange(empty) : setInternalSelectedKeys(empty);
    } else {
      const all = new Set<string>(data.map(keyExtractor));
      onSelectionChange ? onSelectionChange(all) : setInternalSelectedKeys(all);
    }
  };

  const handleToggleSelectRow = (key: string) => {
    const next = new Set<string>(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange ? onSelectionChange(next) : setInternalSelectedKeys(next);
  };

  // Selected items array for bulk actions
  const selectedItems = useMemo(() => {
    return data.filter((item) => selectedKeys.has(keyExtractor(item)));
  }, [data, selectedKeys, keyExtractor]);

  // --- Search debouncing ---
  const [searchValue, setSearchValue] = useState(search?.value ?? '');
  useEffect(() => {
    setSearchValue(search?.value ?? '');
  }, [search?.value]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      search?.onChange(val);
    }, search?.debounceMs ?? 300);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    search?.onChange('');
    onClearSearch?.();
  };

  // --- Sorting ---
  const handleSortClick = (columnKey: string) => {
    if (!onSort) return;
    if (sortColumn !== columnKey) {
      onSort(columnKey, 'asc');
    } else if (sortDirection === 'asc') {
      onSort(columnKey, 'desc');
    } else {
      onSort(columnKey, undefined);
    }
  };

  // --- Pagination Calculations ---
  const currentPg = pagination ? (pagination.currentPage ?? pagination.page ?? 1) : 1;
  const pageSize = pagination ? pagination.pageSize : 25;
  const totalItems = pagination ? pagination.totalItems : data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 25, 50, 100];

  // Generate pagination pages array (e.g. [1, 2, 3, '...', 10])
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range: (number | string)[] = [];
    for (
      let i = Math.max(2, currentPg - delta);
      i <= Math.min(totalPages - 1, currentPg + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPg - delta > 2) {
      range.unshift('...');
    }
    if (currentPg + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }
    return range;
  }, [currentPg, totalPages]);

  // Calculated active filters count
  const calculatedActiveFiltersCount = useMemo(() => {
    if (activeFiltersCount !== undefined) return activeFiltersCount;
    let count = 0;
    if (quickFilters) {
      count += quickFilters.filter((q) => q.value && q.value !== 'all' && q.value !== '').length;
    }
    if (search?.value) count += 1;
    return count;
  }, [activeFiltersCount, quickFilters, search?.value]);

  const hasRowActions = Boolean(onViewItem || onEditItem || (rowActions && rowActions.length > 0));

  return (
    <div className={`listado-crud-container w-full space-y-4 px-4 sm:px-6 md:px-8 py-5 max-w-[1720px] mx-auto text-slate-100 ${className}`}>
      {/* ======================================================== */}
      {/* 1. ENCABEZADO DE PÁGINA (Título, headerChild, Descripción, Acciones) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="space-y-1.5 flex-1">
          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary-400">
              {eyebrow}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {icon && <span className="text-xl sm:text-2xl">{icon}</span>}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {title}
            </h1>
          </div>

          {/* Slot de inserción entre título y descripción */}
          {headerChild && (
            <div className="pt-1 pb-1">
              {headerChild}
            </div>
          )}

          {description && (
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Acciones Superiores: (1) Más acciones, (2) Toggle Cards/Tabla, (3) + Nuevo */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {/* (1) Acciones Globales (... Más acciones) */}
          {globalActions && globalActions.length > 0 && (
            <div className="relative">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsGlobalActionsOpen(!isGlobalActionsOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                aria-expanded={isGlobalActionsOpen}
                aria-label="Más acciones globales"
              >
                <span>... Más acciones</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </Button>

              {isGlobalActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsGlobalActionsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {globalActions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={act.disabled}
                        onClick={() => {
                          setIsGlobalActionsOpen(false);
                          act.onClick();
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors disabled:opacity-40 ${
                          act.destructive
                            ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {act.icon && <span className="w-4 h-4 shrink-0">{act.icon}</span>}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* (2) Vista de presentación (Cards / Tabla) */}
          {allowViewToggle && (
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => handleToggleViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  effectiveViewMode === 'cards'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista en tarjetas"
                aria-label="Vista en tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  effectiveViewMode === 'table'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista en tabla"
                aria-label="Vista en tabla"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>
          )}

          {/* (3) Acción Principal (+ Nuevo) */}
          {(primaryAction || onCreate) && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction?.onClick ?? onCreate}
              disabled={primaryAction?.disabled}
              className="flex items-center gap-1.5 font-bold shadow-md shadow-primary-950/50"
            >
              {primaryAction?.icon ?? <Plus className="w-4 h-4" />}
              <span>{primaryAction?.label ?? createLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS RÁPIDOS */}
      {/* ======================================================== */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 shadow-sm backdrop-blur-sm space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Izquierda: (4) Búsqueda Global + (5) Filtros Rápidos */}
          <div className="flex flex-1 items-center gap-2.5 flex-wrap">
            {/* (4) Búsqueda global */}
            {search && (
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={search.placeholder || 'Buscar por OT, cliente, equipo, descripción...'}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all shadow-inner font-normal"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* (5) Filtros rápidos (Dropdowns compactos) */}
            {quickFilters &&
              quickFilters.map((qf) => (
                <div key={qf.key} className="relative">
                  <select
                    value={qf.value}
                    onChange={(e) => qf.onChange(e.target.value)}
                    aria-label={qf.label}
                    className="h-8 pl-3 pr-7 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-primary-500 cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="all">{qf.label}</option>
                    {qf.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                    ▾
                  </span>
                </div>
              ))}

            {/* Botón "Más filtros" para filtros avanzados */}
            {onAdvancedFiltersClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAdvancedFiltersClick}
                className="h-8 px-2.5 text-xs flex items-center gap-1.5 text-slate-300 border-slate-700/80"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Más filtros</span>
              </Button>
            )}
          </div>

          {/* Derecha: Indicador de filtros activos, Orden rápido, Limpiar, Refrescar */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            {/* Indicador de filtros activos */}
            {calculatedActiveFiltersCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-primary-400" />
                <span>Filtros activos ({calculatedActiveFiltersCount})</span>
              </div>
            )}

            {/* Botón de orden rápido (⇅) */}
            {onSort && (
              <button
                type="button"
                onClick={() => {
                  if (sortColumn) {
                    onSort(sortColumn, sortDirection === 'asc' ? 'desc' : 'asc');
                  }
                }}
                className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                title={`Cambiar dirección de orden (${sortDirection ?? 'defecto'})`}
                aria-label="Orden rápido"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            )}

            {/* Limpiar todos los filtros (🗑️) */}
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-950 text-slate-300 hover:text-red-400 hover:border-red-900/50 transition-colors"
                title="Limpiar todos los filtros"
                aria-label="Limpiar todos los filtros"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Botón Refrescar (🔄) */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`p-1.5 rounded-lg border border-slate-700/80 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-600 transition-colors ${
                  isRefreshing ? 'animate-spin text-primary-400' : ''
                }`}
                title="Refrescar datos"
                aria-label="Refrescar datos"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chips de filtros activos */}
        {calculatedActiveFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60 text-xs">
            {searchValue && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200">
                <span>Búsqueda: {searchValue}</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {quickFilters?.map(
              (qf) =>
                qf.value &&
                qf.value !== 'all' && (
                  <span
                    key={qf.key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-950/60 border border-primary-800/60 text-primary-300"
                  >
                    <span>
                      {qf.label}:{' '}
                      {qf.options.find((o) => o.value === qf.value)?.label ?? qf.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => qf.onChange('all')}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
            )}
          </div>
        )}

        {/* Contenido expandible de filtros avanzados */}
        {advancedFiltersContent}
      </div>

      {/* ======================================================== */}
      {/* (7) BARRA DE ACCIONES MASIVAS (Contextual cuando hay selección) */}
      {/* ======================================================== */}
      {selectable && selectedKeys.size > 0 && (
        <div className="bg-primary-950/80 border border-primary-700/60 rounded-xl p-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-primary-900/90 text-primary-200 font-bold text-xs flex items-center gap-1.5 border border-primary-600/40">
              <Check className="w-3.5 h-3.5" />
              <span>{selectedKeys.size} registros seleccionados</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bulkActions &&
              bulkActions.slice(0, 3).map((act, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={act.variant ?? 'secondary'}
                  disabled={act.disabled}
                  onClick={() => act.onClick(Array.from(selectedKeys), selectedItems)}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  {act.icon}
                  <span>{act.label}</span>
                </Button>
              ))}

            {/* Menú para más acciones masivas si hay más de 3 */}
            {bulkActions && bulkActions.length > 3 && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsBulkMoreOpen(!isBulkMoreOpen)}
                  className="h-7 text-xs flex items-center gap-1 text-slate-300"
                >
                  <span>+ Más acciones</span>
                  <span className="text-[10px]">▾</span>
                </Button>
                {isBulkMoreOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsBulkMoreOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                      {bulkActions.slice(3).map((act, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setIsBulkMoreOpen(false);
                            act.onClick(Array.from(selectedKeys), selectedItems);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                        >
                          {act.icon}
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESTADOS DE CARGA O VACÍO */}
      {/* ======================================================== */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-xl">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-sm font-medium text-slate-300">{loadingMessage}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">{emptyTitle}</h3>
            <p className="text-xs text-slate-400 max-w-sm">{emptyDescription}</p>
          </div>
          {emptyAction && (
            <Button size="sm" variant="primary" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      ) : effectiveViewMode === 'table' ? (
        /* ======================================================== */
        /* (6) VISTA TABLA: ENCABEZADO CON ORDEN Y COLUMNA ACCIONES */
        /* ======================================================== */
        <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl bg-slate-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {selectable && (
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedKeys.size === data.length && data.length > 0}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        aria-label="Seleccionar todos los registros de la página"
                      />
                    </th>
                  )}

                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`py-3 px-3.5 whitespace-nowrap ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {col.sortable && onSort ? (
                        <button
                          type="button"
                          onClick={() => handleSortClick(col.key)}
                          className="inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors uppercase font-bold group"
                        >
                          <span>{col.header}</span>
                          <span className="text-slate-500 group-hover:text-slate-300">
                            {sortColumn === col.key ? (
                              sortDirection === 'asc' ? (
                                '▲'
                              ) : (
                                '▼'
                              )
                            ) : (
                              '⇅'
                            )}
                          </span>
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </th>
                  ))}

                  {hasRowActions && (
                    <th className="py-3 px-3.5 text-right w-28 whitespace-nowrap">
                      ACCIONES
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.map((item, rowIdx) => {
                  const key = keyExtractor(item);
                  const isSelected = selectedKeys.has(key);
                  const isMenuOpen = openRowMenuKey === key;

                  return (
                    <tr
                      key={key}
                      className={`transition-colors hover:bg-slate-900/50 ${
                        isSelected ? 'bg-primary-950/20' : ''
                      }`}
                    >
                      {selectable && (
                        <td className="py-3 px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(key)}
                            className="rounded border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            aria-label={`Seleccionar fila ${rowIdx + 1}`}
                          />
                        </td>
                      )}

                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3 px-3.5 ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          {col.render
                            ? col.render(item, rowIdx)
                            : String((item as any)[col.key] ?? '')}
                        </td>
                      ))}

                      {/* Columna fija ACCIONES (Ver 👁️, Editar ✏️, Menú ⋮) */}
                      {hasRowActions && (
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 justify-end">
                            {onViewItem && (
                              <button
                                type="button"
                                title="Ver detalle"
                                onClick={() => onViewItem(item)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onEditItem && (
                              <button
                                type="button"
                                title="Editar registro"
                                onClick={() => onEditItem(item)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {rowActions && rowActions.length > 0 && (
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  title="Más opciones"
                                  onClick={() => setOpenRowMenuKey(isMenuOpen ? null : key)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setOpenRowMenuKey(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                                      {rowActions.map((opt, oIdx) => (
                                        <button
                                          key={oIdx}
                                          type="button"
                                          disabled={opt.disabled}
                                          onClick={() => {
                                            setOpenRowMenuKey(null);
                                            opt.onClick(item);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors disabled:opacity-40 ${
                                            opt.destructive
                                              ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                          }`}
                                        >
                                          {opt.icon && (
                                            <span className="w-3.5 h-3.5 shrink-0">
                                              {opt.icon}
                                            </span>
                                          )}
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* (2) VISTA CARDS (GRID RESPONSIVE DE TARJETAS) */
        /* ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, idx) => {
            const key = keyExtractor(item);
            const isSelected = selectedKeys.has(key);

            if (renderCard) {
              return (
                <React.Fragment key={key}>
                  {renderCard(item, isSelected, () => handleToggleSelectRow(key))}
                </React.Fragment>
              );
            }

            // Default card layout if no custom renderCard provided
            return (
              <div
                key={key}
                className={`bg-slate-900/80 border rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(key)}
                        className="rounded border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    )}
                    <span className="text-xs font-mono font-bold text-slate-200">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onViewItem && (
                      <button
                        type="button"
                        onClick={() => onViewItem(item)}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Ver detalle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onEditItem && (
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {columns.slice(0, 4).map((col) => (
                    <div key={col.key} className="flex justify-between items-center gap-2">
                      <span className="text-slate-400 font-medium">{col.header}:</span>
                      <span className="text-slate-200 text-right">
                        {col.render ? col.render(item, idx) : String((item as any)[col.key] ?? '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* (8 & 9) PAGINACIÓN COMPLETA EN UNA SOLA FILA EN DESKTOP */}
      {/* ======================================================== */}
      {pagination && totalItems > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400 shadow-sm">
          {/* Izquierda: Total de registros y Selector de filas por página */}
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
            <div>
              Mostrando{' '}
              <span className="font-bold text-slate-200">
                {(currentPg - 1) * pageSize + 1}
              </span>{' '}
              a{' '}
              <span className="font-bold text-slate-200">
                {Math.min(currentPg * pageSize, totalItems)}
              </span>{' '}
              de <span className="font-bold text-slate-200">{totalItems}</span> registros
            </div>

            {/* (9) Selector de filas por página */}
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                <span className="text-[11px] text-slate-400">Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700/80 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* (8) Botones de navegación: « ‹ 1 2 3 ... N › » */}
          <div className="flex items-center gap-1">
            {/* Primera página («) */}
            <button
              type="button"
              disabled={currentPg <= 1}
              onClick={() => pagination.onPageChange(1)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Primera página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Anterior (‹) */}
            <button
              type="button"
              disabled={currentPg <= 1}
              onClick={() => pagination.onPageChange(currentPg - 1)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Números de página */}
            {paginationRange.map((p, pIdx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${pIdx}`} className="px-2 text-slate-500 font-bold">
                    ...
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPg;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm font-bold'
                      : 'border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Siguiente (›) */}
            <button
              type="button"
              disabled={currentPg >= totalPages}
              onClick={() => pagination.onPageChange(currentPg + 1)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Última página (») */}
            <button
              type="button"
              disabled={currentPg >= totalPages}
              onClick={() => pagination.onPageChange(totalPages)}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
