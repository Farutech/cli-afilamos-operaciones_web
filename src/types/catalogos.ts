export type NaturalezaItem = 'INVENTARIO' | 'SERVICIO';

export interface UnidadPresentacion {
  uuid: string;
  codigo: string;
  nombre: string;
  abreviatura: string;
  activo: boolean;
}

export interface ItemCatalogo {
  uuid: string;
  codigoReferencia: string;
  nombre: string;
  descripcion: string;
  naturaleza: NaturalezaItem;
  unidadPresentacion?: UnidadPresentacion;
  precioBase: number;
  stockReferencial: number | null;
  activo: boolean;
}

export interface ItemsResponse {
  items: ItemCatalogo[];
  total: number;
}

export interface TipoDocumentoIdentidad {
  uuid: string;
  codigo: string;
  nombre: string;
  aplicaPersona: 'NATURAL' | 'JURIDICA';
  activo: boolean;
}

export interface CanalOrigen {
  uuid: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface SubtipoDocumento {
  uuid: string;
  codigoSubtipo: string;
  nombre: string;
  descripcion: string;
  prefijo: string;
  folioActual: number;
  formatoPlantilla: string;
  formatoPapel: string;
  imprimeAlAsentar: boolean;
  activo: boolean;
}

export interface TipoDocumentoBase {
  uuid: string;
  codigoBase: string;
  nombre: string;
  disparaWorkflow: boolean;
  subtipos: SubtipoDocumento[];
}

export interface Caja {
  uuid: string;
  codigoCaja: string;
  nombre: string;
  ubicacion: string;
  activa: boolean;
}

export interface MedioPagoInstrumento {
  uuid: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  esHoja: boolean;
  requiereReferencia: boolean;
  activo: boolean;
}

export interface MedioPagoCategoria {
  uuid: string;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  instrumentos: MedioPagoInstrumento[];
}

export interface Cliente {
  uuid: string;
  tipoDocumento?: TipoDocumentoIdentidad;
  numeroDocumento: string;
  nombreRazonSocial: string;
  telefono: string;
  activo: boolean;
}

export interface DocumentoResumenCliente {
  uuid: string;
  numeroDocumentoVisible: string;
  tipoDocumentoBase: string;
  subtipoCodigo: string;
  estado: string;
  fechaEmision: string;
  montoTotal: number;
  saldoPendiente: number;
  cantidadItems: number;
  canalOrigen?: string | null;
}

export interface ClienteHistorico {
  uuid: string;
  tipoDocumento?: TipoDocumentoIdentidad;
  numeroDocumento: string;
  nombreRazonSocial: string;
  telefono: string;
  activo: boolean;
  creadoEn: string;
  totalHistoricoGastado: number;
  totalSolicitudes: number;
  solicitudesActivas: number;
  otsEnProceso: number;
  documentos: DocumentoResumenCliente[];
}

