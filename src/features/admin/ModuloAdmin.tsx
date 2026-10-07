import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Alert,
  EmptyState,
  CRUDTable,
} from '@farutech/design-system';
import { adminApi } from '../../services/adminApi';
import { catalogosApi } from '../../services/catalogosApi';
import type {
  UsuarioAdminDto,
  CrearUsuarioDto,
  CuentaBancariaConfigDto,
  WorkflowDefinicionAdminDto,
  WorkflowEtapaAdminDto,
  CrearWorkflowBorradorDto,
  ActualizarWorkflowDto,
  CrearEtapaDto,
} from '../../types/admin';
import type {
  ItemCatalogo,
  UnidadPresentacion,
  TipoDocumentoIdentidad,
  CanalOrigen,
  TipoDocumentoBase,
  SubtipoDocumento,
  Caja,
  MedioPagoCategoria,
  MedioPagoInstrumento,
  Cliente,
  ClienteHistorico,
  ParametroSistema,
  CategoriaItem,
  ListaPrecio,
} from '../../types/catalogos';
import { RegistroClienteModal } from '../clientes/RegistroClienteModal';
import { ParametroDinamicoModal } from '../config/ParametroDinamicoModal';
import { ConfigurarDenominacionesModal, type DenominacionConfigItem } from '../config/ConfigurarDenominacionesModal';
import {
  EditarSubtipoModal,
  type CambiosSubtipoDoc,
  type SubtipoConTipoBaseLocal,
} from '../config/EditarSubtipoModal';

export interface ModuloAdminProps {
  token?: string;
  initialMacroCat?: MacroCategoria;
  initialSubCat?: SubCatalogo;
  hideCategoryTabs?: boolean;
}

// --- NIVEL 1: Macro-Categorías ---
type MacroCategoria = 'seguridad' | 'clientes' | 'productos' | 'tesoreria' | 'sistema';

// --- NIVEL 2: Sub-Catálogos por Macro-Categoría ---
type SubCatalogoSeguridad = 'roles' | 'usuarios';
type SubCatalogoClientes = 'clientes' | 'canales' | 'tipos_doc';
type SubCatalogoProductos = 'items' | 'unidades' | 'workflows';
type SubCatalogoTesoreria = 'cajas' | 'medios_pago' | 'recaudos';
type SubCatalogoSistema = 'tipos_subtipos' | 'parametros';

type SubCatalogo =
  | SubCatalogoSeguridad
  | SubCatalogoClientes
  | SubCatalogoProductos
  | SubCatalogoTesoreria
  | SubCatalogoSistema;

export interface PermisosAcciones {
  navegar: boolean;
  crear: boolean;
  editar: boolean;
  anular: boolean;
  vobo: boolean;
}

export interface RolPermisosConfig {
  nombre: string;
  badge: 'danger' | 'warning' | 'info' | 'neutral' | 'success';
  icono: string;
  descripcion: string;
  modulos: Record<string, PermisosAcciones>;
}

export const MODULOS_SISTEMA = [
  { id: 'dashboard', nombre: 'Dashboard Operativo', icono: '📊' },
  { id: 'solicitudes', nombre: 'Nueva Solicitud (POS)', icono: '📝' },
  { id: 'taller', nombre: 'Cola de Taller (OT)', icono: '🛠️' },
  { id: 'entregas', nombre: 'Entregas & Despacho', icono: '📦' },
  { id: 'caja', nombre: 'Caja & Turnos', icono: '💰' },
  { id: 'clientes', nombre: 'Clientes & Ficha', icono: '👥' },
  { id: 'reportes', nombre: 'Reportes & Auditoría', icono: '📈' },
  { id: 'admin', nombre: 'Administración & Catálogos', icono: '⚙️' },
];

export const ROLES_PERMISOS_DEFAULT: Record<string, RolPermisosConfig> = {
  Administrador: {
    nombre: 'Administrador',
    badge: 'danger',
    icono: '🛡️',
    descripcion: 'Control total de la plataforma, parametrización central, catálogos, workflows y auditoría.',
    modulos: {
      dashboard: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      solicitudes: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      taller: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      entregas: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      caja: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      clientes: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      reportes: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      admin: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
    },
  },
  Supervisor: {
    nombre: 'Supervisor',
    badge: 'warning',
    icono: '⭐',
    descripcion: 'Aprobación de excepciones comerciales, VoBo de caja, reaperturas y control técnico en taller.',
    modulos: {
      dashboard: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      solicitudes: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      taller: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      entregas: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      caja: { navegar: true, crear: true, editar: true, anular: true, vobo: true },
      clientes: { navegar: true, crear: true, editar: true, anular: false, vobo: false },
      reportes: { navegar: true, crear: false, editar: false, anular: false, vobo: true },
      admin: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
    },
  },
  Cajero: {
    nombre: 'Cajero',
    badge: 'info',
    icono: '💰',
    descripcion: 'Operación de punto de venta mostrador, apertura/cierre de turnos y recaudo de servicios.',
    modulos: {
      dashboard: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      solicitudes: { navegar: true, crear: true, editar: true, anular: false, vobo: false },
      taller: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      entregas: { navegar: true, crear: true, editar: true, anular: false, vobo: false },
      caja: { navegar: true, crear: true, editar: true, anular: false, vobo: false },
      clientes: { navegar: true, crear: true, editar: true, anular: false, vobo: false },
      reportes: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      admin: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
    },
  },
  Operario: {
    nombre: 'Operario',
    badge: 'neutral',
    icono: '🛠️',
    descripcion: 'Ejecución técnica de órdenes de trabajo (OT) en cola de taller y avance de etapas de servicio.',
    modulos: {
      dashboard: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      solicitudes: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      taller: { navegar: true, crear: false, editar: true, anular: false, vobo: false },
      entregas: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      caja: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      clientes: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      reportes: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
      admin: { navegar: false, crear: false, editar: false, anular: false, vobo: false },
    },
  },
  Auditor: {
    nombre: 'Auditor',
    badge: 'neutral',
    icono: '📋',
    descripcion: 'Inspección de bitácora inmutable, trazabilidad financiera y reportería operativa y de caja.',
    modulos: {
      dashboard: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      solicitudes: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      taller: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      entregas: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      caja: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      clientes: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      reportes: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
      admin: { navegar: true, crear: false, editar: false, anular: false, vobo: false },
    },
  },
};

interface RolInfo {
  nombre: string;
  badge: 'danger' | 'warning' | 'info' | 'neutral' | 'success';
  icono: string;
  descripcion: string;
  permisos: string[];
}

const ROLES_SISTEMA: Record<string, RolInfo> = {
  Administrador: {
    nombre: 'Administrador',
    badge: 'danger',
    icono: '🛡️',
    descripcion: 'Control total de la plataforma, parametrización central, catálogos, workflows y auditoría.',
    permisos: ['Gestión de Usuarios y Roles', 'Configuración de Recaudos', 'Diseño de Workflows', 'Todos los Catálogos'],
  },
  Supervisor: {
    nombre: 'Supervisor',
    badge: 'warning',
    icono: '⭐',
    descripcion: 'Aprobación de excepciones comerciales, VoBo de caja, reaperturas y control técnico en taller.',
    permisos: ['VoBo Cierre y Arqueo Ciego', 'Excepciones Comerciales', 'Aprobación Técnica', 'Reaperturas de Turno'],
  },
  Cajero: {
    nombre: 'Cajero',
    badge: 'info',
    icono: '💰',
    descripcion: 'Operación de punto de venta mostrador, apertura/cierre de turnos y recaudo de servicios.',
    permisos: ['Apertura de Turno', 'POS & Anticipos', 'Arqueo Ciego', 'Egresos Menores'],
  },
  Operario: {
    nombre: 'Operario',
    badge: 'neutral',
    icono: '🛠️',
    descripcion: 'Ejecución técnica de órdenes de trabajo (OT) en cola de taller y avance de etapas de servicio.',
    permisos: ['Cola de Trabajo OT', 'Transición de Etapas', 'Firma Técnica de Ejecución'],
  },
  Auditor: {
    nombre: 'Auditor',
    badge: 'neutral',
    icono: '📋',
    descripcion: 'Inspección de bitácora inmutable, trazabilidad financiera y reportería operativa y de caja.',
    permisos: ['Bitácora de Eventos', 'Reportes Financieros', 'Trazabilidad Histórica'],
  },
};


export type SubtipoConTipoBase = SubtipoDocumento & { tipoBaseCodigo: string; tipoBaseNombre: string; tipoBaseUuid: string };

export const ModuloAdmin: React.FC<ModuloAdminProps> = ({
  token,
  initialMacroCat = 'seguridad',
  initialSubCat = 'roles',
  hideCategoryTabs = false,
}) => {
  // Navegación Multinivel
  const [macroCat, setMacroCat] = useState<MacroCategoria>(initialMacroCat);
  const [subCat, setSubCat] = useState<SubCatalogo>(initialSubCat);

  useEffect(() => {
    if (initialMacroCat) setMacroCat(initialMacroCat);
    if (initialSubCat) setSubCat(initialSubCat);
  }, [initialMacroCat, initialSubCat]);

  // Modales Avanzados: Parámetro Dinámico Global
  const [mostrarModalParametroDinamico, setMostrarModalParametroDinamico] = useState(false);
  const [parametroDinamicoTarget, setParametroDinamicoTarget] = useState<ParametroSistema | null>(null);

  // Modal Unificado de Edición de Subtipo (Datos + Consecutivo + Eliminación Física/Lógica)
  const [mostrarModalEditarSubtipo, setMostrarModalEditarSubtipo] = useState(false);
  const [mostrarModalDenominaciones, setMostrarModalDenominaciones] = useState(false);



  const [subtipoEditando, setSubtipoEditando] = useState<SubtipoConTipoBase | null>(null);

  const handleActualizarConsecutivo = async (
    tipoBaseCodigo: string,
    codigoSubtipo: string,
    nuevoFolio: number,
    motivo: string
  ) => {
    setTiposDocBase((prev) =>
      prev.map((tb) => {
        if (tb.codigoBase === tipoBaseCodigo || !tipoBaseCodigo) {
          return {
            ...tb,
            subtipos: tb.subtipos.map((st) =>
              st.codigoSubtipo === codigoSubtipo
                ? { ...st, folioActual: nuevoFolio }
                : st
            ),
          };
        }
        return tb;
      })
    );
    try {
      localStorage.setItem(`ordeon_consecutivo_${codigoSubtipo}`, String(nuevoFolio));
      const logs = JSON.parse(localStorage.getItem('ordeon_consecutivo_logs') || '[]');
      logs.push({
        codigoSubtipo,
        nuevoFolio,
        motivo,
        fecha: new Date().toISOString(),
      });
      localStorage.setItem('ordeon_consecutivo_logs', JSON.stringify(logs));
    } catch {
      // ignore
    }
  };
  /**
   * Guarda los campos editables del subtipo desde el modal unificado.
   * Actualiza la vista local y persiste en el backend cuando el endpoint existe.
   */
  const handleGuardarCamposSubtipo = async (uuid: string, cambios: CambiosSubtipoDoc) => {
    try {
      await catalogosApi.actualizarSubtipoDocs(uuid, {
        nombre: cambios.nombre,
        descripcion: cambios.descripcion,
        formatoPlantilla: cambios.formatoPlantilla,
        formatoPapel: cambios.formatoPapel,
        imprimeAlAsentar: cambios.imprimeAlAsentar,
      });
    } catch {
      // Fallback local si el backend no expone aún el endpoint
    }
    setTiposDocBase((prev) =>
      prev.map((tb) => ({
        ...tb,
        subtipos: tb.subtipos.map((st) =>
          st.uuid === uuid
            ? {
                ...st,
                nombre: cambios.nombre,
                descripcion: cambios.descripcion,
                prefijo: cambios.prefijo,
                formatoPlantilla: cambios.formatoPlantilla,
                formatoPapel: cambios.formatoPapel,
                imprimeAlAsentar: cambios.imprimeAlAsentar,
                longitudCeros: cambios.longitudCeros,
              }
            : st
        ),
      }))
    );
    setSuccessMsg(`Subtipo actualizado: ${cambios.nombre}`);
  };

  /**
   * Eliminación de subtipo en dos modalidades:
   *  - LOGICO: marca inactivo conservando histórico y consecutivo (auditoría).
   *  - FISICO: elimina el registro de la base de datos como si nunca hubiera existido.
   */
  const handleEliminarSubtipo = async (uuid: string, modo: 'FISICO' | 'LOGICO', motivo: string) => {
    if (modo === 'FISICO') {
      try {
        await catalogosApi.eliminarSubtipoFisico(uuid);
      } catch (err: any) {
        throw new Error(
          err?.message ||
            'No se pudo eliminar físicamente: el subtipo puede tener documentos asociados.'
        );
      }
      setTiposDocBase((prev) =>
        prev.map((tb) => ({
          ...tb,
          subtipos: tb.subtipos.filter((st) => st.uuid !== uuid),
        }))
      );
      setSuccessMsg('Subtipo eliminado físicamente del catálogo.');
    } else {
      try {
        await catalogosApi.setSubtipoActivo(uuid, false);
      } catch (err: any) {
        throw new Error(err?.message || 'No se pudo desactivar el subtipo.');
      }
      setTiposDocBase((prev) =>
        prev.map((tb) => ({
          ...tb,
          subtipos: tb.subtipos.map((st) =>
            st.uuid === uuid ? { ...st, activo: false } : st
          ),
        }))
      );
      setSuccessMsg(`Subtipo desactivado lógicamente. Motivo: ${motivo}`);
    }
    try {
      const logs = JSON.parse(localStorage.getItem('ordeon_subtipo_eliminacion_logs') || '[]');
      logs.push({ uuid, modo, motivo, fecha: new Date().toISOString() });
      localStorage.setItem('ordeon_subtipo_eliminacion_logs', JSON.stringify(logs));
    } catch {
      // ignore
    }
  };

  /** Reactiva un subtipo desactivado lógicamente. */
  const handleReactivarSubtipo = async (uuid: string) => {
    try {
      await catalogosApi.setSubtipoActivo(uuid, true);
    } catch {
      // Fallback local
    }
    setTiposDocBase((prev) =>
      prev.map((tb) => ({
        ...tb,
        subtipos: tb.subtipos.map((st) => (st.uuid === uuid ? { ...st, activo: true } : st)),
      }))
    );
    setSuccessMsg('Subtipo reactivado correctamente.');
  };



  const handleGuardarParametroDinamico = async (clave: string, valorActualizado: any) => {
    try {
      await catalogosApi.actualizarParametro(clave, valorActualizado, token);
      setSuccessMsg(`Parámetro '${clave}' guardado exitosamente en el servidor.`);
    } catch {
      setSuccessMsg(`Parámetro '${clave}' actualizado en la sesión.`);
    }
    setParametros((prev) =>
      prev.map((p) =>
        p.clave === clave
          ? { ...p, valorJson: valorActualizado }
          : p
      )
    );
    try {
      const saved = JSON.parse(localStorage.getItem('ordeon_parametros_override') || '{}');
      saved[clave] = valorActualizado;
      localStorage.setItem('ordeon_parametros_override', JSON.stringify(saved));
    } catch {
      // ignore
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ==========================================
  // ESTADOS POR SUB-CATÁLOGO
  // ==========================================

  // --- SEGURIDAD: Roles y Usuarios ---
  const [rolesPermisos, setRolesPermisos] = useState<Record<string, RolPermisosConfig>>(() => {
    try {
      const saved = localStorage.getItem('ordeon_role_permissions');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return ROLES_PERMISOS_DEFAULT;
  });
  const [rolEdicionTarget, setRolEdicionTarget] = useState<RolPermisosConfig | null>(null);
  const [mostrarModalNuevoRol, setMostrarModalNuevoRol] = useState(false);
  const [nuevoRolForm, setNuevoRolForm] = useState<{
    nombre: string;
    badge: 'danger' | 'warning' | 'info' | 'neutral' | 'success';
    icono: string;
    descripcion: string;
  }>({
    nombre: '',
    badge: 'info',
    icono: '🛡️',
    descripcion: '',
  });

  const [mostrarModalDetalleWf, setMostrarModalDetalleWf] = useState(false);

  const [usuarios, setUsuarios] = useState<UsuarioAdminDto[]>([]);
  const [roles, setRoles] = useState<string[]>(() => Object.keys(ROLES_PERMISOS_DEFAULT));
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState<CrearUsuarioDto>({
    codigo: '',
    nombreCompleto: '',
    email: '',
    password: '',
    rol: 'Cajero',
    pin: '',
  });
  const [usuarioPinTarget, setUsuarioPinTarget] = useState<UsuarioAdminDto | null>(null);
  const [nuevoPin, setNuevoPin] = useState('');

  // --- CLIENTES & CANALES ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [clienteHistoricoSeleccionado, setClienteHistoricoSeleccionado] = useState<ClienteHistorico | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [canales, setCanales] = useState<CanalOrigen[]>([]);
  const [loadingCanales, setLoadingCanales] = useState(false);
  const [mostrarModalCanal, setMostrarModalCanal] = useState(false);
  const [nuevoCanal, setNuevoCanal] = useState({ codigo: '', nombre: '' });

  const [tiposDocId, setTiposDocId] = useState<TipoDocumentoIdentidad[]>([]);
  const [loadingTiposDocId, setLoadingTiposDocId] = useState(false);
  const [mostrarModalTipoDocId, setMostrarModalTipoDocId] = useState(false);
  const [nuevoTipoDocId, setNuevoTipoDocId] = useState({ codigo: '', nombre: '', aplicaPersona: 'NATURAL' as 'NATURAL' | 'JURIDICA' });

  // --- PRODUCTOS & SERVICIOS ---
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [mostrarModalItem, setMostrarModalItem] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemCatalogo | null>(null);
  const [categoriasItems, setCategoriasItems] = useState<CategoriaItem[]>([]);
  const [listasPrecio, setListasPrecio] = useState<ListaPrecio[]>([
    { uuid: 'lp-base', codigo: 'BASE', nombre: 'Lista Base (Catálogo)', porcentajeAjuste: 0, esPredeterminada: true, activa: true },
    { uuid: 'lp-mayorista', codigo: 'MAYORISTA', nombre: 'Lista Mayorista', porcentajeAjuste: -10, esPredeterminada: false, activa: true },
    { uuid: 'lp-distribuidor', codigo: 'DISTRIBUIDOR', nombre: 'Lista Distribuidor', porcentajeAjuste: -15, esPredeterminada: false, activa: true },
  ]);
  const [mostrarModalAumentoLista, setMostrarModalAumentoLista] = useState(false);
  const [aumentoListaForm, setAumentoListaForm] = useState({
    listaUuid: 'lp-mayorista',
    porcentajeAumento: 5,
    modo: 'PORCENTAJE' as 'PORCENTAJE' | 'VALOR',
    valorFijo: 0,
  });

  const [nuevoItem, setNuevoItem] = useState({
    codigoReferencia: '',
    nombre: '',
    descripcion: '',
    naturaleza: 'SERVICIO' as 'INVENTARIO' | 'SERVICIO',
    uuidUnidadPresentacion: '',
    precioBase: 0,
    stockReferencial: undefined as number | undefined,
    workflowDefinicionUuid: '',
    categoriaUuid: '' as string,
    listaPrecioUuid: '' as string,
  });

  const [unidades, setUnidades] = useState<UnidadPresentacion[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [mostrarModalUnidad, setMostrarModalUnidad] = useState(false);
  const [nuevaUnidad, setNuevaUnidad] = useState({ codigo: '', nombre: '', abreviatura: '' });

  const [workflows, setWorkflows] = useState<WorkflowDefinicionAdminDto[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [workflowSeleccionado, setWorkflowSeleccionado] = useState<WorkflowDefinicionAdminDto | null>(null);
  const [loadingDetalleWf, setLoadingDetalleWf] = useState(false);
  const [mostrarModalNuevoWf, setMostrarModalNuevoWf] = useState(false);
  const [nuevoWf, setNuevoWf] = useState<CrearWorkflowBorradorDto>({ codigo: '', nombre: '', descripcion: '' });

  // Estados interactivos para Workflow Avanzado (tipo Jira / DevOps)
  const [editandoInfoWf, setEditandoInfoWf] = useState(false);
  const [formEditarWf, setFormEditarWf] = useState<ActualizarWorkflowDto>({ nombre: '', descripcion: '', activo: true });
  const [pestañaWf, setPestañaWf] = useState<'etapas' | 'servicios'>('etapas');

  // Modal y formulario para Agregar / Editar Etapa
  const [mostrarModalPaso, setMostrarModalPaso] = useState(false);
  const [pasoEditando, setPasoEditando] = useState<WorkflowEtapaAdminDto | null>(null);
  const [formPaso, setFormPaso] = useState<CrearEtapaDto>({
    codigo: '',
    nombre: '',
    orden: 1,
    rolRequerido: 'TALLER',
    tiempoEstimadoMinutos: 30,
    descripcion: '',
    esFinal: false,
  });
  const [guardandoPaso, setGuardandoPaso] = useState(false);

  // Vinculación de servicios
  const [servicioParaVincular, setServicioParaVincular] = useState<string>('');
  const [guardandoServicioWf, setGuardandoServicioWf] = useState(false);

  // --- CAJA & TESORERÍA ---
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [nuevaCaja, setNuevaCaja] = useState({ codigoCaja: '', nombre: '', ubicacion: 'Mostrador Principal' });

  const [mediosPagoCategorias, setMediosPagoCategorias] = useState<MedioPagoCategoria[]>([]);
  const [mediosPagoInstrumentos, setMediosPagoInstrumentos] = useState<MedioPagoInstrumento[]>([]);
  const [loadingMediosPago, setLoadingMediosPago] = useState(false);
  const [mostrarModalInstrumento, setMostrarModalInstrumento] = useState(false);
  const [nuevoInstrumento, setNuevoInstrumento] = useState<{
    codigoCategoria: string;
    codigo: string;
    nombre: string;
    requiereReferencia: boolean;
    diasCredito?: number;
  }>({
    codigoCategoria: 'EFECTIVO',
    codigo: '',
    nombre: '',
    requiereReferencia: false,
    diasCredito: 30,
  });

  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({
    EFECTIVO: true,
    BANCOS: true,
    TARJETAS: true,
    BILLETERAS: true,
    CREDITO: true,
    OTROS: true,
  });
  const toggleCategoriaExpandida = (codigo: string) => {
    setCategoriasExpandidas((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const [cuentaBancaria, setCuentaBancaria] = useState<CuentaBancariaConfigDto>({
    banco: '',
    numeroCuenta: '',
    tipoCuenta: 'Ahorros',
    titular: '',
    nitTitular: '',
    billeteraDigital: '',
  });
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [guardandoBanco, setGuardandoBanco] = useState(false);

  // --- DOCUMENTOS & SISTEMA ---
  const [tiposDocBase, setTiposDocBase] = useState<TipoDocumentoBase[]>([]);
  const [loadingTiposDocBase, setLoadingTiposDocBase] = useState(false);
  const [mostrarModalSubtipo, setMostrarModalSubtipo] = useState(false);
  const [uuidTipoBaseTarget, setUuidTipoBaseTarget] = useState<string>('');
  const [nuevoSubtipo, setNuevoSubtipo] = useState({
    codigoSubtipo: '',
    nombre: '',
    descripcion: '',
    prefijo: '',
    formatoPlantilla: 'TIRILLA_POS',
    formatoPapel: 'TIRILLA',
    imprimeAlAsentar: true,
  });

  const [parametros, setParametros] = useState<ParametroSistema[]>([]);

  const denominacionesActualesConfig = useMemo<DenominacionConfigItem[]>(() => {
    const p = parametros.find((param) => param.clave === 'denominaciones_efectivo');
    if (p?.valorJson) {
      try {
        const parsed = JSON.parse(p.valorJson);
        if (Array.isArray(parsed.denominaciones)) {
          return parsed.denominaciones;
        }
      } catch {}
    }
    return [];
  }, [parametros]);

  const handleGuardarDenominaciones = async (nuevas: DenominacionConfigItem[]) => {
    try {
      const jsonStr = JSON.stringify({
        monedaBase: 'COP',
        denominaciones: nuevas,
      });
      await catalogosApi.actualizarParametro('denominaciones_efectivo', jsonStr);
      setSuccessMsg('✓ Denominaciones de monedas y billetes guardadas para caja y arqueos.');
      setParametros((prev) =>
        prev.map((p) =>
          p.clave === 'denominaciones_efectivo'
            ? { ...p, valorJson: jsonStr }
            : p
        )
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar denominaciones');
    }
  };
  const [loadingParametros, setLoadingParametros] = useState(false);
  const [parametroTarget, setParametroTarget] = useState<ParametroSistema | null>(null);
  const [nuevoValorParametro, setNuevoValorParametro] = useState('');

  type SubtipoConTipoBase = SubtipoDocumento & { tipoBaseCodigo: string; tipoBaseNombre: string; tipoBaseUuid: string };

  const todosSubtipos = useMemo<SubtipoConTipoBase[]>(() => {
    return tiposDocBase.flatMap((tb) =>
      (tb.subtipos || []).map((st) => ({
        ...st,
        tipoBaseCodigo: tb.codigoBase,
        tipoBaseNombre: tb.nombre,
        tipoBaseUuid: tb.uuid,
      }))
    );
  }, [tiposDocBase]);

  // ==========================================
  // CARGA AUTOMÁTICA SEGÚN SUB-CATÁLOGO
  // ==========================================

  const cargarSubCatalogo = useCallback(async (sub: SubCatalogo) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    switch (sub) {
      case 'roles':
      case 'usuarios':
        setLoadingUsuarios(true);
        try {
          const [uList, rList] = await Promise.all([
            adminApi.getUsuarios(token),
            adminApi.getRoles(token).catch(() => Object.keys(ROLES_SISTEMA)),
          ]);
          setUsuarios(uList);
          if (rList && rList.length > 0) setRoles(rList);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar usuarios y roles');
        } finally {
          setLoadingUsuarios(false);
        }
        break;

      case 'clientes':
        setLoadingClientes(true);
        try {
          const res = await catalogosApi.getClientes();
          setClientes(res.clientes);
          const resTipos = await catalogosApi.getTiposDocumentoIdentidad().catch(() => ({ tipos: [] }));
          setTiposDocId(resTipos.tipos);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar clientes');
        } finally {
          setLoadingClientes(false);
        }
        break;

      case 'canales':
        setLoadingCanales(true);
        try {
          const res = await catalogosApi.getCanalesOrigen();
          setCanales(res.canales);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar canales');
        } finally {
          setLoadingCanales(false);
        }
        break;

      case 'tipos_doc':
        setLoadingTiposDocId(true);
        try {
          const res = await catalogosApi.getTiposDocumentoIdentidad();
          setTiposDocId(res.tipos);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar tipos de documento');
        } finally {
          setLoadingTiposDocId(false);
        }
        break;

      case 'items':
        setLoadingItems(true);
        try {
          const [resItems, resUnidades, resWfs, resCats, resListas] = await Promise.all([
            catalogosApi.getItems(),
            catalogosApi.getUnidades().catch(() => ({ unidades: [] })),
            adminApi.getWorkflows(true, token).catch(() => []),
            catalogosApi.getCategoriasItem().catch(() => ({ categorias: [] })),
            catalogosApi.getListasPrecio().catch(() => ({ listas: [] })),
          ]);
          setItems(resItems.items || []);
          setUnidades(resUnidades.unidades || []);
          setWorkflows(resWfs || []);
          if (resCats.categorias && resCats.categorias.length > 0) {
            setCategoriasItems(resCats.categorias);
          }
          if (resListas.listas && resListas.listas.length > 0) {
            setListasPrecio(resListas.listas);
          }
          if (resUnidades.unidades && resUnidades.unidades.length > 0) {
            setNuevoItem(prev => ({ ...prev, uuidUnidadPresentacion: resUnidades.unidades[0].uuid }));
          }
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar catálogo de ítems');
        } finally {
          setLoadingItems(false);
        }
        break;

      case 'unidades':
        setLoadingUnidades(true);
        try {
          const res = await catalogosApi.getUnidades();
          setUnidades(res.unidades || []);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar unidades');
        } finally {
          setLoadingUnidades(false);
        }
        break;

      case 'workflows':
        setLoadingWorkflows(true);
        try {
          const wfs = await adminApi.getWorkflows(true, token);
          setWorkflows(wfs);
          setWorkflowSeleccionado(prev => prev ?? (wfs.length > 0 ? wfs[0] : null));
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar workflows');
        } finally {
          setLoadingWorkflows(false);
        }
        break;

      case 'cajas':
        setLoadingCajas(true);
        try {
          const res = await catalogosApi.getCajas();
          setCajas(res.cajas);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar cajas');
        } finally {
          setLoadingCajas(false);
        }
        break;

      case 'medios_pago':
        setLoadingMediosPago(true);
        try {
          const [resArbol, resInst] = await Promise.all([
            catalogosApi.getMediosPagoArbol().catch(() => ({ categorias: [] })),
            catalogosApi.getMediosPagoInstrumentos().catch(() => ({ instrumentos: [] })),
          ]);
          setMediosPagoCategorias(resArbol.categorias);
          setMediosPagoInstrumentos(resInst.instrumentos);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar medios de pago');
        } finally {
          setLoadingMediosPago(false);
        }
        break;

      case 'recaudos':
        setLoadingBanco(true);
        try {
          const cuenta = await adminApi.getCuentaBancaria(token);
          setCuentaBancaria(cuenta);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar configuración de recaudos');
        } finally {
          setLoadingBanco(false);
        }
        break;

      case 'tipos_subtipos':
        setLoadingTiposDocBase(true);
        try {
          const res = await catalogosApi.getTiposDocumento();
          setTiposDocBase(res.tipos);
          if (res.tipos.length > 0) {
            setUuidTipoBaseTarget(res.tipos[0].uuid);
          }
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar tipos y subtipos');
        } finally {
          setLoadingTiposDocBase(false);
        }
        break;

      case 'parametros':
        setLoadingParametros(true);
        try {
          const res = await catalogosApi.getParametros();
          setParametros(res.parametros);
        } catch (err: unknown) {
          setErrorMsg((err as Error).message || 'Error al cargar parámetros del sistema');
        } finally {
          setLoadingParametros(false);
        }
        break;
    }
  }, [token]);

  useEffect(() => {
    cargarSubCatalogo(subCat);
  }, [subCat, cargarSubCatalogo]);

  // Al cambiar de macro-categoría, selecciona el primer sub-catálogo correspondiente
  const cambiarMacroCategoria = (nuevaMacro: MacroCategoria) => {
    setMacroCat(nuevaMacro);
    switch (nuevaMacro) {
      case 'seguridad':
        setSubCat('roles');
        break;
      case 'clientes':
        setSubCat('clientes');
        break;
      case 'productos':
        setSubCat('items');
        break;
      case 'tesoreria':
        setSubCat('cajas');
        break;
      case 'sistema':
        setSubCat('tipos_subtipos');
        break;
    }
  };

  // ==========================================
  // HANDLERS DE CREACIÓN Y ACCIONES
  // ==========================================

  // --- Roles & Matriz de Permisos ---
  const handleGuardarPermisosRol = (rolActualizado: RolPermisosConfig) => {
    const nuevosRoles = {
      ...rolesPermisos,
      [rolActualizado.nombre]: rolActualizado,
    };
    setRolesPermisos(nuevosRoles);
    localStorage.setItem('ordeon_role_permissions', JSON.stringify(nuevosRoles));
    window.dispatchEvent(new Event('ordeon_permissions_updated'));
    setSuccessMsg(`Permisos del rol '${rolActualizado.nombre}' guardados exitosamente.`);
    setRolEdicionTarget(null);
  };

  const handleCrearNuevoRol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRolForm.nombre.trim()) return;
    const nombre = nuevoRolForm.nombre.trim();
    if (rolesPermisos[nombre]) {
      setErrorMsg(`El rol '${nombre}' ya existe.`);
      return;
    }
    const modulosDefault: Record<string, PermisosAcciones> = {};
    MODULOS_SISTEMA.forEach((m) => {
      modulosDefault[m.id] = {
        navegar: m.id === 'solicitudes' || m.id === 'caja',
        crear: m.id === 'solicitudes',
        editar: false,
        anular: false,
        vobo: false,
      };
    });
    const nuevoConfig: RolPermisosConfig = {
      nombre,
      badge: nuevoRolForm.badge,
      icono: nuevoRolForm.icono || '🛡️',
      descripcion: nuevoRolForm.descripcion || `Rol personalizado para operaciones de ${nombre}.`,
      modulos: modulosDefault,
    };
    const nuevosRoles = {
      ...rolesPermisos,
      [nombre]: nuevoConfig,
    };
    setRolesPermisos(nuevosRoles);
    setRoles(Object.keys(nuevosRoles));
    localStorage.setItem('ordeon_role_permissions', JSON.stringify(nuevosRoles));
    window.dispatchEvent(new Event('ordeon_permissions_updated'));
    setSuccessMsg(`Rol '${nombre}' creado exitosamente.`);
    setMostrarModalNuevoRol(false);
    setNuevoRolForm({ nombre: '', badge: 'info', icono: '🛡️', descripcion: '' });
  };

  // --- Usuarios ---
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await adminApi.crearUsuario(nuevoUsuario, token);
      setSuccessMsg(`Usuario ${nuevoUsuario.codigo} creado exitosamente.`);
      setMostrarModalUsuario(false);
      setNuevoUsuario({ codigo: '', nombreCompleto: '', email: '', password: '', rol: 'Cajero', pin: '' });
      cargarSubCatalogo('usuarios');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear usuario');
    }
  };

  const handleToggleUsuario = async (u: UsuarioAdminDto) => {
    try {
      await adminApi.cambiarEstadoUsuario(u.uuid, !u.activo, token);
      setSuccessMsg(`Estado de ${u.codigo} actualizado a ${!u.activo ? 'ACTIVO' : 'INACTIVO'}.`);
      cargarSubCatalogo('usuarios');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cambiar estado de usuario');
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioPinTarget) return;
    try {
      await adminApi.resetearPinUsuario(usuarioPinTarget.uuid, nuevoPin, token);
      setSuccessMsg(`PIN actualizado para ${usuarioPinTarget.codigo}.`);
      setUsuarioPinTarget(null);
      setNuevoPin('');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al actualizar PIN');
    }
  };

  // --- Clientes ---

  const handleVerHistoricoCliente = async (uuid: string) => {
    setLoadingHistorico(true);
    try {
      const hist = await catalogosApi.getClienteHistorico(uuid);
      setClienteHistoricoSeleccionado(hist);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al obtener historial del cliente');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleToggleCliente = async (cliente: Cliente) => {
    try {
      setClientes((prev) =>
        prev.map((c) => (c.uuid === cliente.uuid ? { ...c, activo: !c.activo } : c))
      );
      setSuccessMsg(`Estado del cliente '${cliente.nombreRazonSocial}' actualizado.`);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al actualizar cliente');
    }
  };

  // --- Canales ---
  const handleCrearCanal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearCanalOrigen(nuevoCanal);
      setSuccessMsg(`Canal '${nuevoCanal.nombre}' creado exitosamente.`);
      setMostrarModalCanal(false);
      setNuevoCanal({ codigo: '', nombre: '' });
      cargarSubCatalogo('canales');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear canal');
    }
  };

  const handleToggleCanal = async (canal: CanalOrigen) => {
    try {
      setCanales((prev) =>
        prev.map((c) => (c.codigo === canal.codigo ? { ...c, activo: !c.activo } : c))
      );
      setSuccessMsg(`Estado del canal '${canal.nombre}' actualizado.`);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Error al actualizar canal');
    }
  };

  // --- Tipos Doc Id ---
  const handleCrearTipoDocId = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearTipoDocumentoIdentidad(nuevoTipoDocId);
      setSuccessMsg(`Tipo de identificación '${nuevoTipoDocId.codigo}' creado exitosamente.`);
      setMostrarModalTipoDocId(false);
      setNuevoTipoDocId({ codigo: '', nombre: '', aplicaPersona: 'NATURAL' });
      cargarSubCatalogo('tipos_doc');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear tipo de identificación');
    }
  };

  // --- Items & Listas de Precios ---
  const handleGuardarItem = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMsg(null);
  if (!nuevoItem.categoriaUuid) {
    setErrorMsg('Selecciona una categoría para el ítem antes de guardarlo.');
    return;
  }
  try {
      if (itemEditando) {
        await catalogosApi.actualizarItem(itemEditando.uuid, {
          nombre: nuevoItem.nombre,
          descripcion: nuevoItem.descripcion,
          naturaleza: nuevoItem.naturaleza,
          uuidUnidadPresentacion: nuevoItem.uuidUnidadPresentacion,
          precioBase: Number(nuevoItem.precioBase),
          stockReferencial: nuevoItem.naturaleza === 'INVENTARIO' ? Number(nuevoItem.stockReferencial ?? 0) : undefined,
          workflowDefinicionUuid: nuevoItem.naturaleza === 'SERVICIO' && nuevoItem.workflowDefinicionUuid ? nuevoItem.workflowDefinicionUuid : undefined,
          categoriaUuid: nuevoItem.categoriaUuid || null,
          listaPrecioUuid: nuevoItem.listaPrecioUuid || null,
        });
        setSuccessMsg(`Ítem '${nuevoItem.nombre}' actualizado exitosamente.`);
      } else {
        await catalogosApi.crearItem({
          codigoReferencia: nuevoItem.codigoReferencia,
          nombre: nuevoItem.nombre,
          descripcion: nuevoItem.descripcion,
          naturaleza: nuevoItem.naturaleza,
          uuidUnidadPresentacion: nuevoItem.uuidUnidadPresentacion,
          precioBase: Number(nuevoItem.precioBase),
          stockReferencial: nuevoItem.naturaleza === 'INVENTARIO' ? Number(nuevoItem.stockReferencial ?? 0) : undefined,
                  workflowDefinicionUuid: nuevoItem.naturaleza === 'SERVICIO' && nuevoItem.workflowDefinicionUuid ? nuevoItem.workflowDefinicionUuid : undefined,
                  categoriaUuid: nuevoItem.categoriaUuid,
                  listaPrecioUuid: nuevoItem.listaPrecioUuid || null,
                });
        setSuccessMsg(`Ítem '${nuevoItem.nombre}' creado exitosamente.`);
      }
      setMostrarModalItem(false);
      setItemEditando(null);
      setNuevoItem({
        codigoReferencia: '',
        nombre: '',
        descripcion: '',
        naturaleza: 'SERVICIO',
        uuidUnidadPresentacion: unidades[0]?.uuid || '',
        precioBase: 0,
        stockReferencial: undefined,
        workflowDefinicionUuid: '',
        categoriaUuid: '',
        listaPrecioUuid: '',
      });
      cargarSubCatalogo('items');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al guardar ítem');
    }
  };

  const handleAplicarAumentoLista = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.aplicarAumentoListaPrecio(
        aumentoListaForm.listaUuid,
        aumentoListaForm.porcentajeAumento
      );
      setSuccessMsg(`Aumento del ${aumentoListaForm.porcentajeAumento}% aplicado a la lista de precios.`);
      setMostrarModalAumentoLista(false);
      cargarSubCatalogo('items');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al aplicar aumento a la lista de precios');
    }
  };

  const handleToggleItem = async (it: ItemCatalogo) => {
    try {
      await catalogosApi.setItemActivo(it.uuid, !it.activo);
      setSuccessMsg(`Ítem ${it.codigoReferencia} ${!it.activo ? 'activado' : 'desactivado'}.`);
      cargarSubCatalogo('items');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cambiar estado del ítem');
    }
  };

  // --- Unidades ---
  const handleCrearUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearUnidad(nuevaUnidad);
      setSuccessMsg(`Unidad '${nuevaUnidad.nombre}' creada exitosamente.`);
      setMostrarModalUnidad(false);
      setNuevaUnidad({ codigo: '', nombre: '', abreviatura: '' });
      cargarSubCatalogo('unidades');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear unidad de medida');
    }
  };

  // --- Workflows ---
  // --- Workflows (Gestión Integral tipo Jira / Azure DevOps) ---
  const handleCargarDetalleWorkflow = async (uuid: string) => {
    setLoadingDetalleWf(true);
    try {
      const wf = await adminApi.getWorkflowById(uuid, token);
      setWorkflowSeleccionado(wf);
      setFormEditarWf({
        nombre: wf.nombre,
        descripcion: wf.descripcion,
        activo: wf.activo,
      });
      setWorkflows((prev) => prev.map((w) => (w.uuid === uuid ? wf : w)));
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al obtener detalle del workflow');
    } finally {
      setLoadingDetalleWf(false);
    }
  };

  const handleSeleccionarWorkflow = (wf: WorkflowDefinicionAdminDto) => {
    setWorkflowSeleccionado(wf);
    setFormEditarWf({
      nombre: wf.nombre,
      descripcion: wf.descripcion,
      activo: wf.activo,
    });
    setEditandoInfoWf(false);
    setPestañaWf('etapas');
    setMostrarModalDetalleWf(true);
    handleCargarDetalleWorkflow(wf.uuid);
    if (items.length === 0) {
      catalogosApi.getItems().then((res) => setItems(res.items || [])).catch(() => {});
    }
  };

  const handleCrearWorkflowBorrador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const creado = await adminApi.crearBorradorWorkflow(nuevoWf, token);
      setSuccessMsg(`Workflow borrador '${creado.codigo}' v${creado.versionNumero} creado exitosamente.`);
      setMostrarModalNuevoWf(false);
      setNuevoWf({ codigo: '', nombre: '', descripcion: '' });
      cargarSubCatalogo('workflows');
      handleSeleccionarWorkflow(creado);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear workflow borrador');
    }
  };

  const handleGuardarInfoWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowSeleccionado) return;
    setErrorMsg(null);
    try {
      const actualizado = await adminApi.actualizarWorkflow(workflowSeleccionado.uuid, formEditarWf, token);
      setWorkflowSeleccionado(actualizado);
      setEditandoInfoWf(false);
      setSuccessMsg(`Workflow '${actualizado.codigo}' actualizado exitosamente.`);
      setWorkflows((prev) => prev.map((w) => (w.uuid === actualizado.uuid ? actualizado : w)));
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al actualizar workflow');
    }
  };

  const handlePublicarWorkflow = async (wf: WorkflowDefinicionAdminDto) => {
    if (!window.confirm(`¿Publicar y activar versión ${wf.versionNumero} de ${wf.codigo}?`)) return;
    try {
      const actualizado = await adminApi.publicarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow ${wf.codigo} publicado.`);
      if (workflowSeleccionado?.uuid === wf.uuid) {
        setWorkflowSeleccionado(actualizado);
      }
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al publicar workflow');
    }
  };

  const handleRetirarWorkflow = async (wf: WorkflowDefinicionAdminDto) => {
    if (!window.confirm(`¿Retirar y pausar el workflow ${wf.codigo}?`)) return;
    try {
      const actualizado = await adminApi.retirarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow ${wf.codigo} retirado.`);
      if (workflowSeleccionado?.uuid === wf.uuid) {
        setWorkflowSeleccionado(actualizado);
      }
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al retirar workflow');
    }
  };

  const handleEliminarWorkflow = async (wf: WorkflowDefinicionAdminDto) => {
    if (!window.confirm(`¿Desea eliminar o desactivar definitivamente el workflow '${wf.codigo}'?`)) return;
    try {
      await adminApi.eliminarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow '${wf.codigo}' procesado.`);
      setMostrarModalDetalleWf(false);
      setWorkflowSeleccionado(null);
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al eliminar workflow');
    }
  };

  // Etapas / Pasos
  const handleAbrirCrearPaso = () => {
    if (!workflowSeleccionado) return;
    const ordenSiguiente = (workflowSeleccionado.etapas?.length || 0) + 1;
    setPasoEditando(null);
    setFormPaso({
      codigo: `PASO_${ordenSiguiente}`,
      nombre: '',
      orden: ordenSiguiente,
      rolRequerido: 'TALLER',
      tiempoEstimadoMinutos: 30,
      descripcion: '',
      esFinal: false,
    });
    setMostrarModalPaso(true);
  };

  const handleAbrirEditarPaso = (etapa: WorkflowEtapaAdminDto) => {
    setPasoEditando(etapa);
    setFormPaso({
      codigo: etapa.codigo,
      nombre: etapa.nombre,
      orden: etapa.orden,
      rolRequerido: etapa.rolRequerido || 'TALLER',
      tiempoEstimadoMinutos: etapa.tiempoEstimadoMinutos || 30,
      descripcion: etapa.descripcion || '',
      esFinal: etapa.esFinal,
    });
    setMostrarModalPaso(true);
  };

  const handleGuardarPaso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowSeleccionado) return;
    setErrorMsg(null);
    setGuardandoPaso(true);
    try {
      let wfActualizado: WorkflowDefinicionAdminDto;
      if (pasoEditando) {
        wfActualizado = await adminApi.actualizarEtapa(workflowSeleccionado.uuid, pasoEditando.uuid, {
          nombre: formPaso.nombre,
          codigo: formPaso.codigo,
          orden: formPaso.orden,
          rolRequerido: formPaso.rolRequerido,
          tiempoEstimadoMinutos: Number(formPaso.tiempoEstimadoMinutos || 0),
          descripcion: formPaso.descripcion,
          activo: true,
        }, token);
        setSuccessMsg(`Etapa '${formPaso.nombre}' actualizada exitosamente.`);
      } else {
        wfActualizado = await adminApi.agregarEtapa(workflowSeleccionado.uuid, {
          codigo: formPaso.codigo,
          nombre: formPaso.nombre,
          orden: formPaso.orden,
          rolRequerido: formPaso.rolRequerido,
          tiempoEstimadoMinutos: Number(formPaso.tiempoEstimadoMinutos || 0),
          descripcion: formPaso.descripcion,
          esFinal: formPaso.esFinal,
        }, token);
        setSuccessMsg(`Etapa '${formPaso.nombre}' añadida exitosamente.`);
      }
      setWorkflowSeleccionado(wfActualizado);
      setWorkflows((prev) => prev.map((w) => (w.uuid === wfActualizado.uuid ? wfActualizado : w)));
      setMostrarModalPaso(false);
      setPasoEditando(null);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al guardar etapa del workflow');
    } finally {
      setGuardandoPaso(false);
    }
  };

  const handleEliminarPaso = async (etapa: WorkflowEtapaAdminDto) => {
    if (!workflowSeleccionado) return;
    if (!window.confirm(`¿Eliminar la etapa '${etapa.nombre}' (${etapa.codigo})?`)) return;
    try {
      const wfActualizado = await adminApi.eliminarEtapa(workflowSeleccionado.uuid, etapa.uuid, token);
      setWorkflowSeleccionado(wfActualizado);
      setWorkflows((prev) => prev.map((w) => (w.uuid === wfActualizado.uuid ? wfActualizado : w)));
      setSuccessMsg(`Etapa '${etapa.nombre}' eliminada del workflow.`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al eliminar etapa');
    }
  };

  const handleMoverPaso = async (indiceActual: number, direccion: 'arriba' | 'abajo') => {
    if (!workflowSeleccionado || !workflowSeleccionado.etapas) return;
    const etapasCopy = [...workflowSeleccionado.etapas];
    const indiceNuevo = direccion === 'arriba' ? indiceActual - 1 : indiceActual + 1;
    if (indiceNuevo < 0 || indiceNuevo >= etapasCopy.length) return;

    const temp = etapasCopy[indiceActual];
    etapasCopy[indiceActual] = etapasCopy[indiceNuevo];
    etapasCopy[indiceNuevo] = temp;

    const stepIds = etapasCopy.map((s) => s.uuid);
    try {
      const wfActualizado = await adminApi.reordenarEtapas(workflowSeleccionado.uuid, { stepIds }, token);
      setWorkflowSeleccionado(wfActualizado);
      setWorkflows((prev) => prev.map((w) => (w.uuid === wfActualizado.uuid ? wfActualizado : w)));
      setSuccessMsg('Secuencia de etapas reordenada exitosamente.');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al reordenar etapas');
    }
  };

  // Servicios Vinculados
  const handleVincularServicio = async () => {
    if (!workflowSeleccionado || !servicioParaVincular) return;
    setGuardandoServicioWf(true);
    try {
      await adminApi.asignarServicioWorkflow(workflowSeleccionado.uuid, servicioParaVincular, token);
      setSuccessMsg('Servicio vinculado al workflow exitosamente.');
      setServicioParaVincular('');
      await handleCargarDetalleWorkflow(workflowSeleccionado.uuid);
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al vincular servicio');
    } finally {
      setGuardandoServicioWf(false);
    }
  };

  const handleDesvincularServicio = async (itemId: string, itemNombre: string) => {
    if (!workflowSeleccionado) return;
    if (!window.confirm(`¿Desvincular el servicio '${itemNombre}' de este workflow?`)) return;
    try {
      await adminApi.desasignarServicioWorkflow(workflowSeleccionado.uuid, itemId, token);
      setSuccessMsg(`Servicio '${itemNombre}' desvinculado.`);
      await handleCargarDetalleWorkflow(workflowSeleccionado.uuid);
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al desvincular servicio');
    }
  };


  // --- Cajas ---
  const handleCrearCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearCaja(nuevaCaja);
      setSuccessMsg(`Caja '${nuevaCaja.codigoCaja}' registrada exitosamente.`);
      setMostrarModalCaja(false);
      setNuevaCaja({ codigoCaja: '', nombre: '', ubicacion: 'Mostrador Principal' });
      cargarSubCatalogo('cajas');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear caja');
    }
  };

  const handleToggleCaja = async (c: Caja) => {
    try {
      await catalogosApi.setCajaActiva(c.uuid, !c.activa);
      setSuccessMsg(`Caja ${c.codigoCaja} ${!c.activa ? 'activada' : 'desactivada'}.`);
      cargarSubCatalogo('cajas');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cambiar estado de la caja');
    }
  };

  // --- Medios de Pago Instrumentos ---
  const handleCrearInstrumento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearMedioPagoInstrumento({
        codigoCategoria: nuevoInstrumento.codigoCategoria,
        codigo: nuevoInstrumento.codigo,
        nombre: nuevoInstrumento.nombre,
        requiereReferencia: nuevoInstrumento.requiereReferencia,
        diasCredito: nuevoInstrumento.codigoCategoria === 'CREDITO' ? (nuevoInstrumento.diasCredito || 30) : undefined,
      } as any);
      setSuccessMsg(`Medio de pago '${nuevoInstrumento.nombre}' creado exitosamente.`);
      setMostrarModalInstrumento(false);
      setNuevoInstrumento({ codigoCategoria: 'EFECTIVO', codigo: '', nombre: '', requiereReferencia: false, diasCredito: 30 });
      cargarSubCatalogo('medios_pago');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear instrumento de pago');
    }
  };

  // --- Recaudos / Cuentas Bancarias ---
  const handleGuardarBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoBanco(true);
    setErrorMsg(null);
    try {
      await adminApi.guardarCuentaBancaria(cuentaBancaria, token);
      setSuccessMsg('Configuración de cuenta de recaudo guardada exitosamente.');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al guardar cuenta bancaria');
    } finally {
      setGuardandoBanco(false);
    }
  };

  // --- Subtipos de Documento ---
  const handleCrearSubtipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearSubtipo(uuidTipoBaseTarget, nuevoSubtipo);
      setSuccessMsg(`Subtipo '${nuevoSubtipo.codigoSubtipo}' creado exitosamente.`);
      setMostrarModalSubtipo(false);
      setNuevoSubtipo({
        codigoSubtipo: '',
        nombre: '',
        descripcion: '',
        prefijo: '',
        formatoPlantilla: 'TIRILLA_POS',
        formatoPapel: 'TIRILLA',
        imprimeAlAsentar: true,
      });
      cargarSubCatalogo('tipos_subtipos');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear subtipo de documento');
    }
  };

  // --- Parámetros ---
  const handleGuardarParametro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parametroTarget) return;
    setErrorMsg(null);
    try {
      await catalogosApi.actualizarParametro(parametroTarget.clave, nuevoValorParametro);
      setSuccessMsg(`Parámetro '${parametroTarget.clave}' actualizado.`);
      setParametroTarget(null);
      cargarSubCatalogo('parametros');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al actualizar parámetro');
    }
  };



  const METADATA_TITULO_SUBCAT: Record<string, { titulo: string; descripcion: string; icono: string }> = {
    roles: {
      titulo: 'Matriz de Roles & Permisos',
      descripcion: 'Definición de perfiles de seguridad y asignación granular de permisos por módulo.',
      icono: '🔑',
    },
    usuarios: {
      titulo: 'Gestión de Usuarios, Cajeros & Personal',
      descripcion: 'Control de credenciales, roles asignados y estados de actividad del personal.',
      icono: '👤',
    },
    clientes: {
      titulo: 'Directorio Central de Clientes',
      descripcion: 'Fichas comerciales, datos de contacto e historial transaccional de clientes.',
      icono: '👥',
    },
    canales: {
      titulo: 'Canales de Venta & Origen',
      descripcion: 'Puntos de contacto comercial (Mostrador, WhatsApp, Telefónico, etc.).',
      icono: '🌐',
    },
    tipos_doc: {
      titulo: 'Tipos de Documento de Identidad',
      descripcion: 'Homologación de documentos legales para personas naturales y jurídicas (CC, NIT, CE, etc.).',
      icono: '🪪',
    },
    items: {
      titulo: 'Catálogo de Ítems, Productos & Servicios',
      descripcion: 'Gestión de referencias, naturalezas (Inventario/Servicio), precios base, categorías multinivel y workflows.',
      icono: '🏷️',
    },
    unidades: {
      titulo: 'Unidades de Medida & Presentación',
      descripcion: 'Unidades de cuantificación para productos físicos y tiempos de servicios.',
      icono: '⚖️',
    },
    workflows: {
      titulo: 'Flujos de Trabajo (Workflows) de Taller',
      descripcion: 'Secuencia de etapas técnicas operativas para órdenes de trabajo (OT).',
      icono: '🔄',
    },
    cajas: {
      titulo: 'Cajas Físicas de Mostrador',
      descripcion: 'Terminales POS físicas habilitadas para apertura de turnos y recaudo.',
      icono: '🏧',
    },
    medios_pago: {
      titulo: 'Formas & Medios de Pago (Árbol Jerárquico)',
      descripcion: 'Clasificación de medios de pago por categorías e instrumentos transaccionales hijos.',
      icono: '💳',
    },
    recaudos: {
      titulo: 'Cuentas Bancarias de Recaudo',
      descripcion: 'Configuración de cuentas empresariales para transferencias, consignaciones y cheques.',
      icono: '🏛️',
    },
    tipos_subtipos: {
      titulo: 'Tipos & Subtipos de Documento (Control Novasoft)',
      descripcion: 'Administración de prefijos, consecutivos, formatos de tirilla/carta y políticas de anulación.',
      icono: '📑',
    },
    parametros: {
      titulo: 'Parámetros Globales del Sistema',
      descripcion: 'Configuración centralizada de políticas comerciales, IVA, anticipos, tolerancia y auditoría.',
      icono: '⚙️',
    },
  };

  const metaActual = METADATA_TITULO_SUBCAT[subCat] || {
    titulo: 'Administración & Catálogos Centrales',
    descripcion: 'Control de usuarios, directivos, catálogos comerciales, canales, caja, workflows y parámetros del sistema.',
    icono: '⚙️',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Principal Dinámico Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{metaActual.icono}</span> {metaActual.titulo}
          </h1>
          <p className="text-sm text-gray-400">
            {metaActual.descripcion}
          </p>
        </div>
      </div>

      {/* Alertas Globales */}
      {errorMsg && (
        <Alert variant="danger" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* ========================================== */}
      {/* NIVEL 1: NAVEGACIÓN MACRO-CATEGORÍAS */}
      {/* ========================================== */}
      {!hideCategoryTabs && (
        <>
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-900/80 border border-white/10 rounded-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => cambiarMacroCategoria('seguridad')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            macroCat === 'seguridad'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🛡️</span> Seguridad & Personal
        </button>

        <button
          type="button"
          onClick={() => cambiarMacroCategoria('clientes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            macroCat === 'clientes'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>👥</span> Clientes & Canales
        </button>

        <button
          type="button"
          onClick={() => cambiarMacroCategoria('productos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            macroCat === 'productos'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📦</span> Productos & Servicios
        </button>

        <button
          type="button"
          onClick={() => cambiarMacroCategoria('tesoreria')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            macroCat === 'tesoreria'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>💰</span> Caja & Tesorería
        </button>

        <button
          type="button"
          onClick={() => cambiarMacroCategoria('sistema')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
            macroCat === 'sistema'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📋</span> Documentos & Sistema
        </button>
      </div>

      {/* ========================================== */}
      {/* NIVEL 2: SUB-CATÁLOGOS (PILLS) */}
      {/* ========================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-3">
        {macroCat === 'seguridad' && (
          <>
            <button
              type="button"
              onClick={() => setSubCat('roles')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'roles'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Matriz de Roles
            </button>
            <button
              type="button"
              onClick={() => setSubCat('usuarios')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'usuarios'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Usuarios, Cajeros & Operarios
            </button>
          </>
        )}

        {macroCat === 'clientes' && (
          <>
            <button
              type="button"
              onClick={() => setSubCat('clientes')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'clientes'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Directorio de Clientes
            </button>
            <button
              type="button"
              onClick={() => setSubCat('canales')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'canales'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Canales de Origen
            </button>
            <button
              type="button"
              onClick={() => setSubCat('tipos_doc')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'tipos_doc'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Tipos de Documento Identidad
            </button>
          </>
        )}

        {macroCat === 'productos' && (
          <>
            <button
              type="button"
              onClick={() => setSubCat('items')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'items'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Ítems & Servicios
            </button>
            <button
              type="button"
              onClick={() => setSubCat('unidades')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'unidades'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Unidades de Medida
            </button>
            <button
              type="button"
              onClick={() => setSubCat('workflows')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'workflows'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Workflows de Taller
            </button>
          </>
        )}

        {macroCat === 'tesoreria' && (
          <>
            <button
              type="button"
              onClick={() => setSubCat('cajas')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'cajas'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Cajas Físicas de Mostrador
            </button>
            <button
              type="button"
              onClick={() => setSubCat('medios_pago')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'medios_pago'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Formas & Medios de Pago
            </button>
            <button
              type="button"
              onClick={() => setSubCat('recaudos')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'recaudos'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Cuentas de Recaudo Bancario
            </button>
          </>
        )}

        {macroCat === 'sistema' && (
          <>
            <button
              type="button"
              onClick={() => setSubCat('tipos_subtipos')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'tipos_subtipos'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Tipos & Subtipos de Documento
            </button>
            <button
              type="button"
              onClick={() => setSubCat('parametros')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                subCat === 'parametros'
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              Parámetros Globales del Sistema
            </button>
          </>
        )}
      </div>
      </>
      )}

      {/* ========================================== */}

      {/* VISTAS DE CONTENIDO */}
      {/* ========================================== */}

      {/* 1.1 ROLES CON CRUDTABLE Y MATRIZ DE PERMISOS */}
      {subCat === 'roles' && (
        <div className="space-y-4">
          <CRUDTable<RolPermisosConfig>
            data={Object.values(rolesPermisos)}
            columns={[
              {
                key: 'nombre',
                label: 'Rol',
                sortable: true,
                render: (_, r) => (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{r.icono}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{r.nombre}</div>
                      <div className="text-[11px] text-gray-400">{r.descripcion}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'badge',
                label: 'Nivel',
                render: (_, r) => <Badge variant={r.badge}>{r.nombre}</Badge>,
              },
              {
                key: 'modulos',
                label: 'Módulos con Acceso',
                render: (_, r) => {
                  const modulosConAcceso = MODULOS_SISTEMA.filter((m) => r.modulos?.[m.id]?.navegar);
                  return (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {modulosConAcceso.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center gap-1"
                        >
                          <span>{m.icono}</span> {m.nombre}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
              {
                key: 'usuarios',
                label: 'Usuarios Activos',
                render: (_, r) => {
                  const count = usuarios.filter((u) => u.rol === r.nombre).length;
                  return (
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-gray-800 text-gray-200 border border-white/10">
                      {count} {count === 1 ? 'usuario' : 'usuarios'}
                    </span>
                  );
                },
              },
              {
                key: 'acciones',
                label: 'Acciones',
                align: 'right',
                render: (_, r) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRolEdicionTarget(JSON.parse(JSON.stringify(r)))}
                  >
                    ⚙️ Matriz de Permisos
                  </Button>
                ),
              },
            ]}
            onCreate={() => setMostrarModalNuevoRol(true)}
            createLabel="+ Nuevo Rol"
            searchable={true}
            searchPlaceholder="Buscar rol por nombre o descripción..."
            pagination={true}
            pageSize={6}
            emptyMessage="No hay roles registrados."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 1.2 USUARIOS / CAJEROS / OPERARIOS */}
      {subCat === 'usuarios' && (
        <div className="space-y-4">
          <CRUDTable
            data={usuarios}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombreCompleto', label: 'Nombre Completo', sortable: true },
              { key: 'email', label: 'Email', sortable: true, render: (v) => <span className="text-gray-400">{v}</span> },
              {
                key: 'rol',
                label: 'Rol del Sistema',
                sortable: true,
                render: (v) => <Badge variant={ROLES_SISTEMA[v]?.badge ?? 'neutral'}>{v}</Badge>,
              },
              {
                key: 'tienePin',
                label: 'PIN',
                render: (_, u) =>
                  u.tienePin ? (
                    <span className="text-emerald-400 text-xs font-semibold">✓ Configurado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 text-xs font-medium">
                      ⚠️ Sin PIN
                    </span>
                  ),
              },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
              {
                key: 'acciones',
                label: 'Acciones',
                align: 'right',
                render: (_, u) => {
                  const esAdminPrincipal = u.codigo === 'ADMIN' || (u.rol === 'Administrador' && u.nombreCompleto?.toLowerCase().includes('principal'));
                  return (
                    <div className="flex gap-2 justify-end items-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUsuarioPinTarget(u);
                          setNuevoPin('');
                        }}
                      >
                        {u.tienePin ? 'Reset PIN' : 'Asignar PIN'}
                      </Button>
                      {esAdminPrincipal ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/40">
                          🛡️ Protegido
                        </span>
                      ) : (
                        <Button
                          variant={u.activo ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleUsuario(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            loading={loadingUsuarios}
            onCreate={() => setMostrarModalUsuario(true)}
            createLabel="+ Nuevo Usuario / Cajero"
            searchable={true}
            searchPlaceholder="Buscar por código, nombre o email..."
            filters={[
              {
                key: 'rol',
                label: 'Rol',
                type: 'select',
                options: roles.map((r) => ({ label: r, value: r })),
              },
            ]}
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron usuarios que coincidan con la búsqueda."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 2.1 CLIENTES */}
      {subCat === 'clientes' && (
        <div className="space-y-4">
          <CRUDTable
            data={clientes}
            columns={[
              {
                key: 'tipoDocumento',
                label: 'Tipo Doc',
                render: (_, c) => <span className="font-bold text-gray-400">{c.tipoDocumento?.codigo ?? 'CC'}</span>,
              },
              {
                key: 'numeroDocumento',
                label: 'Número Documento',
                sortable: true,
                render: (v, c) => {
                  const esGeneral = !c.numeroDocumento || c.nombreRazonSocial?.toUpperCase().includes('GENERAL');
                  return (
                    <span className="font-mono font-bold text-white">
                      {v || (esGeneral ? '—' : '—')}
                    </span>
                  );
                },
              },
              {
                key: 'nombreRazonSocial',
                label: 'Nombre / Razón Social',
                sortable: true,
                render: (v, c) => {
                  const esGeneral = !c.numeroDocumento || c.nombreRazonSocial?.toUpperCase().includes('GENERAL');
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{v}</span>
                      {esGeneral && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-950/80 text-amber-300 border border-amber-600/40">
                          🛡️ Sistema (Fijo)
                        </span>
                      )}
                    </div>
                  );
                },
              },
              { key: 'telefono', label: 'Teléfono', render: (v) => <span className="text-slate-400">{v || '—'}</span> },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
              {
                key: 'acciones',
                label: 'Historial & Acciones',
                align: 'right',
                render: (_, c) => {
                  const esGeneral = !c.numeroDocumento || c.nombreRazonSocial?.toUpperCase().includes('GENERAL');
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={loadingHistorico}
                        onClick={() => handleVerHistoricoCliente(c.uuid)}
                      >
                        {loadingHistorico ? 'Cargando...' : '👁️ Ver Historial'}
                      </Button>
                      {!esGeneral && (
                        <Button
                          variant={c.activo ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleCliente(c)}
                        >
                          {c.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            loading={loadingClientes}
            onCreate={() => setMostrarModalCliente(true)}
            createLabel="+ Nuevo Cliente"
            searchable={true}
            searchPlaceholder="Buscar por documento o nombre de cliente..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron clientes registrados."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 2.2 CANALES DE ORIGEN */}
      {subCat === 'canales' && (
        <div className="space-y-4">
          <CRUDTable
            data={canales}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombre', label: 'Nombre del Canal', sortable: true },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
            ]}
            loading={loadingCanales}
            onCreate={() => setMostrarModalCanal(true)}
            createLabel="+ Nuevo Canal de Origen"
            searchable={true}
            pagination={true}
            pageSize={8}
            rowActions={[
              {
                id: 'editar_canal',
                label: 'Editar Canal',
                icon: <span>✏️</span>,
                tooltip: 'Editar código y nombre del canal',
                variant: 'primary',
                onClick: (row) => {
                  setNuevoCanal({ codigo: row.codigo, nombre: row.nombre });
                  setMostrarModalCanal(true);
                },
              },
              {
                id: 'toggle_canal',
                label: 'Cambiar Estado',
                icon: <span>🔄</span>,
                variant: 'secondary',
                tooltip: 'Activar o desactivar canal',
                onClick: (row) => handleToggleCanal(row),
              },
            ]}
            emptyMessage="No se encontraron canales de origen."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 2.3 TIPOS DE DOCUMENTO DE IDENTIDAD */}
      {subCat === 'tipos_doc' && (
        <div className="space-y-4">
          <CRUDTable
            data={tiposDocId}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombre', label: 'Nombre', sortable: true },
              {
                key: 'aplicaPersona',
                label: 'Aplica A',
                render: (v) => (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-800/40">
                    {v}
                  </span>
                ),
              },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
            ]}
            loading={loadingTiposDocId}
            onCreate={() => setMostrarModalTipoDocId(true)}
            createLabel="+ Nuevo Tipo de Documento"
            searchable={true}
            searchPlaceholder="Buscar tipo de documento..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron tipos de documento."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 3.1 ITEMS & SERVICIOS */}
      {subCat === 'items' && (
        <div className="space-y-4">
          {/* Barra de Acciones de Catálogo y Listas de Precios */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Catálogo Maestro:</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {items.length} ítems
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                {listasPrecio.length} listas de precios
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMostrarModalAumentoLista(true)}
              >
                📈 Aumentar Lista de Precios
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setItemEditando(null);
                  setNuevoItem({
                    codigoReferencia: '',
                    nombre: '',
                    descripcion: '',
                    naturaleza: 'SERVICIO',
                    uuidUnidadPresentacion: unidades[0]?.uuid || '',
                    precioBase: 0,
                    stockReferencial: undefined,
                    workflowDefinicionUuid: '',
                    categoriaUuid: '',
                    listaPrecioUuid: '',
                  });
                  setMostrarModalItem(true);
                }}
              >
                + Nuevo Ítem / Servicio
              </Button>
            </div>
          </div>

          <CRUDTable
            data={items}
            columns={[
              {
                key: 'codigoReferencia',
                label: 'Código Ref.',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              {
                key: 'nombre',
                label: 'Nombre & Descripción',
                sortable: true,
                render: (_, it) => (
                  <div>
                    <div className="font-semibold text-white">{it.nombre}</div>
                    {it.categoria?.nombre && (
                      <div className="text-[10px] text-slate-400">
                        📁 {it.categoria.rutaCompleta || it.categoria.nombre}
                      </div>
                    )}
                    {it.descripcion && <div className="text-xs text-gray-400">{it.descripcion}</div>}
                  </div>
                ),
              },
              {
                key: 'naturaleza',
                label: 'Naturaleza',
                render: (v) => (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      v === 'SERVICIO'
                        ? 'bg-blue-900/30 text-blue-300 border-blue-700/40'
                        : 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                    }`}
                  >
                    {v}
                  </span>
                ),
              },
              {
                key: 'workflowDefinicionCodigo',
                label: 'Flujo de Trabajo (OT)',
                render: (_, it) =>
                  it.naturaleza === 'SERVICIO' ? (
                    it.workflowDefinicionCodigo ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                        🔄 {it.workflowDefinicionCodigo}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Por defecto</span>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">N/A (Inventario)</span>
                  ),
              },
              {
                key: 'unidadPresentacion',
                label: 'Unidad',
                render: (_, it) => (
                  <span className="text-gray-400">{it.unidadPresentacion?.abreviatura || 'UNID'}</span>
                ),
              },
              {
                key: 'precioBase',
                label: 'Precio Base',
                sortable: true,
                render: (v) => (
                  <span className="font-semibold text-white">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                    }).format(v)}
                  </span>
                ),
              },
              {
                key: 'stockReferencial',
                label: 'Stock',
                render: (_, it) => (
                  <span className="font-mono">
                    {it.naturaleza === 'INVENTARIO' ? (it.stockReferencial ?? 0) : 'N/A'}
                  </span>
                ),
              },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
              {
                key: 'acciones',
                label: 'Acciones',
                align: 'right',
                render: (_, it) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setItemEditando(it);
                        setNuevoItem({
                          codigoReferencia: it.codigoReferencia,
                          nombre: it.nombre,
                          descripcion: it.descripcion || '',
                          naturaleza: it.naturaleza,
                          uuidUnidadPresentacion: it.unidadPresentacion?.uuid || unidades[0]?.uuid || '',
                          precioBase: it.precioBase,
                          stockReferencial: it.stockReferencial ?? undefined,
                          workflowDefinicionUuid: it.workflowDefinicionUuid || '',
                          categoriaUuid: it.categoriaUuid || it.categoria?.uuid || '',
                          listaPrecioUuid: it.listaPrecioUuid || '',
                        });
                        setMostrarModalItem(true);
                      }}
                      title="Editar ítem existente"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      variant={it.activo ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleItem(it)}
                      title={it.activo ? 'Desactivar ítem' : 'Activar ítem'}
                    >
                      {it.activo ? '🚫' : '✓'}
                    </Button>
                  </div>
                ),
              },
            ]}
            loading={loadingItems}
            searchable={true}
            searchPlaceholder="Buscar ítem o servicio..."
            filters={[
              {
                key: 'naturaleza',
                label: 'Naturaleza',
                type: 'select',
                options: [
                  { label: 'Servicios de Taller', value: 'SERVICIO' },
                  { label: 'Productos de Inventario', value: 'INVENTARIO' },
                ],
              },
            ]}
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron ítems o servicios."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 3.2 UNIDADES DE MEDIDA */}
      {subCat === 'unidades' && (
        <div className="space-y-4">
          <CRUDTable
            data={unidades}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombre', label: 'Nombre', sortable: true },
              {
                key: 'abreviatura',
                label: 'Abreviatura',
                render: (v) => <span className="font-bold text-blue-300">{v}</span>,
              },
              {
                key: 'activo',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
            ]}
            loading={loadingUnidades}
            onCreate={() => setMostrarModalUnidad(true)}
            createLabel="+ Nueva Unidad de Medida"
            searchable={true}
            searchPlaceholder="Buscar unidad de medida..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron unidades de medida."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 3.3 WORKFLOWS DE TALLER CON CRUDTABLE */}
      {subCat === 'workflows' && (
        <div className="space-y-4">
          <CRUDTable<WorkflowDefinicionAdminDto>
            data={workflows}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{String(v)}</span>,
              },
              {
                key: 'nombre',
                label: 'Nombre del Workflow',
                sortable: true,
                render: (_, wf) => (
                  <div>
                    <div className="font-semibold text-white">{wf.nombre}</div>
                    <div className="text-xs text-gray-400">{wf.descripcion}</div>
                  </div>
                ),
              },
              {
                key: 'versionNumero',
                label: 'Versión',
                sortable: true,
                render: (v) => (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-blue-300 font-bold border border-white/10">
                    v{String(v)}
                  </span>
                ),
              },
              {
                key: 'etapas',
                label: 'Etapas de Servicio',
                render: (_, wf) => (
                  <span className="text-xs text-gray-300 font-medium">
                    {wf.etapas?.length ?? 0} etapas configuradas
                  </span>
                ),
              },
              {
                key: 'estado',
                label: 'Estado',
                sortable: true,
                render: (_, wf) => (
                  <Badge variant={wf.esVigente ? 'success' : wf.activo ? 'warning' : 'neutral'}>
                    {wf.esVigente ? 'PUBLICADO' : wf.activo ? 'BORRADOR' : 'RETIRADO'}
                  </Badge>
                ),
              },
              {
                key: 'acciones',
                label: 'Acciones',
                align: 'right',
                render: (_, wf) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={loadingDetalleWf}
                      onClick={() => handleCargarDetalleWorkflow(wf.uuid)}
                    >
                      ⚙️ Configurar Flujo &amp; Etapas
                    </Button>
                    {!wf.esVigente && wf.activo && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublicarWorkflow(wf)}
                      >
                        Publicar Versión
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            loading={loadingWorkflows}
            onCreate={() => setMostrarModalNuevoWf(true)}
            createLabel="+ Nuevo Borrador de Workflow"
            searchable={true}
            searchPlaceholder="Buscar workflow por código o nombre..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron workflows de taller."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />

          {loadingDetalleWf && (
            <div className="text-center py-4 text-sm text-slate-400">
              Cargando detalle y etapas del workflow...
            </div>
          )}

          {/* Pipeline Visual de Etapas del Workflow Seleccionado */}
          {!loadingDetalleWf && workflowSeleccionado && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🔄</span>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Pipeline Técnico: {workflowSeleccionado.nombre}
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono font-bold">
                        v{workflowSeleccionado.versionNumero}
                      </span>
                      <Badge variant={workflowSeleccionado.esVigente ? 'success' : 'warning'}>
                        {workflowSeleccionado.esVigente ? 'PUBLICADO' : 'BORRADOR'}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">
                        ({workflowSeleccionado.serviciosVinculados?.length ?? workflowSeleccionado.serviciosVinculadosCount ?? 0} servicios vinculados)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{workflowSeleccionado.descripcion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSeleccionarWorkflow(workflowSeleccionado)}
                  >
                    🛠️ Gestionar Etapas &amp; Roles
                  </Button>
                  {!workflowSeleccionado.esVigente && workflowSeleccionado.activo && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handlePublicarWorkflow(workflowSeleccionado)}
                    >
                      🚀 Publicar Versión
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Secuencia Técnica de Etapas y Roles Responsables ({workflowSeleccionado.etapas.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workflowSeleccionado.etapas.map((et, idx) => (
                    <div
                      key={et.uuid}
                      onClick={() => handleSeleccionarWorkflow(workflowSeleccionado)}
                      className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col justify-between gap-2 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                              {et.nombre}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">{et.codigo}</div>
                          </div>
                        </div>
                        {et.esFinal ? (
                          <Badge variant="success">🏁 Final</Badge>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Paso {idx + 1} ➜</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-indigo-300 border border-slate-700">
                          {et.rolRequerido === 'SUPERVISOR' && '⭐ Supervisor'}
                          {et.rolRequerido === 'CALIDAD' && '🔬 Calidad'}
                          {et.rolRequerido === 'OPERARIO' && '⚙️ Operario'}
                          {et.rolRequerido === 'ADMIN' && '🛡️ Admin'}
                          {(!et.rolRequerido || et.rolRequerido === 'TALLER') && '🛠️ Taller'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ⏱️ {et.tiempoEstimadoMinutos || 30} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4.1 CAJAS FÍSICAS */}
      {subCat === 'cajas' && (
        <div className="space-y-4">
          <CRUDTable
            data={cajas}
            columns={[
              {
                key: 'codigoCaja',
                label: 'Código de Caja',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombre', label: 'Nombre Descriptivo', sortable: true },
              { key: 'ubicacion', label: 'Ubicación Física', render: (v) => <span className="text-gray-400">{v}</span> },
              {
                key: 'activa',
                label: 'Estado',
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activa' : 'Inactiva'}
                  </Badge>
                ),
              },
              {
                key: 'acciones',
                label: 'Acciones',
                align: 'right',
                render: (_, c) => {
                  const tieneTurnoAbierto = Boolean((c as any).tieneTurnoAbierto || (c as any).turnoActivo);
                  return (
                    <div className="flex items-center justify-end gap-2">
                      {tieneTurnoAbierto ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-950/60 text-amber-300 border border-amber-600/30">
                          🔒 Turno Abierto (Bloqueada)
                        </span>
                      ) : (
                        <Button
                          variant={c.activa ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleCaja(c)}
                        >
                          {c.activa ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
            loading={loadingCajas}
            onCreate={() => setMostrarModalCaja(true)}
            createLabel="+ Nueva Caja de Mostrador"
            searchable={true}
            searchPlaceholder="Buscar caja..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron cajas registradas."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 4.2 FORMAS & MEDIOS DE PAGO (ÁRBOL JERÁRQUICO) */}
      {subCat === 'medios_pago' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🌳</span> Árbol Jerárquico de Formas & Instrumentos de Pago
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estructura de dos niveles: {mediosPagoCategorias.length || 6} categorías macro (padres) e instrumentos transaccionales (hijos) habilitados para POS y tesorería.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const todosExpandidos = Object.values(categoriasExpandidas).every(Boolean);
                  const nuevoEstado: Record<string, boolean> = {};
                  ['EFECTIVO', 'BANCOS', 'TARJETAS', 'BILLETERAS', 'CREDITO', 'OTROS'].forEach((k) => {
                    nuevoEstado[k] = !todosExpandidos;
                  });
                  setCategoriasExpandidas(nuevoEstado);
                }}
              >
                {Object.values(categoriasExpandidas).every(Boolean) ? '📁 Colapsar Todo' : '📂 Expandir Todo'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const param = parametros.find((p) => p.clave === 'denominaciones_efectivo');
                  if (param) {
                    setParametroTarget(param);
                  } else {
                    setParametroTarget({
                      uuid: 'param-denominaciones',
                      clave: 'denominaciones_efectivo',
                      valorJson: JSON.stringify({
                        monedaBase: 'COP',
                        denominaciones: [
                          { valor: 100000, etiqueta: '$100.000', tipo: 'BILLETE', activa: true },
                          { valor: 50000, etiqueta: '$50.000', tipo: 'BILLETE', activa: true },
                          { valor: 20000, etiqueta: '$20.000', tipo: 'BILLETE', activa: true },
                          { valor: 10000, etiqueta: '$10.000', tipo: 'BILLETE', activa: true },
                          { valor: 5000, etiqueta: '$5.000', tipo: 'BILLETE', activa: true },
                          { valor: 2000, etiqueta: '$2.000', tipo: 'BILLETE', activa: true },
                          { valor: 1000, etiqueta: '$1.000', tipo: 'BILLETE', activa: true },
                          { valor: 500, etiqueta: '$500', tipo: 'MONEDA', activa: true },
                          { valor: 200, etiqueta: '$200', tipo: 'MONEDA', activa: true },
                          { valor: 100, etiqueta: '$100', tipo: 'MONEDA', activa: true },
                          { valor: 50, etiqueta: '$50', tipo: 'MONEDA', activa: true },
                        ],
                      }),
                      descripcion: 'Denominaciones de efectivo para arqueo y cierre',
                      categoria: 'Tesorería',
                    });
                  }
                }}
              >
                💵 Monedas de Caja
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setNuevoInstrumento({ codigoCategoria: 'EFECTIVO', codigo: '', nombre: '', requiereReferencia: false, diasCredito: 30 });
                  setMostrarModalInstrumento(true);
                }}
              >
                + Nuevo Instrumento de Pago
              </Button>
            </div>
          </div>

          {loadingMediosPago ? (
            <div className="p-8 text-center text-slate-400">Cargando catálogo de medios de pago...</div>
          ) : (
            <div className="space-y-3">
              {[
                { codigo: 'EFECTIVO', nombre: 'Efectivo & Caja Menor', icono: '💵', desc: 'Conteo físico por denominación en arqueos y cierres Z' },
                { codigo: 'BANCOS', nombre: 'Transferencias Bancarias & Consignaciones', icono: '🏦', desc: 'Validación por comprobante y cuenta receptora' },
                { codigo: 'TARJETAS', nombre: 'Tarjetas Débito & Crédito (Datáfonos)', icono: '💳', desc: 'Vouchers y autorizaciones electrónicas de datáfono' },
                { codigo: 'BILLETERAS', nombre: 'Billeteras Digitales (Nequi / Daviplata)', icono: '📱', desc: 'Recaudo por QR dinámico o número de teléfono celular' },
                { codigo: 'CREDITO', nombre: 'Crédito Comercial (Cuentas por Cobrar)', icono: '⏱️', desc: 'Otorgamiento de plazo de pago con control de días de crédito' },
                { codigo: 'OTROS', nombre: 'Otros Instrumentos & Papelería', icono: '📄', desc: 'Cheques, bonos y notas crédito de mostrador' },
              ].map((catDef) => {
                const estaExpandido = categoriasExpandidas[catDef.codigo] !== false;
                const instrumentosCat = mediosPagoInstrumentos.filter((inst) => {
                  const c = (inst.categoria || '').toUpperCase();
                  const cod = inst.codigo.toUpperCase();
                  if (catDef.codigo === 'EFECTIVO') return c.includes('EFECTIVO') || cod.includes('EFE');
                  if (catDef.codigo === 'BANCOS') return c.includes('BANCO') || c.includes('TRANSF') || cod.includes('BAN') || cod.includes('TRA');
                  if (catDef.codigo === 'TARJETAS') return c.includes('TARJETA') || c.includes('DATA') || cod.includes('TAR') || cod.includes('POS');
                  if (catDef.codigo === 'BILLETERAS') return c.includes('BILLETERA') || c.includes('NEQUI') || c.includes('DAVI') || cod.includes('DIG');
                  if (catDef.codigo === 'CREDITO') return c.includes('CRED') || cod.includes('CRE') || inst.diasCredito !== undefined;
                  return !c.includes('EFECTIVO') && !c.includes('BANCO') && !c.includes('TARJETA') && !c.includes('BILLETERA') && !c.includes('CRED') && !cod.includes('CRE');
                });

                return (
                  <div
                    key={catDef.codigo}
                    className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Rama Padre (Categoría) con toggle expandible */}
                    <div
                      onClick={() => toggleCategoriaExpandida(catDef.codigo)}
                      className="p-3.5 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 cursor-pointer hover:bg-slate-900/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs w-4 text-center font-bold">
                          {estaExpandido ? '▼' : '▶'}
                        </span>
                        <span className="text-lg">{catDef.icono}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{catDef.nombre}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                              Rama: {catDef.codigo}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{catDef.desc}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {instrumentosCat.length} hijos
                        </span>
                        {catDef.codigo === 'EFECTIVO' && (
                          <button
                            type="button"
                            onClick={() => {
                              const param = parametros.find((p) => p.clave === 'denominaciones_efectivo');
                              if (param) setParametroTarget(param);
                            }}
                            className="text-[11px] text-amber-400 hover:underline cursor-pointer font-semibold"
                          >
                            Monedas ➔
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setNuevoInstrumento({
                              codigoCategoria: catDef.codigo,
                              codigo: '',
                              nombre: '',
                              requiereReferencia: catDef.codigo !== 'EFECTIVO',
                              diasCredito: catDef.codigo === 'CREDITO' ? 30 : undefined,
                            });
                            setMostrarModalInstrumento(true);
                          }}
                          className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
                        >
                          + Añadir a {catDef.codigo}
                        </button>
                      </div>
                    </div>

                    {/* Hijos (Hojas / Instrumentos de la Rama) */}
                    {estaExpandido && (
                      <div className="p-3 bg-slate-950/40">
                        {instrumentosCat.length === 0 ? (
                          <div className="text-xs text-slate-500 py-3 px-4 text-center italic border border-dashed border-slate-800 rounded-lg">
                            No hay instrumentos configurados en esta rama. Haga clic en "+ Añadir a {catDef.codigo}" para registrar el primero.
                          </div>
                        ) : (
                          <div className="space-y-1.5 pl-4 border-l-2 border-indigo-500/30 ml-3 my-1">
                            {instrumentosCat.map((inst, idx) => {
                              const esUltimo = idx === instrumentosCat.length - 1;
                              return (
                                <div
                                  key={inst.uuid}
                                  className="relative py-2 px-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
                                >
                                  {/* Conector visual de rama */}
                                  <span className="text-indigo-400/50 font-mono text-xs select-none mr-1">
                                    {esUltimo ? '└─' : '├─'}
                                  </span>

                                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                                    <span className="font-mono font-bold text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      {inst.codigo}
                                    </span>
                                    <span className="text-xs font-semibold text-white">{inst.nombre}</span>

                                    {(catDef.codigo === 'CREDITO' || inst.diasCredito) && (
                                      <span className="text-[11px] font-bold text-yellow-300 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-700/50">
                                        ⏱ Plazo: {inst.diasCredito || 30} días de crédito
                                      </span>
                                    )}

                                    {inst.requiereReferencia ? (
                                      <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-700/40">
                                        Exige Referencia / Voucher
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                        Cobro Directo
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge variant={inst.activo ? 'success' : 'neutral'}>
                                      {inst.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4.3 CUENTAS DE RECAUDO BANCARIO */}
      {subCat === 'recaudos' && (
        <Card className="p-6 bg-gray-900/40 border border-white/10 max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Configuración de Recaudos / Cuentas de Cobro</h3>
            <p className="text-sm text-gray-400 mt-1">
              Información de la cuenta bancaria de la empresa donde los clientes transfieren y consignan los anticipos y pagos.
            </p>
          </div>

          {loadingBanco ? (
            <div className="p-8 text-center text-gray-400">Cargando datos de recaudo bancario...</div>
          ) : (
            <form onSubmit={handleGuardarBanco} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Entidad Bancaria"
                  required
                  placeholder="Ej: Bancolombia"
                  value={cuentaBancaria.banco}
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, banco: e.target.value })}
                  fullWidth
                />
                <Input
                  label="Número de Cuenta"
                  required
                  placeholder="Ej: 123-456789-01"
                  value={cuentaBancaria.numeroCuenta}
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, numeroCuenta: e.target.value })}
                  fullWidth
                />
                <Select
                  label="Tipo de Cuenta"
                  value={cuentaBancaria.tipoCuenta}
                  onChange={(val: any) => setCuentaBancaria({ ...cuentaBancaria, tipoCuenta: val?.target?.value ?? val })}
                  options={[
                    { label: 'Ahorros', value: 'Ahorros' },
                    { label: 'Corriente', value: 'Corriente' },
                  ]}
                  fullWidth
                />
                <Input
                  label="Titular de la Cuenta"
                  required
                  placeholder="Ej: Afilamos Hermanos S.A.S."
                  value={cuentaBancaria.titular}
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, titular: e.target.value })}
                  fullWidth
                />
                <Input
                  label="NIT / Cédula Titular"
                  required
                  placeholder="Ej: 900.123.456-7"
                  value={cuentaBancaria.nitTitular}
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, nitTitular: e.target.value })}
                  fullWidth
                />
                <Input
                  label="Billetera Digital / Celular"
                  placeholder="Ej: Nequi / Daviplata 3001234567"
                  value={cuentaBancaria.billeteraDigital || ''}
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, billeteraDigital: e.target.value })}
                  fullWidth
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="primary" type="submit" disabled={guardandoBanco}>
                  {guardandoBanco ? 'Guardando...' : 'Guardar Datos de Recaudo'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}


      {/* 5.1 TIPOS & SUBTIPOS DE DOCUMENTO */}
      {subCat === 'tipos_subtipos' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Documentos base de operación y sus subtipos (prefijos, folios actuales y formato de papel).</p>

          <CRUDTable<SubtipoConTipoBase>
            data={todosSubtipos}
            columns={[
              {
                key: 'tipoBaseCodigo',
                label: 'Tipo Base',
                sortable: true,
                render: (_, row) => (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-blue-400">{row.tipoBaseCodigo}</span>
                    <span className="text-gray-400 text-xs">· {row.tipoBaseNombre}</span>
                  </div>
                ),
              },
              {
                key: 'codigoSubtipo',
                label: 'Cód. Subtipo',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{String(v)}</span>,
              },
              {
                key: 'nombre',
                label: 'Nombre',
                sortable: true,
                render: (v) => <span className="text-white font-medium">{String(v)}</span>,
              },
              {
                key: 'prefijo',
                label: 'Prefijo',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-amber-300">{String(v || '-')}</span>,
              },
              {
                key: 'folioActual',
                label: 'Folio Actual',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-emerald-400">{Number(v || 0)}</span>,
              },
              {
                key: 'formatoPapel',
                label: 'Formato',
                sortable: true,
                render: (v) => <span className="text-gray-300 text-xs">{String(v)}</span>,
              },
              {
                key: 'imprimeAlAsentar',
                label: 'Imprime al Asentar',
                render: (v) => (
                  <Badge variant={v ? 'info' : 'neutral'}>
                    {v ? 'Sí' : 'No'}
                  </Badge>
                ),
              },
              {
                key: 'activo',
                label: 'Estado',
                sortable: true,
                render: (v) => (
                  <Badge variant={v ? 'success' : 'neutral'}>
                    {v ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
              },
            ]}
            loading={loadingTiposDocBase}
            onCreate={() => setMostrarModalSubtipo(true)}
            createLabel="+ Nuevo Subtipo de Documento"
            searchable={true}
            searchPlaceholder="Buscar subtipo por nombre, código o prefijo..."
            filters={[
              {
                key: 'tipoBaseCodigo',
                label: 'Tipo Base',
                type: 'select',
                options: tiposDocBase.map((tb) => ({
                  label: `${tb.codigoBase} - ${tb.nombre}`,
                  value: tb.codigoBase,
                })),
              },
            ]}
            pagination={true}
            pageSize={8}
            rowActions={[
              {
                id: 'editar_subtipo',
                label: 'Editar Subtipo',
                icon: <span>✏️</span>,
                tooltip:
                  'Editar datos, saltar consecutivo o eliminar (física/lógica) el subtipo documental',
                variant: 'primary',
                onClick: (row) => {
                  setSubtipoEditando(row);
                  setMostrarModalEditarSubtipo(true);
                },
              },
            ]}
            emptyMessage="No se encontraron subtipos de documento registrados."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* 5.2 PARÁMETROS GLOBALES DEL SISTEMA */}
      {subCat === 'parametros' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Parámetros técnicos y reglas de negocio del sistema.</p>

          <CRUDTable<ParametroSistema>
            data={parametros}
            columns={[
              {
                key: 'clave',
                label: 'Clave',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-blue-300">{String(v)}</span>,
              },
              {
                key: 'categoria',
                label: 'Categoría',
                sortable: true,
                render: (v) => (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                    {String(v)}
                  </span>
                ),
              },
              {
                key: 'descripcion',
                label: 'Descripción',
                render: (v) => <span className="text-gray-300 text-xs max-w-xs">{String(v)}</span>,
              },
              {
                key: 'valorJson',
                label: 'Valor Actual',
                render: (v) => <span className="font-mono text-emerald-400 text-xs">{String(v)}</span>,
              },
              {
                key: 'uuid',
                label: 'Acción',
                align: 'right',
                render: (_, row) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setParametroTarget(row);
                      setNuevoValorParametro(typeof row.valorJson === 'string' ? row.valorJson : JSON.stringify(row.valorJson, null, 2));
                    }}
                  >
                    Editar Valor
                  </Button>
                ),
              },
            ]}
            loading={loadingParametros}
            searchable={true}
            searchPlaceholder="Buscar parámetro por clave o descripción..."
            filters={[
              {
                key: 'categoria',
                label: 'Categoría',
                type: 'select',
                options: Array.from(new Set(parametros.map((p) => p.categoria))).map((cat) => ({
                  label: cat,
                  value: cat,
                })),
              },
            ]}
            pagination={true}
            pageSize={10}
            rowActions={[
              {
                id: 'configurar_parametro',
                label: 'Configurar Regla',
                icon: <span>⚙️</span>,
                tooltip: 'Configurar regla con formulario dinámico e inteligente',
                variant: 'primary',
                onClick: (row) => {
                  setParametroDinamicoTarget(row);
                  setMostrarModalParametroDinamico(true);
                },
              },
            ]}
            emptyMessage="No se encontraron parámetros registrados."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
        </div>
      )}

      {/* ========================================== */}
      {/* MODALES DE CREACIÓN Y EDICIÓN (DESIGN SYSTEM) */}
      {/* ========================================== */}

      {/* Modal 1: Nuevo Usuario */}
      <Modal
        isOpen={mostrarModalUsuario}
        onClose={() => setMostrarModalUsuario(false)}
        title="Nuevo Usuario / Cajero"
        size="md"
      >
        <form onSubmit={handleCrearUsuario} className="space-y-4 p-4">
          <Input
            label="Código de Operario"
            required
            placeholder="Ej: CAJERO_02"
            value={nuevoUsuario.codigo}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre Completo"
            required
            placeholder="Ej: Carlos Gómez"
            value={nuevoUsuario.nombreCompleto}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombreCompleto: e.target.value })}
            fullWidth
          />
          <Input
            type="email"
            label="Email Institucional"
            required
            placeholder="Ej: cajero2@afilamos.com"
            value={nuevoUsuario.email}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
            fullWidth
          />
          <Input
            type="password"
            label="Contraseña Inicial"
            required
            placeholder="••••••••"
            value={nuevoUsuario.password}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
            fullWidth
          />
          <Select
            label="Rol Asignado"
            value={nuevoUsuario.rol}
            onChange={(val: any) => setNuevoUsuario({ ...nuevoUsuario, rol: val?.target?.value ?? val })}
            options={roles.map((r) => ({ label: r, value: r }))}
            fullWidth
          />
          <Input
            type="password"
            label="PIN Numérico (4-6 dígitos)"
            maxLength={6}
            placeholder="Ej: 1234"
            value={nuevoUsuario.pin}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, pin: e.target.value })}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalUsuario(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Reset PIN */}
      <Modal
        isOpen={!!usuarioPinTarget}
        onClose={() => setUsuarioPinTarget(null)}
        title={`Resetear PIN de ${usuarioPinTarget?.codigo ?? ''}`}
        size="sm"
      >
        <form onSubmit={handleResetPin} className="space-y-4 p-4">
          <Input
            type="password"
            label="Nuevo PIN (4 a 6 dígitos)"
            required
            maxLength={6}
            placeholder="••••"
            value={nuevoPin}
            onChange={(e) => setNuevoPin(e.target.value)}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setUsuarioPinTarget(null)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar PIN
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Nuevo Cliente Unificado */}
      <RegistroClienteModal
        isOpen={mostrarModalCliente}
        onClose={() => setMostrarModalCliente(false)}
        tiposDocumento={tiposDocId}
        onClienteCreado={(cl) => {
          setSuccessMsg(`Cliente '${cl.nombreRazonSocial}' registrado exitosamente.`);
          setMostrarModalCliente(false);
          cargarSubCatalogo('clientes');
        }}
      />

      {/* Modal 4: Historial Cliente */}
      <Modal
        isOpen={!!clienteHistoricoSeleccionado}
        onClose={() => setClienteHistoricoSeleccionado(null)}
        title={clienteHistoricoSeleccionado ? `${clienteHistoricoSeleccionado.nombreRazonSocial}` : ''}
        size="lg"
      >
        {clienteHistoricoSeleccionado && (
          <div className="space-y-4 p-4">
            <p className="text-xs text-gray-400 font-mono">
              {clienteHistoricoSeleccionado.tipoDocumento?.codigo ?? 'CC'}: {clienteHistoricoSeleccionado.numeroDocumento} · Tel: {clienteHistoricoSeleccionado.telefono || 'N/A'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                <div className="text-xs text-gray-400">Total Solicitudes</div>
                <div className="text-lg font-bold text-white">{clienteHistoricoSeleccionado.totalSolicitudes}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                <div className="text-xs text-gray-400">OTs en Taller</div>
                <div className="text-lg font-bold text-primary-400">{clienteHistoricoSeleccionado.otsEnProceso}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                <div className="text-xs text-gray-400">Total Consumido</div>
                <div className="text-lg font-bold text-emerald-400">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(clienteHistoricoSeleccionado.totalHistoricoGastado)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Historial de Órdenes & Solicitudes</h4>
              {clienteHistoricoSeleccionado.documentos.length === 0 ? (
                <EmptyState title="Sin solicitudes previas" description="No hay órdenes registradas para este cliente." variant="info" size="sm" />
              ) : (
                <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
                  {clienteHistoricoSeleccionado.documentos.map((d) => (
                    <div key={d.uuid} className="p-3 bg-black/20 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{d.numeroDocumentoVisible} ({d.subtipoCodigo})</div>
                        <div className="text-gray-500">{new Date(d.fechaEmision).toLocaleDateString('es-CO')} · {d.cantidadItems} ítems</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-emerald-400">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(d.montoTotal)}
                        </div>
                        <Badge variant={d.estado === 'ASENTADO' ? 'success' : 'neutral'}>{d.estado}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setClienteHistoricoSeleccionado(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 5: Crear / Editar Ítem */}
      <Modal
        isOpen={mostrarModalItem}
        onClose={() => {
          setMostrarModalItem(false);
          setItemEditando(null);
        }}
        title={itemEditando ? `✏️ Editar Ítem: ${itemEditando.codigoReferencia}` : 'Nuevo Ítem o Servicio'}
        size="lg"
      >
        <form onSubmit={handleGuardarItem} className="space-y-4 p-2">
          {/* Sección 1: Identificación Básica */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>📋</span> 1. Identificación Básica del Ítem
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Código de Referencia *"
                required
                placeholder="Ej: SRV-AFIL-CIRCULAR"
                value={nuevoItem.codigoReferencia}
                disabled={Boolean(itemEditando)}
                onChange={(e) => setNuevoItem({ ...nuevoItem, codigoReferencia: e.target.value.toUpperCase() })}
                fullWidth
              />
              <Select
                label="Naturaleza del Ítem *"
                value={nuevoItem.naturaleza}
                disabled={Boolean(itemEditando)}
                onChange={(val: any) => setNuevoItem({ ...nuevoItem, naturaleza: (val?.target?.value ?? val) as any })}
                options={[
                  { label: '🛠️ SERVICIO (Taller / OTs de Afilado)', value: 'SERVICIO' },
                  { label: '📦 INVENTARIO (Producto Físico Comercial)', value: 'INVENTARIO' },
                ]}
                fullWidth
              />
            </div>

            <Input
              label="Nombre Comercial *"
              required
              placeholder="Ej: Afilado de Disco de Sierra Widia 10''"
              value={nuevoItem.nombre}
              onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
              fullWidth
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descripción / Especificaciones Técnicas
              </label>
              <textarea
                placeholder="Detalles sobre ángulo, diámetro, desbaste o características del producto..."
                value={nuevoItem.descripcion}
                onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-y focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Sección 2: Precios y Presentación */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>🏷️</span> 2. Categorización & Precios Comerciales
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Categoría del Catálogo"
                value={nuevoItem.categoriaUuid}
                onChange={(val: any) => setNuevoItem({ ...nuevoItem, categoriaUuid: val?.target?.value ?? val })}
                options={[
                  { label: '— Sin categoría principal —', value: '' },
                  ...categoriasItems.map((c) => ({
                    label: `${'—'.repeat(c.nivel - 1)} ${c.nombre} (${c.codigo})`,
                    value: c.uuid,
                  })),
                ]}
                fullWidth
              />
              <Select
                label="Lista de Precios Predeterminada"
                value={nuevoItem.listaPrecioUuid}
                onChange={(val: any) => setNuevoItem({ ...nuevoItem, listaPrecioUuid: val?.target?.value ?? val })}
                options={[
                  { label: 'Precio General Estándar (Sin Ajuste)', value: '' },
                  ...listasPrecio.map((lp) => ({
                    label: `${lp.nombre} (${lp.codigo}) ${lp.porcentajeAjuste >= 0 ? `(+${lp.porcentajeAjuste}%)` : `(${lp.porcentajeAjuste}%)`}`,
                    value: lp.uuid,
                  })),
                ]}
                fullWidth
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Unidad de Presentación *"
                value={nuevoItem.uuidUnidadPresentacion}
                onChange={(val: any) => setNuevoItem({ ...nuevoItem, uuidUnidadPresentacion: val?.target?.value ?? val })}
                options={(unidades || []).map((u) => ({ label: `${u.nombre} (${u.abreviatura})`, value: u.uuid }))}
                fullWidth
              />
              <Input
                type="number"
                min="0"
                step="500"
                label="Precio Base sin Impuestos (COP) *"
                required
                value={nuevoItem.precioBase}
                onChange={(e) => setNuevoItem({ ...nuevoItem, precioBase: Number(e.target.value) })}
                fullWidth
              />
            </div>
          </div>

          {/* Sección 3: Parámetros Operativos */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>⚙️</span> 3. Parámetros Operativos & Taller
            </h4>
            {nuevoItem.naturaleza === 'SERVICIO' ? (
              <Select
                label="Workflow de Etapas en Taller *"
                value={nuevoItem.workflowDefinicionUuid}
                onChange={(val: any) => setNuevoItem({ ...nuevoItem, workflowDefinicionUuid: val?.target?.value ?? val })}
                options={[
                  { label: 'Flujo Estándar de Taller (Recepción -> Afilado -> Control -> Entrega)', value: '' },
                  ...workflows.map((w) => ({ label: `${w.codigo} - ${w.nombre} (v${w.versionNumero})`, value: w.uuid }))
                ]}
                fullWidth
              />
            ) : (
              <Input
                type="number"
                min="0"
                label="Stock Referencial Físico Inicial"
                placeholder="0"
                value={nuevoItem.stockReferencial ?? ''}
                onChange={(e) => setNuevoItem({ ...nuevoItem, stockReferencial: e.target.value ? Number(e.target.value) : undefined })}
                fullWidth
              />
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setMostrarModalItem(false);
                setItemEditando(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {itemEditando ? 'Actualizar Ítem' : 'Guardar Ítem'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 5B: Aumentar Lista de Precios */}
      <Modal
        isOpen={mostrarModalAumentoLista}
        onClose={() => setMostrarModalAumentoLista(false)}
        title="📈 Aumentar Lista de Precios"
        size="md"
      >
        <form onSubmit={handleAplicarAumentoLista} className="space-y-4 p-4">
          <p className="text-xs text-slate-400">
            Aplica un incremento porcentual masivo a los precios vigentes de los ítems adscritos a la lista seleccionada.
          </p>
          <Select
            label="Lista de Precios a Incrementar"
            value={aumentoListaForm.listaUuid}
            onChange={(val: any) => setAumentoListaForm({ ...aumentoListaForm, listaUuid: val?.target?.value ?? val })}
            options={listasPrecio.map((lp) => ({
              label: `${lp.nombre} (${lp.codigo}) ${lp.porcentajeAjuste >= 0 ? `(+${lp.porcentajeAjuste}%)` : `(${lp.porcentajeAjuste}%)`}`,
              value: lp.uuid,
            }))}
            fullWidth
            required
          />
          <Input
            type="number"
            step="0.5"
            label="Porcentaje de Incremento (%)"
            required
            placeholder="Ej: 5.5"
            value={aumentoListaForm.porcentajeAumento}
            onChange={(e) => setAumentoListaForm({ ...aumentoListaForm, porcentajeAumento: Number(e.target.value) })}
            helperText="Ejemplo: un valor de 10 incrementará los precios en un 10%."
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalAumentoLista(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Aplicar Incremento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Nueva Caja */}
      <Modal
        isOpen={mostrarModalCaja}
        onClose={() => setMostrarModalCaja(false)}
        title="Nueva Caja de Mostrador"
        size="md"
      >
        <form onSubmit={handleCrearCaja} className="space-y-4 p-4">
          <Input
            label="Código de Caja"
            required
            placeholder="Ej: CAJA-02"
            value={nuevaCaja.codigoCaja}
            onChange={(e) => setNuevaCaja({ ...nuevaCaja, codigoCaja: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre Descriptivo"
            required
            placeholder="Ej: Caja Mostrador Secundaria"
            value={nuevaCaja.nombre}
            onChange={(e) => setNuevaCaja({ ...nuevaCaja, nombre: e.target.value })}
            fullWidth
          />
          <Input
            label="Ubicación Física"
            placeholder="Ej: Recepción Taller"
            value={nuevaCaja.ubicacion}
            onChange={(e) => setNuevaCaja({ ...nuevaCaja, ubicacion: e.target.value })}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalCaja(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Caja
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 7: Nueva Unidad */}
      <Modal
        isOpen={mostrarModalUnidad}
        onClose={() => setMostrarModalUnidad(false)}
        title="Nueva Unidad de Medida"
        size="md"
      >
        <form onSubmit={handleCrearUnidad} className="space-y-4 p-4">
          <Input
            label="Código"
            required
            placeholder="Ej: METRO"
            value={nuevaUnidad.codigo}
            onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre"
            required
            placeholder="Ej: Metro Lineal"
            value={nuevaUnidad.nombre}
            onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, nombre: e.target.value })}
            fullWidth
          />
          <Input
            label="Abreviatura"
            required
            placeholder="Ej: MT"
            value={nuevaUnidad.abreviatura}
            onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, abreviatura: e.target.value.toUpperCase() })}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalUnidad(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Unidad
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 8: Nuevo Canal */}
      <Modal
        isOpen={mostrarModalCanal}
        onClose={() => setMostrarModalCanal(false)}
        title="Nuevo Canal de Origen"
        size="md"
      >
        <form onSubmit={handleCrearCanal} className="space-y-4 p-4">
          <Input
            label="Código de Canal"
            required
            placeholder="Ej: WHATSAPP"
            value={nuevoCanal.codigo}
            onChange={(e) => setNuevoCanal({ ...nuevoCanal, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre Descriptivo"
            required
            placeholder="Ej: Atención por WhatsApp"
            value={nuevoCanal.nombre}
            onChange={(e) => setNuevoCanal({ ...nuevoCanal, nombre: e.target.value })}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalCanal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Canal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 9: Nuevo Instrumento de Pago */}
      <Modal
        isOpen={mostrarModalInstrumento}
        onClose={() => setMostrarModalInstrumento(false)}
        title="Nuevo Instrumento de Pago"
        size="md"
      >
        <form onSubmit={handleCrearInstrumento} className="space-y-4 p-4">
          <Select
            label="Categoría Base (Rama del Árbol)"
            value={nuevoInstrumento.codigoCategoria}
            onChange={(val: any) => {
              const v = typeof val === 'string' ? val : val?.target?.value;
              setNuevoInstrumento({
                ...nuevoInstrumento,
                codigoCategoria: v,
                diasCredito: v === 'CREDITO' ? (nuevoInstrumento.diasCredito || 30) : undefined,
                requiereReferencia: v !== 'EFECTIVO',
              });
            }}
            options={[
              { label: 'Efectivo & Caja Menor', value: 'EFECTIVO' },
              { label: 'Consignación / Transferencia Bancaria', value: 'BANCOS' },
              { label: 'Tarjeta Débito / Crédito (Datáfono)', value: 'TARJETAS' },
              { label: 'Billetera Digital (Nequi / Daviplata)', value: 'BILLETERAS' },
              { label: 'Crédito Comercial (Plazo en Días)', value: 'CREDITO' },
              { label: 'Otro Medio / Papelería', value: 'OTROS' },
            ]}
            fullWidth
          />
          <Input
            label="Código del Instrumento"
            required
            placeholder="Ej: DAVIPLATA, CRED-30D"
            value={nuevoInstrumento.codigo}
            onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre Descriptivo"
            required
            placeholder="Ej: Billetera Daviplata, Crédito 30 Días"
            value={nuevoInstrumento.nombre}
            onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, nombre: e.target.value })}
            fullWidth
          />

          {nuevoInstrumento.codigoCategoria === 'CREDITO' && (
            <div style={{ background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }} className="space-y-2">
              <Input
                label="Días de Crédito Disponibles *"
                type="number"
                min={1}
                max={365}
                required
                value={nuevoInstrumento.diasCredito ?? 30}
                onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, diasCredito: parseInt(e.target.value, 10) || 0 })}
                fullWidth
              />
              <p className="text-[11px] text-amber-300">
                Define el número máximo de días calendario otorgados al cliente para cancelar el saldo pendiente de la factura.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="reqRef"
              checked={nuevoInstrumento.requiereReferencia}
              onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, requiereReferencia: e.target.checked })}
              className="rounded border-gray-700 text-primary-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="reqRef" className="text-xs text-gray-300 cursor-pointer">
              Exige comprobante o referencia de transacción
            </label>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalInstrumento(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Instrumento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 10: Nuevo Subtipo de Documento */}
      <Modal
        isOpen={mostrarModalSubtipo}
        onClose={() => setMostrarModalSubtipo(false)}
        title="Nuevo Subtipo de Documento"
        size="md"
      >
        <form onSubmit={handleCrearSubtipo} className="space-y-4 p-4">
          <Select
            label="Tipo Base"
            value={uuidTipoBaseTarget}
            onChange={(val: any) => setUuidTipoBaseTarget(val?.target?.value ?? val)}
            options={tiposDocBase.map((tb) => ({ label: `${tb.codigoBase} - ${tb.nombre}`, value: tb.uuid }))}
            fullWidth
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Código Subtipo"
              required
              placeholder="Ej: REC-CAJA-01"
              value={nuevoSubtipo.codigoSubtipo}
              onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, codigoSubtipo: e.target.value.toUpperCase() })}
              fullWidth
            />
            <Input
              label="Prefijo"
              required
              placeholder="Ej: RC"
              value={nuevoSubtipo.prefijo}
              onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, prefijo: e.target.value.toUpperCase() })}
              fullWidth
            />
          </div>
          <Input
            label="Nombre Descriptivo"
            required
            placeholder="Ej: Recibo de Caja Mostrador"
            value={nuevoSubtipo.nombre}
            onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, nombre: e.target.value })}
            fullWidth
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Formato Papel"
              value={nuevoSubtipo.formatoPapel}
              onChange={(val: any) => setNuevoSubtipo({ ...nuevoSubtipo, formatoPapel: val?.target?.value ?? val })}
              options={[
                { label: 'Tirilla POS 80mm', value: 'TIRILLA' },
                { label: 'Media Carta', value: 'MEDIA_CARTA' },
                { label: 'Carta Completa', value: 'CARTA' },
              ]}
              fullWidth
            />
            <Input
              label="Plantilla"
              value={nuevoSubtipo.formatoPlantilla}
              onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, formatoPlantilla: e.target.value })}
              fullWidth
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalSubtipo(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Subtipo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 11: Editar Parámetro */}
      <Modal
        isOpen={!!parametroTarget}
        onClose={() => setParametroTarget(null)}
        title={`Editar Parámetro: ${parametroTarget?.clave ?? ''}`}
        size="md"
      >
        <div className="space-y-4 p-4">
          <p className="text-xs text-gray-400">{parametroTarget?.descripcion}</p>
          <form onSubmit={handleGuardarParametro} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Valor JSON / Configuración</label>
              <textarea
                rows={4}
                required
                value={nuevoValorParametro}
                onChange={(e) => setNuevoValorParametro(e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setParametroTarget(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Actualizar Parámetro
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal 12: Nuevo Tipo Doc Identidad */}
      <Modal
        isOpen={mostrarModalTipoDocId}
        onClose={() => setMostrarModalTipoDocId(false)}
        title="Nuevo Tipo de Documento de Identidad"
        size="md"
      >
        <form onSubmit={handleCrearTipoDocId} className="space-y-4 p-4">
          <Input
            label="Código"
            required
            placeholder="Ej: PPT"
            value={nuevoTipoDocId.codigo}
            onChange={(e) => setNuevoTipoDocId({ ...nuevoTipoDocId, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre"
            required
            placeholder="Ej: Permiso por Protección Temporal"
            value={nuevoTipoDocId.nombre}
            onChange={(e) => setNuevoTipoDocId({ ...nuevoTipoDocId, nombre: e.target.value })}
            fullWidth
          />
          <Select
            label="Aplica Persona"
            value={nuevoTipoDocId.aplicaPersona}
            onChange={(val: any) => setNuevoTipoDocId({ ...nuevoTipoDocId, aplicaPersona: (typeof val === 'string' ? val : val?.target?.value) as any })}
            options={[
              { label: 'Persona Natural', value: 'NATURAL' },
              { label: 'Persona Jurídica', value: 'JURIDICA' },
            ]}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalTipoDocId(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Tipo Doc
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 13: Nuevo Workflow Borrador */}
      <Modal
        isOpen={mostrarModalNuevoWf}
        onClose={() => setMostrarModalNuevoWf(false)}
        title="Nuevo Borrador de Workflow"
        size="md"
      >
        <form onSubmit={handleCrearWorkflowBorrador} className="space-y-4 p-4">
          <Input
            label="Código del Workflow"
            required
            placeholder="Ej: TALLER-ESPECIAL"
            value={nuevoWf.codigo}
            onChange={(e) => setNuevoWf({ ...nuevoWf, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre Descriptivo"
            required
            placeholder="Ej: Flujo de Afilado Especializado"
            value={nuevoWf.nombre}
            onChange={(e) => setNuevoWf({ ...nuevoWf, nombre: e.target.value })}
            fullWidth
          />
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Descripción</label>
            <textarea
              placeholder="Detalles del proceso técnico..."
              value={nuevoWf.descripcion || ''}
              onChange={(e) => setNuevoWf({ ...nuevoWf, descripcion: e.target.value })}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalNuevoWf(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Borrador
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 14: Matriz de Permisos por Rol (Checkboxes Grid) */}
      <Modal
        isOpen={!!rolEdicionTarget}
        onClose={() => setRolEdicionTarget(null)}
        title={`Matriz de Permisos: ${rolEdicionTarget?.nombre ?? ''}`}
        size="lg"
      >
        {rolEdicionTarget && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/80 p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{rolEdicionTarget.icono}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{rolEdicionTarget.nombre}</h3>
                    <Badge variant={rolEdicionTarget.badge}>{rolEdicionTarget.nombre}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{rolEdicionTarget.descripcion}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const modulosActualizados: Record<string, PermisosAcciones> = {};
                    MODULOS_SISTEMA.forEach((m) => {
                      modulosActualizados[m.id] = {
                        navegar: true,
                        crear: true,
                        editar: true,
                        anular: true,
                        vobo: true,
                      };
                    });
                    setRolEdicionTarget({
                      ...rolEdicionTarget,
                      modulos: modulosActualizados,
                    });
                  }}
                >
                  ✓ Marcar Todo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const modulosActualizados: Record<string, PermisosAcciones> = {};
                    MODULOS_SISTEMA.forEach((m) => {
                      modulosActualizados[m.id] = {
                        navegar: true,
                        crear: false,
                        editar: false,
                        anular: false,
                        vobo: false,
                      };
                    });
                    setRolEdicionTarget({
                      ...rolEdicionTarget,
                      modulos: modulosActualizados,
                    });
                  }}
                >
                  👁️ Solo Ver
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const modulosActualizados: Record<string, PermisosAcciones> = {};
                    MODULOS_SISTEMA.forEach((m) => {
                      modulosActualizados[m.id] = {
                        navegar: false,
                        crear: false,
                        editar: false,
                        anular: false,
                        vobo: false,
                      };
                    });
                    setRolEdicionTarget({
                      ...rolEdicionTarget,
                      modulos: modulosActualizados,
                    });
                  }}
                >
                  ✕ Desmarcar Todo
                </Button>
              </div>
            </div>

            {/* Grid Interactivo de Permisos con Checks */}
            <div className="overflow-x-auto border border-white/10 rounded-xl bg-gray-950/60 shadow-inner">
              <table className="min-w-full divide-y divide-white/10 text-xs">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-200">Módulo / Pantalla</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-200">Ver / Navegar</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-200">Crear</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-200">Editar</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-200">Anular</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-200">VoBo Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {MODULOS_SISTEMA.map((mod) => {
                    const perms = rolEdicionTarget.modulos?.[mod.id] || {
                      navegar: false,
                      crear: false,
                      editar: false,
                      anular: false,
                      vobo: false,
                    };

                    const handleToggle = (campo: keyof PermisosAcciones) => {
                      setRolEdicionTarget({
                        ...rolEdicionTarget,
                        modulos: {
                          ...rolEdicionTarget.modulos,
                          [mod.id]: {
                            ...perms,
                            [campo]: !perms[campo],
                          },
                        },
                      });
                    };

                    return (
                      <tr key={mod.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2.5">
                          <span className="text-base">{mod.icono}</span>
                          <span>{mod.nombre}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perms.navegar}
                            onChange={() => handleToggle('navegar')}
                            className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-white/20 focus:ring-blue-500 cursor-pointer accent-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perms.crear}
                            onChange={() => handleToggle('crear')}
                            className="w-4 h-4 rounded text-emerald-600 bg-gray-800 border-white/20 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perms.editar}
                            onChange={() => handleToggle('editar')}
                            className="w-4 h-4 rounded text-amber-600 bg-gray-800 border-white/20 focus:ring-amber-500 cursor-pointer accent-amber-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perms.anular}
                            onChange={() => handleToggle('anular')}
                            className="w-4 h-4 rounded text-rose-600 bg-gray-800 border-white/20 focus:ring-rose-500 cursor-pointer accent-rose-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={perms.vobo}
                            onChange={() => handleToggle('vobo')}
                            className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-white/20 focus:ring-purple-500 cursor-pointer accent-purple-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setRolEdicionTarget(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => handleGuardarPermisosRol(rolEdicionTarget)}>
                Guardar Matriz de Permisos
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 15: Nuevo Rol */}
      <Modal
        isOpen={mostrarModalNuevoRol}
        onClose={() => setMostrarModalNuevoRol(false)}
        title="Crear Nuevo Rol del Sistema"
        size="md"
      >
        <form onSubmit={handleCrearNuevoRol} className="space-y-4 p-4">
          <Input
            label="Nombre del Rol"
            required
            placeholder="Ej: Asistente de Taller"
            value={nuevoRolForm.nombre}
            onChange={(e) => setNuevoRolForm({ ...nuevoRolForm, nombre: e.target.value })}
            fullWidth
          />
          <Input
            label="Descripción del Rol"
            placeholder="Ej: Personal encargado de recepción y clasificación de herramientas."
            value={nuevoRolForm.descripcion}
            onChange={(e) => setNuevoRolForm({ ...nuevoRolForm, descripcion: e.target.value })}
            fullWidth
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Distintivo Visual (Badge)"
              value={nuevoRolForm.badge}
              onChange={(val: any) => setNuevoRolForm({ ...nuevoRolForm, badge: (val?.target?.value ?? val) as any })}
              options={[
                { label: 'Información (Azul)', value: 'info' },
                { label: 'Éxito (Verde)', value: 'success' },
                { label: 'Advertencia (Ámbar)', value: 'warning' },
                { label: 'Peligro / Crítico (Rojo)', value: 'danger' },
                { label: 'Neutral (Gris)', value: 'neutral' },
              ]}
              fullWidth
            />
            <Select
              label="Ícono Representativo"
              value={nuevoRolForm.icono}
              onChange={(val: any) => setNuevoRolForm({ ...nuevoRolForm, icono: val?.target?.value ?? val })}
              options={[
                { label: '🛡️ Escudo', value: '🛡️' },
                { label: '⭐ Estrella', value: '⭐' },
                { label: '💰 Caja', value: '💰' },
                { label: '🛠️ Herramientas', value: '🛠️' },
                { label: '📋 Lista', value: '📋' },
                { label: '🏷️ Etiqueta', value: '🏷️' },
                { label: '👤 Usuario', value: '👤' },
              ]}
              fullWidth
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalNuevoRol(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Rol &amp; Configurar Permisos
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 16: Detalle y Gestión Avanzada de Workflow (tipo Jira / DevOps / Trello) */}
      <Modal
        isOpen={mostrarModalDetalleWf && !!workflowSeleccionado}
        onClose={() => {
          setMostrarModalDetalleWf(false);
          setEditandoInfoWf(false);
        }}
        title={`Flujo Técnico: ${workflowSeleccionado?.codigo ?? ''} - ${workflowSeleccionado?.nombre ?? ''}`}
        size="lg"
      >
        {workflowSeleccionado && (
          <div className="p-4 space-y-5">
            {/* Cabecera del Workflow */}
            <div className="bg-gray-900/80 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-white text-lg">{workflowSeleccionado.codigo}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-blue-300 font-mono font-bold border border-white/10">
                      v{workflowSeleccionado.versionNumero}
                    </span>
                    <Badge variant={workflowSeleccionado.esVigente ? 'success' : workflowSeleccionado.activo ? 'warning' : 'neutral'}>
                      {workflowSeleccionado.esVigente ? 'PUBLICADO' : workflowSeleccionado.activo ? 'BORRADOR' : 'RETIRADO'}
                    </Badge>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono border border-slate-700">
                      📦 {workflowSeleccionado.serviciosVinculados?.length ?? workflowSeleccionado.serviciosVinculadosCount ?? 0} servicios asociados
                    </span>
                  </div>
                  {!editandoInfoWf && (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-white">{workflowSeleccionado.nombre}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{workflowSeleccionado.descripcion || 'Sin descripción técnica adicional.'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditandoInfoWf(!editandoInfoWf)}
                  >
                    {editandoInfoWf ? '✕ Cancelar Edición' : '✏️ Editar Info'}
                  </Button>

                  {!workflowSeleccionado.esVigente && workflowSeleccionado.activo && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handlePublicarWorkflow(workflowSeleccionado)}
                    >
                      🚀 Publicar
                    </Button>
                  )}

                  {workflowSeleccionado.esVigente && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetirarWorkflow(workflowSeleccionado)}
                    >
                      ⏸️ Retirar
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminarWorkflow(workflowSeleccionado)}
                  >
                    🗑️
                  </Button>
                </div>
              </div>

              {/* Formulario de edición rápida de información general */}
              {editandoInfoWf && (
                <form onSubmit={handleGuardarInfoWorkflow} className="pt-3 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Nombre del Workflow"
                      required
                      value={formEditarWf.nombre ?? ''}
                      onChange={(e) => setFormEditarWf({ ...formEditarWf, nombre: e.target.value })}
                      fullWidth
                    />
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Descripción Técnica</label>
                      <input
                        type="text"
                        value={formEditarWf.descripcion ?? ''}
                        onChange={(e) => setFormEditarWf({ ...formEditarWf, descripcion: e.target.value })}
                        className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Descripción del flujo técnico..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEditarWf.activo ?? true}
                        onChange={(e) => setFormEditarWf({ ...formEditarWf, activo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-white/20 accent-blue-500"
                      />
                      <span>Workflow activo y disponible</span>
                    </label>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setEditandoInfoWf(false)}>
                        Cancelar
                      </Button>
                      <Button variant="primary" size="sm" type="submit">
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Pestañas de Navegación del Modal */}
            <div className="flex border-b border-white/10 gap-2">
              <button
                type="button"
                onClick={() => setPestañaWf('etapas')}
                className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                  pestañaWf === 'etapas'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span>🛠️ Secuencia de Etapas &amp; Roles</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gray-800 text-[10px] font-mono">
                  {workflowSeleccionado.etapas?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPestañaWf('servicios')}
                className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                  pestañaWf === 'servicios'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span>📦 Servicios del Catálogo Vinculados</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gray-800 text-[10px] font-mono">
                  {workflowSeleccionado.serviciosVinculados?.length ?? workflowSeleccionado.serviciosVinculadosCount ?? 0}
                </span>
              </button>
            </div>

            {/* Pestaña 1: Etapas y Roles Técnicos */}
            {pestañaWf === 'etapas' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    Define la secuencia de etapas, roles autorizados para avanzar y tiempos SLA estimados.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleAbrirCrearPaso}>
                    + Agregar Etapa / Paso
                  </Button>
                </div>

                {workflowSeleccionado.etapas?.length === 0 ? (
                  <div className="p-8 text-center bg-gray-900/40 rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-gray-400">Este workflow no tiene etapas configuradas.</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={handleAbrirCrearPaso}>
                      + Crear Primer Paso
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {workflowSeleccionado.etapas.map((et, idx) => {
                      const esPrimero = idx === 0;
                      const esUltimo = idx === workflowSeleccionado.etapas.length - 1;

                      return (
                        <div
                          key={et.uuid}
                          className="p-3.5 bg-gray-900/70 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-white/20 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500 text-blue-300 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-white">{et.nombre}</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-white/5">
                                  {et.codigo}
                                </span>
                                {esUltimo ? (
                                  <Badge variant="success">🏁 Final (Despacho)</Badge>
                                ) : (
                                  <span className="text-xs text-gray-400 font-mono">Paso {idx + 1} ➜</span>
                                )}
                              </div>
                              {et.descripcion && (
                                <p className="text-xs text-gray-400 mt-1">{et.descripcion}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-indigo-300 border border-slate-700">
                                  {et.rolRequerido === 'SUPERVISOR' && '⭐ Supervisor Técnico'}
                                  {et.rolRequerido === 'CALIDAD' && '🔬 Control de Calidad'}
                                  {et.rolRequerido === 'OPERARIO' && '⚙️ Operario de Taller'}
                                  {et.rolRequerido === 'ADMIN' && '🛡️ Administrador'}
                                  {(!et.rolRequerido || et.rolRequerido === 'TALLER') && '🛠️ Taller General'}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ⏱️ SLA Estimado: {et.tiempoEstimadoMinutos || 30} min
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              disabled={esPrimero}
                              onClick={() => handleMoverPaso(idx, 'arriba')}
                              title="Mover etapa hacia arriba"
                              className={`p-1.5 rounded-lg border text-xs ${
                                esPrimero
                                  ? 'border-transparent text-gray-600 cursor-not-allowed'
                                  : 'border-white/10 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              disabled={esUltimo}
                              onClick={() => handleMoverPaso(idx, 'abajo')}
                              title="Mover etapa hacia abajo"
                              className={`p-1.5 rounded-lg border text-xs ${
                                esUltimo
                                  ? 'border-transparent text-gray-600 cursor-not-allowed'
                                  : 'border-white/10 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              ⬇️
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAbrirEditarPaso(et)}
                              title="Editar etapa"
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleEliminarPaso(et)}
                              title="Eliminar etapa"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña 2: Servicios Vinculados */}
            {pestañaWf === 'servicios' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-200">
                  ℹ️ Cualquier solicitud de servicio que incluya uno de estos ítems ingresará al taller bajo este flujo de trabajo y seguirá sus etapas y roles configurados.
                </div>

                {/* Formulario de vinculación rápida */}
                <div className="p-3.5 bg-gray-900/60 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <Select
                      label="Seleccionar Servicio del Catálogo"
                      value={servicioParaVincular}
                      onChange={(val: any) => setServicioParaVincular(val?.target?.value ?? val)}
                      options={[
                        { label: '-- Selecciona un servicio para asociar --', value: '' },
                        ...items
                          .filter((it) => it.naturaleza === 'SERVICIO')
                          .filter((it) => !(workflowSeleccionado.serviciosVinculados || []).some((sv) => sv.id === it.uuid))
                          .map((it) => ({
                            label: `${it.codigoReferencia} - ${it.nombre} ($${Number(it.precioBase || 0).toLocaleString()})`,
                            value: it.uuid,
                          })),
                      ]}
                      fullWidth
                    />
                  </div>
                  <div className="sm:self-end w-full sm:w-auto">
                    <Button
                      variant="primary"
                      disabled={!servicioParaVincular || guardandoServicioWf}
                      onClick={handleVincularServicio}
                    >
                      {guardandoServicioWf ? 'Vinculando...' : '+ Vincular Servicio'}
                    </Button>
                  </div>
                </div>

                {/* Lista de servicios vinculados */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Servicios Asignados a este Flujo ({workflowSeleccionado.serviciosVinculados?.length || 0})
                  </h5>
                  {(!workflowSeleccionado.serviciosVinculados || workflowSeleccionado.serviciosVinculados.length === 0) ? (
                    <div className="p-6 text-center bg-gray-900/30 rounded-xl border border-white/5 text-xs text-gray-400">
                      No hay ítems de servicio asociados a este workflow actualmente.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {workflowSeleccionado.serviciosVinculados.map((sv) => (
                        <div
                          key={sv.id}
                          className="p-3 bg-gray-900/60 rounded-xl border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">⚙️</span>
                            <div>
                              <div className="text-sm font-semibold text-white flex items-center gap-2">
                                <span>{sv.name}</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-blue-300 border border-white/5">
                                  {sv.code}
                                </span>
                              </div>
                              {sv.description && (
                                <p className="text-xs text-gray-400 mt-0.5">{sv.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {sv.basePrice !== undefined && (
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                ${Number(sv.basePrice).toLocaleString()}
                              </span>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDesvincularServicio(sv.id, sv.name)}
                              title="Desasociar servicio del flujo"
                            >
                              ✕ Desvincular
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => {
                  setMostrarModalDetalleWf(false);
                  setEditandoInfoWf(false);
                }}
              >
                Cerrar Detalle
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 16.1: Crear / Editar Etapa Técnica de Workflow (Jira / DevOps style) */}
      <Modal
        isOpen={mostrarModalPaso}
        onClose={() => setMostrarModalPaso(false)}
        title={pasoEditando ? `✏️ Editar Etapa: ${pasoEditando.nombre}` : '➕ Nueva Etapa Técnica de Workflow'}
        size="md"
      >
        <form onSubmit={handleGuardarPaso} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código de la Etapa"
              required
              placeholder="Ej: DIAGNOSTICO"
              value={formPaso.codigo}
              onChange={(e) => setFormPaso({ ...formPaso, codigo: e.target.value.toUpperCase() })}
              fullWidth
            />
            <Input
              label="Orden Secuencial"
              type="number"
              min="1"
              required
              value={String(formPaso.orden || 1)}
              onChange={(e) => setFormPaso({ ...formPaso, orden: parseInt(e.target.value) || 1 })}
              fullWidth
            />
          </div>

          <Input
            label="Nombre Descriptivo de la Etapa"
            required
            placeholder="Ej: Afilado de Dientes y Calibración"
            value={formPaso.nombre}
            onChange={(e) => setFormPaso({ ...formPaso, nombre: e.target.value })}
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Rol Responsable (Autorizado)"
              value={formPaso.rolRequerido || 'TALLER'}
              onChange={(val: any) => setFormPaso({ ...formPaso, rolRequerido: val?.target?.value ?? val })}
              options={[
                { label: '🛠️ Personal de Taller General (TALLER)', value: 'TALLER' },
                { label: '⚙️ Operario Técnico Especialista (OPERARIO)', value: 'OPERARIO' },
                { label: '⭐ Supervisor Técnico / VoBo (SUPERVISOR)', value: 'SUPERVISOR' },
                { label: '🔬 Inspector de Control de Calidad (CALIDAD)', value: 'CALIDAD' },
                { label: '🛡️ Administrador de Planta (ADMIN)', value: 'ADMIN' },
              ]}
              fullWidth
            />

            <Input
              label="SLA Estimado (Minutos)"
              type="number"
              min="1"
              placeholder="Ej: 30"
              value={String(formPaso.tiempoEstimadoMinutos || 30)}
              onChange={(e) => setFormPaso({ ...formPaso, tiempoEstimadoMinutos: parseInt(e.target.value) || 30 })}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
              Instrucciones / Procedimiento Técnico
            </label>
            <textarea
              placeholder="Describe los criterios de aceptación, pruebas técnicas o herramientas a utilizar en esta fase..."
              value={formPaso.descripcion || ''}
              onChange={(e) => setFormPaso({ ...formPaso, descripcion: e.target.value })}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalPaso(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={guardandoPaso}>
              {guardandoPaso ? 'Guardando...' : pasoEditando ? 'Actualizar Etapa' : 'Crear Etapa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Unificado de Subtipos: Datos + Saltar Consecutivo + Eliminación Física/Lógica */}
      <EditarSubtipoModal
        isOpen={mostrarModalEditarSubtipo}
        onClose={() => setMostrarModalEditarSubtipo(false)}
        subtipo={subtipoEditando as SubtipoConTipoBaseLocal | null}
        onGuardarCampos={handleGuardarCamposSubtipo}
        onSaltarConsecutivo={handleActualizarConsecutivo}
        onEliminar={handleEliminarSubtipo}
        onReactivar={handleReactivarSubtipo}
      />

            <ConfigurarDenominacionesModal
        isOpen={mostrarModalDenominaciones}
        onClose={() => setMostrarModalDenominaciones(false)}
        denominacionesIniciales={denominacionesActualesConfig}
        onGuardar={handleGuardarDenominaciones}
      />

      <ParametroDinamicoModal
        isOpen={mostrarModalParametroDinamico}
        onClose={() => setMostrarModalParametroDinamico(false)}
        parametro={parametroDinamicoTarget}
        onGuardar={handleGuardarParametroDinamico}
      />
    </div>
  );
};

