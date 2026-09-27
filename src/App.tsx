import { useState, useEffect } from 'react';
import { DesignSystemProvider } from '@farutech/design-system';
import { AppLayout, type ViewRoute } from './components/layout/AppLayout';
import { ColaTaller } from './features/taller/ColaTaller';
import { TableroKanbanTaller } from './features/taller/TableroKanbanTaller';
import { SolicitudCapturaMixta } from './features/solicitudes/SolicitudCapturaMixta';
import { HistorialSolicitudesView } from './features/solicitudes/HistorialSolicitudesView';
import { ModuloEntregas } from './features/entregas/ModuloEntregas';
import { ModuloCaja } from './features/caja/ModuloCaja';
import { FichaCliente } from './features/clientes/FichaCliente';
import { DashboardOperativo } from './features/dashboard/DashboardOperativo';
import { ModuloReportes } from './features/reportes/ModuloReportes';
import { ModuloAdmin } from './features/admin/ModuloAdmin';
import { LoginForm } from './features/auth/LoginForm';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { catalogosApi } from './services/catalogosApi';
import { cajaApi } from './services/cajaApi';
import { dashboardApi } from './services/dashboardApi';
import type { UsuarioSesion } from './types/auth';
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente, MedioPagoInstrumento } from './types/catalogos';

export function App() {
  const [sesion, setSesion] = useState<UsuarioSesion | null>(() => {
    try {
      const saved = localStorage.getItem('ordeon_sesion');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentRoute, setCurrentRoute] = useState<ViewRoute>('dashboard');

  // Lector de código de barras USB/HID (RF-11.2)
  useBarcodeScanner((code) => {
    if (code.startsWith('SOL-') || code.startsWith('OT-') || code.startsWith('REM-')) {
      setCurrentRoute('entregas_pendientes');
    }
  });

  // Catálogos para captura de solicitudes y entregas
  const [canales, setCanales] = useState<CanalOrigen[]>([]);
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoIdentidad[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [instrumentos, setInstrumentos] = useState<MedioPagoInstrumento[]>([]);
  const [turnoActivo, setTurnoActivo] = useState(false);
  const [otPendientesCount, setOtPendientesCount] = useState(0);

  useEffect(() => {
    if (!sesion) return;
    let isMounted = true;
    const fetchCatalogos = async () => {
      try {
        const [cRes, tdRes, clRes, inRes, turno, dash] = await Promise.all([
          catalogosApi.getCanalesOrigen().catch(() => ({ canales: [] })),
          catalogosApi.getTiposDocumentoIdentidad().catch(() => ({ tipos: [] })),
          catalogosApi.getClientes().catch(() => ({ clientes: [], total: 0 })),
          catalogosApi.getMediosPagoInstrumentos().catch(() => ({ instrumentos: [] })),
          cajaApi.obtenerTurnoActivo('CAJA-01', sesion.token).catch(() => null),
          dashboardApi.getMetricas(sesion.token).catch(() => null),
        ]);
        if (isMounted) {
          setCanales(cRes.canales);
          setTiposDoc(tdRes.tipos);
          setClientes(clRes.clientes);
          setInstrumentos(inRes.instrumentos);
          setTurnoActivo(Boolean(turno));
          setOtPendientesCount(dash?.itemsEnTallerCount ?? 0);
        }
      } catch {
        // Ignorar fallback
      }
    };
    fetchCatalogos();
    return () => {
      isMounted = false;
    };
  }, [sesion]);

  const handleLogout = () => {
    localStorage.removeItem('ordeon_token');
    localStorage.removeItem('ordeon_sesion');
    localStorage.removeItem('ordeon_permissions');
    setSesion(null);
  };

  if (!sesion) {
    return (
      <DesignSystemProvider colorMode="dark">
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
          }}
        >
          <LoginForm onLoginSuccess={(s: UsuarioSesion) => setSesion(s)} />
        </div>
      </DesignSystemProvider>
    );
  }

  return (
    <DesignSystemProvider colorMode="dark">
      <AppLayout
        sesion={sesion}
        activeRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        onLogout={handleLogout}
        turnoActivo={turnoActivo}
        otPendientesCount={otPendientesCount}
      >
        {/* Enrutamiento Dinámico Principal */}
        {currentRoute === 'dashboard' && (
          <DashboardOperativo
            token={sesion.token}
            onNavigateTab={(t) => {
              if (t === 'solicitudes') setCurrentRoute('solicitudes_nueva');
              else if (t === 'taller') setCurrentRoute('taller_cola');
              else if (t === 'caja') setCurrentRoute('caja_apertura');
              else if (t === 'entregas') setCurrentRoute('entregas_pendientes');
              else if (t === 'clientes') setCurrentRoute('clientes');
              else if (t === 'reportes') setCurrentRoute('reportes_operativos');
              else if (t === 'admin') setCurrentRoute('config_roles');
            }}
          />
        )}

        {currentRoute === 'solicitudes_nueva' && (
          <SolicitudCapturaMixta
            canales={canales}
            tiposDocumento={tiposDoc}
            clientes={clientes}
            onAsentarSolicitud={async () => setCurrentRoute('solicitudes_lista')}
          />
        )}

        {currentRoute === 'solicitudes_lista' && (
          <HistorialSolicitudesView
            onNuevaSolicitud={() => setCurrentRoute('solicitudes_nueva')}
          />
        )}

        {currentRoute === 'taller_cola' && (
          <ColaTaller
            token={sesion.token}
            usuarioActual={{ publicId: sesion.publicId, codigo: sesion.codigo, rol: sesion.rol }}
          />
        )}

        {currentRoute === 'taller_kanban' && <TableroKanbanTaller />}

        {(currentRoute === 'entregas_pendientes' || currentRoute === 'entregas_remisiones') && (
          <ModuloEntregas
            token={sesion.token}
            instrumentosPago={instrumentos}
            usuarioActual={{ publicId: sesion.publicId, codigo: sesion.codigo, rol: sesion.rol }}
          />
        )}

        {(currentRoute === 'caja_apertura' ||
          currentRoute === 'caja_movimientos' ||
          currentRoute === 'caja_arqueo') && (
          <ModuloCaja userRole={sesion.rol} token={sesion.token} />
        )}

        {currentRoute === 'clientes' && (
          <FichaCliente onIniciarSolicitud={() => setCurrentRoute('solicitudes_nueva')} />
        )}

        {(currentRoute === 'reportes_operativos' ||
          currentRoute === 'reportes_financieros' ||
          currentRoute === 'reportes_bitacora') && (
          <ModuloReportes token={sesion.token} />
        )}

        {/* ─── CONFIGURACIÓN (ADMINISTRACIÓN REORGANIZADA) ─────────────── */}
        {currentRoute === 'config_roles' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="seguridad"
            initialSubCat="roles"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_usuarios' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="seguridad"
            initialSubCat="usuarios"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_canales' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="clientes"
            initialSubCat="canales"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_documentos_identidad' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="clientes"
            initialSubCat="tipos_doc"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_items' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="productos"
            initialSubCat="items"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_unidades' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="productos"
            initialSubCat="unidades"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_workflows' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="productos"
            initialSubCat="workflows"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_cajas' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="tesoreria"
            initialSubCat="cajas"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_medios_pago' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="tesoreria"
            initialSubCat="medios_pago"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_cuentas' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="tesoreria"
            initialSubCat="recaudos"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_documentos' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="sistema"
            initialSubCat="tipos_subtipos"
            hideCategoryTabs={true}
          />
        )}

        {currentRoute === 'config_parametros' && (
          <ModuloAdmin
            token={sesion.token}
            initialMacroCat="sistema"
            initialSubCat="parametros"
            hideCategoryTabs={true}
          />
        )}
      </AppLayout>
    </DesignSystemProvider>
  );
}

export default App;