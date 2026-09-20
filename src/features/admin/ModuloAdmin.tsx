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
  CrearWorkflowBorradorDto,
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
} from '../../types/catalogos';

interface ModuloAdminProps {
  token?: string;
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

export const ModuloAdmin: React.FC<ModuloAdminProps> = ({ token }) => {
  // Navegación Multinivel
  const [macroCat, setMacroCat] = useState<MacroCategoria>('seguridad');
  const [subCat, setSubCat] = useState<SubCatalogo>('roles');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ==========================================
  // ESTADOS POR SUB-CATÁLOGO
  // ==========================================

  // --- SEGURIDAD: Roles y Usuarios ---
  const [usuarios, setUsuarios] = useState<UsuarioAdminDto[]>([]);
  const [roles, setRoles] = useState<string[]>(Object.keys(ROLES_SISTEMA));
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
  const [nuevoCliente, setNuevoCliente] = useState({
    numeroDocumento: '',
    nombreRazonSocial: '',
    telefono: '',
    tipoDocumentoCodigo: 'CC',
  });
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
  const [nuevoItem, setNuevoItem] = useState({
    codigoReferencia: '',
    nombre: '',
    descripcion: '',
    naturaleza: 'SERVICIO' as 'INVENTARIO' | 'SERVICIO',
    uuidUnidadPresentacion: '',
    precioBase: 0,
    stockReferencial: undefined as number | undefined,
    workflowDefinicionUuid: '',
  });

  const [unidades, setUnidades] = useState<UnidadPresentacion[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [mostrarModalUnidad, setMostrarModalUnidad] = useState(false);
  const [nuevaUnidad, setNuevaUnidad] = useState({ codigo: '', nombre: '', abreviatura: '' });

  const [workflows, setWorkflows] = useState<WorkflowDefinicionAdminDto[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [workflowSeleccionado, setWorkflowSeleccionado] = useState<WorkflowDefinicionAdminDto | null>(null);
  const [mostrarModalNuevoWf, setMostrarModalNuevoWf] = useState(false);
  const [nuevoWf, setNuevoWf] = useState<CrearWorkflowBorradorDto>({ codigo: '', nombre: '', descripcion: '' });

  // --- CAJA & TESORERÍA ---
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [nuevaCaja, setNuevaCaja] = useState({ codigoCaja: '', nombre: '', ubicacion: 'Mostrador Principal' });

  const [mediosPagoCategorias, setMediosPagoCategorias] = useState<MedioPagoCategoria[]>([]);
  const [mediosPagoInstrumentos, setMediosPagoInstrumentos] = useState<MedioPagoInstrumento[]>([]);
  const [loadingMediosPago, setLoadingMediosPago] = useState(false);
  const [mostrarModalInstrumento, setMostrarModalInstrumento] = useState(false);
  const [nuevoInstrumento, setNuevoInstrumento] = useState({
    codigoCategoria: 'EFECTIVO',
    codigo: '',
    nombre: '',
    requiereReferencia: false,
  });

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
          const [resItems, resUnidades, resWfs] = await Promise.all([
            catalogosApi.getItems(),
            catalogosApi.getUnidades().catch(() => ({ unidades: [] })),
            adminApi.getWorkflows(true, token).catch(() => []),
          ]);
          setItems(resItems.items);
          setUnidades(resUnidades.unidades);
          setWorkflows(resWfs);
          if (resUnidades.unidades.length > 0) {
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
          setUnidades(res.unidades);
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
  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearCliente(nuevoCliente);
      setSuccessMsg(`Cliente '${nuevoCliente.nombreRazonSocial}' registrado exitosamente.`);
      setMostrarModalCliente(false);
      setNuevoCliente({ numeroDocumento: '', nombreRazonSocial: '', telefono: '', tipoDocumentoCodigo: 'CC' });
      cargarSubCatalogo('clientes');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al registrar cliente');
    }
  };

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

  // --- Items ---
  const handleCrearItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await catalogosApi.crearItem({
        codigoReferencia: nuevoItem.codigoReferencia,
        nombre: nuevoItem.nombre,
        descripcion: nuevoItem.descripcion,
        naturaleza: nuevoItem.naturaleza,
        uuidUnidadPresentacion: nuevoItem.uuidUnidadPresentacion,
        precioBase: Number(nuevoItem.precioBase),
        stockReferencial: nuevoItem.naturaleza === 'INVENTARIO' ? Number(nuevoItem.stockReferencial ?? 0) : undefined,
        workflowDefinicionUuid: nuevoItem.naturaleza === 'SERVICIO' && nuevoItem.workflowDefinicionUuid ? nuevoItem.workflowDefinicionUuid : undefined,
      });
      setSuccessMsg(`Ítem '${nuevoItem.nombre}' creado exitosamente.`);
      setMostrarModalItem(false);
      setNuevoItem({
        codigoReferencia: '',
        nombre: '',
        descripcion: '',
        naturaleza: 'SERVICIO',
        uuidUnidadPresentacion: unidades[0]?.uuid || '',
        precioBase: 0,
        stockReferencial: undefined,
        workflowDefinicionUuid: '',
      });
      cargarSubCatalogo('items');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear ítem');
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
  const handleCrearWorkflowBorrador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const creado = await adminApi.crearBorradorWorkflow(nuevoWf, token);
      setSuccessMsg(`Workflow borrador '${creado.codigo}' v${creado.versionNumero} creado exitosamente.`);
      setMostrarModalNuevoWf(false);
      setNuevoWf({ codigo: '', nombre: '', descripcion: '' });
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear workflow borrador');
    }
  };

  const handlePublicarWorkflow = async (wf: WorkflowDefinicionAdminDto) => {
    if (!window.confirm(`¿Publicar y activar versión ${wf.versionNumero} de ${wf.codigo}?`)) return;
    try {
      await adminApi.publicarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow ${wf.codigo} publicado.`);
      cargarSubCatalogo('workflows');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al publicar workflow');
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
      await catalogosApi.crearMedioPagoInstrumento(nuevoInstrumento);
      setSuccessMsg(`Medio de pago '${nuevoInstrumento.nombre}' creado exitosamente.`);
      setMostrarModalInstrumento(false);
      setNuevoInstrumento({ codigoCategoria: 'EFECTIVO', codigo: '', nombre: '', requiereReferencia: false });
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



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> Administración & Catálogos Centrales
          </h1>
          <p className="text-sm text-gray-400">
            Control de usuarios, directivos, catálogos comerciales, canales, caja, workflows y parámetros del sistema.
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

      {/* ========================================== */}

      {/* VISTAS DE CONTENIDO */}
      {/* ========================================== */}

      {/* 1.1 ROLES */}
      {subCat === 'roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLES_SISTEMA).map(([key, r]) => {
              const count = usuarios.filter((u) => u.rol === key).length;
              return (
                <Card key={key} className="p-4 bg-gray-900/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{r.icono}</span>
                    <Badge variant={r.badge}>{r.nombre}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{r.nombre}</h4>
                    <p className="text-xs text-gray-400 mt-1">{r.descripcion}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                      Capacidades Autorizadas:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.permisos.map((p, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 pt-1 flex justify-between items-center">
                    <span>Usuarios asignados:</span>
                    <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{count}</span>
                  </div>
                </Card>
              );
            })}
          </div>
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
                    <span className="text-gray-500 text-xs">Sin PIN</span>
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
                render: (_, u) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setUsuarioPinTarget(u);
                        setNuevoPin('');
                      }}
                    >
                      Reset PIN
                    </Button>
                    <Button
                      variant={u.activo ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleUsuario(u)}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                ),
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
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombreRazonSocial', label: 'Nombre / Razón Social', sortable: true },
              { key: 'telefono', label: 'Teléfono', render: (v) => <span className="text-gray-400">{v || 'Sin teléfono'}</span> },
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
                label: 'Historial & Órdenes',
                align: 'right',
                render: (_, c) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loadingHistorico}
                    onClick={() => handleVerHistoricoCliente(c.uuid)}
                  >
                    {loadingHistorico ? 'Cargando...' : '👁️ Ver Historial'}
                  </Button>
                ),
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
            searchPlaceholder="Buscar canal..."
            pagination={true}
            pageSize={8}
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
                  <Button
                    variant={it.activo ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggleItem(it)}
                  >
                    {it.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                ),
              },
            ]}
            loading={loadingItems}
            onCreate={() => setMostrarModalItem(true)}
            createLabel="+ Nuevo Ítem / Servicio"
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

      {/* 3.3 WORKFLOWS DE TALLER */}
      {subCat === 'workflows' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">Flujos de trabajo técnicos versionados para ejecución de órdenes de trabajo (OT).</p>
            <Button variant="primary" onClick={() => setMostrarModalNuevoWf(true)}>
              + Nuevo Borrador de Workflow
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Definiciones Versionadas</h3>
              {loadingWorkflows ? (
                <div className="p-4 text-center text-gray-400">Cargando workflows...</div>
              ) : (
                workflows.map((wf) => {
                  const seleccionado = workflowSeleccionado?.uuid === wf.uuid;
                  return (
                    <div
                      key={wf.uuid}
                      onClick={() => setWorkflowSeleccionado(wf)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        seleccionado
                          ? 'bg-blue-900/30 border-blue-500 shadow-md'
                          : 'bg-gray-900/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white font-mono">{wf.codigo}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">v{wf.versionNumero}</span>
                          <Badge variant={wf.esVigente ? 'success' : wf.activo ? 'warning' : 'neutral'}>
                            {wf.esVigente ? 'PUBLICADO' : wf.activo ? 'BORRADOR' : 'RETIRADO'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">{wf.nombre}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-2">
              {workflowSeleccionado ? (
                <Card className="p-5 bg-gray-900/40 border border-white/10 space-y-4">
                  <div className="flex justify-between items-start border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{workflowSeleccionado.nombre}</h2>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                          {workflowSeleccionado.codigo} · v{workflowSeleccionado.versionNumero}
                        </span>
                        <Badge variant={workflowSeleccionado.esVigente ? 'success' : 'warning'}>
                          {workflowSeleccionado.esVigente ? 'PUBLICADO' : 'BORRADOR'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{workflowSeleccionado.descripcion}</p>
                    </div>

                    {!workflowSeleccionado.esVigente && workflowSeleccionado.activo && (
                      <Button variant="primary" size="sm" onClick={() => handlePublicarWorkflow(workflowSeleccionado)}>
                        Publicar Versión
                      </Button>
                    )}
                  </div>


                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Etapas y Transiciones</h4>
                    <div className="space-y-3">
                      {workflowSeleccionado.etapas.map((et, idx) => (
                        <div key={et.uuid} className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">{et.nombre}</div>
                              <div className="text-xs font-mono text-gray-400">{et.codigo}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {et.esFinal && <Badge variant="success">Etapa Final</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-lg">
                  Selecciona un workflow para ver su configuración técnica.
                </div>
              )}
            </div>
          </div>
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
                render: (_, c) => (
                  <Button
                    variant={c.activa ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggleCaja(c)}
                  >
                    {c.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                ),
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

      {/* 4.2 FORMAS & MEDIOS DE PAGO */}
      {subCat === 'medios_pago' && (
        <div className="space-y-4">
          {mediosPagoCategorias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediosPagoCategorias.map((cat) => (
                <span
                  key={cat.uuid}
                  className="text-xs px-2.5 py-1 rounded bg-gray-800/80 text-gray-300 border border-white/10 flex items-center gap-1.5 font-medium"
                >
                  📁 {cat.nombre}
                </span>
              ))}
            </div>
          )}

          <CRUDTable
            data={mediosPagoInstrumentos}
            columns={[
              {
                key: 'codigo',
                label: 'Código',
                sortable: true,
                render: (v) => <span className="font-mono font-bold text-white">{v}</span>,
              },
              { key: 'nombre', label: 'Nombre del Instrumento', sortable: true },
              { key: 'categoria', label: 'Categoría', render: (v) => <span className="text-gray-400">{v || 'GENERAL'}</span> },
              {
                key: 'requiereReferencia',
                label: 'Exige Referencia',
                render: (v) =>
                  v ? (
                    <span className="text-amber-400 text-xs">Requiere Ref. Transacción</span>
                  ) : (
                    <span className="text-gray-500 text-xs">Directo</span>
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
            loading={loadingMediosPago}
            onCreate={() => setMostrarModalInstrumento(true)}
            createLabel="+ Nuevo Instrumento de Pago"
            searchable={true}
            searchPlaceholder="Buscar medio de pago..."
            pagination={true}
            pageSize={8}
            emptyMessage="No se encontraron medios de pago registrados."
            className="border border-white/10 rounded-xl overflow-hidden shadow-xl"
          />
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
                  onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, tipoCuenta: e.target.value })}
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
                      setNuevoValorParametro(row.valorJson);
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
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
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

      {/* Modal 3: Nuevo Cliente */}
      <Modal
        isOpen={mostrarModalCliente}
        onClose={() => setMostrarModalCliente(false)}
        title="Nuevo Cliente"
        size="md"
      >
        <form onSubmit={handleCrearCliente} className="space-y-4 p-4">
          <Select
            label="Tipo de Identificación"
            value={nuevoCliente.tipoDocumentoCodigo}
            onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoDocumentoCodigo: e.target.value })}
            options={[
              { label: 'Cédula de Ciudadanía (CC)', value: 'CC' },
              { label: 'NIT / Persona Jurídica', value: 'NIT' },
              { label: 'Cédula de Extranjería (CE)', value: 'CE' },
              { label: 'Pasaporte', value: 'PASAPORTE' },
            ]}
            fullWidth
          />
          <Input
            label="Número de Documento"
            required
            placeholder="Ej: 1020304050"
            value={nuevoCliente.numeroDocumento}
            onChange={(e) => setNuevoCliente({ ...nuevoCliente, numeroDocumento: e.target.value })}
            fullWidth
          />
          <Input
            label="Nombre / Razón Social"
            required
            placeholder="Ej: Carpintería El Cedro"
            value={nuevoCliente.nombreRazonSocial}
            onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombreRazonSocial: e.target.value })}
            fullWidth
          />
          <Input
            label="Teléfono / WhatsApp"
            placeholder="Ej: 300 123 4567"
            value={nuevoCliente.telefono}
            onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
            fullWidth
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalCliente(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Registrar Cliente
            </Button>
          </div>
        </form>
      </Modal>

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

      {/* Modal 5: Nuevo Ítem / Servicio */}
      <Modal
        isOpen={mostrarModalItem}
        onClose={() => setMostrarModalItem(false)}
        title="Nuevo Ítem o Servicio"
        size="lg"
      >
        <form onSubmit={handleCrearItem} className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código de Referencia"
              required
              placeholder="Ej: SRV-AFIL-CIRCULAR"
              value={nuevoItem.codigoReferencia}
              onChange={(e) => setNuevoItem({ ...nuevoItem, codigoReferencia: e.target.value.toUpperCase() })}
              fullWidth
            />
            <Select
              label="Naturaleza"
              value={nuevoItem.naturaleza}
              onChange={(e) => setNuevoItem({ ...nuevoItem, naturaleza: e.target.value as any })}
              options={[
                { label: 'SERVICIO (Taller / OTs)', value: 'SERVICIO' },
                { label: 'INVENTARIO (Producto Físico)', value: 'INVENTARIO' },
              ]}
              fullWidth
            />
          </div>

          <Input
            label="Nombre Comercial"
            required
            placeholder="Ej: Afilado de Disco de Sierra"
            value={nuevoItem.nombre}
            onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
            fullWidth
          />

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Descripción</label>
            <textarea
              placeholder="Detalles del servicio o especificaciones técnicas..."
              value={nuevoItem.descripcion}
              onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white h-16 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unidad de Medida"
              value={nuevoItem.uuidUnidadPresentacion}
              onChange={(e) => setNuevoItem({ ...nuevoItem, uuidUnidadPresentacion: e.target.value })}
              options={unidades.map((u) => ({ label: `${u.nombre} (${u.abreviatura})`, value: u.uuid }))}
              fullWidth
            />
            <Input
              type="number"
              min="0"
              step="500"
              label="Precio Base (COP)"
              required
              value={nuevoItem.precioBase}
              onChange={(e) => setNuevoItem({ ...nuevoItem, precioBase: Number(e.target.value) })}
              fullWidth
            />
          </div>

          {nuevoItem.naturaleza === 'SERVICIO' ? (
            <Select
              label="Workflow de Taller Asociado"
              value={nuevoItem.workflowDefinicionUuid}
              onChange={(e) => setNuevoItem({ ...nuevoItem, workflowDefinicionUuid: e.target.value })}
              options={[
                { label: 'Flujo Estándar de Taller', value: '' },
                ...workflows.map((w) => ({ label: `${w.codigo} - ${w.nombre} (v${w.versionNumero})`, value: w.uuid }))
              ]}
              fullWidth
            />
          ) : (
            <Input
              type="number"
              min="0"
              label="Stock Referencial Inicial"
              placeholder="0"
              value={nuevoItem.stockReferencial ?? ''}
              onChange={(e) => setNuevoItem({ ...nuevoItem, stockReferencial: e.target.value ? Number(e.target.value) : undefined })}
              fullWidth
            />
          )}

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setMostrarModalItem(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar Ítem
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
            label="Categoría Base"
            value={nuevoInstrumento.codigoCategoria}
            onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, codigoCategoria: e.target.value })}
            options={[
              { label: 'Efectivo', value: 'EFECTIVO' },
              { label: 'Consignación / Transferencia', value: 'CONSIGNACION_TRANSFERENCIA' },
              { label: 'Tarjeta Débito / Crédito', value: 'TARJETA' },
              { label: 'Otro Medio', value: 'OTRO' },
            ]}
            fullWidth
          />
          <Input
            label="Código"
            required
            placeholder="Ej: DAVIPLATA"
            value={nuevoInstrumento.codigo}
            onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, codigo: e.target.value.toUpperCase() })}
            fullWidth
          />
          <Input
            label="Nombre"
            required
            placeholder="Ej: Billetera Daviplata"
            value={nuevoInstrumento.nombre}
            onChange={(e) => setNuevoInstrumento({ ...nuevoInstrumento, nombre: e.target.value })}
            fullWidth
          />
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
            onChange={(e) => setUuidTipoBaseTarget(e.target.value)}
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
              onChange={(e) => setNuevoSubtipo({ ...nuevoSubtipo, formatoPapel: e.target.value })}
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
            onChange={(e) => setNuevoTipoDocId({ ...nuevoTipoDocId, aplicaPersona: e.target.value as any })}
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
    </div>
  );
};

