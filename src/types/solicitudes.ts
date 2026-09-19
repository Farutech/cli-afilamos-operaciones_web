export type NaturalezaItem = 'INVENTARIO' | 'SERVICIO';

export interface ItemOperacionDto {
  publicId: string;
  codigo: string;
  naturaleza: NaturalezaItem;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  exigeAnticipoObligatorio: boolean;
  porcentajeAnticipoMinimo: number;
  anticipoMinimoRequerido: number;
  anticipoDirectoImputado: number;
  saldoPendienteItem: number;
  franjaCompromiso: string;
  permiteCancelacion: boolean;
  stockReferencialDisponible: number | null;
  advertenciaStockInsuficiente: boolean;
}

export interface DesglosePagoDto {
  instrumentoPublicId: string;
  monto: number;
  referenciaTransaccion: string;
}

export interface RecaudoDto {
  publicId: string;
  codigo: string;
  montoTotal: number;
  tipoRecaudo: string;
  itemEspecificoPublicId: string | null;
  fechaHoraUtc: string;
  desgloses: DesglosePagoDto[];
}

export interface SolicitudDetalleDto {
  publicId: string;
  codigo: string;
  numeroDocumentoVisible: string;
  subtipoCodigo: string;
  subtipoNombre: string;
  clientePublicId: string;
  clienteNombre: string;
  clienteNumeroDocumento: string;
  canalPublicId: string;
  canalNombre: string;
  totalNeto: number;
  totalInventario: number;
  totalServicios: number;
  totalAnticiposImputados: number;
  totalPagadoInventario: number;
  saldoPendiente: number;
  estado: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
  fechaEmision: string;
  notas: string;
  exigeAnticipoPendienteVoBo: boolean;
  inventarioPendientePago100: boolean;
  items: ItemOperacionDto[];
  recaudos: RecaudoDto[];
}

export interface ItemSolicitudCreacion {
  itemCatalogoPublicId?: string | null;
  naturaleza: NaturalezaItem;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  franjaCompromiso?: string;
  anticipoInicial?: number | null;
  instrumentoPagoPublicId?: string | null;
}

export interface CrearSolicitudRequest {
  subtipoPublicId: string;
  clientePublicId: string;
  canalPublicId: string;
  usuarioCreadorId?: number;
  usuarioCreadorCodigo?: string;
  notas?: string;
  items?: ItemSolicitudCreacion[];
}

export interface RegistroRapidoClienteRequest {
  uuidTipoDocumento: string;
  numeroDocumento: string;
  nombreRazonSocial: string;
  telefono?: string;
}

export interface AutorizarExcepcionRequest {
  supervisorCodigo: string;
  supervisorPin: string;
  motivoJustificacion: string;
  cajeroSolicitanteCodigo: string;
}
