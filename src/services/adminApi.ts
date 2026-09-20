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
    return apiClient<UsuarioAdminDto[]>('/admin/usuarios', { method: 'GET' }, token);
  },

  async crearUsuario(dto: CrearUsuarioDto, token?: string): Promise<UsuarioAdminDto> {
    return apiClient<UsuarioAdminDto>(
      '/admin/usuarios',
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
  },

  async actualizarUsuario(
    uuid: string,
    dto: ActualizarUsuarioDto,
    token?: string,
  ): Promise<UsuarioAdminDto> {
    return apiClient<UsuarioAdminDto>(
      `/admin/usuarios/${uuid}`,
      { method: 'PUT', body: JSON.stringify(dto) },
      token,
    );
  },

  async cambiarEstadoUsuario(
    uuid: string,
    activo: boolean,
    token?: string,
  ): Promise<UsuarioAdminDto> {
    return apiClient<UsuarioAdminDto>(
      `/admin/usuarios/${uuid}/estado`,
      { method: 'PATCH', body: JSON.stringify({ activo }) },
      token,
    );
  },

  async resetearPinUsuario(uuid: string, nuevoPin: string, token?: string): Promise<void> {
    await apiClient<{ mensaje: string }>(
      `/admin/usuarios/${uuid}/reset-pin`,
      { method: 'POST', body: JSON.stringify({ nuevoPin }) },
      token,
    );
  },

  async getRoles(token?: string): Promise<string[]> {
    return apiClient<string[]>('/admin/roles', { method: 'GET' }, token);
  },

  // ─── Configuración de Recaudos (datos bancarios para transferencias) ────────

  async getCuentaBancaria(token?: string): Promise<CuentaBancariaConfigDto> {
    return apiClient<CuentaBancariaConfigDto>('/admin/cuentas-bancarias', { method: 'GET' }, token);
  },

  async guardarCuentaBancaria(
    dto: CuentaBancariaConfigDto,
    token?: string,
  ): Promise<CuentaBancariaConfigDto> {
    return apiClient<CuentaBancariaConfigDto>(
      '/admin/cuentas-bancarias',
      { method: 'PUT', body: JSON.stringify(dto) },
      token,
    );
  },

  // ─── Workflows Versionados ──────────────────────────────────────────────────

  async getWorkflows(
    incluirInactivos = false,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto[]> {
    return apiClient<WorkflowDefinicionAdminDto[]>(
      `/admin/workflows?incluirInactivos=${incluirInactivos}`,
      { method: 'GET' },
      token,
    );
  },

  async crearBorradorWorkflow(
    dto: CrearWorkflowBorradorDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return apiClient<WorkflowDefinicionAdminDto>(
      '/admin/workflows/borrador',
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
  },

  async agregarEtapa(
    uuid: string,
    dto: CrearEtapaDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return apiClient<WorkflowDefinicionAdminDto>(
      `/admin/workflows/${uuid}/etapas`,
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
  },

  async agregarTransicion(
    uuid: string,
    dto: CrearTransicionDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    return apiClient<WorkflowDefinicionAdminDto>(
      `/admin/workflows/${uuid}/transiciones`,
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
  },

  async publicarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    return apiClient<WorkflowDefinicionAdminDto>(
      `/admin/workflows/${uuid}/publicar`,
      { method: 'POST' },
      token,
    );
  },

  async retirarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    return apiClient<WorkflowDefinicionAdminDto>(
      `/admin/workflows/${uuid}/retirar`,
      { method: 'POST' },
      token,
    );
  },
};

