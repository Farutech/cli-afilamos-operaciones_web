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

const BASE_URL = '/api/v1/admin';

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const adminApi = {
  // Usuarios y Roles
  async getUsuarios(token?: string): Promise<UsuarioAdminDto[]> {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al obtener lista de usuarios');
    }
    return res.json();
  },

  async crearUsuario(dto: CrearUsuarioDto, token?: string): Promise<UsuarioAdminDto> {
    const res = await fetch(`${BASE_URL}/usuarios`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al crear usuario');
    }
    return res.json();
  },

  async actualizarUsuario(uuid: string, dto: ActualizarUsuarioDto, token?: string): Promise<UsuarioAdminDto> {
    const res = await fetch(`${BASE_URL}/usuarios/${uuid}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al actualizar usuario');
    }
    return res.json();
  },

  async cambiarEstadoUsuario(uuid: string, activo: boolean, token?: string): Promise<UsuarioAdminDto> {
    const res = await fetch(`${BASE_URL}/usuarios/${uuid}/estado`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ activo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al cambiar estado de usuario');
    }
    return res.json();
  },

  async resetearPinUsuario(uuid: string, nuevoPin: string, token?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/usuarios/${uuid}/reset-pin`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ nuevoPin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al resetear PIN');
    }
  },

  async getRoles(token?: string): Promise<string[]> {
    const res = await fetch(`${BASE_URL}/roles`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al obtener roles');
    }
    return res.json();
  },

  // Cuentas Bancarias
  async getCuentaBancaria(token?: string): Promise<CuentaBancariaConfigDto> {
    const res = await fetch(`${BASE_URL}/cuentas-bancarias`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al obtener cuenta bancaria');
    }
    return res.json();
  },

  async guardarCuentaBancaria(dto: CuentaBancariaConfigDto, token?: string): Promise<CuentaBancariaConfigDto> {
    const res = await fetch(`${BASE_URL}/cuentas-bancarias`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al guardar cuenta bancaria');
    }
    return res.json();
  },

  // Workflows
  async getWorkflows(incluirInactivos = false, token?: string): Promise<WorkflowDefinicionAdminDto[]> {
    const res = await fetch(`${BASE_URL}/workflows?incluirInactivos=${incluirInactivos}`, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al obtener workflows');
    }
    return res.json();
  },

  async crearBorradorWorkflow(dto: CrearWorkflowBorradorDto, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await fetch(`${BASE_URL}/workflows/borrador`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al crear borrador de workflow');
    }
    return res.json();
  },

  async agregarEtapa(uuid: string, dto: CrearEtapaDto, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await fetch(`${BASE_URL}/workflows/${uuid}/etapas`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al agregar etapa');
    }
    return res.json();
  },

  async agregarTransicion(uuid: string, dto: CrearTransicionDto, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await fetch(`${BASE_URL}/workflows/${uuid}/transiciones`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al agregar transición');
    }
    return res.json();
  },

  async publicarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await fetch(`${BASE_URL}/workflows/${uuid}/publicar`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al publicar workflow');
    }
    return res.json();
  },

  async retirarWorkflow(uuid: string, token?: string): Promise<WorkflowDefinicionAdminDto> {
    const res = await fetch(`${BASE_URL}/workflows/${uuid}/retirar`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Error al retirar workflow');
    }
    return res.json();
  },
};
