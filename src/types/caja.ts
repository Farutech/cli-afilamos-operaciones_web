export interface MovimientoDto {
  id: number;
  publicId: string;
  codigo: string;
  tipoMovimiento: string;
  monto: number;
  concepto: string;
  fechaUtc: string;
  idInstrumento?: number | null;
  nombreInstrumento?: string | null;
}

export interface TurnoDto {
  id: number;
  publicId: string;
  codigo: string;
  codigoCaja: string;
  nombreCaja: string;
  idUsuarioApertura: number;
  nombreCajero: string;
  fechaAperturaUtc: string;
  baseInicial: number;
  estado: 'ABIERTO' | 'PENDIENTE_VOBO' | 'CERRADO' | 'RECHAZADO';
  fechaCierreUtc?: string | null;
  declaradoTotal?: number | null;
  teoricoTotal?: number | null;
  diferenciaTotal?: number | null;
  observacionVoBo?: string | null;
  movimientos: MovimientoDto[];
}

export interface AperturaTurnoRequest {
  codigoCaja: string;
  baseInicial: number;
  idUsuario?: number;
}

export interface RegistrarEgresoRequest {
  monto: number;
  motivo: string;
  idUsuario?: number;
}

export interface EgresoDto {
  idDocumento: number;
  consecutivo: string;
  monto: number;
  motivo: string;
  fechaUtc: string;
}

export interface DeclararArqueoCiegoRequest {
  declaradoEfectivo: number;
  declaradoTarjeta: number;
  declaradoTransferencia: number;
}

export interface DeclaracionCierreResponse {
  estado: string;
  idCierre: number;
  codigoTurno: string;
}

export interface ValoresDesgloseDto {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  total: number;
}

export interface DetalleSupervisorCierreDto {
  idTurno: number;
  codigoTurno: string;
  cajero: string;
  declarado: ValoresDesgloseDto;
  teorico: ValoresDesgloseDto;
  diferencia: number;
  estado: string;
}

export interface ProcesarVoBoRequest {
  idUsuarioSupervisor?: number;
  pin: string;
  decision: 'APROBADO' | 'RECHAZADO';
  observacion?: string;
}
