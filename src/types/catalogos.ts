export type NaturalezaItem = 'INVENTARIO' | 'SERVICIO';

export interface UnidadPresentacion {
  uuid: string;
  codigo: string;
  nombre: string;
  abreviatura: string;
  activo: boolean;
}

/**
 * Categoría de ítems multinivel (Árbol jerárquico: Categoría -> Subcategoría -> ...).
 * Permite clasificar ítems y servicios para filtrado especializado en el POS.
 */
export interface CategoriaItem {
  uuid: string;
  codigo: string;
  nombre: string;
  nivel: number;
  categoriaPadreUuid?: string | null;
  rutaCompleta?: string;
  activo: boolean;
  hijos?: CategoriaItem[];
}

/**
 * Lista de precios configurable (Estilo Novasoft / POS comercial).
 * El recargo/descuento se aplica en porcentaje sobre el precio base del ítem.
 */
export interface ListaPrecio {
  uuid: string;
  codigo: string;
  nombre: string;
  porcentajeAjuste: number;
  esPredeterminada: boolean;
  activa: boolean;
}

/**
 * Política global de manipulación de precios en mostrador.
 * Define si el cajero puede modificar el precio y con qué tolerancia máxima.
 */
export interface PoliticaPrecios {
  permiteModificarPrecio: boolean;
  maxDiferenciaPorcentaje: number;
  requiereVoBoSuperaTolerancia: boolean;
  permitirMultiplicadorLista: boolean;
}

/** Denominación de efectivo (billete o moneda) para el arqueo/cierre de caja. */
export interface DenominacionEfectivo {
  valor: number;
  etiqueta: string;
  tipo: 'BILLETE' | 'MONEDA';
  activa: boolean;
}

/** Configuración de monedas/denominaciones admitidas por caja para conteo de efectivo. */
export interface ConfiguracionDenominaciones {
  monedaBase: string;
  monedasAdmitidas: string[];
  denominaciones: DenominacionEfectivo[];
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
  workflowDefinicionUuid?: string;
  workflowDefinicionCodigo?: string;
  workflowDefinicionNombre?: string;
  /** Categoría multinivel a la que pertenece el ítem (opcional en ítems heredados). */
  categoria?: CategoriaItem | null;
  categoriaUuid?: string | null;
  /** Lista de precios asignada (si aplica). */
  listaPrecioUuid?: string | null;
  listaPrecioNombre?: string | null;
  /** Precio final con el ajuste de la lista de precios aplicado. */
  precioConLista?: number;
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
  /** Cantidad de ceros a la izquierda del folio (padding estilo Novasoft, ej: 4 -> 0001). */
  longitudCeros?: number;
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

export interface ParametroSistema {
  uuid: string;
  clave: string;
  valorJson: string;
  descripcion: string;
  categoria: string;
}
