import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { DesignSystemProvider } from '@farutech/design-system';

import { apiBaseUrl } from '@/lib/api-client';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { OrdeonDashboard } from '@/features/dashboard/OrdeonDashboard';
import AdminClients from '@/components/admin-clients';
import AdminServices from '@/components/admin/AdminServices';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminPrices from '@/components/admin/AdminPrices';
import AdminUnitsCategories from '@/components/admin/AdminUnitsCategories';
import AdminTaxDiscount from '@/components/admin/AdminTaxDiscount';
import AdminSegments from '@/components/admin/AdminSegments';
import AdminCreditLimits from '@/components/admin/AdminCreditLimits';
import AdminAuditLogs from '@/components/admin/AdminAuditLogs';
import AdminApprovals from '@/components/admin/AdminApprovals';
import AdminUsers from '@/components/admin/AdminUsers';
import { SectionPage } from '@/components/pages/SectionPage';
import { RequestModal } from '@/components/modals/RequestModal';

import { catalogosApi } from '@/services/catalogosApi';
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente } from '@/types/catalogos';

// Operaciones módulos integrados
import { ColaTaller } from '@/features/taller/ColaTaller';
import { TableroKanbanTaller } from '@/features/taller/TableroKanbanTaller';
import { ModuloEntregas } from '@/features/entregas/ModuloEntregas';
import { ModuloCaja } from '@/features/caja/ModuloCaja';
import { ModuloReportes } from '@/features/reportes/ModuloReportes';
import { SolicitudCapturaMixta } from '@/features/solicitudes/SolicitudCapturaMixta';
import { HistorialSolicitudesView } from '@/features/solicitudes/HistorialSolicitudesView';
import { ModuloAdmin } from '@/features/admin/ModuloAdmin';

export interface UserSession {
  name: string;
  token?: string;
  canAccessCash?: boolean;
  role?: string;
  publicId?: string;
  codigo?: string;
}

export function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem('ordeon_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState<string>('Resumen');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  // Subvista para módulos compuestos (ej. Solicitudes: lista vs nueva)
  const [solicitudesSubView, setSolicitudesSubView] = useState<'lista' | 'nueva'>('lista');
  const [tallerSubView, setTallerSubView] = useState<'cola' | 'kanban'>('cola');

  // Catálogos para formularios operativos
  const [canales, setCanales] = useState<CanalOrigen[]>([]);
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoIdentidad[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    if (!session?.token) return;
    Promise.all([
      catalogosApi.getCanalesOrigen().catch(() => ({ canales: [] })),
      catalogosApi.getTiposDocumentoIdentidad().catch(() => ({ tipos: [] })),
      catalogosApi.getClientes().catch(() => ({ clientes: [], total: 0 })),
    ]).then(([cRes, tdRes, clRes]) => {
      setCanales(cRes.canales || []);
      setTiposDoc(tdRes.tipos || []);
      setClientes(clRes.clientes || []);
    });
  }, [session?.token]);

  // Guardar sesión en localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem('ordeon_session', JSON.stringify(session));
      if (session.token) {
        localStorage.setItem('ordeon_token', session.token);
      }
    } else {
      localStorage.removeItem('ordeon_session');
      localStorage.removeItem('ordeon_token');
    }
  }, [session]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get('identifier') || '').trim();
    const password = String(form.get('password') || '');

    const API_URL = apiBaseUrl();

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          identifier,
          username: identifier,
          email: identifier,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.title || 'Credenciales incorrectas o usuario no registrado.';
        throw new Error(msg);
      }

      const data = await response.json();
      const user = data.user || data.data || {};
      const newSession: UserSession = {
        name: user.fullName || user.nombreCompleto || user.name || identifier || 'Javier Ramírez',
        token: data.accessToken || data.token || 'demo-token',
        canAccessCash:
          user.canAccessCash === true ||
          user.role === 'cashier' ||
          user.rol === 'cajero' ||
          user.rol === 'admin' ||
          user.permissions?.includes?.('cash') ||
          true,
        role: user.role || user.rol || 'Administrador',
        publicId: user.publicId || user.id || 'usr-001',
        codigo: user.codigo || identifier,
      };

      setSession(newSession);
      toast.success('¡Bienvenido a Ordeon Operaciones!', {
        description: `Sesión iniciada como ${newSession.name}.`,
      });
    } catch (error) {
      // Fallback para modo offline / desarrollo
      if (identifier.toLowerCase() === 'admin' || identifier.includes('afilamos') || identifier.includes('@')) {
        const demoSession: UserSession = {
          name: identifier === 'admin' ? 'Javier Ramírez' : identifier.split('@')[0],
          token: 'demo-local-token',
          canAccessCash: true,
          role: 'Administrador del sistema',
          publicId: 'usr-admin-01',
          codigo: identifier,
        };
        setSession(demoSession);
        toast.info('Sesión iniciada en modo local', {
          description: 'Conectado al entorno local con permisos administrativos.',
        });
      } else {
        const message = error instanceof Error ? error.message : 'Error al conectar con la API de autenticación.';
        setLoginError(message);
        toast.error('No se pudo iniciar sesión', { description: message });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    toast.info('Sesión cerrada correctamente');
  }

  if (!session) {
    return (
      <DesignSystemProvider colorMode="dark">
        <Toaster position="top-right" closeButton richColors theme="dark" />
        <LoginScreen onSubmit={handleLogin} loading={loading} error={loginError} />
      </DesignSystemProvider>
    );
  }

  // Enrutamiento de contenido
  let content = <SectionPage title={activeSection} />;

  if (activeSection === 'Resumen') {
    content = (
      <OrdeonDashboard
        userName={session.name}
        token={session.token}
        onNew={() => setNewRequestOpen(true)}
        showCashSummary={session.canAccessCash === true}
        onNavigateSection={setActiveSection}
      />
    );
  } else if (activeSection === 'Clientes' || activeSection === 'Directorio') {
    content = <AdminClients token={session.token || ''} />;
  } else if (activeSection === 'Segmentos') {
    content = <AdminSegments token={session.token} />;
  } else if (activeSection === 'Crédito y límites') {
    content = <AdminCreditLimits token={session.token} />;
  } else if (activeSection === 'Historial de solicitudes') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN · CLIENTES</p>
            <h1>Historial de Solicitudes</h1>
            <p className="heading-copy">Consulta cronológica de pedidos y solicitudes emitidas por clientes.</p>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setActiveSection('Solicitudes');
              setSolicitudesSubView('nueva');
            }}
          >
            + Nueva Solicitud
          </button>
        </div>
        <HistorialSolicitudesView
          onNuevaSolicitud={() => {
            setActiveSection('Solicitudes');
            setSolicitudesSubView('nueva');
          }}
        />
      </div>
    );
  } else if (activeSection === 'Solicitudes') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERACIÓN · SOLICITUDES</p>
            <h1>Gestión de Solicitudes</h1>
            <p className="heading-copy">Captura y consulta solicitudes operativas de afilado y servicios.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={solicitudesSubView === 'lista' ? 'primary-button' : 'secondary-button'}
              onClick={() => setSolicitudesSubView('lista')}
            >
              Historial
            </button>
            <button
              className={solicitudesSubView === 'nueva' ? 'primary-button' : 'secondary-button'}
              onClick={() => setSolicitudesSubView('nueva')}
            >
              + Nueva Solicitud
            </button>
          </div>
        </div>

        {solicitudesSubView === 'lista' ? (
          <HistorialSolicitudesView onNuevaSolicitud={() => setSolicitudesSubView('nueva')} />
        ) : (
          <SolicitudCapturaMixta
            canales={canales}
            tiposDocumento={tiposDoc}
            clientes={clientes}
            onAsentarSolicitud={async () => setSolicitudesSubView('lista')}
          />
        )}
      </div>
    );
  } else if (activeSection === 'Órdenes de trabajo') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERACIÓN · TALLER</p>
            <h1>Órdenes de Trabajo</h1>
            <p className="heading-copy">Control de procesos, cola de afilado y tablero Kanban en tiempo real.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={tallerSubView === 'cola' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTallerSubView('cola')}
            >
              Cola de Trabajo
            </button>
            <button
              className={tallerSubView === 'kanban' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTallerSubView('kanban')}
            >
              Tablero Kanban
            </button>
          </div>
        </div>

        {tallerSubView === 'cola' ? (
          <ColaTaller
            token={session.token || ''}
            usuarioActual={{
              publicId: session.publicId || 'usr-001',
              codigo: session.codigo || 'admin',
              rol: session.role || 'Administrador',
            }}
          />
        ) : (
          <TableroKanbanTaller />
        )}
      </div>
    );
  } else if (activeSection === 'Entregas') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERACIÓN · ENTREGAS</p>
            <h1>Módulo de Entregas</h1>
            <p className="heading-copy">Despacho de pedidos, liquidación de saldos y remisiones de entrega.</p>
          </div>
        </div>
        <ModuloEntregas
          token={session.token || ''}
          usuarioActual={{
            publicId: session.publicId || 'usr-001',
            codigo: session.codigo || 'admin',
            rol: session.role || 'Administrador',
          }}
        />
      </div>
    );
  } else if (activeSection === 'Caja y turnos' || activeSection === 'Pagos y crédito') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERACIÓN · TESORERÍA</p>
            <h1>Caja y Turnos</h1>
            <p className="heading-copy">Apertura, cierre de turnos, arqueos y registro de movimientos de caja.</p>
          </div>
        </div>
        <ModuloCaja userRole={session.role} token={session.token} />
      </div>
    );
  } else if (activeSection === 'Catálogos' || activeSection === 'Servicios') {
    content = <AdminServices token={session.token} />;
  } else if (activeSection === 'Productos y materiales') {
    content = <AdminProducts token={session.token} />;
  } else if (activeSection === 'Precios') {
    content = <AdminPrices token={session.token} />;
  } else if (activeSection === 'Unidades y categorías') {
    content = <AdminUnitsCategories token={session.token} />;
  } else if (activeSection === 'Impuestos y descuentos') {
    content = <AdminTaxDiscount token={session.token} />;
  } else if (activeSection === 'Reportes' || activeSection.startsWith('Operación') || activeSection.startsWith('Ventas') || activeSection.startsWith('Inventario') || activeSection === 'Clientes') {
    content = (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN · REPORTES</p>
            <h1>Reportes y Estadísticas</h1>
            <p className="heading-copy">Métricas operativas, financieras y auditoría de movimientos.</p>
          </div>
        </div>
        <ModuloReportes token={session.token} />
      </div>
    );
  } else if (activeSection === 'Auditoría' || activeSection === 'Registro de actividad') {
    content = <AdminAuditLogs token={session.token} />;
  } else if (activeSection === 'Aprobaciones pendientes') {
    content = <AdminApprovals token={session.token} />;
    } else if (activeSection === 'Formas y medios de pago' || activeSection === 'Formas de pago') {
    content = (
      <div className="page-content">
        <ModuloAdmin
          token={session.token}
          initialMacroCat="tesoreria"
          initialSubCat="medios_pago"
          hideCategoryTabs={true}
        />
      </div>
    );
  } else if (activeSection === 'Subtipos de documento' || activeSection === 'Tipos y subtipos') {
    content = (
      <div className="page-content">
        <ModuloAdmin
          token={session.token}
          initialMacroCat="sistema"
          initialSubCat="tipos_subtipos"
          hideCategoryTabs={true}
        />
      </div>
    );
  } else if (activeSection === 'Parámetros del sistema' || activeSection === 'Parámetros globales') {
    content = (
      <div className="page-content">
        <ModuloAdmin
          token={session.token}
          initialMacroCat="sistema"
          initialSubCat="parametros"
          hideCategoryTabs={true}
        />
      </div>
    );
  } else if (activeSection === 'Usuarios') {
    content = <AdminUsers token={session.token} />;
  }

  return (
    <DesignSystemProvider colorMode="dark">
      <Toaster position="top-right" closeButton richColors theme="dark" />
      <AppShell
        userName={session.name}
        active={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
      >
        {content}
      </AppShell>

      {newRequestOpen && (
        <RequestModal
          onClose={() => setNewRequestOpen(false)}
          onSubmitSuccess={() => {
            setActiveSection('Solicitudes');
            setSolicitudesSubView('lista');
          }}
        />
      )}
    </DesignSystemProvider>
  );
}

export default App;