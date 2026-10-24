/**
 * AdminCatalogLayout
 * ------------------------------------------------------------------
 * Layout estandarizado para las secciones del módulo de Administración,
 * Configuración y Catálogos del proyecto cli-afilamos-operaciones-web.
 *
 * Encapsula el patrón visual de referencia (`AdminSegments`,
 * `AdminCreditLimits`, `AdminPrices`) que ya está alineado con el
 * `@farutech/design-system`:
 *   - Eyebrow + Título + Descripción + Icono a la izquierda
 *   - Acciones globales (botones primarios) a la derecha
 *   - Panel blanco/translucido para el contenido
 *
 * Este componente NO duplica lógica de paginación/búsqueda — el
 * contenido lo provee el consumidor.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminCatalogLayoutProps {
  /** Etiqueta pequeña sobre el título (ej: "ADMINISTRACIÓN · CLIENTES"). */
  eyebrow?: string;
  /** Título principal de la sección. */
  title: string;
  /** Descripción breve que aparece bajo el título. */
  description?: string;
  /** Icono Lucide/Heroicons que se muestra junto al título. */
  icon?: ReactNode;
  /** Acciones globales (botones a la derecha del header). */
  headerActions?: ReactNode;
  /** Contenido principal (panel con tabla, formularios, etc.). */
  children: ReactNode;
  /** ClassName adicional para el contenedor raíz. */
  className?: string;
  /** Variante de tema. `dark` por defecto para alinearse con el admin. */
  variant?: 'dark' | 'default';
}

/**
 * Encabezado + contenedor de acciones y panel de contenido.
 */
export function AdminCatalogLayout({
  eyebrow,
  title,
  description,
  icon,
  headerActions,
  children,
  className,
  variant = 'dark',
}: AdminCatalogLayoutProps) {
  const isDark = variant === 'dark';

  return (
    <section
      aria-labelledby={`acl-${title.replace(/\s+/g, '-').toLowerCase()}`}
      className={cn('flex flex-col gap-4', className)}
    >
      <header
        className={cn(
          'flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                isDark
                  ? 'bg-violet-500/10 text-violet-300 ring-violet-500/20'
                  : 'bg-violet-50 text-violet-600 ring-violet-200'
              )}
              aria-hidden
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.18em] mb-1',
                  isDark ? 'text-violet-300/80' : 'text-violet-600/80'
                )}
              >
                {eyebrow}
              </p>
            )}
            <h2
              id={`acl-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn(
                'text-xl md:text-2xl font-bold truncate',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  'mt-1 text-sm max-w-2xl',
                  isDark ? 'text-slate-400' : 'text-gray-500'
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{headerActions}</div>
        )}
      </header>

      <div
        className={cn(
          'rounded-xl border overflow-hidden',
          isDark
            ? 'bg-[#15161d] border-white/10'
            : 'bg-white border-gray-200 shadow-sm'
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Encabezado de tabla compartido (fila superior de columnas). El
 * consumidor define sus columnas. Mantener consistente el espaciado
 * con el patrón de clientes.
 */
export function AdminTableHeader({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 border-b border-white/10 bg-[#1c1d26]"
      role="row"
    >
      {children}
    </div>
  );
}

/**
 * Fila de tabla con hover consistente. Se usa junto con `AdminTableHeader`
 * para mantener el mismo look en todas las secciones.
 */
export function AdminTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role="row"
      onClick={onClick}
      className={cn(
        'grid items-center gap-3 px-4 py-3 text-sm border-b border-white/5 transition-colors',
        onClick && 'cursor-pointer hover:bg-white/[0.03]',
        !onClick && 'hover:bg-white/[0.02]',
        className
      )}
    >
      {children}
    </div>
  );
}