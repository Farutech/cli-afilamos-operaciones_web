import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  UserCheck,
  Shield,
  User,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronRight,
  Key,
  ShieldCheck,
  CheckSquare,
  Square,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, CrudPagination } from '@farutech/design-system';
import { adminApi } from '@/services/adminApi';
import type { UsuarioAdminDto } from '@/types/admin';

interface PermisoDef {
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
}

const PERMISOS_SISTEMA: PermisoDef[] = [
  // Solicitudes & Mostrador
  { codigo: 'solicitudes.crear', nombre: 'Crear Solicitudes', descripcion: 'Registrar nuevas solicitudes de mostrador o canales digitales', modulo: 'Solicitudes & Mostrador' },
  { codigo: 'solicitudes.guardar_borrador', nombre: 'Guardar Borrador', descripcion: 'Permitir guardar solicitudes sin asentar inmediatamente', modulo: 'Solicitudes & Mostrador' },
  { codigo: 'solicitudes.asentar', nombre: 'Asentar Solicitud', descripcion: 'Asentar solicitudes regulares que cumplan las políticas de cobro', modulo: 'Solicitudes & Mostrador' },
  { codigo: 'solicitudes.vobo_anticipo', nombre: 'Solicitar Excepción VoBo', descripcion: 'Solicitar autorización de excepción cuando no se cubra el anticipo', modulo: 'Solicitudes & Mostrador' },
  { codigo: 'solicitudes.modificar_precios', nombre: 'Modificar Precios Manualmente', descripcion: 'Alterar precios sugeridos de lista durante la captura', modulo: 'Solicitudes & Mostrador' },

  // Aprobaciones, Seguridad & PIN (CRÍTICO)
  { codigo: 'seguridad.aprobar_con_pin', nombre: 'Aprobar con PIN de Supervisor (VoBo)', descripcion: 'Autorizado para ingresar PIN válido y avalar excepciones de cobro e inventario', modulo: 'Aprobaciones & Seguridad / PIN' },
  { codigo: 'seguridad.gestionar_pin', nombre: 'Asignar y Gestionar PIN', descripcion: 'Capacidad de configurar o reestablecer PIN de usuarios y operarios', modulo: 'Aprobaciones & Seguridad / PIN' },

  // Taller & Operación
  { codigo: 'taller.iniciar_etapa', nombre: 'Iniciar Etapas Técnicas', descripcion: 'Recibir órdenes de trabajo y pasarlas a proceso técnico', modulo: 'Taller & Procesos' },
  { codigo: 'taller.finalizar_etapa', nombre: 'Finalizar Trabajos Técnicos', descripcion: 'Marcar servicios como finalizados y listos para entrega', modulo: 'Taller & Procesos' },
  { codigo: 'taller.reasignar_operario', nombre: 'Reasignar Operario', descripcion: 'Cambiar el técnico responsable de una orden activa', modulo: 'Taller & Procesos' },
  { codigo: 'taller.cancelar_servicio', nombre: 'Cancelar Ítems en Taller', descripcion: 'Dar de baja trabajos con justificación técnica', modulo: 'Taller & Procesos' },

  // Entregas & Despachos
  { codigo: 'entregas.despachar', nombre: 'Despachar Pedidos', descripcion: 'Confirmar retiro físico del cliente y firma de recibido', modulo: 'Entregas & Despacho' },
  { codigo: 'entregas.liquidar_saldo', nombre: 'Liquidar Saldos Pendientes', descripcion: 'Cobrar el valor restante contra entrega en mostrador', modulo: 'Entregas & Despacho' },
  { codigo: 'entregas.reimprimir_remision', nombre: 'Reimprimir Remisiones', descripcion: 'Generar copias de comprobantes de despacho', modulo: 'Entregas & Despacho' },

  // Caja & Tesorería
  { codigo: 'caja.apertura_cierre', nombre: 'Apertura y Cierre de Turno', descripcion: 'Abrir turnos, ingresar base y realizar arqueos de cierre', modulo: 'Caja & Tesorería' },
  { codigo: 'caja.movimientos_extraordinarios', nombre: 'Movimientos de Caja', descripcion: 'Registrar egresos de emergencia y transferencias', modulo: 'Caja & Tesorería' },

  // Configuración & Catálogos
  { codigo: 'admin.parametros', nombre: 'Configurar Parámetros', descripcion: 'Editar políticas globales del sistema y reglas de negocio', modulo: 'Administración' },
  { codigo: 'admin.usuarios_roles', nombre: 'Gestionar Usuarios y Roles', descripcion: 'Crear personal, asignar roles y configurar permisos de seguridad', modulo: 'Administración' },
];

interface RolConfig {
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  permisos: string[];
}

const ROLES_DEFAULT: RolConfig[] = [
  {
    codigo: 'ADMIN',
    nombre: 'Administrador del Sistema',
    descripcion: 'Control total de la plataforma, auditoría, configuración, parámetros y seguridad.',
    color: 'border-rose-500/40 text-rose-300 bg-rose-950/20',
    permisos: PERMISOS_SISTEMA.map((p) => p.codigo),
  },
  {
    codigo: 'SUPERVISOR',
    nombre: 'Supervisor Técnico / Mostrador',
    descripcion: 'Autorización de excepciones comerciales, VoBo con PIN válido, reasignación y control.',
    color: 'border-amber-500/40 text-amber-300 bg-amber-950/20',
    permisos: [
      'solicitudes.crear',
      'solicitudes.guardar_borrador',
      'solicitudes.asentar',
      'solicitudes.vobo_anticipo',
      'seguridad.aprobar_con_pin',
      'taller.iniciar_etapa',
      'taller.finalizar_etapa',
      'taller.reasignar_operario',
      'entregas.despachar',
      'entregas.liquidar_saldo',
      'caja.apertura_cierre',
    ],
  },
  {
    codigo: 'CAJERO',
    nombre: 'Cajero / Atención al Cliente',
    descripcion: 'Captura de solicitudes en mostrador, recaudo de abonos, despacho y manejo de caja diaria.',
    color: 'border-indigo-500/40 text-indigo-300 bg-indigo-950/20',
    permisos: [
      'solicitudes.crear',
      'solicitudes.guardar_borrador',
      'solicitudes.asentar',
      'entregas.despachar',
      'entregas.liquidar_saldo',
      'caja.apertura_cierre',
    ],
  },
  {
    codigo: 'TALLER',
    nombre: 'Operario Técnico de Taller',
    descripcion: 'Diagnóstico, afilado, calibración y registro de avance en órdenes de trabajo.',
    color: 'border-blue-500/40 text-blue-300 bg-blue-950/20',
    permisos: ['taller.iniciar_etapa', 'taller.finalizar_etapa'],
  },
  {
    codigo: 'ENTREGA',
    nombre: 'Encargado de Despacho y Logística',
    descripcion: 'Recepción de ítems terminados, remisiones y entrega formal al cliente.',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20',
    permisos: ['entregas.despachar', 'entregas.liquidar_saldo', 'entregas.reimprimir_remision'],
  },
  {
    codigo: 'AUDITOR',
    nombre: 'Auditor & Consulta',
    descripcion: 'Acceso de solo lectura para revisión de registros y reportes contables.',
    color: 'border-purple-500/40 text-purple-300 bg-purple-950/20',
    permisos: ['entregas.reimprimir_remision'],
  },
];

const FALLBACK_USERS: UsuarioAdminDto[] = [
  { uuid: 'u-1', codigo: 'admin', nombreCompleto: 'Javier Ramírez', email: 'javier.ramirez@afilamos.local', rol: 'ADMIN', activo: true, tienePin: true, creadoEn: '2026-01-01T00:00:00Z' },
  { uuid: 'u-2', codigo: 'cajero01', nombreCompleto: 'Carlos Mendoza', email: 'carlos.mendoza@afilamos.local', rol: 'CAJERO', activo: true, tienePin: true, creadoEn: '2026-01-10T00:00:00Z' },
  { uuid: 'u-3', codigo: 'supervisor01', nombreCompleto: 'Lucía Peña', email: 'lucia.pena@afilamos.local', rol: 'SUPERVISOR', activo: true, tienePin: true, creadoEn: '2026-01-12T00:00:00Z' },
  { uuid: 'u-4', codigo: 'taller01', nombreCompleto: 'Pedro Gómez', email: 'pedro.gomez@afilamos.local', rol: 'TALLER', activo: true, tienePin: false, creadoEn: '2026-01-15T00:00:00Z' },
  { uuid: 'u-5', codigo: 'entrega01', nombreCompleto: 'Mariana Salazar', email: 'mariana.salazar@afilamos.local', rol: 'ENTREGA', activo: false, tienePin: false, creadoEn: '2026-02-01T00:00:00Z' },
];

export default function AdminUsers({ token }: { token?: string }) {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [users, setUsers] = useState<UsuarioAdminDto[]>(FALLBACK_USERS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<UsuarioAdminDto | 'new' | null>(null);
  const [viewUser, setViewUser] = useState<UsuarioAdminDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal y Acordeón de Permisos de Rol
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [rolModalTarget, setRolModalTarget] = useState<RolConfig | null>(null);
  const [acordeonModulosAbiertos, setAcordeonModulosAbiertos] = useState<Record<string, boolean>>({
    'Aprobaciones & Seguridad / PIN': true,
    'Solicitudes & Mostrador': true,
  });

  // Gestión de Roles y Permisos
  const [roles, setRoles] = useState<RolConfig[]>(() => {
    try {
      const stored = localStorage.getItem('ordeon_roles_permisos');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return ROLES_DEFAULT;
  });

  const [rolSeleccionadoCodigo, setRolSeleccionadoCodigo] = useState<string>('SUPERVISOR');

  const rolActivo = useMemo(() => {
    return roles.find((r) => r.codigo === rolSeleccionadoCodigo) || roles[0];
  }, [roles, rolSeleccionadoCodigo]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminApi.getUsuarios(token);
      if (res && res.length > 0) {
        setUsers(res);
      } else {
        setUsers(FALLBACK_USERS);
      }
    } catch {
      setUsers(FALLBACK_USERS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [token]);

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const pinVal = String(data.get('pin') || '').trim();
    const body = {
      codigo: String(data.get('codigo') || '').trim(),
      nombreCompleto: String(data.get('nombreCompleto') || '').trim(),
      email: String(data.get('email') || '').trim(),
      rol: String(data.get('rol') || 'CAJERO'),
      password: String(data.get('password') || 'Afilamos2026*'),
      pin: pinVal || '1234',
    };

    try {
      if (modal === 'new') {
        await adminApi.crearUsuario(body, token);
      } else {
        await adminApi.actualizarUsuario(modal.uuid, {
          nombreCompleto: body.nombreCompleto,
          email: body.email,
          rol: body.rol,
        }, token);
      }
      setModal(null);
      toast.success(modal === 'new' ? 'Usuario registrado correctamente' : 'Usuario actualizado correctamente');
      await loadUsers();
    } catch {
      // Fallback local
      if (modal === 'new') {
        const newUser: UsuarioAdminDto = {
          uuid: `u-${Date.now()}`,
          codigo: body.codigo,
          nombreCompleto: body.nombreCompleto,
          email: body.email,
          rol: body.rol,
          activo: true,
          tienePin: !!pinVal,
          creadoEn: new Date().toISOString(),
        };
        setUsers((prev) => [newUser, ...prev]);
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.uuid === modal.uuid
              ? { ...u, nombreCompleto: body.nombreCompleto, email: body.email, rol: body.rol, tienePin: !!pinVal }
              : u
          )
        );
      }
      setModal(null);
      toast.success('Cambios guardados localmente');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: UsuarioAdminDto) {
    try {
      await adminApi.cambiarEstadoUsuario(user.uuid, !user.activo, token);
      setUsers((prev) =>
        prev.map((u) => (u.uuid === user.uuid ? { ...u, activo: !u.activo } : u))
      );
      toast.success(`Usuario ${!user.activo ? 'activado' : 'desactivado'}`);
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.uuid === user.uuid ? { ...u, activo: !u.activo } : u))
      );
      toast.info(`Estado actualizado localmente`);
    }
  }

  // Agrupación de permisos por módulo
  const modulosAgrupados = useMemo(() => {
    const map: Record<string, PermisoDef[]> = {};
    for (const p of PERMISOS_SISTEMA) {
      if (!map[p.modulo]) map[p.modulo] = [];
      map[p.modulo].push(p);
    }
    return map;
  }, []);

  const togglePermisoRol = (codigoPermiso: string) => {
    if (!rolModalTarget) return;
    const yaExiste = rolModalTarget.permisos.includes(codigoPermiso);
    const nuevosPermisos = yaExiste
      ? rolModalTarget.permisos.filter((p) => p !== codigoPermiso)
      : [...rolModalTarget.permisos, codigoPermiso];

    const targetActualizado = { ...rolModalTarget, permisos: nuevosPermisos };
    setRolModalTarget(targetActualizado);

    // Actualizar en la lista general de roles
    const actualizados = roles.map((r) =>
      r.codigo === targetActualizado.codigo ? targetActualizado : r
    );
    setRoles(actualizados);
  };

  const toggleModuloCompleto = (modulo: string) => {
    if (!rolModalTarget) return;
    const permisosModulo = modulosAgrupados[modulo]?.map((p) => p.codigo) || [];
    const todosSeleccionados = permisosModulo.every((cp) => rolModalTarget.permisos.includes(cp));

    let nuevosPermisos: string[];
    if (todosSeleccionados) {
      // Desmarcar todos del módulo
      nuevosPermisos = rolModalTarget.permisos.filter((cp) => !permisosModulo.includes(cp));
    } else {
      // Marcar todos del módulo
      const faltantes = permisosModulo.filter((cp) => !rolModalTarget.permisos.includes(cp));
      nuevosPermisos = [...rolModalTarget.permisos, ...faltantes];
    }

    const targetActualizado = { ...rolModalTarget, permisos: nuevosPermisos };
    setRolModalTarget(targetActualizado);

    const actualizados = roles.map((r) =>
      r.codigo === targetActualizado.codigo ? targetActualizado : r
    );
    setRoles(actualizados);
  };

  const toggleAcordeonModulo = (modulo: string) => {
    setAcordeonModulosAbiertos((prev) => ({
      ...prev,
      [modulo]: !prev[modulo],
    }));
  };

  const handleAbrirModalPermisos = (rol: RolConfig) => {
    setRolSeleccionadoCodigo(rol.codigo);
    setRolModalTarget({ ...rol });
    setIsPermissionsModalOpen(true);
  };

  const handleGuardarPermisos = () => {
    try {
      localStorage.setItem('ordeon_roles_permisos', JSON.stringify(roles));
      toast.success(`Permisos de '${rolModalTarget?.nombre || rolActivo.nombre}' guardados correctamente.`);
      setIsPermissionsModalOpen(false);
    } catch {
      toast.error('No se pudieron persistir los permisos.');
    }
  };

  // Helper para verificar si un rol tiene autorización de PIN
  const rolPuedeAprobarPin = (rolCodigo: string) => {
    const rol = roles.find((r) => r.codigo === rolCodigo);
    return rol?.permisos.includes('seguridad.aprobar_con_pin') ?? false;
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nombreCompleto.toLowerCase().includes(q) ||
        u.codigo.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q)
    );
  }, [users, query]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  return (
    <div className="space-y-4">
      {/* Pestañas Superiores */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'usuarios'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" /> 👥 Personal & Usuarios ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" /> 🔑 Roles, Permisos & Autorizaciones PIN ({roles.length})
        </button>
      </div>

      {/* PESTAÑA 1: USUARIOS */}
      {activeTab === 'usuarios' && (
        <section className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          <header className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase m-0 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                Directorio de Personal y Accesos
              </h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Cuentas de acceso, credenciales POS, estado de cuenta y facultamiento de PIN para VoBo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, usuario, rol..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModal('new')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
              >
                + Nuevo Usuario
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando personal...</div>
          ) : pagedUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No se encontraron usuarios registrados.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              <div className="grid grid-cols-12 gap-2 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <span className="col-span-4">Usuario / Colaborador</span>
                <span className="col-span-2">Rol Asignado</span>
                <span className="col-span-2">Facultad de PIN</span>
                <span className="col-span-2">Estado</span>
                <span className="col-span-2 text-right">Acciones</span>
              </div>
              {pagedUsers.map((usr) => {
                const tieneFacultadPin = rolPuedeAprobarPin(usr.rol);
                return (
                  <div key={usr.uuid} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-800/30 transition-colors text-xs">
                    <div className="col-span-4 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                        {usr.nombreCompleto.slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{usr.nombreCompleto}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <span>@{usr.codigo}</span>
                          <span>·</span>
                          <span className="truncate">{usr.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {usr.rol}
                      </span>
                    </div>

                    {/* Estado de PIN y VoBo */}
                    <div className="col-span-2">
                      {usr.tienePin ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Key className="w-3 h-3 text-emerald-400" /> PIN Activo
                          </span>
                          {tieneFacultadPin ? (
                            <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> Aprueba VoBo
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500">Solo identificación</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Sin PIN</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        usr.activo
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                      }`}>
                        {usr.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        onClick={() => setViewUser(usr)}
                        aria-label={`Ver detalle de ${usr.nombreCompleto}`}
                        title="Ver detalle completo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        onClick={() => setModal(usr)}
                        aria-label={`Editar ${usr.nombreCompleto}`}
                        title="Editar usuario"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          usr.activo
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                        }`}
                        onClick={() => void toggleStatus(usr)}
                        aria-label={`Cambiar estado de ${usr.nombreCompleto}`}
                        title={usr.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 border-t border-slate-800 bg-slate-900/30">
            <CrudPagination
              currentPage={page}
              totalPages={totalPages}
              perPage={pageSize}
              total={users.length}
              onPageChange={(newPage) => setPage(newPage)}
              perPageOptions={[10, 25, 50, 100]}
              onPerPageChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        </section>
      )}

      {/* PESTAÑA 2: ROLES & PERMISOS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide m-0 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Perfiles de Seguridad y Roles del Sistema
                </h3>
                <p className="text-xs text-slate-400 m-0 mt-0.5">
                  Haz clic en cualquier rol para abrir el modal interactivo de permisos con acordeón y control de facultades PIN.
                </p>
              </div>
            </div>

            {/* Cuadrícula de Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map((r) => {
                const tienePin = r.permisos.includes('seguridad.aprobar_con_pin');
                return (
                  <div
                    key={r.codigo}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/70 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-white flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-400" />
                          {r.nombre}
                        </strong>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {r.codigo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 m-0">
                        {r.descripcion}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {r.permisos.length} permisos
                        </span>
                        {tienePin ? (
                          <span className="text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/50 flex items-center gap-1">
                            <Key className="w-3 h-3" /> Aprueba con PIN (VoBo)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            Sin VoBo PIN
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleAbrirModalPermisos(r)}
                      className="border-slate-700 bg-slate-900 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Configurar Permisos & PIN
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PERMISOS DE ROL CON ACORDEÓN INTERACTIVO                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title={rolModalTarget ? `Configuración de Permisos · ${rolModalTarget.nombre} (${rolModalTarget.codigo})` : 'Configuración de Permisos'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400 font-mono">
              Total activos: <strong className="text-emerald-400">{rolModalTarget?.permisos.length}</strong> / {PERMISOS_SISTEMA.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsPermissionsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleGuardarPermisos}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Guardar Permisos del Rol
              </Button>
            </div>
          </div>
        }
      >
        {rolModalTarget && (
          <div className="p-2 space-y-3 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            {/* Cabecera Informativa del Rol */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700/50">
                    ROL: {rolModalTarget.codigo}
                  </span>
                  <span className="font-bold text-white text-xs">{rolModalTarget.nombre}</span>
                </div>
                <p className="text-[11px] text-slate-400 m-0 mt-1">{rolModalTarget.descripcion}</p>
              </div>

              {/* Botón rápido para expandir o colapsar todos */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const allOpen = Object.keys(modulosAgrupados).reduce((acc, m) => ({ ...acc, [m]: true }), {});
                    setAcordeonModulosAbiertos(allOpen);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
                >
                  Expandir todo
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setAcordeonModulosAbiertos({})}
                  className="text-[11px] text-slate-400 hover:text-slate-300 font-semibold cursor-pointer underline"
                >
                  Colapsar todo
                </button>
              </div>
            </div>

            {/* Acordeón de Módulos */}
            <div className="space-y-2">
              {Object.entries(modulosAgrupados).map(([modulo, permisos]) => {
                const isOpen = !!acordeonModulosAbiertos[modulo];
                const permisosActivosEnModulo = permisos.filter((p) => rolModalTarget.permisos.includes(p.codigo)).length;
                const esModuloSeguridad = modulo.includes('PIN') || modulo.includes('Seguridad');

                return (
                  <div
                    key={modulo}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      esModuloSeguridad
                        ? 'border-amber-700/60 bg-amber-950/20'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    {/* Barra de título del acordeón */}
                    <div className="p-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 cursor-pointer select-none">
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => toggleAcordeonModulo(modulo)}
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={`font-bold text-xs ${esModuloSeguridad ? 'text-amber-300' : 'text-white'}`}>
                          {esModuloSeguridad ? '🛡️' : '📁'} {modulo}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          permisosActivosEnModulo > 0 ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {permisosActivosEnModulo} / {permisos.length}
                        </span>
                      </div>

                      {/* Botón rápido para marcar / desmarcar este módulo */}
                      <button
                        type="button"
                        onClick={() => toggleModuloCompleto(modulo)}
                        className="text-[11px] text-slate-400 hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title={permisosActivosEnModulo === permisos.length ? 'Desmarcar todos' : 'Marcar todos'}
                      >
                        {permisosActivosEnModulo === permisos.length ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> Desmarcar módulo
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" /> Marcar módulo
                          </>
                        )}
                      </button>
                    </div>

                    {/* Contenido desplegable del acordeón */}
                    {isOpen && (
                      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permisos.map((p) => {
                            const isGranted = rolModalTarget.permisos.includes(p.codigo);
                            const esPermisoPin = p.codigo === 'seguridad.aprobar_con_pin';
                            return (
                              <label
                                key={p.codigo}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                  isGranted
                                    ? esPermisoPin
                                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-sm'
                                      : 'bg-indigo-950/40 border-indigo-600/50 text-slate-100 shadow-sm'
                                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  onChange={() => togglePermisoRol(p.codigo)}
                                  className="mt-0.5 w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0"
                                />
                                <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs block text-white">
                                      {p.nombre}
                                    </span>
                                    {esPermisoPin && (
                                      <span className="text-[9px] font-bold text-amber-300 bg-amber-900/60 px-1 rounded border border-amber-600/40">
                                        PIN VOBO
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 block leading-tight">
                                    {p.descripcion}
                                  </span>
                                  <span className="text-[9px] font-mono text-indigo-400/80 block pt-0.5">
                                    {p.codigo}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: VER DETALLE DE USUARIO */}
      <Modal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title="Ficha del Usuario del Sistema"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewUser(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewUser;
                setViewUser(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar usuario
            </Button>
          </>
        }
      >
        {viewUser && (
          <div className="space-y-3 p-2 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-full bg-indigo-900/60 border border-indigo-600/50 flex items-center justify-center text-indigo-300 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm m-0">{viewUser.nombreCompleto}</h3>
                <p className="text-slate-400 font-mono text-[11px] m-0">@{viewUser.codigo}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Rol Operativo</span>
                <span className="font-mono text-indigo-300 font-bold text-xs">{viewUser.rol}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Facultad de PIN VoBo</span>
                <span className={`font-bold text-xs ${rolPuedeAprobarPin(viewUser.rol) ? 'text-amber-300' : 'text-slate-400'}`}>
                  {rolPuedeAprobarPin(viewUser.rol) ? '✓ Autorizado para aprobar excepciones' : '✗ No facultado por su rol'}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Correo Electrónico</span>
              <span className="text-white font-mono">{viewUser.email}</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">PIN Registrado</span>
              <span className="text-emerald-400 font-mono font-bold">
                {viewUser.tienePin ? '✓ PIN numérico configurado y activo' : '✗ Sin PIN configurado'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: CREAR / EDITAR USUARIO */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Registrar Nuevo Colaborador' : `Editar Usuario · ${modal?.nombreCompleto}`}
        size="md"
      >
        <form onSubmit={saveUser} className="space-y-3 p-2 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo *</label>
            <input
              type="text"
              name="nombreCompleto"
              defaultValue={modal && modal !== 'new' ? modal.nombreCompleto : ''}
              required
              placeholder="Ej: Javier Ramírez"
              className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Usuario (Código) *</label>
              <input
                type="text"
                name="codigo"
                defaultValue={modal && modal !== 'new' ? modal.codigo : ''}
                disabled={modal !== 'new'}
                required
                placeholder="ej: jramirez"
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Rol *</label>
              <select
                name="rol"
                defaultValue={modal && modal !== 'new' ? modal.rol : 'CAJERO'}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.codigo} - {r.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              name="email"
              defaultValue={modal && modal !== 'new' ? modal.email : ''}
              required
              placeholder="ej: javier.ramirez@afilamos.local"
              className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {modal === 'new' ? 'Contraseña *' : 'Cambiar Contraseña (Opcional)'}
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                defaultValue={modal === 'new' ? 'Afilamos2026*' : ''}
                required={modal === 'new'}
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>PIN de Autorización *</span>
                <span className="text-[10px] text-amber-400 font-mono">4 dígitos</span>
              </label>
              <input
                type="password"
                name="pin"
                maxLength={4}
                placeholder="1234"
                defaultValue="1234"
                required
                className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-indigo-500 text-center tracking-widest"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 italic mt-1 m-0">
            * El PIN se utiliza para autorizar excepciones comerciales (VoBo), apertura de gaveta de caja o confirmar transacciones críticas cuando el rol lo faculte.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
