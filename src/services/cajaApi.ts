import type {
  TurnoDto,
  AperturaTurnoRequest,
  RegistrarEgresoRequest,
  EgresoDto,
  DeclararArqueoCiegoRequest,
  DeclaracionCierreResponse,
  DetalleSupervisorCierreDto,
  ProcesarVoBoRequest
} from '../types/caja';

const API_BASE = '/api/v1/caja';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function abrirTurno(req: AperturaTurnoRequest): Promise<TurnoDto> {
  const res = await fetch(`${API_BASE}/turnos/apertura`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al abrir turno' }));
    throw new Error(err.message || 'Error al abrir turno');
  }

  return res.json();
}

export async function obtenerTurnoActivo(codigoCaja: string = 'CAJA-01'): Promise<TurnoDto | null> {
  const res = await fetch(`${API_BASE}/turnos/activo?codigoCaja=${encodeURIComponent(codigoCaja)}`, {
    headers: getAuthHeaders()
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error('Error al consultar turno activo');
  }

  return res.json();
}

export async function obtenerTurnoPorId(id: number): Promise<TurnoDto> {
  const res = await fetch(`${API_BASE}/turnos/${id}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    throw new Error('Error al consultar turno');
  }

  return res.json();
}

export async function registrarEgreso(turnoId: number, req: RegistrarEgresoRequest): Promise<EgresoDto> {
  const res = await fetch(`${API_BASE}/turnos/${turnoId}/egreso`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al registrar egreso' }));
    throw new Error(err.message || 'Error al registrar egreso');
  }

  return res.json();
}

export async function declararArqueoCiego(turnoId: number, req: DeclararArqueoCiegoRequest): Promise<DeclaracionCierreResponse> {
  const res = await fetch(`${API_BASE}/turnos/${turnoId}/cierre/declarar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al declarar arqueo de cierre' }));
    throw new Error(err.message || 'Error al declarar arqueo de cierre');
  }

  return res.json();
}

export async function obtenerDetalleSupervisor(turnoId: number): Promise<DetalleSupervisorCierreDto> {
  const res = await fetch(`${API_BASE}/cierres/${turnoId}/detalle-supervisor`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al consultar detalle de supervisión' }));
    throw new Error(err.message || 'Error al consultar detalle de supervisión');
  }

  return res.json();
}

export async function procesarVoBo(turnoId: number, req: ProcesarVoBoRequest): Promise<TurnoDto> {
  const res = await fetch(`${API_BASE}/cierres/${turnoId}/vobo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al procesar VoBo' }));
    throw new Error(err.message || 'Error al procesar VoBo');
  }

  return res.json();
}
