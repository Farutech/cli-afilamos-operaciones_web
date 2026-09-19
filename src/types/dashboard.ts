export interface CanalEstadisticaDto {
  canalCodigo: string;
  canalNombre: string;
  cantidadSolicitudes: number;
  totalVentas: number;
}

export interface SolicitudResumenDashboardDto {
  uuid: string;
  numeroDocumento: string;
  clienteNombre: string;
  fechaEmision: string;
  estado: string;
  total: number;
  canalNombre?: string | null;
}

export interface TallerResumenDashboardDto {
  itemUuid: string;
  otNumero: string;
  itemDescripcion: string;
  etapaActualCodigo: string;
  etapaActualNombre: string;
  franjaCompromiso?: string | null;
  tecnicoAsignado?: string | null;
}

export interface DashboardMetricasDto {
  solicitudesActivasCount: number;
  itemsEnTallerCount: number;
  itemsListosEntregaCount: number;
  despachadosHoyCount: number;
  totalRecaudosHoy: number;
  cajaAbierta: boolean;
  codigoCaja?: string | null;
  turnoActivoCodigo?: string | null;
  saldoEfectivoActual: number;
  distribucionCanales: CanalEstadisticaDto[];
  ultimasSolicitudes: SolicitudResumenDashboardDto[];
  itemsEnTaller: TallerResumenDashboardDto[];
}
