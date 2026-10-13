import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  Inbox,
  AlertCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '@farutech/design-system';
import type { TableDensity } from './ListPageLayout';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface RowActionMenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowActionsConfig {
  primary?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondary?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
  menu?: RowActionMenuOption[];
}

export interface StandardRowAction<T> {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'danger' | 'default' | 'primary' | 'secondary' | 'success' | 'ghost';
  disabled?: boolean;
}

export interface BulkActionConfig {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedKeys: string[]) => void;
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface StandardDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  density?: TableDensity;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  isSearching?: boolean;
  onClearSearch?: () => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (newSelected: Set<string>) => void;
  bulkActions?: BulkActionConfig[];
  rowActions?:
    | ((row: T) => RowActionsConfig | StandardRowAction<T>[])
    | StandardRowAction<T>[]
    | RowActionsConfig;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  pagination?: {
    currentPage?: number;
    page?: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
}

/**
 * StandardDataTable
 * Tabla de datos transversal canónica.
 * Resuelve la jerarquía visual de acciones en fila única, densidades compacta/estándar/cómoda,
 * selecciones masivas y estados de carga, vacío y error.
 */
export function StandardDataTable<T>({
  columns,
  data,
  keyExtractor,
  density = 'standard',
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No hay registros',
  emptyDescription = 'No se encontraron datos disponibles en este módulo.',
  emptyMessage,
  emptyAction,
  isSearching = false,
  onClearSearch,
  selectable = false,
  selectedKeys = new Set<string>(),
  onSelectionChange,
  bulkActions,
  rowActions,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
}: StandardDataTableProps<T>): React.ReactElement {
  const [openMenuRowKey, setOpenMenuRowKey] = useState<string | null>(null);

  const effectiveEmptyTitle = emptyMessage || emptyTitle;
  const currentPg = pagination ? (pagination.currentPage ?? pagination.page ?? 1) : 1;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize)) : 1;

  const resolveActionsConfig = (row: T): RowActionsConfig | null => {
    if (!rowActions) return null;
    if (typeof rowActions === 'function') {
      const res = (rowActions as any)(row);
      if (Array.isArray(res)) {
        return {
          primary: res[0],
          secondary: res[1],
          menu: res.slice(2),
        };
      }
      return res;
    }
    if (Array.isArray(rowActions)) {
      const list = rowActions as StandardRowAction<T>[];
      return {
        primary: list[0]
          ? {
              label: list[0].label,
              icon: list[0].icon,
              onClick: () => list[0].onClick(row),
              disabled: list[0].disabled,
            }
          : undefined,
        secondary: list[1]
          ? {
              label: list[1].label,
              icon: list[1].icon,
              onClick: () => list[1].onClick(row),
              disabled: list[1].disabled,
            }
          : undefined,
        menu: list.slice(2).map((a) => ({
          label: a.label,
          icon: a.icon,
          onClick: () => a.onClick(row),
          disabled: a.disabled,
          variant: a.variant,
        })),
      };
    }
    return rowActions as RowActionsConfig;
  };

  // Clases por densidad
  const densityCellClasses: Record<TableDensity, string> = {
    compact: 'py-2 px-3 text-xs',
    standard: 'py-3.5 px-4 text-sm',
    comfortable: 'py-5 px-4 text-sm',
  };

  const densityHeaderClasses: Record<TableDensity, string> = {
    compact: 'py-2 px-3 text-[11px]',
    standard: 'py-3 px-4 text-xs',
    comfortable: 'py-3.5 px-4 text-xs',
  };

  // Manejo de selección
  const allKeys = data.map(keyExtractor);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
  const someSelected = allKeys.some((k) => selectedKeys.has(k)) && !allSelected;

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set<string>());
    } else {
      onSelectionChange(new Set<string>(allKeys));
    }
  };

  const toggleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set<string>(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  return (
    <div className="w-full space-y-2">
      {/* Barra de Acciones Masivas (Aparece cuando hay selección) */}
      {selectable && selectedKeys.size > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="bg-primary-950/80 border border-primary-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-primary-200 font-medium">
            <Check className="w-4 h-4 text-primary-400" />
            <span>{selectedKeys.size} {selectedKeys.size === 1 ? 'registro seleccionado' : 'registros seleccionados'}</span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={action.variant === 'danger' ? 'danger' : action.variant === 'secondary' ? 'outline' : 'primary'}
                onClick={() => action.onClick(Array.from(selectedKeys))}
                className="text-xs h-7.5 px-3 flex items-center gap-1.5"
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}
            <button
              type="button"
              onClick={() => onSelectionChange?.(new Set<string>())}
              className="text-xs text-slate-400 hover:text-slate-200 underline ml-2 transition-colors"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Contenedor Principal de la Tabla */}
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl shadow-lg overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Cabecera */}
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 select-none">
              <tr>
                {selectable && (
                  <th className={`w-10 text-center ${densityHeaderClasses[density]}`}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';

                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`font-semibold text-slate-300 ${alignClass} ${densityHeaderClasses[density]} ${
                        col.sortable ? 'cursor-pointer hover:text-white transition-colors' : ''
                      }`}
                      onClick={() => col.sortable && onSort?.(col.key)}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-500 text-[10px]">
                            {isSorted ? (
                              sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-primary-400" /> : <ChevronDown className="w-3 h-3 text-primary-400" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {rowActions && (
                  <th className={`w-28 text-right font-semibold text-slate-300 ${densityHeaderClasses[density]}`}>
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            {/* Cuerpo de la Tabla */}
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {loading ? (
                // Estado de Carga: Skeletons
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse bg-slate-900/30">
                    {selectable && (
                      <td className={`text-center ${densityCellClasses[density]}`}>
                        <div className="w-3.5 h-3.5 bg-slate-800 rounded mx-auto" />
                      </td>
                    )}
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className={densityCellClasses[density]}>
                        <div className="h-4 bg-slate-800/70 rounded w-4/5" />
                      </td>
                    ))}
                    {rowActions && (
                      <td className={densityCellClasses[density]}>
                        <div className="h-6 bg-slate-800/70 rounded w-16 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : error ? (
                // Estado de Error
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                      <h3 className="text-sm font-semibold text-slate-200">Ocurrió un error al consultar los datos</h3>
                      <p className="text-xs text-slate-400">{error}</p>
                      {onRetry && (
                        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2 text-xs">
                          <RotateCcw className="w-3 h-3 mr-1" /> Reintentar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                // Estado Vacío / Sin Resultados
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <Inbox className="w-9 h-9 text-slate-500 mx-auto" />
                      <h3 className="text-sm font-semibold text-slate-200">
                        {isSearching ? 'Sin resultados para la búsqueda' : effectiveEmptyTitle}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isSearching ? 'Intenta modificar los términos o limpiar los filtros aplicados.' : emptyDescription}
                      </p>
                      {isSearching && onClearSearch ? (
                        <Button size="sm" variant="outline" onClick={onClearSearch} className="text-xs">
                          Limpiar filtros de búsqueda
                        </Button>
                      ) : (
                        emptyAction && (
                          <Button size="sm" variant="primary" onClick={emptyAction.onClick} className="text-xs">
                            {emptyAction.label}
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Filas de Datos
                data.map((row, rIdx) => {
                  const rowKey = keyExtractor(row);
                  const isSelected = selectedKeys.has(rowKey);
                  const actionsConfig = resolveActionsConfig(row);
                  const isMenuOpen = openMenuRowKey === rowKey;

                  return (
                    <tr
                      key={rowKey}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isSelected ? 'bg-primary-950/20' : rIdx % 2 === 1 ? 'bg-slate-950/20' : ''
                      }`}
                    >
                      {selectable && (
                        <td className={`text-center ${densityCellClasses[density]}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(rowKey)}
                            className="rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                      )}

                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';

                        return (
                          <td key={col.key} className={`${alignClass} ${densityCellClasses[density]}`}>
                            {col.render ? col.render(row, rIdx) : (row as any)[col.key]}
                          </td>
                        );
                      })}

                      {/* Acciones por Fila en Fila Única Consistente */}
                      {actionsConfig && (
                        <td className={`text-right ${densityCellClasses[density]}`}>
                          <div className="flex items-center justify-end gap-1 relative">
                            {/* Acción Primaria */}
                            {actionsConfig.primary && (
                              <button
                                type="button"
                                title={actionsConfig.primary.label}
                                aria-label={actionsConfig.primary.label}
                                onClick={actionsConfig.primary.onClick}
                                disabled={actionsConfig.primary.disabled || actionsConfig.primary.loading}
                                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors disabled:opacity-40"
                              >
                                {actionsConfig.primary.icon}
                              </button>
                            )}

                            {/* Acción Secundaria */}
                            {actionsConfig.secondary && (
                              <button
                                type="button"
                                title={actionsConfig.secondary.label}
                                aria-label={actionsConfig.secondary.label}
                                onClick={actionsConfig.secondary.onClick}
                                disabled={actionsConfig.secondary.disabled}
                                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors disabled:opacity-40"
                              >
                                {actionsConfig.secondary.icon}
                              </button>
                            )}

                            {/* Menú Contextual Desplegable */}
                            {actionsConfig.menu && actionsConfig.menu.length > 0 && (
                              <div className="relative">
                                <button
                                  type="button"
                                  title="Más opciones"
                                  aria-label="Más opciones"
                                  onClick={() => setOpenMenuRowKey(isMenuOpen ? null : rowKey)}
                                  className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setOpenMenuRowKey(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                                      {actionsConfig.menu.map((opt, oIdx) => (
                                        <button
                                          key={oIdx}
                                          type="button"
                                          disabled={opt.disabled}
                                          onClick={() => {
                                            setOpenMenuRowKey(null);
                                            opt.onClick();
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors disabled:opacity-40 ${
                                            opt.destructive
                                              ? 'text-red-400 hover:bg-red-950/30 hover:text-red-300'
                                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                          }`}
                                        >
                                          {opt.icon && <span className="w-3.5 h-3.5 shrink-0">{opt.icon}</span>}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Integrada */}
        {pagination && pagination.totalItems > 0 && (
          <div className="border-t border-slate-800/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div>
                Mostrando{' '}
                <span className="font-semibold text-slate-200">
                  {(currentPg - 1) * pagination.pageSize + 1}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-slate-200">
                  {Math.min(currentPg * pagination.pageSize, pagination.totalItems)}
                </span>{' '}
                de <span className="font-semibold text-slate-200">{pagination.totalItems}</span> registros
              </div>

              {pagination.onPageSizeChange && (
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                  <span className="text-[11px] text-slate-400">Filas:</span>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPg <= 1}
                onClick={() => pagination.onPageChange(currentPg - 1)}
                title="Página anterior"
                className="h-7 px-2.5 text-xs"
              >
                Anterior
              </Button>
              <span className="px-2 text-slate-300 font-medium">
                Pág. {currentPg} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPg >= totalPages}
                onClick={() => pagination.onPageChange(currentPg + 1)}
                title="Página siguiente"
                className="h-7 px-2.5 text-xs"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
