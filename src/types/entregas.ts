import type { Cliente, CanalOrigen, MedioPagoInstrumento } from './catalogos';

export interface ItemListoEntrega {
  itemPublicId: string;
  itemCodigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  anticipoDirectoImputado: number;
  saldoPendienteItem: number;
  documentoSolicitudPublicId: string;
  documentoSolicitudNumero: string;
  documentoOtPublicId: string;
  documentoOtNumero: string;
  clientePublicId: string;
  clienteNombre: string;
  clienteNumeroDocumento: string;
  clienteTelefono: string;
  etapaActualCodigo: string;
  etapaActualNombre: string;
  franjaCompromiso: string;
}

export interface DesglosePagoRequest {
  instrumentoPublicId: string;
  monto: number;
  referenciaTransaccion?: string;
}

export interface GenerarRemisionRequest {
  solicitudPublicId: string;
  usuarioGeneraId?: number;
  usuarioGeneraCodigo?: string;
  notas?: string;
}

export interface RegistrarPagoEntregaRequest {
  monto: number;
  cajeroId?: number;
  cajeroCodigo?: string;
  desgloses: DesglosePagoRequest[];
}

export interface DespacharRemisionRequest {
  usuarioDespachaId?: number;
  usuarioDespachaCodigo?: string;
  recibidoPorNombre: string;
  recibidoPorDocumento: string;
}

export interface DesgloseMedioPagoDetalle {
  publicId: string;
  instrumento?: MedioPagoInstrumento | null;
  monto: number;
  referenciaTransaccion?: string;
}

export interface RecaudoEntregaDetalle {
  publicId: string;
  codigo: string;
  montoTotal: number;
  tipoRecaudo: string;
  createdAtUtc: string;
  desgloses: DesglosePagoRequest[];
}

export interface ItemRemisionDetalle {
  publicId: string;
  codigo: string;
  naturaleza: string;
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
}

export interface RemisionDetalle {
  publicId: string;
  codigo: string;
  numeroDocumento: string;
  estado: string;
  fechaEmision: string;
  notas: string;
  cliente: Cliente;
  canal: CanalOrigen;
  totalNeto: number;
  totalAnticiposPrevios: number;
  totalPagosEntrega: number;
  saldoPendiente: number;
  recibidoPorNombre?: string | null;
  recibidoPorDocumento?: string | null;
  documentoSolicitudPublicId?: string | null;
  documentoSolicitudNumero?: string | null;
  documentoOtPublicId?: string | null;
  documentoOtNumero?: string | null;
  items: ItemRemisionDetalle[];
  recaudos: RecaudoEntregaDetalle[];
}
