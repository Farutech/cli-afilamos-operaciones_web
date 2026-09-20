import { apiClient } from './api';
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

// Obtiene el token JWT almacenado en localStorage (sesión activa)
function getToken(): string | undefined {
  return localStorage.getItem('ordeon_token') ?? undefined;
}

export async function abrirTurno(req: AperturaTurnoRequest, token?: string): Promise<TurnoDto> {
  return apiClient<TurnoDto>(
    '/caja/turnos/apertura',
    { method: 'POST', body: JSON.stringify(req) },
    token ?? getToken(),
  );
}

export async function obtenerTurnoActivo(codigoCaja: string = 'CAJA-01', token?: string): Promise<TurnoDto | null> {
  try {
    return await apiClient<TurnoDto>(
      `/caja/turnos/activo?codigoCaja=${encodeURIComponent(codigoCaja)}`,
      { method: 'GET' },
      token ?? getToken(),
    );
  } catch (err: unknown) {
    // 404 → no hay turno activo
    if ((err as Error).message?.includes('[404]')) return null;
    throw err;
  }
}

export async function obtenerTurnoPorId(id: number, token?: string): Promise<TurnoDto> {
  return apiClient<TurnoDto>(
    `/caja/turnos/${id}`,
    { method: 'GET' },
    token ?? getToken(),
  );
}

export async function registrarEgreso(turnoId: number, req: RegistrarEgresoRequest, token?: string): Promise<EgresoDto> {
  return apiClient<EgresoDto>(
    `/caja/turnos/${turnoId}/egreso`,
    { method: 'POST', body: JSON.stringify(req) },
    token ?? getToken(),
  );
}

export async function declararArqueoCiego(turnoId: number, req: DeclararArqueoCiegoRequest, token?: string): Promise<DeclaracionCierreResponse> {
  return apiClient<DeclaracionCierreResponse>(
    `/caja/turnos/${turnoId}/cierre/declarar`,
    { method: 'POST', body: JSON.stringify(req) },
    token ?? getToken(),
  );
}

export async function obtenerDetalleSupervisor(turnoId: number, token?: string): Promise<DetalleSupervisorCierreDto> {
  return apiClient<DetalleSupervisorCierreDto>(
    `/caja/cierres/${turnoId}/detalle-supervisor`,
    { method: 'GET' },
    token ?? getToken(),
  );
}

export async function procesarVoBo(turnoId: number, req: ProcesarVoBoRequest, token?: string): Promise<TurnoDto> {
  return apiClient<TurnoDto>(
    `/caja/cierres/${turnoId}/vobo`,
    { method: 'POST', body: JSON.stringify(req) },
    token ?? getToken(),
  );
}

