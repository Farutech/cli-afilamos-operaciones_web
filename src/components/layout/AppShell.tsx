import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { ProfileModal } from '@/components/modals/ProfileModal';

export type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  count?: string;
  children?: string[];
};

export const navigationGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Resumen', icon: LayoutDashboard },
      { label: 'Solicitudes', icon: ClipboardList, count: '12' },
      { label: 'Órdenes de trabajo', icon: Wrench, count: '8' },
      { label: 'Entregas', icon: PackageCheck },
      { label: 'Pagos y crédito', icon: CreditCard },
      { label: 'Caja y turnos', icon: WalletCards },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        label: 'Clientes',
        icon: Users,
        children: ['Directorio', 'Segmentos', 'Crédito y límites', 'Historial de solicitudes'],
      },
      {
        label: 'Catálogos',
        icon: ShoppingBag,
        children: [
          'Servicios',
          'Productos y materiales',
          'Precios',
          'Unidades y categorías',
          'Impuestos y descuentos',
        ],
      },
      {
        label: 'Reportes',
        icon: FileBarChart,
        children: [
          'Operación',
          'Ventas y cobros',
          'Inventario',
          'Caja y turnos',
          'Clientes',
          'Auditoría',
        ],
      },
      {
        label: 'Auditoría',
        icon: ShieldCheck,
        children: ['Registro de actividad', 'Aprobaciones pendientes', 'Usuarios'],
      },
    ],
  },
];

export const allNavigationItems = navigationGroups.flatMap((group) => group.items);

export interface AppShellProps {
  userName: string;
  active: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

interface FloatingSubmenuState {
  label: string;
  children: string[];
  top: number;
}

export function AppShell({
  userName,
  active,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Clientes: true,
  });
  const [floatingMenu, setFloatingMenu] = useState<FloatingSubmenuState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (delay = 200) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setFloatingMenu(null);
    }, delay);
  };

  const openSubmenuFor = (item: NavItem, element: HTMLElement) => {
    clearCloseTimer();
    if (!item.children || item.children.length === 0) {
      setFloatingMenu(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    const menuHeight = item.children.length * 36 + 44;
    const maxTop = Math.max(12, window.innerHeight - menuHeight - 16);
    const top = Math.min(rect.top, maxTop);
    setFloatingMenu({
      label: item.label,
      children: item.children,
      top,
    });
  };

  // Close floating menu when sidebar expands/collapses
  useEffect(() => {
    clearCloseTimer();
    setFloatingMenu(null);
  }, [sidebarCollapsed]);

  // Click outside listener: removes floating menu immediately on outside pointerdown
  useEffect(() => {
    function handlePointerDownOutside(event: PointerEvent) {
      const target = event.target as Node;
      const isInsideFlyout = floatingRef.current?.contains(target);
      const isInsideNav = navRef.current?.contains(target);

      if (!isInsideFlyout && !isInsideNav) {
        clearCloseTimer();
        setFloatingMenu(null);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'JR';

  return (
    <main className="app-shell">
      {/* Sidebar Principal */}
      <aside
        className={`sidebar ${menuOpen ? 'mobile-open' : ''} ${
          sidebarCollapsed ? 'is-collapsed' : ''
        }`}
      >
        <div className="brand-lockup">
          <div className="brand-mark">O</div>
          <div className="brand-copy">
            <p className="brand-name">ordeon</p>
            <p className="brand-subtitle">operaciones</p>
          </div>
        </div>

        <nav ref={navRef} className="nav-section" aria-label="Navegación principal">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isDirectActive = active === item.label;
                const isChildActive = item.children?.includes(active);
                const isExpanded = !sidebarCollapsed && !!expandedGroups[item.label];
                const isFlyoutOpen = sidebarCollapsed && floatingMenu?.label === item.label;

                return (
                  <div className="nav-tree" key={item.label}>
                    <button
                      className={`nav-item ${
                        isDirectActive || isChildActive || isFlyoutOpen ? 'active' : ''
                      }`}
                      onMouseEnter={(e) => {
                        if (sidebarCollapsed) {
                          if (hasChildren) {
                            openSubmenuFor(item, e.currentTarget);
                          } else {
                            clearCloseTimer();
                            setFloatingMenu(null);
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (sidebarCollapsed && hasChildren) {
                          scheduleClose(220);
                        }
                      }}
                      onClick={(e) => {
                        if (hasChildren) {
                          // Solo el submenú carga páginas. El ítem padre solo expande o abre el flyout.
                          e.preventDefault();
                          if (sidebarCollapsed) {
                            openSubmenuFor(item, e.currentTarget);
                          } else {
                            setExpandedGroups((current) => ({
                              ...current,
                              [item.label]: !current[item.label],
                            }));
                          }
                        } else {
                          // No tiene submenú: navega directamente
                          clearCloseTimer();
                          setFloatingMenu(null);
                          onNavigate(item.label);
                          setMenuOpen(false);
                        }
                      }}
                      title={item.label}
                      aria-expanded={hasChildren ? (sidebarCollapsed ? isFlyoutOpen : isExpanded) : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.count && <b>{item.count}</b>}
                      {hasChildren && !sidebarCollapsed && (
                        <ChevronRight
                          className={`nav-expand ${isExpanded ? 'is-open' : ''}`}
                        />
                      )}
                    </button>

                    {/* Submenú en modo expandido (accordion clásico) */}
                    {hasChildren && !sidebarCollapsed && isExpanded && (
                      <div className="nav-children" role="menu">
                        {item.children!.map((child) => (
                          <button
                            className={`nav-child ${active === child ? 'font-bold text-white' : ''}`}
                            key={child}
                            role="menuitem"
                            onClick={() => {
                              onNavigate(child);
                              setMenuOpen(false);
                            }}
                          >
                            <span>{child}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Perfil de Usuario en el Footer del Sidebar */}
        <div className="sidebar-bottom">
          <div ref={profileRef} className="profile-menu-wrap">
            <button
              className="user-card"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label={`Abrir menú de ${userName}`}
              aria-expanded={profileOpen}
            >
              <div className="user-avatar">{initials}</div>
              <div className="user-copy">
                <strong>{userName || 'Usuario Ordeon'}</strong>
                <span>Administrador del sistema</span>
              </div>
              <ChevronRight
                className={`icon-small profile-chevron ${
                  profileOpen ? 'is-open' : ''
                }`}
              />
            </button>

            {profileOpen && (
              <div className="profile-menu" role="menu">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setProfileModalOpen(true);
                  }}
                  role="menuitem"
                >
                  <Users className="w-4 h-4 mr-2" /> Datos personales y PIN
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  role="menuitem"
                  style={{ color: '#f87171' }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
          <p className="sidebar-credit">
            Creado por <strong>Farutech</strong>
          </p>
        </div>
      </aside>

      {/* Submenú Flotante Único (Modo Colapsado con Hover-Intent y Hit-Bridge) */}
      {sidebarCollapsed && floatingMenu && (
        <div
          ref={floatingRef}
          className="sidebar-floating-flyout"
          style={{ top: `${floatingMenu.top}px` }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={() => scheduleClose(200)}
          role="menu"
          aria-label={`Submenú ${floatingMenu.label}`}
        >
          <div className="floating-flyout-header">
            <span>{floatingMenu.label}</span>
          </div>
          <div className="floating-flyout-items">
            {floatingMenu.children.map((child) => {
              const isChildActive = active === child;
              return (
                <button
                  key={child}
                  className={`floating-flyout-item ${isChildActive ? 'is-active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    clearCloseTimer();
                    setFloatingMenu(null);
                    onNavigate(child);
                    setMenuOpen(false);
                  }}
                >
                  <span>{child}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Área Principal de Contenido */}
      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="sidebar-toggle topbar-toggle"
              aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <span>Ordeon</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{active}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search className="w-4 h-4" />
              <input
                ref={searchInputRef}
                aria-label="Buscar"
                placeholder="Buscar en Ordeon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                className="icon-button"
                aria-label="Notificaciones"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" />
                <i />
              </button>

              {showNotifications && (
                <div
                  className="notification-popover"
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    width: '320px',
                    background: '#1a1b20',
                    border: '1px solid #302d3b',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 18px 48px rgba(0,0,0,0.6)',
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <strong style={{ fontSize: '12px' }}>Notificaciones</strong>
                    <span style={{ fontSize: '10px', color: '#8b5cf6' }}>
                      2 nuevas
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div
                      style={{
                        padding: '8px 10px',
                        background: '#14151a',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <strong style={{ color: '#eee', display: 'block' }}>
                        OT-2026-0147 lista
                      </strong>
                      <span style={{ color: '#888', fontSize: '10px' }}>
                        Restaurante La Casona lista para entrega
                      </span>
                    </div>
                    <div
                      style={{
                        padding: '8px 10px',
                        background: '#14151a',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <strong style={{ color: '#eee', display: 'block' }}>
                        Turno de caja abierto
                      </strong>
                      <span style={{ color: '#888', fontSize: '10px' }}>
                        Caja 01 inició operaciones a las 08:00
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              className="help-button"
              aria-label="Ayuda"
              onClick={() =>
                alert('Soporte Ordeon Operaciones — Desarrollado por Farutech.')
              }
            >
              ?
            </button>
          </div>
        </header>

        {children}
      </section>

      {profileModalOpen && (
        <ProfileModal
          name={userName}
          onClose={() => setProfileModalOpen(false)}
          onLogout={onLogout}
        />
      )}
    </main>
  );
}

export default AppShell;
