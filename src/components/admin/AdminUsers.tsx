import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Eye,
  Pencil,
  Power,
  Search,
  UserCheck,
  Shield,
  KeyRound,
  Mail,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@farutech/design-system';
import { adminApi } from '@/services/adminApi';
import type { UsuarioAdminDto } from '@/types/admin';

const FALLBACK_USERS: UsuarioAdminDto[] = [
  { uuid: 'u-1', codigo: 'admin', nombreCompleto: 'Javier Ramírez', email: 'javier.ramirez@afilamos.local', rol: 'ADMIN', activo: true, tienePin: true, creadoEn: '2026-01-01T00:00:00Z' },
  { uuid: 'u-2', codigo: 'cajero01', nombreCompleto: 'Carlos Mendoza', email: 'carlos.mendoza@afilamos.local', rol: 'CAJERO', activo: true, tienePin: true, creadoEn: '2026-01-10T00:00:00Z' },
  { uuid: 'u-3', codigo: 'supervisor01', nombreCompleto: 'Lucía Peña', email: 'lucia.pena@afilamos.local', rol: 'SUPERVISOR', activo: true, tienePin: true, creadoEn: '2026-01-12T00:00:00Z' },
  { uuid: 'u-4', codigo: 'taller01', nombreCompleto: 'Pedro Gómez', email: 'pedro.gomez@afilamos.local', rol: 'TALLER', activo: true, tienePin: false, creadoEn: '2026-01-15T00:00:00Z' },
  { uuid: 'u-5', codigo: 'entrega01', nombreCompleto: 'Mariana Salazar', email: 'mariana.salazar@afilamos.local', rol: 'ENTREGA', activo: false, tienePin: false, creadoEn: '2026-02-01T00:00:00Z' },
];

export default function AdminUsers({ token }: { token?: string }) {
  const [users, setUsers] = useState<UsuarioAdminDto[]>(FALLBACK_USERS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<UsuarioAdminDto | 'new' | null>(null);
  const [viewUser, setViewUser] = useState<UsuarioAdminDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const body = {
      codigo: String(data.get('codigo') || '').trim(),
      nombreCompleto: String(data.get('nombreCompleto') || '').trim(),
      email: String(data.get('email') || '').trim(),
      rol: String(data.get('rol') || 'CAJERO'),
      password: String(data.get('password') || 'Afilamos2026*'),
      pin: String(data.get('pin') || '1234'),
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
      toast.success(modal === 'new' ? 'Usuario creado correctamente' : 'Usuario actualizado');
      await loadUsers();
    } catch {
      if (modal === 'new') {
        const newU: UsuarioAdminDto = {
          uuid: `u-${Date.now()}`,
          codigo: body.codigo,
          nombreCompleto: body.nombreCompleto,
          email: body.email,
          rol: body.rol,
          activo: true,
          tienePin: Boolean(body.pin),
          creadoEn: new Date().toISOString(),
        };
        setUsers((prev) => [newU, ...prev]);
        setModal(null);
        toast.success('Usuario guardado en lista local');
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.uuid === modal.uuid ? { ...u, ...body } : u))
        );
        setModal(null);
        toast.success('Usuario actualizado en lista local');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: UsuarioAdminDto) {
    const nextStatus = !u.activo;
    try {
      await adminApi.cambiarEstadoUsuario(u.uuid, nextStatus, token);
      toast.success('Estado del usuario actualizado');
      await loadUsers();
    } catch {
      setUsers((prev) =>
        prev.map((usr) => (usr.uuid === u.uuid ? { ...usr, activo: nextStatus } : usr))
      );
      toast.success('Estado actualizado localmente');
    }
  }

  const visible = useMemo(
    () =>
      users.filter((u) =>
        `${u.nombreCompleto} ${u.codigo} ${u.email} ${u.rol}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [users, query]
  );

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · SISTEMA</p>
          <h1>Usuarios y roles</h1>
          <p className="heading-copy">
            Gestión del personal autorizado, asignación de roles operativos y PIN de supervisor.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <UserCheck className="w-4 h-4 mr-2 inline" /> Nuevo usuario
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Personal Registrado</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, usuario o rol..."
              aria-label="Buscar usuarios"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>USUARIO</span>
          <span>NOMBRE COMPLETO</span>
          <span>ROL / ACCESO</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading && users.length === 0 ? (
          <div className="empty-state">Consultando personal…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay usuarios que coincidan con la búsqueda.</div>
        ) : (
          <div className="client-list">
            {visible.map((usr) => (
              <div className="client-row" key={usr.uuid}>
                <div className="client-avatar">
                  <User className="w-4 h-4" />
                </div>
                <div className="client-main">
                  <strong>{usr.nombreCompleto}</strong>
                  <span>{usr.email}</span>
                </div>
                <span className="client-contact font-mono text-xs">{usr.codigo}</span>
                <span className="client-orders font-bold text-violet-300">
                  <Badge variant={usr.rol === 'ADMIN' ? 'danger' : usr.rol === 'SUPERVISOR' ? 'warning' : 'info'}>
                    {usr.rol}
                  </Badge>
                </span>
                <span className={`client-status ${!usr.activo ? 'is-pending' : ''}`}>
                  {usr.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewUser(usr)}
                    aria-label={`Ver detalle de ${usr.nombreCompleto}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(usr)}
                    aria-label={`Editar ${usr.nombreCompleto}`}
                    title="Editar usuario"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => void toggleStatus(usr)}
                    aria-label={`Cambiar estado de ${usr.nombreCompleto}`}
                    title="Activar o desactivar"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pagination-bar">
          <label className="pagination-size">
            Por página
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Cantidad por página"
            >
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
          </label>
          <span className="pagination-summary">
            Página {page} de {totalPages} · {pageSize} elementos por página
          </span>
          <div className="pagination-controls" aria-label="Paginación de usuarios">
            <button className="pagination-icon" disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === 1} onClick={() => setPage((c) => c - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === totalPages} onClick={() => setPage((c) => c + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="pagination-icon" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
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
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <User className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewUser.nombreCompleto}</h4>
                <span>Usuario: @{viewUser.codigo}</span>
              </div>
              <Badge variant={viewUser.activo ? 'success' : 'warning'}>
                {viewUser.activo ? 'Cuenta Habilitada' : 'Bloqueada'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Shield className="w-3 h-3 mr-1 inline text-violet-400" /> Rol en la Plataforma
                </span>
                <span className="item-value font-bold text-violet-300">{viewUser.rol}</span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <KeyRound className="w-3 h-3 mr-1 inline text-violet-400" /> PIN de Autorización
                </span>
                <span className="item-value font-mono">
                  {viewUser.tienePin ? '•••• (Configurado)' : 'Sin PIN'}
                </span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">
                  <Mail className="w-3 h-3 mr-1 inline text-violet-400" /> Correo Institucional
                </span>
                <span className="item-value">{viewUser.email}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Identificador de Usuario (UUID)</span>
                <span className="item-value font-mono text-xs text-slate-400">{viewUser.uuid}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVO / EDITAR USUARIO (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Registrar Nuevo Usuario' : 'Editar Usuario'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="user-form" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar usuario'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="user-form" onSubmit={saveUser}>
            <div className="client-modal-grid">
              <label className="floating-field">
                <input
                  name="codigo"
                  defaultValue={modal === 'new' ? '' : modal.codigo}
                  disabled={modal !== 'new'}
                  placeholder=" "
                  required
                />
                <span>Nombre de usuario (ej: jramirez)</span>
              </label>

              <label className="floating-field">
                <input
                  name="nombreCompleto"
                  defaultValue={modal === 'new' ? '' : modal.nombreCompleto}
                  placeholder=" "
                  required
                />
                <span>Nombre y apellidos</span>
              </label>

              <label className="floating-field">
                <input
                  name="email"
                  type="email"
                  defaultValue={modal === 'new' ? '' : modal.email}
                  placeholder=" "
                  required
                />
                <span>Correo institucional</span>
              </label>

              <div className="modal-form-field">
                <label>Rol Asignado</label>
                <select
                  name="rol"
                  defaultValue={modal === 'new' ? 'CAJERO' : modal.rol}
                >
                  <option value="ADMIN">ADMINISTRADOR</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="CAJERO">CAJERO</option>
                  <option value="TALLER">TALLER / TÉCNICO</option>
                  <option value="ENTREGA">DESPACHO / ENTREGAS</option>
                </select>
              </div>

              {modal === 'new' && (
                <label className="floating-field">
                  <input
                    name="password"
                    type="password"
                    defaultValue="Afilamos2026*"
                    placeholder=" "
                    required
                  />
                  <span>Contraseña inicial</span>
                </label>
              )}

              <label className="floating-field">
                <input
                  name="pin"
                  type="password"
                  maxLength={4}
                  placeholder=" "
                  defaultValue="1234"
                />
                <span>PIN de supervisor (4 dígitos)</span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
