import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@farutech/design-system';
import type { UsuarioSesion } from '../../types/auth';

export type ViewRoute =
  | 'dashboard'
  | 'solicitudes_nueva'
  | 'solicitudes_lista'
  | 'taller_cola'
  | 'taller_kanban'
  | 'entregas_pendientes'
  | 'entregas_remisiones'
  | 'caja_apertura'
  | 'caja_movimientos'
  | 'caja_arqueo'
  | 'clientes'
  | 'reportes_operativos'
  | 'reportes_financieros'
  | 'reportes_bitacora'
  | 'config_roles'
  | 'config_usuarios'
  | 'config_canales'
  | 'config_documentos_identidad'
  | 'config_items'
  | 'config_unidades'
  | 'config_workflows'
  | 'config_cajas'
  | 'config_medios_pago'
  | 'config_cuentas'
  | 'config_documentos'
  | 'config_parametros';

export interface NavSubItem {
  id: ViewRoute;
  label: string;
  icon: string;
  badge?: string | number;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  moduloPermiso?: string;
}

export interface NavSection {
  id: string;
  title: string;
  icon?: string;
  items: {
    id?: ViewRoute;
    label: string;
    icon: string;
    moduloPermiso?: string;
    children?: NavSubItem[];
  }[];
}

export const NAVIGATION_STRUCTURE: NavSection[] = [
  {
    id: 'operacion',
    title: 'OPERACIÓN',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '📊',
        moduloPermiso: 'dashboard',
      },
      {
        label: 'Mostrador',
        icon: '📝',
        moduloPermiso: 'solicitudes',
        children: [
          { id: 'solicitudes_nueva', label: 'Nueva Solicitud (POS)', icon: '⚡' },
          { id: 'solicitudes_lista', label: 'Historial de Solicitudes', icon: '📋' },
        ],
      },
      {
        label: 'Taller',
        icon: '🛠️',
        moduloPermiso: 'taller',
        children: [
          { id: 'taller_cola', label: 'Cola de Taller (OT)', icon: '⏳' },
          { id: 'taller_kanban', label: 'Tablero / Etapas', icon: '📌' },
        ],
      },
      {
        label: 'Entregas & Despacho',
        icon: '📦',
        moduloPermiso: 'entregas',
        children: [
          { id: 'entregas_pendientes', label: 'Pendientes de Entrega', icon: '📫' },
          { id: 'entregas_remisiones', label: 'Remisiones Emitidas', icon: '🚚' },
        ],
      },
    ],
  },
  {
    id: 'tesoreria',
    title: 'TESORERÍA',
    items: [
      {
        label: 'Caja & Turnos',
        icon: '💰',
        moduloPermiso: 'caja',
        children: [
          { id: 'caja_apertura', label: 'Apertura / Cierre', icon: '🔐' },
          { id: 'caja_movimientos', label: 'Movimientos & Egresos', icon: '💸' },
          { id: 'caja_arqueo', label: 'Arqueo Ciego', icon: '⚖️' },
        ],
      },
    ],
  },
  {
    id: 'clientes_sec',
    title: 'CLIENTES',
    items: [
      {
        id: 'clientes',
        label: 'Directorio de Clientes',
        icon: '👥',
        moduloPermiso: 'clientes',
      },
    ],
  },
  {
    id: 'reportes_sec',
    title: 'REPORTES',
    items: [
      {
        label: 'Centro de Reportes',
        icon: '📈',
        moduloPermiso: 'reportes',
        children: [
          { id: 'reportes_operativos', label: 'Reportes Operativos', icon: '📊' },
          { id: 'reportes_financieros', label: 'Financieros (Cierre Z)', icon: '💵' },
          { id: 'reportes_bitacora', label: 'Bitácora de Auditoría', icon: '📜' },
        ],
      },
    ],
  },
  {
    id: 'configuracion',
    title: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Seguridad & Personal',
        icon: '🛡️',
        moduloPermiso: 'admin',
        children: [
          { id: 'config_roles', label: 'Roles & Permisos', icon: '🔑' },
          { id: 'config_usuarios', label: 'Usuarios & Cajeros', icon: '👤' },
        ],
      },
      {
        label: 'Clientes & Canales',
        icon: '🏷️',
        moduloPermiso: 'admin',
        children: [
          { id: 'config_canales', label: 'Canales de Venta', icon: '🌐' },
          { id: 'config_documentos_identidad', label: 'Tipos Doc. Identidad', icon: '🪪' },
        ],
      },
      {
        label: 'Productos & Servicios',
        icon: '📦',
        moduloPermiso: 'admin',
        children: [
          { id: 'config_items', label: 'Catálogo de Ítems', icon: '🏷️' },
          { id: 'config_unidades', label: 'Unidades de Medida', icon: '⚖️' },
          { id: 'config_workflows', label: 'Workflows de Taller', icon: '🔄' },
        ],
      },
      {
        label: 'Caja & Bancos',
        icon: '🏦',
        moduloPermiso: 'admin',
        children: [
          { id: 'config_cajas', label: 'Cajas Físicas', icon: '🏧' },
          { id: 'config_medios_pago', label: 'Medios de Pago', icon: '💳' },
          { id: 'config_cuentas', label: 'Cuentas Bancarias', icon: '🏛️' },
        ],
      },
      {
        label: 'Documentos & Sistema',
        icon: '📄',
        moduloPermiso: 'admin',
        children: [
          { id: 'config_documentos', label: 'Tipos & Subtipos Doc.', icon: '📑' },
          { id: 'config_parametros', label: 'Parámetros Globales', icon: '⚙️' },
        ],
      },
    ],
  },
];

interface AppLayoutProps {
  sesion: UsuarioSesion;
  activeRoute: ViewRoute;
  onRouteChange: (route: ViewRoute) => void;
  onLogout: () => void;
  children: React.ReactNode;
  turnoActivo?: boolean;
  otPendientesCount?: number;
}

export function AppLayout({
  sesion,
  activeRoute,
  onRouteChange,
  onLogout,
  children,
  turnoActivo = true,
  otPendientesCount = 3,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(() => {
    // Grupo inicial basado en la ruta activa
    for (const section of NAVIGATION_STRUCTURE) {
      for (const item of section.items) {
        if (item.children && item.children.some((c) => c.id === activeRoute)) {
          return item.label;
        }
      }
    }
    return null;
  });

  const [rolePermissions, setRolePermissions] = useState<Record<string, any> | null>(() => {
    try {
      const saved = localStorage.getItem('ordeon_role_permissions');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('ordeon_role_permissions');
        setRolePermissions(saved ? JSON.parse(saved) : null);
      } catch {
        // fallback
      }
    };
    window.addEventListener('ordeon_permissions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ordeon_permissions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const esAdmin = sesion.rol.toLowerCase().includes('admin');

  // Filtrado de navegación por permisos de rol
  const filteredNav = useMemo(() => {
    return NAVIGATION_STRUCTURE.map((section) => {
      const filteredItems = section.items
        .map((item) => {
          // Permiso del módulo padre
          if (item.moduloPermiso) {
            if (rolePermissions && rolePermissions[sesion.rol]) {
              const perms = rolePermissions[sesion.rol].modulos?.[item.moduloPermiso];
              if (perms !== undefined && !perms.navegar) {
                return null;
              }
            } else if (item.moduloPermiso === 'admin' && !esAdmin) {
              return null;
            }
          }

          // Si tiene hijos, filtrar hijos
          if (item.children) {
            return {
              ...item,
              children: item.children,
            };
          }

          return item;
        })
        .filter(Boolean) as NavSection['items'];

      return {
        ...section,
        items: filteredItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [sesion.rol, esAdmin, rolePermissions]);

  const toggleGroup = (groupLabel: string) => {
    // Si ya está abierto, se colapsa (null); si no, se abre SOLO este y se cierran todos los demás
    setActiveGroup((prev) => (prev === groupLabel ? null : groupLabel));
  };

  // Encontrar el breadcrumb de la ruta activa
  const breadcrumb = useMemo(() => {
    for (const section of NAVIGATION_STRUCTURE) {
      for (const item of section.items) {
        if (item.id === activeRoute) {
          return [section.title, item.label];
        }
        if (item.children) {
          const child = item.children.find((c) => c.id === activeRoute);
          if (child) {
            return [section.title, item.label, child.label];
          }
        }
      }
    }
    return ['Ordeon', 'Inicio'];
  }, [activeRoute]);

  // Al cambiar la ruta, abrir exclusivamente el grupo al que pertenece la nueva ruta
  useEffect(() => {
    for (const section of NAVIGATION_STRUCTURE) {
      for (const item of section.items) {
        if (item.children && item.children.some((c) => c.id === activeRoute)) {
          setActiveGroup(item.label);
          return;
        }
      }
    }
  }, [activeRoute]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* ─── SIDEBAR IZQUIERDO MULTINIVEL (ACORDEÓN) ───────────────── */}
      <aside
        className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 select-none z-30 shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Cabecera Sidebar / Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-600/30">
                O
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-white text-base leading-none tracking-tight">
                  Ordeon POS
                </h1>
                <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  Afilamos Operaciones
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-600/30">
              O
            </div>
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {sidebarCollapsed ? '➔' : '◀'}
          </button>
        </div>

        {/* Navegación Acordeón con Scroll */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {filteredNav.map((section) => (
            <div key={section.id} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {section.title}
                </div>
              )}

              {section.items.map((item, idx) => {
                // Caso 1: Ítem plano sin hijos
                if (item.id && !item.children) {
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onRouteChange(item.id!)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                }

                // Caso 2: Grupo con acordeón de hijos (solo uno abierto a la vez)
                const isGroupOpen = activeGroup === item.label;
                const isChildActive = Boolean(item.children?.some((c) => c.id === activeRoute));

                return (
                  <div key={item.label + idx} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isChildActive
                          ? 'text-indigo-400 bg-indigo-950/30 font-bold border border-indigo-500/20'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="text-base shrink-0">{item.icon}</span>
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!sidebarCollapsed && (
                        <span className="text-[10px] text-slate-500 transition-transform duration-200">
                          {isGroupOpen ? '▼' : '▶'}
                        </span>
                      )}
                    </button>

                    {/* Lista de Sub-ítems */}
                    {isGroupOpen && !sidebarCollapsed && item.children && (
                      <div className="pl-6 space-y-1 border-l-2 border-slate-800 ml-4 py-1">
                        {item.children.map((child) => {
                          const isSubActive = activeRoute === child.id;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => onRouteChange(child.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30'
                                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-xs">{child.icon}</span>
                                <span className="truncate">{child.label}</span>
                              </div>

                              {child.id === 'taller_cola' && otPendientesCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                                  {otPendientesCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Sidebar / Perfil de Usuario */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                  {sesion.nombreCompleto
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">
                    {sesion.nombreCompleto}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant={esAdmin ? 'danger' : 'info'}>{sesion.rol}</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Sesión iniciada</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex justify-center py-2 text-slate-400 hover:text-rose-400 transition-colors"
              title="Cerrar sesión"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* ─── CONTENEDOR PRINCIPAL DERECHO ─────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
        {/* Header Superior Global */}
        <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          {/* Breadcrumbs y Título */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Ordeon</span>
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb + idx}>
                <span className="text-slate-600">/</span>
                <span
                  className={
                    idx === breadcrumb.length - 1
                      ? 'font-bold text-white text-sm'
                      : 'text-slate-400 font-medium'
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Acciones Rápidas del Header */}
          <div className="flex items-center gap-3">
            {/* Estado de Turno de Caja */}
            <div
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                turnoActivo
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${turnoActivo ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{turnoActivo ? 'Turno Abierto: CAJA-01' : 'Sin Turno Abierto'}</span>
            </div>

            {/* Botón Permanente de Nueva Solicitud (POS) */}
            <button
              type="button"
              onClick={() => onRouteChange('solicitudes_nueva')}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>+ Nueva Solicitud</span>
            </button>
          </div>
        </header>

        {/* Área de Contenido Principal (con Scroll Central) */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
