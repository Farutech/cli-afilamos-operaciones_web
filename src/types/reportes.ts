export interface RecaudoMedioPagoDto {
  medioPagoCodigo: string;
  medioPagoNombre: string;
  totalMonto: number;
  cantidadTransacciones: number;
}

export interface ReporteConsolidadoDto {
  periodoDesdeUtc?: string | null;
  periodoHastaUtc?: string | null;
  generadoEnUtc: string;
  totalVentas: number;
  totalVentasInventario: number;
  totalVentasServicios: number;
  cantidadSolicitudes: number;
  cantidadRemisiones: number;
  totalRecaudos: number;
  recaudosPorMedio: RecaudoMedioPagoDto[];
  totalEgresos: number;
  cantidadEgresos: number;
  balanceNetoCaja: number;
}

export interface MovimientoResumenZDto {
  fechaUtc: string;
  codigo: string;
  tipoMovimiento: string;
  concepto: string;
  monto: number;
  medioPago?: string | null;
}

export interface ReporteCierreZDto {
  turnoId: number;
  turnoCodigo: string;
  cajaCodigo: string;
  cajaNombre: string;
  cajeroApertura: string;
  supervisorVoBo?: string | null;
  fechaAperturaUtc: string;
  fechaCierreUtc?: string | null;
  baseInicial: number;
  totalRecaudosEfectivo: number;
  totalRecaudosTarjeta: number;
  totalRecaudosTransferencia: number;
  totalRecaudosGeneral: number;
  totalEgresos: number;
  saldoTeoricoEfectivo: number;
  declaradoEfectivo: number;
  diferenciaEfectivo: number;
  saldoTeoricoTarjeta: number;
  declaradoTarjeta: number;
  diferenciaTarjeta: number;
  saldoTeoricoTransferencia: number;
  declaradoTransferencia: number;
  diferenciaTransferencia: number;
  diferenciaTotal: number;
  estadoTurno: string;
  aprobadoVoBo: boolean;
  observacionesVoBo?: string | null;
  movimientos: MovimientoResumenZDto[];
}
