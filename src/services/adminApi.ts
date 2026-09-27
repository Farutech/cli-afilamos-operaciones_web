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

  async crearUsuario(dto: CrearUsuarioDto, _token?: string): Promise<UsuarioAdminDto> {
    return {
      uuid: 'user-' + Date.now(),
      codigo: dto.codigo,
      nombreCompleto: dto.nombreCompleto,
      email: dto.email,
      rol: dto.rol,
      activo: true,
      tienePin: !!dto.pin,
      creadoEn: new Date().toISOString(),
    };
  },

  async actualizarUsuario(
    uuid: string,
    dto: ActualizarUsuarioDto,
    _token?: string,
  ): Promise<UsuarioAdminDto> {
    return {
      uuid,
      codigo: 'USR',
      nombreCompleto: dto.nombreCompleto || 'Usuario',
      email: dto.email || 'usuario@afilamos.local',
      rol: dto.rol || 'ADMIN',
      activo: true,
      tienePin: false,
      creadoEn: new Date().toISOString(),
    };
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
