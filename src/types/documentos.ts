export type EstadoDocumento = 'BORRADOR' | 'ASENTADO' | 'ANULADO';
export type TipoRelacionDocumento = 'ORIGINA' | 'REEMPLAZA' | 'PAGA' | 'DESPACHA';

export interface Documento {
  uuid: string;
  numeroDocumento: string;
  estado: EstadoDocumento;
  folio: number | null;
  uuidSubtipo: string;
  codigoSubtipo: string;
  nombreSubtipo: string;
  uuidCliente: string;
  nombreCliente: string;
  documentoCliente: string;
  uuidCanal: string;
  codigoCanal: string;
  nombreCanal: string;
  usuarioCreadorCodigo: string;
  totalNeto: number;
  saldoPendiente: number;
  fechaEmision: string;
  notas: string;
  motivoAnulacion?: string | null;
  usuarioAnulacionCodigo?: string | null;
  fechaAnulacionUtc?: string | null;
}

export interface CreateDocumentoDraft {
  uuidSubtipo: string;
  uuidCliente: string;
  uuidCanal: string;
  totalNeto: number;
  saldoPendiente: number;
  idTurno?: number | null;
  notas?: string;
}

export interface AsentarDocumentoResponse {
  uuid: string;
  numeroDocumento: string;
  folioAsignado: number;
  estado: string;
  asentadoEn: string;
}

export interface DocumentoDependencia {
  uuid: string;
  uuidDocumentoOrigen: string;
  numeroDocumentoOrigen: string;
  uuidDocumentoDestino: string;
  numeroDocumentoDestino: string;
  tipoRelacion: TipoRelacionDocumento;
  notas: string;
  createdAtUtc: string;
}
