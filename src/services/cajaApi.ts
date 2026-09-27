import { apiClient } from './api';
import type {
  TurnoDto,
  AperturaTurnoRequest,
  RegistrarEgresoRequest,
  EgresoDto,
  DeclararArqueoCiegoRequest,
  DeclaracionCierreResponse,
  DetalleSupervisorCierreDto,
  ProcesarVoBoRequest,
} from '../types/caja';

function getToken(): string | undefined {
  return localStorage.getItem('ordeon_token') ?? undefined;
}

export async function abrirTurno(req: AperturaTurnoRequest, token?: string): Promise<TurnoDto> {
  const res = await apiClient<any>(
    '/cash/shifts/open',
    {
      method: 'POST',
      body: JSON.stringify({
        baseAmount: req.baseInicial,
      }),
    },
    token ?? getToken(),
  );

  return {
    id: 1,
    publicId: res?.id || 'turno-01',
    codigo: 'TURNO-01',
    codigoCaja: req.codigoCaja || 'CAJA-01',
    nombreCaja: 'Caja Mostrador',
    idUsuarioApertura: req.idUsuario ?? 1,
    nombreCajero: 'Cajero Principal',
    fechaAperturaUtc: new Date().toISOString(),
    baseInicial: req.baseInicial,
    estado: 'ABIERTO',
    movimientos: [],
  };
}

export async function obtenerTurnoActivo(codigoCaja: string = 'CAJA-01', token?: string): Promise<TurnoDto | null> {
  try {
    const res = await apiClient<any>(
      `/cash/active?registerCode=${encodeURIComponent(codigoCaja)}`,
      { method: 'GET' },
      token ?? getToken(),
    );

    return {
      id: 1,
      publicId: res.uuid || res.shiftId || '',
      codigo: res.codigoCaja || res.registerCode || 'CAJA-01',
      codigoCaja: res.codigoCaja || res.registerCode || 'CAJA-01',
      nombreCaja: res.nombreCaja || res.registerCode || 'Caja',
      idUsuarioApertura: 1,
      nombreCajero: res.cajeroNombre || res.openedByName || 'Cajero',
      fechaAperturaUtc: res.openedAt || new Date().toISOString(),
      baseInicial: res.baseInicial ?? res.baseAmount ?? 0,
      teoricoTotal: res.saldoTeorico ?? res.theoreticalBalance ?? 0,
      diferenciaTotal: 0,
      estado: res.estado || res.status || 'ABIERTO',
      movimientos: [],
    };
  } catch (err: unknown) {
    if ((err as Error).message?.includes('[404]')) return null;
    throw err;
  }
}

export async function obtenerTurnoPorId(id: number, token?: string): Promise<TurnoDto> {
  const res = await apiClient<any>(
    `/cash/shifts/${id}`,
    { method: 'GET' },
    token ?? getToken(),
  );

  return {
    id,
    publicId: res.uuid || res.shiftId || String(id),
    codigo: `TURNO-0${id}`,
    codigoCaja: res.codigoCaja || res.registerCode || 'CAJA-01',
    nombreCaja: 'Caja Mostrador',
    idUsuarioApertura: 1,
    nombreCajero: 'Cajero Principal',
    fechaAperturaUtc: res.openedAt || new Date().toISOString(),
    baseInicial: res.baseInicial || res.baseAmount || 0,
    teoricoTotal: res.saldoTeorico || res.theoreticalBalance || 0,
    estado: res.status === 'CLOSED' ? 'CERRADO' : 'ABIERTO',
    movimientos: [],
  };
}

export async function registrarEgreso(turnoId: number, req: RegistrarEgresoRequest, token?: string): Promise<EgresoDto> {
  const res = await apiClient<any>(
    `/cash/shifts/${turnoId}/movements`,
    {
      method: 'POST',
      body: JSON.stringify({
        kind: 'OUT',
        amount: req.monto,
        reason: req.motivo,
      }),
    },
    token ?? getToken(),
  );

  return {
    idDocumento: 1,
    consecutivo: 'EGR-0001',
    monto: res?.amount ?? req.monto,
    motivo: res?.reason ?? req.motivo,
    fechaUtc: res?.createdAt ?? new Date().toISOString(),
  };
}

export async function declararArqueoCiego(turnoId: number, req: DeclararArqueoCiegoRequest, token?: string): Promise<DeclaracionCierreResponse> {
  await apiClient<any>(
    `/cash/shifts/${turnoId}/counts`,
    {
      method: 'POST',
      body: JSON.stringify({
        declaredAmount: req.declaradoEfectivo,
        countMethod: 'BLIND_COUNT',
      }),
    },
    token ?? getToken(),
  );

  return {
    estado: 'PENDIENTE_VOBO',
    idCierre: 1,
    codigoTurno: `TURNO-0${turnoId}`,
  };
}

export async function obtenerDetalleSupervisor(turnoId: number, token?: string): Promise<DetalleSupervisorCierreDto> {
  const res = await apiClient<any>(
    `/reports/cash-closure/${turnoId}`,
    { method: 'GET' },
    token ?? getToken(),
  );

  const saldo = res?.saldoTeorico ?? res?.theoreticalBalance ?? 0;
  const decl = res?.totalDeclarado ?? res?.declaredTotal ?? 0;

  return {
    idTurno: turnoId,
    codigoTurno: `TURNO-0${turnoId}`,
    cajero: 'Cajero Principal',
    declarado: {
      efectivo: decl,
      tarjeta: 0,
      transferencia: 0,
      total: decl,
    },
    teorico: {
      efectivo: saldo,
      tarjeta: 0,
      transferencia: 0,
      total: saldo,
    },
    diferencia: decl - saldo,
    estado: res?.estado ?? 'PENDIENTE_VOBO',
  };
}

export async function procesarVoBo(turnoId: number, req: ProcesarVoBoRequest, token?: string): Promise<TurnoDto> {
  await apiClient<any>(
    `/cash/shifts/${turnoId}/close`,
    {
      method: 'POST',
      body: JSON.stringify({
        closeReason: req.observacion,
        supervisorPin: req.pin,
        discrepancyReason: req.observacion,
      }),
    },
    token ?? getToken(),
  );

  return {
    id: turnoId,
    publicId: String(turnoId),
    codigo: `TURNO-0${turnoId}`,
    codigoCaja: 'CAJA-01',
    nombreCaja: 'Caja Mostrador',
    idUsuarioApertura: 1,
    nombreCajero: 'Cajero Principal',
    fechaAperturaUtc: new Date().toISOString(),
    baseInicial: 0,
    estado: 'CERRADO',
    movimientos: [],
  };
}

export const cajaApi = {
  abrirTurno,
  obtenerTurnoActivo,
  obtenerTurnoPorId,
  registrarEgreso,
  declararArqueoCiego,
  obtenerDetalleSupervisor,
  procesarVoBo,
};
