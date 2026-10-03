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
        children: ['Registro de actividad', 'Aprobaciones pendientes'],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function closeFloatingMenus(event: PointerEvent) {
      const target = event.target as Node;
      if (!navRef.current?.contains(target)) {
        if (sidebarCollapsed) setExpandedGroups({});
      }
      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeFloatingMenus);
    return () => document.removeEventListener('pointerdown', closeFloatingMenus);
  }, [sidebarCollapsed]);

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
                const isDirectActive = active === item.label;
                const isChildActive = item.children?.includes(active);
                const isExpanded = !!expandedGroups[item.label];

                return (
                  <div className="nav-tree" key={item.label}>
                    <button
                      className={`nav-item ${
                        isDirectActive || isChildActive ? 'active' : ''
                      }`}
                      onClick={() => {
                        onNavigate(item.label);
                        if (item.children) {
                          setExpandedGroups((current) => ({
                            ...current,
                            [item.label]: !current[item.label],
                          }));
                        } else {
                          setExpandedGroups({});
                          setMenuOpen(false);
                        }
                      }}
                      title={item.label}
                      aria-expanded={item.children ? isExpanded : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.count && <b>{item.count}</b>}
                      {item.children && (
                        <ChevronRight
                          className={`nav-expand ${isExpanded ? 'is-open' : ''}`}
                        />
                      )}
                    </button>

                    {item.children && isExpanded && (
                      <div
                        className={`nav-children ${
                          sidebarCollapsed ? 'nav-children-floating' : ''
                        }`}
                        role="menu"
                      >
                        {item.children.map((child) => (
                          <button
                            className={`nav-child ${active === child ? 'font-bold text-white' : ''}`}
                            key={child}
                            role="menuitem"
                            onClick={() => {
                              onNavigate(child);
                              if (sidebarCollapsed) setExpandedGroups({});
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
