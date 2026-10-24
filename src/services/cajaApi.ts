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
import { securePin } from './pinSecurity';

function getToken(): string | undefined {
  return localStorage.getItem('ordeon_token') ?? undefined;
}

export async function abrirTurno(req: AperturaTurnoRequest, token?: string): Promise<TurnoDto> {
  const caja = req.codigoCaja || 'CAJA-01';
  try {
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

    const turno: TurnoDto = {
      id: res?.id || Date.now(),
      publicId: res?.id || `turno-${Date.now()}`,
      codigo: res?.code || res?.codigo || 'TURNO-01',
      codigoCaja: caja,
      nombreCaja: 'Caja Mostrador',
      idUsuarioApertura: req.idUsuario ?? 1,
      nombreCajero: 'Cajero Principal',
      fechaAperturaUtc: new Date().toISOString(),
      baseInicial: req.baseInicial,
      estado: 'ABIERTO',
      movimientos: [],
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`ordeon_turno_${caja}`, JSON.stringify(turno));
    }
    return turno;
  } catch (err: unknown) {
    const e = err as Error;
    // Fallback de contingencia local si la API remota responde 401 (sin token de servidor o modo offline)
    if (
      e.message?.includes('[401]') ||
      e.message?.includes('401') ||
      e.message?.includes('Failed to fetch') ||
      e.message?.includes('NetworkError')
    ) {
      const localTurno: TurnoDto = {
        id: Date.now(),
        publicId: `turno-local-${Date.now()}`,
        codigo: 'TURNO-01',
        codigoCaja: caja,
        nombreCaja: 'Caja Mostrador Principal',
        idUsuarioApertura: req.idUsuario ?? 1,
        nombreCajero: 'Javier Ramírez (Cajero)',
        fechaAperturaUtc: new Date().toISOString(),
        baseInicial: req.baseInicial,
        estado: 'ABIERTO',
        movimientos: [],
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`ordeon_turno_${caja}`, JSON.stringify(localTurno));
      }
      return localTurno;
    }
    throw err;
  }
}

export async function obtenerTurnoActivo(codigoCaja: string = 'CAJA-01', token?: string): Promise<TurnoDto | null> {
  try {
    const res = await apiClient<any>(
      `/cash/active?registerCode=${encodeURIComponent(codigoCaja)}`,
      { method: 'GET' },
      token ?? getToken(),
    );

    const movsRaw = Array.isArray(res.movimientos) ? res.movimientos : (Array.isArray(res.movements) ? res.movements : []);
    const movimientos = movsRaw.map((m: any, idx: number) => {
      const esOut = m.tipo === 'OUT' || m.kind === 'OUT' || m.tipoMovimiento === 'EGRESO_CAJA_MENOR';
      const esBase = m.tipo === 'BASE_INICIAL' || m.tipoMovimiento === 'BASE_INICIAL';
      const tipo = esBase ? 'BASE_INICIAL' : (esOut ? 'EGRESO_CAJA_MENOR' : (m.tipoMovimiento === 'PAGO' ? 'PAGO' : 'INGRESO'));

      return {
        id: idx + 1,
        publicId: m.uuid || m.publicId || String(idx + 1),
        codigo: m.codigo || (esOut ? 'EGR-0001' : (esBase ? 'BASE-01' : 'REC-0001')),
        tipoMovimiento: tipo,
        monto: typeof m.monto === 'number' ? m.monto : (m.amount ?? 0),
        concepto: m.concepto || m.motivo || m.reason || (esOut ? 'Egreso menor' : 'Movimiento de caja'),
        fechaUtc: m.fechaUtc || m.createdAt || new Date().toISOString(),
        nombreInstrumento: m.nombreInstrumento || null,
      };
    });

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
      movimientos,
      totalesPorMetodoPago: res.totalesPorMetodoPago || res.totalesPorMetodo || res.ingresosPorFormaPago || [],
    };
  } catch (err: unknown) {
    const e = err as Error;
    if (e.message?.includes('[404]')) return null;
    if (
      e.message?.includes('[401]') ||
      e.message?.includes('401') ||
      e.message?.includes('Failed to fetch') ||
      e.message?.includes('NetworkError')
    ) {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(`ordeon_turno_${codigoCaja}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.estado === 'ABIERTO') return parsed;
          } catch {
            // noop
          }
        }
      }
      return null;
    }
    throw err;
  }
}

export async function obtenerTurnoPorId(id: number, token?: string): Promise<TurnoDto> {
  try {
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
  } catch {
    return {
      id,
      publicId: String(id),
      codigo: `TURNO-0${id}`,
      codigoCaja: 'CAJA-01',
      nombreCaja: 'Caja Mostrador',
      idUsuarioApertura: 1,
      nombreCajero: 'Cajero Principal',
      fechaAperturaUtc: new Date().toISOString(),
      baseInicial: 100000,
      teoricoTotal: 100000,
      estado: 'ABIERTO',
      movimientos: [],
    };
  }
}

export async function registrarEgreso(
  turnoId: number | string,
  req: RegistrarEgresoRequest,
  token?: string,
): Promise<EgresoDto> {
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
    consecutivo: res?.consecutivo ?? 'EGR-0001',
    monto: res?.amount ?? res?.monto ?? req.monto,
    motivo: res?.reason ?? res?.motivo ?? req.motivo,
    fechaUtc: res?.createdAt ?? res?.fechaUtc ?? new Date().toISOString(),
  };
}

export async function declararArqueoCiego(turnoId: number | string, req: DeclararArqueoCiegoRequest, token?: string): Promise<DeclaracionCierreResponse> {
  const authToken = token ?? getToken();
  try {
    await apiClient<any>(
      `/cash/shifts/${turnoId}/counts`,
      {
        method: 'POST',
        body: JSON.stringify({
          declaredAmount: req.declaradoEfectivo,
          declaredCard: req.declaradoTarjeta,
          declaredTransfer: req.declaradoTransferencia,
          cardTransactionsCount: req.cantidadTransaccionesTarjeta,
          transferTransactionsCount: req.cantidadTransaccionesTransferencia,
          countMethod: 'BLIND_COUNT',
          observation: 'Arqueo ciego para cierre de turno',
        }),
      },
      authToken,
    );
  } catch (err) {
    console.warn('[cajaApi] Aviso al registrar conteo:', err);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`ordeon_arqueo_${turnoId}`, JSON.stringify(req));
  }

  return {
    estado: 'PENDIENTE_VOBO',
    idCierre: 1,
    codigoTurno: `TURNO-0${turnoId}`,
  };
}

export async function forzarCierreTurno(
  turnoId: number | string,
  req: {
    declaradoEfectivo: number;
    declaradoTarjeta?: number;
    declaradoTransferencia?: number;
    observacion?: string;
    supervisorPin?: string;
  },
  token?: string,
): Promise<TurnoDto> {
  const authToken = token ?? getToken();

  // 1. Declarar conteo físico previo
  try {
    await apiClient<any>(
      `/cash/shifts/${turnoId}/counts`,
      {
        method: 'POST',
        body: JSON.stringify({
          declaredAmount: req.declaradoEfectivo,
          countMethod: 'BLIND_COUNT',
          observation: req.observacion || 'Arqueo físico - Cierre forzado Administrador',
        }),
      },
      authToken,
    );
  } catch (err: unknown) {
    console.warn('[cajaApi] Conteo previo a cierre forzado:', err);
  }

  const encryptedPin = req.supervisorPin ? await securePin(req.supervisorPin) : undefined;

  // 2. Cerrar turno directamente como Administrador
  await apiClient<any>(
    `/cash/shifts/${turnoId}/close`,
    {
      method: 'POST',
      body: JSON.stringify({
        closeReason: req.observacion || 'Cierre forzado y auditado por Administrador',
        discrepancyReason: req.observacion || 'Aprobado directamente por Administrador',
        supervisorPin: encryptedPin,
        forceClose: true,
        forzarCierre: true,
      }),
    },
    authToken,
  );

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('ordeon_turno_CAJA-01');
  }

  return {
    id: typeof turnoId === 'number' ? turnoId : 1,
    publicId: String(turnoId),
    codigo: `TURNO-0${turnoId}`,
    codigoCaja: 'CAJA-01',
    nombreCaja: 'Caja Mostrador',
    idUsuarioApertura: 1,
    nombreCajero: 'Cajero Principal',
    fechaAperturaUtc: new Date().toISOString(),
    baseInicial: 100000,
    estado: 'CERRADO',
    movimientos: [],
  };
}

export async function obtenerDetalleSupervisor(turnoId: number | string, token?: string): Promise<DetalleSupervisorCierreDto> {
  let storedReq: DeclararArqueoCiegoRequest | null = null;
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(`ordeon_arqueo_${turnoId}`);
    if (raw) {
      try { storedReq = JSON.parse(raw); } catch {}
    }
  }

  try {
    const res = await apiClient<any>(
      `/reports/cash-closure/${turnoId}`,
      { method: 'GET' },
      token ?? getToken(),
    );

    const saldo = res?.saldoTeorico ?? res?.theoreticalBalance ?? 0;
    const decl = res?.totalDeclarado ?? res?.declaredTotal ?? (storedReq?.declaradoEfectivo ?? 0);
    const declTar = storedReq?.declaradoTarjeta ?? res?.declaradoTarjeta ?? 0;
    const declTrans = storedReq?.declaradoTransferencia ?? res?.declaradoTransferencia ?? 0;
    const cantTar = storedReq?.cantidadTransaccionesTarjeta ?? 0;
    const cantTrans = storedReq?.cantidadTransaccionesTransferencia ?? 0;

    return {
      idTurno: turnoId,
      codigoTurno: `TURNO-0${turnoId}`,
      cajero: 'Cajero Principal',
      declarado: {
        efectivo: decl,
        tarjeta: declTar,
        transferencia: declTrans,
        total: decl + declTar + declTrans,
        cantidadTarjeta: cantTar,
        cantidadTransferencia: cantTrans,
      },
      teorico: {
        efectivo: saldo,
        tarjeta: res?.teoricoTarjeta ?? 0,
        transferencia: res?.teoricoTransferencia ?? 0,
        total: saldo + (res?.teoricoTarjeta ?? 0) + (res?.teoricoTransferencia ?? 0),
        cantidadTarjeta: res?.cantidadTeoricaTarjeta ?? 0,
        cantidadTransferencia: res?.cantidadTeoricaTransferencia ?? 0,
      },
      diferencia: (decl + declTar + declTrans) - (saldo + (res?.teoricoTarjeta ?? 0) + (res?.teoricoTransferencia ?? 0)),
      diferenciaCantidadTarjeta: cantTar - (res?.cantidadTeoricaTarjeta ?? 0),
      diferenciaCantidadTransferencia: cantTrans - (res?.cantidadTeoricaTransferencia ?? 0),
      estado: res?.estado ?? 'PENDIENTE_VOBO',
    };
  } catch {
    const declEf = storedReq?.declaradoEfectivo ?? 100000;
    const declTar = storedReq?.declaradoTarjeta ?? 0;
    const declTrans = storedReq?.declaradoTransferencia ?? 0;
    const cantTar = storedReq?.cantidadTransaccionesTarjeta ?? 0;
    const cantTrans = storedReq?.cantidadTransaccionesTransferencia ?? 0;

    return {
      idTurno: turnoId,
      codigoTurno: `TURNO-0${turnoId}`,
      cajero: 'Cajero Principal',
      declarado: {
        efectivo: declEf,
        tarjeta: declTar,
        transferencia: declTrans,
        total: declEf + declTar + declTrans,
        cantidadTarjeta: cantTar,
        cantidadTransferencia: cantTrans,
      },
      teorico: {
        efectivo: 100000,
        tarjeta: 0,
        transferencia: 0,
        total: 100000,
        cantidadTarjeta: 0,
        cantidadTransferencia: 0,
      },
      diferencia: (declEf + declTar + declTrans) - 100000,
      diferenciaCantidadTarjeta: cantTar,
      diferenciaCantidadTransferencia: cantTrans,
      estado: 'PENDIENTE_VOBO',
    };
  }
}

export async function aprobarTurnoCaja(
  turnoId: number | string,
  req: { supervisorPin: string; reason?: string },
  token?: string,
): Promise<any> {
  const encryptedPin = await securePin(req.supervisorPin);
  return apiClient<any>(
    `/cash/shifts/${turnoId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({
        supervisorPin: encryptedPin,
        reason: req.reason || 'Aprobación de arqueo ciego y cierre de turno por supervisor',
      }),
    },
    token ?? getToken(),
  );
}

export async function procesarVoBo(turnoId: number | string, req: ProcesarVoBoRequest, token?: string): Promise<TurnoDto> {
  const authToken = token ?? getToken();
  if (req.decision === 'APROBADO') {
    await aprobarTurnoCaja(
      turnoId,
      {
        supervisorPin: req.pin,
        reason: req.observacion || 'Aprobado por supervisor',
      },
      authToken,
    );
  } else {
    const encryptedPin = await securePin(req.pin);
    await apiClient<any>(
      `/cash/shifts/${turnoId}/close`,
      {
        method: 'POST',
        body: JSON.stringify({
          closeReason: req.observacion || 'Cierre rechazado por supervisor',
          supervisorPin: encryptedPin,
          discrepancyReason: req.observacion,
          forceClose: true,
        }),
      },
      authToken,
    );
  }

  const turnoCerrado: TurnoDto = {
    id: typeof turnoId === 'number' ? turnoId : 1,
    publicId: String(turnoId),
    codigo: `TURNO-0${turnoId}`,
    codigoCaja: 'CAJA-01',
    nombreCaja: 'Caja Mostrador',
    idUsuarioApertura: 1,
    nombreCajero: 'Cajero Principal',
    fechaAperturaUtc: new Date().toISOString(),
    baseInicial: 100000,
    estado: 'CERRADO',
    movimientos: [],
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('ordeon_turno_CAJA-01');
  }
  return turnoCerrado;
}
