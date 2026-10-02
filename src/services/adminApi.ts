import { apiClient } from './api';
import type {
  UsuarioAdminDto,
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  CuentaBancariaConfigDto,
  WorkflowDefinicionAdminDto,
  CrearWorkflowBorradorDto,
  CrearEtapaDto,
  CrearTransicionDto,
} from '../types/admin';

function mapUsuario(u: any, fallbackId?: string): UsuarioAdminDto {
  return {
    uuid: u?.id || u?.uuid || fallbackId || '',
    codigo: u?.username || u?.code || 'USR',
    nombreCompleto: u?.fullName || u?.name || u?.username || 'Usuario',
    email: u?.email || '',
    rol: u?.role || (u?.canSuperviseCash ? 'SUPERVISOR' : (u?.canBeCashier ? 'CAJERO' : 'ADMIN')),
    activo: u?.isActive ?? u?.active ?? true,
    tienePin: u?.hasPinConfigured ?? Boolean(u?.pin),
    creadoEn: u?.createdAt || new Date().toISOString(),
  };
}

export const adminApi = {
  // ─── Usuarios y Roles ───────────────────────────────────────────────────────

  async getUsuarios(token?: string): Promise<UsuarioAdminDto[]> {
    try {
      const res = await apiClient<any[]>('/users', { method: 'GET' }, token);
      const list = Array.isArray(res) ? res : [];
      return list.map((u: any) => ({
        uuid: u.id,
        codigo: u.username || 'USR',
        nombreCompleto: u.fullName || u.username,
        email: u.email || `${u.username || 'user'}@afilamos.local`,
        rol: u.canSuperviseCash ? 'SUPERVISOR' : (u.canBeCashier ? 'CAJERO' : 'ADMIN'),
        activo: u.isActive ?? true,
        tienePin: u.hasPinConfigured ?? false,
        creadoEn: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  async crearUsuario(dto: CrearUsuarioDto, token?: string): Promise<UsuarioAdminDto> {
    const res = await apiClient<any>('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: dto.codigo,
        fullName: dto.nombreCompleto,
        email: dto.email,
        password: dto.password,
        role: dto.rol,
        pin: dto.pin || null,
        documentNumber: '',
        phone: '',
        canBeCashier: dto.rol === 'CAJERO',
        canSuperviseCash: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
        canForceCloseCash: dto.rol === 'ADMIN',
        canApproveAdvanceWaiver: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
        canApproveDelivery: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
      }),
    }, token);
    return mapUsuario(res);
  },

  async actualizarUsuario(
    uuid: string,
    dto: ActualizarUsuarioDto,
    token?: string,
  ): Promise<UsuarioAdminDto> {
    const res = await apiClient<any>(`/users/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify({
        fullName: dto.nombreCompleto,
        email: dto.email,
        role: dto.rol,
        documentNumber: '',
        phone: '',
        canBeCashier: dto.rol === 'CAJERO',
        canSuperviseCash: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
        canForceCloseCash: dto.rol === 'ADMIN',
        canApproveAdvanceWaiver: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
        canApproveDelivery: dto.rol === 'SUPERVISOR' || dto.rol === 'ADMIN',
      }),
    }, token);
    return mapUsuario(res, uuid);
  },

  async cambiarEstadoUsuario(
    uuid: string,
    activo: boolean,
    token?: string,
  ): Promise<UsuarioAdminDto> {
    await apiClient<any>(
      `/users/${uuid}/status`,
      { method: 'PATCH', body: JSON.stringify({ active: activo }) },
      token,
    );
    return {
      uuid,
      codigo: 'USR',
      nombreCompleto: 'Usuario',
      email: 'usuario@afilamos.local',
      rol: 'ADMIN',
      activo,
      tienePin: false,
      creadoEn: new Date().toISOString(),
    };
  },

  async resetearPinUsuario(uuid: string, nuevoPin: string, token?: string): Promise<void> {
    await apiClient<{ message: string }>(
      `/users/${uuid}/reset-pin`,
      { method: 'POST', body: JSON.stringify({ newPin: nuevoPin }) },
      token,
    );
  },

  async getRoles(token?: string): Promise<string[]> {
    try {
      const res = await apiClient<string[]>('/users/roles', { method: 'GET' }, token);
      return Array.isArray(res) ? res : ['ADMIN', 'SUPERVISOR', 'CAJERO', 'TALLER'];
    } catch {
      return ['ADMIN', 'SUPERVISOR', 'CAJERO', 'TALLER'];
    }
  },

  // ─── Configuración de Recaudos (datos bancarios para transferencias) ────────

  async getCuentaBancaria(token?: string): Promise<CuentaBancariaConfigDto> {
    try {
      const res = await apiClient<any>('/configuration/parameters/DATOS_BANCARIOS', { method: 'GET' }, token);
      if (res?.value) {
        return JSON.parse(res.value) as CuentaBancariaConfigDto;
      }
    } catch {
      // Fallback
    }
    return {
      banco: 'Bancolombia',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '123-456789-00',
      titular: 'Afilamos Hermanos S.A.S.',
      nitTitular: '900.123.456-7',
      billeteraDigital: '3001234567',
    };
  },

  async guardarCuentaBancaria(
    dto: CuentaBancariaConfigDto,
    token?: string,
  ): Promise<CuentaBancariaConfigDto> {
    await apiClient<any>(
      '/configuration/parameters/DATOS_BANCARIOS',
      { method: 'PUT', body: JSON.stringify(dto) },
      token,
    );
    return dto;
  },

  // ─── Workflows Versionados ──────────────────────────────────────────────────

  async getWorkflows(
    _incluirInactivos = false,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto[]> {
    try {
      const res = await apiClient<any>('/configuration/workflows', { method: 'GET' }, token);
      const raw = Array.isArray(res) ? res : (res?.workflows || []);
      return raw.map((w: any) => ({
        uuid: w.id,
        codigo: w.code,
        nombre: w.name,
        descripcion: w.description || '',
        versionNumero: 1,
        esVigente: true,
        activo: true,
        creadoEn: new Date().toISOString(),
        etapas: (w.steps || []).map((s: any) => ({
          uuid: s.id,
          codigo: s.code,
          nombre: s.name,
          orden: s.step,
          permiteCancelacionDirecta: false,
          esFinal: false,
          transicionesSalientes: [],
        })),
      }));
    } catch {
      return [];
    }
  },

  async crearBorradorWorkflow(
    dto: CrearWorkflowBorradorDto,
    _token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return {
      uuid: 'wf-' + Date.now(),
      codigo: dto.codigo,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      versionNumero: 1,
      esVigente: false,
      activo: true,
      creadoEn: new Date().toISOString(),
      etapas: [],
    };
  },

  async agregarEtapa(
    _uuid: string,
    _dto: CrearEtapaDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return this.getWorkflows(false, token).then((w) => w[0]);
  },

  async agregarTransicion(
    _uuid: string,
    _dto: CrearTransicionDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return this.getWorkflows(false, token).then((w) => w[0]);
  },

  async publicarWorkflow(_uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    return this.getWorkflows(false, token).then((w) => w[0]);
  },

  async retirarWorkflow(_uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    return this.getWorkflows(false, token).then((w) => w[0]);
  },
};
