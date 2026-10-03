import { apiClient } from './api';
import type {
  UsuarioAdminDto,
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  CuentaBancariaConfigDto,
  WorkflowDefinicionAdminDto,
  WorkflowServicioItemDto,
  CrearWorkflowBorradorDto,
  ActualizarWorkflowDto,
  CrearEtapaDto,
  ActualizarEtapaDto,
  ReordenarEtapasDto,
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
    incluirInactivos = false,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto[]> {
    try {
      const res = await apiClient<any>(`/configuration/workflows?includeInactive=${incluirInactivos}`, { method: 'GET' }, token);
      const raw = Array.isArray(res) ? res : (res?.workflows || res?.items || []);
      return raw.map((w: any) => ({
        uuid: w.id || w.uuid,
        id: w.id || w.uuid,
        codigo: w.code || w.codigo,
        nombre: w.name || w.nombre,
        descripcion: w.description || w.descripcion || '',
        versionNumero: w.versionNumero || 1,
        esVigente: w.esVigente ?? w.active ?? true,
        activo: w.activo ?? w.active ?? true,
        serviciosVinculadosCount: w.serviciosVinculadosCount ?? 0,
        creadoEn: w.creadoEn || new Date().toISOString(),
        etapas: (w.steps || w.etapas || []).map((s: any) => ({
          uuid: s.id || s.uuid,
          id: s.id || s.uuid,
          codigo: s.code || s.codigo,
          nombre: s.name || s.nombre,
          orden: s.step || s.orden || 1,
          step: s.step || s.orden || 1,
          descripcion: s.descripcion || s.description || '',
          rolRequerido: s.rolRequerido || s.requiredRole || 'TALLER',
          tiempoEstimadoMinutos: s.tiempoEstimadoMinutos ?? s.estimatedMinutes ?? 0,
          permiteCancelacionDirecta: s.permiteCancelacionDirecta ?? false,
          esFinal: s.esFinal ?? false,
          activo: s.activo ?? s.active ?? true,
          transicionesSalientes: s.transicionesSalientes || [],
        })),
      }));
    } catch {
      return [];
    }
  },

  async getWorkflowById(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(`/configuration/workflows/${uuid}`, { method: 'GET' }, token);
    return {
      uuid: res.id || res.uuid,
      id: res.id || res.uuid,
      codigo: res.code || res.codigo,
      nombre: res.name || res.nombre,
      descripcion: res.description || res.descripcion || '',
      versionNumero: res.versionNumero || 1,
      esVigente: res.esVigente ?? res.active ?? true,
      activo: res.activo ?? res.active ?? true,
      serviciosVinculadosCount: res.serviciosVinculadosCount ?? (res.serviciosVinculados?.length || 0),
      serviciosVinculados: res.serviciosVinculados || [],
      creadoEn: res.creadoEn || new Date().toISOString(),
      etapas: (res.steps || res.etapas || []).map((s: any) => ({
        uuid: s.id || s.uuid,
        id: s.id || s.uuid,
        codigo: s.code || s.codigo,
        nombre: s.name || s.nombre,
        orden: s.step || s.orden || 1,
        step: s.step || s.orden || 1,
        descripcion: s.descripcion || s.description || '',
        rolRequerido: s.rolRequerido || s.requiredRole || 'TALLER',
        tiempoEstimadoMinutos: s.tiempoEstimadoMinutos ?? s.estimatedMinutes ?? 0,
        permiteCancelacionDirecta: s.permiteCancelacionDirecta ?? false,
        esFinal: s.esFinal ?? false,
        activo: s.activo ?? s.active ?? true,
        transicionesSalientes: s.transicionesSalientes || [],
      })),
    };
  },

  async crearBorradorWorkflow(
    dto: CrearWorkflowBorradorDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      '/configuration/workflows',
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid, token);
  },

  async actualizarWorkflow(
    uuid: string,
    dto: ActualizarWorkflowDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}`,
      { method: 'PUT', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async eliminarWorkflow(uuid: string, token?: string): Promise<void> {
    await apiClient<any>(`/configuration/workflows/${uuid}`, { method: 'DELETE' }, token);
  },

  async agregarEtapa(
    uuid: string,
    dto: CrearEtapaDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/steps`,
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async actualizarEtapa(
    uuid: string,
    etapaUuid: string,
    dto: ActualizarEtapaDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/steps/${etapaUuid}`,
      { method: 'PUT', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async eliminarEtapa(
    uuid: string,
    etapaUuid: string,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/steps/${etapaUuid}`,
      { method: 'DELETE' },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async reordenarEtapas(
    uuid: string,
    dto: ReordenarEtapasDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/steps/reorder`,
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async getServiciosWorkflow(
    uuid: string,
    token?: string,
  ): Promise<WorkflowServicioItemDto[]> {
    try {
      const res = await apiClient<any[]>(`/configuration/workflows/${uuid}/services`, { method: 'GET' }, token);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  async asignarServicioWorkflow(
    uuid: string,
    itemId: string,
    token?: string,
  ): Promise<void> {
    await apiClient<any>(`/configuration/workflows/${uuid}/services/${itemId}`, { method: 'POST' }, token);
  },

  async desasignarServicioWorkflow(
    uuid: string,
    itemId: string,
    token?: string,
  ): Promise<void> {
    await apiClient<any>(`/configuration/workflows/${uuid}/services/${itemId}`, { method: 'DELETE' }, token);
  },

  async agregarTransicion(
    uuid: string,
    dto: CrearTransicionDto,
    token?: string,
  ): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/transitions`,
      { method: 'POST', body: JSON.stringify(dto) },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async publicarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/publish`,
      { method: 'PATCH' },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },

  async retirarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await apiClient<any>(
      `/configuration/workflows/${uuid}/retire`,
      { method: 'PATCH' },
      token,
    );
    return this.getWorkflowById(res.id || res.uuid || uuid, token);
  },
};
