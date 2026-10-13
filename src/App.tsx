import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { DesignSystemProvider } from '@farutech/design-system';
import { ListPageLayout } from '@/components/ui';

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
import AdminCashRegisters from '@/components/admin/AdminCashRegisters';
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
import { ModuloPagosCredito } from '@/features/pagos/ModuloPagosCredito';
import { ModuloReportes } from '@/features/reportes/ModuloReportes';
import { SolicitudCapturaMixta } from '@/features/solicitudes/SolicitudCapturaMixta';
import { HistorialSolicitudesView, type SolicitudHistorialItem } from '@/features/solicitudes/HistorialSolicitudesView';
import { ModalComprobanteSolicitud, type ComprobanteSolicitudData } from '@/features/solicitudes/ModalComprobanteSolicitud';
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

  // Estado para modal de notificación de impresión post-asentar solicitud
  const [solicitudParaImprimirPostAsentar, setSolicitudParaImprimirPostAsentar] =
    useState<ComprobanteSolicitudData | null>(null);

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
              lineaId: it.lineaId || it.publicId,
              itemCatalogoId: it.itemCatalogoId,
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
    numeroDocumentoVisible?: string;
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
    const nuevoNumero = solicitud.numeroDocumentoVisible || (solicitud.requestId
      ? (solicitudEnEdicion?.numeroDocumentoVisible || `SOL-${solicitud.requestId.slice(0, 8)}`)
      : `SOL-${String(Math.floor(1000 + Math.random() * 9000))}`);

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

      // 2. Sincronizar ítems en backend
      if (uuidSol) {
        let lineasExistentesEnBackend: { id: string }[] = [];
        if (solicitud.requestId) {
          try {
            const detalleActual = await solicitudesApi.getSolicitudByUuid(uuidSol, session?.token);
            lineasExistentesEnBackend = detalleActual?.items?.map((it) => ({ id: it.publicId })) || [];
          } catch {
            lineasExistentesEnBackend = [];
          }
        }

        // A. Eliminar líneas en backend que el usuario quitó en la pantalla
        const idsLineasEnPantalla = new Set(solicitud.lineas.map((l) => l.lineaId).filter(Boolean));
        for (const lineaBackend of lineasExistentesEnBackend) {
          if (!idsLineasEnPantalla.has(lineaBackend.id)) {
            try {
              await solicitudesApi.removerItem(uuidSol, lineaBackend.id, session?.token);
            } catch (errRemover: any) {
              const msg = errRemover?.message || 'Error al remover ítem';
              toast.error(`Error al remover ítem de la solicitud: ${msg}`, { id: 'asentar-sol' });
              throw errRemover;
            }
          }
        }

        // B. Agregar líneas nuevas (aquellas que no estaban ya en backend)
        const idsExistentes = new Set(lineasExistentesEnBackend.map((l) => l.id));
        for (const linea of solicitud.lineas) {
          const yaExisteEnBackend = linea.lineaId && idsExistentes.has(linea.lineaId);
          if (!yaExisteEnBackend && linea.itemCatalogoId) {
            try {
              const resItem = await solicitudesApi.agregarItem(
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
              const nuevoItem = resItem.items?.find((it) => it.itemCatalogoId === linea.itemCatalogoId);
              if (nuevoItem) {
                linea.lineaId = nuevoItem.publicId;
              }
            } catch (itemErr: any) {
              const msg = itemErr?.message || 'Error al agregar ítem';
              toast.error(`Error al guardar ítem "${linea.descripcion}": ${msg}`, { id: 'asentar-sol' });
              throw itemErr;
            }
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

      if (!esBorrador) {
        setSolicitudParaImprimirPostAsentar({
          numeroSolicitud: nuevaSolicitudHistorial.numeroSolicitud,
          subtipo: nuevaSolicitudHistorial.subtipo,
          fecha: nuevaSolicitudHistorial.fecha,
          clienteNombre: nuevaSolicitudHistorial.clienteNombre,
          clienteDocumento: nuevaSolicitudHistorial.clienteDocumento,
          observaciones: nuevaSolicitudHistorial.observaciones,
          lineas: nuevaSolicitudHistorial.lineas?.map((l: any) => ({
            descripcion: l.descripcion,
            naturaleza: l.naturaleza,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal: l.subtotal || l.cantidad * l.precioUnitario,
            fechaEntregaCompromiso: l.fechaEntregaCompromiso,
            franjaCompromiso: l.franjaCompromiso,
            observaciones: l.observaciones,
          })),
          pagosAbono: nuevaSolicitudHistorial.pagosAbono?.map((p: any) => ({
            instrumentoNombre: p.instrumentoNombre,
            monto: p.monto,
            referencia: p.referencia,
          })),
          totalNetoCop: nuevaSolicitudHistorial.totalNetoCop,
          anticipoCop: nuevaSolicitudHistorial.anticipoCop,
          saldoCop: nuevaSolicitudHistorial.saldoCop,
          estado: nuevaSolicitudHistorial.estado,
        });
      }
    }
  };

  useEffect(() => {
    if (!session?.token) return;
    const currentToken = session.token;
    Promise.all([
      catalogosApi.getCanalesOrigen(currentToken).catch(() => ({ canales: [] })),
      catalogosApi.getTiposDocumentoIdentidad(currentToken).catch(() => ({ tipos: [] })),
      catalogosApi.getClientes(undefined, undefined, currentToken).catch(() => ({ clientes: [], total: 0 })),
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

      if (typeof window !== 'undefined') {
        localStorage.setItem('ordeon_session', JSON.stringify(newSession));
        if (newSession.token) {
          localStorage.setItem('ordeon_token', newSession.token);
        }
      }

      setSession(newSession);
      toast.success('¡Bienvenido a Ordeon Operaciones!', {
        description: `Sesión iniciada como ${newSession.name}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al conectar con la API de autenticación.';
      setLoginError(message);
      toast.error('No se pudo iniciar sesión', { description: message });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(emailOrIdentifier: string) {
    const API_URL = apiBaseUrl();
    const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: emailOrIdentifier, username: emailOrIdentifier }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al procesar la solicitud.');
    }
    toast.success('Solicitud enviada', {
      description: 'Si la cuenta está registrada, se enviaron las instrucciones.',
    });
  }

  function handleLogout() {
    setSession(null);
    toast.info('Sesión cerrada correctamente');
  }

  if (!session) {
    return (
      <DesignSystemProvider colorMode="dark">
        <Toaster position="top-right" closeButton richColors theme="dark" />
        <LoginScreen
          onSubmit={handleLogin}
          onForgotPasswordSubmit={handleForgotPassword}
          loading={loading}
          error={loginError}
        />
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
        onNew={() => {
          setSolicitudEnEdicion(null);
          setActiveSection('Solicitudes');
          setSolicitudesSubView('nueva');
        }}
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
    );
  } else if (activeSection === 'Solicitudes') {
    content = solicitudesSubView === 'lista' ? (
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
      <ListPageLayout
        title={solicitudEnEdicion ? `Modificando Solicitud: ${solicitudEnEdicion.numeroDocumentoVisible || 'Borrador'}` : 'Captura de Solicitudes (POS)'}
        eyebrow="OPERACIÓN · SOLICITUDES"
        description="Captura y asienta solicitudes operativas de afilado, servicios e ítems de mostrador."
        actions={
          <button
            type="button"
            onClick={() => {
              setSolicitudEnEdicion(null);
              setSolicitudesSubView('lista');
            }}
            className="h-8 px-3.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>← Volver al Historial</span>
          </button>
        }
      >
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
      </ListPageLayout>
    );
  } else if (activeSection === 'Órdenes de trabajo') {
    content = tallerSubView === 'cola' ? (
      <ColaTaller
        token={session.token || ''}
        usuarioActual={{
          publicId: session.publicId || 'usr-001',
          codigo: session.codigo || 'admin',
          rol: session.role || 'Administrador',
        }}
        vistaSwitch={
          <button
            type="button"
            onClick={() => setTallerSubView('kanban')}
            className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Tablero Kanban →</span>
          </button>
        }
      />
    ) : (
      <ListPageLayout
        title="Tablero Kanban de Taller"
        eyebrow="OPERACIÓN · TALLER"
        description="Visualización y seguimiento ágil de órdenes de trabajo por estado."
        actions={
          <button
            type="button"
            onClick={() => setTallerSubView('cola')}
            className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>← Ver Cola de Trabajo</span>
          </button>
        }
      >
        <TableroKanbanTaller />
      </ListPageLayout>
    );
  } else if (activeSection === 'Entregas') {
    content = (
      <div className="page-content">
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
  } else if (activeSection === 'Pagos y crédito') {
    content = (
      <div className="page-content">
        <ModuloPagosCredito token={session.token} userRole={session.role} />
      </div>
    );
  } else if (activeSection === 'Caja y turnos') {
    content = (
      <ListPageLayout
        title="Caja y Turnos"
        eyebrow="OPERACIÓN · TESORERÍA"
        description="Apertura, cierre de turnos, arqueos y registro de movimientos de caja."
      >
        <ModuloCaja userRole={session.role} token={session.token} />
      </ListPageLayout>
    );
  } else if (
    activeSection === 'Cajas y terminales' ||
    activeSection === 'Cajas' ||
    activeSection === 'Terminales'
  ) {
    content = <AdminCashRegisters token={session.token} />;
  } else if (
    activeSection === 'Catálogos' ||
    activeSection === 'Productos y servicios' ||
    activeSection === 'Servicios' ||
    activeSection === 'Productos y materiales'
  ) {
    content = <AdminItems token={session.token} />;
  } else if (activeSection === 'Precios' || activeSection === 'Listas de precios') {
    content = <AdminPrices token={session.token} />;
  } else if (activeSection === 'Unidades y categorías') {
    content = <AdminUnitsCategories token={session.token} />;
  } else if (activeSection === 'Impuestos y descuentos') {
    content = <AdminTaxDiscount token={session.token} />;
  } else if (
    activeSection === 'Reportes' ||
    activeSection === 'Reportes y Estadísticas' ||
    activeSection === 'Reporte Z' ||
    activeSection === 'Reportes de Ventas' ||
    activeSection === 'Reportes de Inventario' ||
    activeSection === 'Reporte de operación' ||
    activeSection === 'Ventas y cobros' ||
    activeSection === 'Inventario' ||
    activeSection === 'Reporte de caja' ||
    activeSection === 'Reporte de clientes' ||
    activeSection === 'Reporte de auditoría'
  ) {
    content = (
      <ListPageLayout
        title="Reportes y Estadísticas"
        eyebrow="ADMINISTRACIÓN · REPORTES"
        description="Métricas operativas, financieras y auditoría de movimientos."
      >
        <ModuloReportes token={session.token} />
      </ListPageLayout>
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
  } else if (activeSection === 'Usuarios' || activeSection === 'Usuarios y personal') {
    content = <AdminUsers token={session.token} initialTab="usuarios" />;
  } else if (activeSection === 'Roles y permisos' || activeSection === 'Roles') {
    content = <AdminUsers token={session.token} initialTab="roles" />;
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

      {solicitudParaImprimirPostAsentar && (
        <ModalComprobanteSolicitud
          isOpen={Boolean(solicitudParaImprimirPostAsentar)}
          onClose={() => setSolicitudParaImprimirPostAsentar(null)}
          solicitud={solicitudParaImprimirPostAsentar}
          esConfirmacionAsentada={true}
        />
      )}
    </DesignSystemProvider>
  );
}

export default App;