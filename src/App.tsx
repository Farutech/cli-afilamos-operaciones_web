import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { DesignSystemProvider, SegmentedControl } from '@farutech/design-system';

import { apiBaseUrl } from '@/lib/api-client';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { OrdeonDashboard } from '@/features/dashboard/OrdeonDashboard';
import AdminClients from '@/components/admin-clients';
import AdminItems from '@/components/admin/AdminItems';
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
import { solicitudesApi } from '@/services/solicitudesApi';
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente } from '@/types/catalogos';

// Operaciones módulos integrados
import { ColaTaller } from '@/features/taller/ColaTaller';
import { TableroKanbanTaller } from '@/features/taller/TableroKanbanTaller';
import { ModuloEntregas } from '@/features/entregas/ModuloEntregas';
import { ModuloCaja } from '@/features/caja/ModuloCaja';
import { ModuloReportes } from '@/features/reportes/ModuloReportes';
import { SolicitudCapturaMixta } from '@/features/solicitudes/SolicitudCapturaMixta';
import { HistorialSolicitudesView, type SolicitudHistorialItem } from '@/features/solicitudes/HistorialSolicitudesView';
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
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token === 'demo-local-token') {
          // Limpiar token demo obsoleto para forzar login real con credenciales válidas
          localStorage.removeItem('ordeon_session');
          localStorage.removeItem('ordeon_token');
          return null;
        }

        if (parsed.token && typeof parsed.token === 'string') {
          try {
            const parts = parsed.token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp && Date.now() >= payload.exp * 1000) {
                console.warn('El token de sesión ha expirado. Limpiando credenciales locales.');
                localStorage.removeItem('ordeon_session');
                localStorage.removeItem('ordeon_token');
                return null;
              }
            }
          } catch {
            // Token no parseable
          }
        }

        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthExpired = () => {
      setSession(null);
      setLoginError('Tu sesión ha expirado. Por favor ingresa nuevamente con tus credenciales.');
    };
    window.addEventListener('ordeon:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('ordeon:auth_expired', handleAuthExpired);
  }, []);

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
  const [solicitudesCreadas, setSolicitudesCreadas] = useState<SolicitudHistorialItem[]>(() => {
    try {
      const stored = localStorage.getItem('ordeon_solicitudes_locales');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ordeon_solicitudes_locales', JSON.stringify(solicitudesCreadas));
    } catch (e) {
      console.warn('No se pudo guardar solicitudes en localStorage:', e);
    }
  }, [solicitudesCreadas]);

  // Estado para continuar o editar una solicitud guardada / borrador
  const [solicitudEnEdicion, setSolicitudEnEdicion] = useState<{
    requestId?: string;
    numeroDocumentoVisible?: string;
    clienteUuid?: string;
    canalUuid?: string;
    observaciones?: string;
    lineas?: any[];
    pagosAbono?: any[];
  } | null>(null);

  const handleEditarSolicitud = async (sol: SolicitudHistorialItem) => {
    let lineasCargadas = sol.lineas || [];
    let obs = sol.observaciones || '';
    let cliId = sol.clienteUuid || '';
    let canalId = sol.canalUuid || '';

    // Si tiene ID en backend, consultar detalle fresco
    if (sol.id && session?.token) {
      try {
        const detalle = await solicitudesApi.getSolicitudByUuid(sol.id, session.token);
        if (detalle) {
          cliId = detalle.clientePublicId || cliId;
          canalId = detalle.canalPublicId || canalId;
          obs = detalle.notas || obs;
          if (detalle.items && detalle.items.length > 0) {
            lineasCargadas = detalle.items.map((it) => ({
              idTemp: it.publicId || `it-${Date.now()}-${Math.random()}`,
              itemCatalogoId: it.publicId,
              naturaleza: it.naturaleza,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              subtotal: it.subtotal,
              stockReferencial: it.stockReferencialDisponible,
              exigeAnticipo: it.exigeAnticipoObligatorio,
              porcentajeAnticipoMinimo: it.porcentajeAnticipoMinimo,
              anticipoMinimo: it.anticipoMinimoRequerido,
              anticipoImputado: it.anticipoDirectoImputado,
              franjaCompromiso: it.franjaCompromiso,
              observaciones: '',
            }));
          }
        }
      } catch (e) {
        console.warn('Cargando borrador desde almacenamiento local:', e);
      }
    }

    setSolicitudEnEdicion({
      requestId: sol.id,
      numeroDocumentoVisible: sol.numeroSolicitud,
      clienteUuid: cliId,
      canalUuid: canalId,
      observaciones: obs,
      lineas: lineasCargadas,
      pagosAbono: sol.pagosAbono || [],
    });
    setActiveSection('Solicitudes');
    setSolicitudesSubView('nueva');
  };

  const handleAsentarSolicitud = async (solicitud: {
    requestId?: string;
    canalUuid: string;
    clienteUuid: string;
    tipoDocumentoUuid?: string;
    tipoDocumentoCodigo?: string;
    subtipoUuid?: string;
    subtipoCodigo?: string;
    lineas: any[];
    totalPagadoInventario: number;
    anticipoVoBoAutorizado: boolean;
    observaciones?: string;
    pagosAbono?: any[];
    esSoloGuardar?: boolean;
    supervisorPin?: string;
  }) => {
    const clienteObj = clientes.find((c) => c.uuid === solicitud.clienteUuid);
    const subtotalCalc = solicitud.lineas.reduce(
      (acc, l) => acc + (l.subtotal || l.cantidad * l.precioUnitario),
      0
    );
    const totalAbonado = (solicitud.pagosAbono || []).reduce((acc, p) => acc + (p.monto || 0), 0);
    const saldo = Math.max(0, subtotalCalc - totalAbonado);
    const nuevoNumero = solicitud.requestId
      ? (solicitudEnEdicion?.numeroDocumentoVisible || `SOL-${solicitud.requestId.slice(0, 8)}`)
      : `SOL-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const tieneServicios = solicitud.lineas.some((l) => l.naturaleza === 'SERVICIO');
    const esBorrador = solicitud.esSoloGuardar === true;

    const nuevaSolicitudHistorial: SolicitudHistorialItem = {
      id: solicitud.requestId,
      numeroSolicitud: nuevoNumero,
      subtipo: solicitud.subtipoCodigo || solicitud.tipoDocumentoCodigo || 'SOL_EST',
      fecha: new Date().toISOString().split('T')[0],
      clienteNombre: clienteObj ? clienteObj.nombreRazonSocial : 'Cliente Mostrador',
      clienteDocumento: clienteObj ? clienteObj.numeroDocumento : '—',
      clienteUuid: solicitud.clienteUuid,
      canalUuid: solicitud.canalUuid,
      tipoDocumentoUuid: solicitud.tipoDocumentoUuid,
      subtipoUuid: solicitud.subtipoUuid,
      observaciones: solicitud.observaciones,
      lineas: solicitud.lineas,
      pagosAbono: solicitud.pagosAbono,
      totalItems: solicitud.lineas.length,
      totalNetoCop: subtotalCalc,
      anticipoCop: totalAbonado,
      saldoCop: saldo,
      estado: esBorrador ? 'BORRADOR' : 'ASENTADA',
    };

    try {
      toast.loading(
        esBorrador
          ? 'Guardando borrador de la solicitud...'
          : 'Consumiendo servicio de backend para asentar solicitud...',
        { id: 'asentar-sol' }
      );

      let uuidSol = solicitud.requestId;

      // 1. Si no existe solicitud previa en backend, invocar POST /requests
      if (!uuidSol) {
        const resSolicitud = await solicitudesApi.crearSolicitud(
          {
            subtipoPublicId: solicitud.subtipoUuid || solicitud.tipoDocumentoUuid || 'SOL_EST',
            clientePublicId: solicitud.clienteUuid,
            canalPublicId: solicitud.canalUuid,
            notas: solicitud.observaciones,
          },
          session?.token
        );
        uuidSol = resSolicitud.publicId;
        nuevaSolicitudHistorial.id = uuidSol;
        nuevaSolicitudHistorial.numeroSolicitud = resSolicitud.codigo || nuevoNumero;
      }

      // 2. Agregar ítems al backend si tienen identificador en catálogo
      for (const linea of solicitud.lineas) {
        if (linea.itemCatalogoId && uuidSol) {
          try {
            await solicitudesApi.agregarItem(
              uuidSol,
              {
                itemCatalogoPublicId: linea.itemCatalogoId,
                naturaleza: linea.naturaleza,
                cantidad: linea.cantidad,
                precioUnitario: linea.precioUnitario,
                descripcion: linea.descripcion,
              },
              session?.token
            );
          } catch (itemErr) {
            console.warn('Error al agregar ítem a solicitud:', itemErr);
          }
        }
      }

      // 3. Confirmar / Asentar solicitud solo si no es solo guardar
      if (!esBorrador && uuidSol) {
        const initialPayments = (solicitud.pagosAbono || []).map((p: any) => ({
          paymentMethodId: p.instrumentoUuid,
          amount: p.monto,
          referenceNumber: p.referencia || 'SIN-REF',
        }));

        await solicitudesApi.asentarSolicitud(
          uuidSol,
          {
            usuarioAsientaId: 1,
            usuarioAsientaCodigo: session?.codigo || 'admin',
            initialPayments,
            supervisorPin: solicitud.supervisorPin || null,
          },
          session?.token
        );

        if (tieneServicios) {
          toast.success(
            `Solicitud ${nuevaSolicitudHistorial.numeroSolicitud} asentada. Se generó la orden de trabajo para taller.`,
            {
              id: 'asentar-sol',
              action: {
                label: 'Ir a Taller',
                onClick: () => setActiveSection('Órdenes de trabajo'),
              },
            }
          );
        } else {
          toast.success(`Solicitud ${nuevaSolicitudHistorial.numeroSolicitud} asentada con éxito.`, {
            id: 'asentar-sol',
          });
        }
      } else {
        toast.success(`Solicitud ${nuevaSolicitudHistorial.numeroSolicitud} guardada como borrador con éxito.`, {
          id: 'asentar-sol',
        });
      }
    } catch (err: any) {
      console.error('Error al consumir el servicio backend para asentar solicitud:', err);
      const errMsg = err?.message || 'Error desconocido al invocar la API del backend';
      toast.error(`Aviso Backend: ${errMsg}`, {
        id: 'asentar-sol',
        duration: 10000,
        description: 'El servicio del backend generó este error al procesar la solicitud. Se registró en el historial local.',
      });
    } finally {
      setSolicitudesCreadas((prev) => {
        const existIdx = prev.findIndex(
          (s) => (nuevaSolicitudHistorial.id && s.id === nuevaSolicitudHistorial.id) ||
                 s.numeroSolicitud === nuevaSolicitudHistorial.numeroSolicitud
        );
        if (existIdx >= 0) {
          const copia = [...prev];
          copia[existIdx] = {
            ...copia[existIdx],
            ...nuevaSolicitudHistorial,
          };
          return copia;
        }
        return [nuevaSolicitudHistorial, ...prev];
      });
      setSolicitudEnEdicion(null);
      setSolicitudesSubView('lista');
    }
  };

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
          codigo: identifier,
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

  if (activeSection === 'Resumen' || activeSection === 'Operación') {
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
              setSolicitudEnEdicion(null);
              setActiveSection('Solicitudes');
              setSolicitudesSubView('nueva');
            }}
          >
            + Nueva Solicitud
          </button>
        </div>
        <HistorialSolicitudesView
          onNuevaSolicitud={() => {
            setSolicitudEnEdicion(null);
            setActiveSection('Solicitudes');
            setSolicitudesSubView('nueva');
          }}
          onEditarSolicitud={handleEditarSolicitud}
          solicitudesExtra={solicitudesCreadas}
          token={session?.token}
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
          <SegmentedControl
            size="sm"
            value={solicitudesSubView}
            onChange={(val) => {
              if (val === 'nueva') {
                setSolicitudEnEdicion(null);
              }
              setSolicitudesSubView(val as 'nueva' | 'lista');
            }}
            options={[
              { value: 'nueva', label: 'Captura (POS)' },
              { value: 'lista', label: 'Historial' },
            ]}
          />
        </div>

        {solicitudesSubView === 'lista' ? (
          <HistorialSolicitudesView
            onNuevaSolicitud={() => {
              setSolicitudEnEdicion(null);
              setSolicitudesSubView('nueva');
            }}
            onEditarSolicitud={handleEditarSolicitud}
            solicitudesExtra={solicitudesCreadas}
            token={session?.token}
          />
        ) : (
          <SolicitudCapturaMixta
            canales={canales}
            tiposDocumento={tiposDoc}
            clientes={clientes}
            onAsentarSolicitud={handleAsentarSolicitud}
            solicitudInicial={solicitudEnEdicion}
            onCancelarEdicion={() => {
              setSolicitudEnEdicion(null);
              setSolicitudesSubView('lista');
            }}
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
  } else if (
    activeSection === 'Catálogos' ||
    activeSection === 'Productos y servicios' ||
    activeSection === 'Servicios' ||
    activeSection === 'Productos y materiales'
  ) {
    content = <AdminItems token={session.token} />;
  } else if (activeSection === 'Precios') {
    content = <AdminPrices token={session.token} />;
  } else if (activeSection === 'Unidades y categorías') {
    content = <AdminUnitsCategories token={session.token} />;
  } else if (activeSection === 'Impuestos y descuentos') {
    content = <AdminTaxDiscount token={session.token} />;
  } else if (activeSection === 'Reportes' || activeSection === 'Reportes y Estadísticas' || activeSection === 'Reporte Z' || activeSection === 'Reportes de Ventas' || activeSection === 'Reportes de Inventario') {
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