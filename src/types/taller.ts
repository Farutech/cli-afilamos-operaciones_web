export interface TransicionDisponible {
  transicionPublicId: string;
  codigo: string;
  nombre: string;
  rolRequerido?: string | null;
  requiereAprobacion: boolean;
  etapaDestinoCodigo: string;
  etapaDestinoNombre: string;
  esDestinoFinal: boolean;
}

export interface HistorialEventoTaller {
  etapaNombre: string;
  accion: string;
  detalle: string;
  usuarioCodigo?: string | null;
  fechaHoraUtc: string;
}

export interface ItemTaller {
  itemPublicId: string;
  itemCodigo: string;
  descripcion: string;
  cantidad: number;
  franjaCompromiso: string;
  documentoOtPublicId: string;
  documentoOtNumero: string;
  documentoSolicitudPublicId: string;
  documentoSolicitudNumero: string;
  clienteNombre: string;
  clienteTelefono: string;
  workflowInstanciaPublicId: string;
  etapaActualCodigo: string;
  etapaActualNombre: string;
  etapaActualOrden: number;
  permiteCancelacionDirecta: boolean;
  esFinal: boolean;
  responsableAsignadoRol?: string | null;
  responsableAsignadoCodigo?: string | null;
  transicionesPermitidas: TransicionDisponible[];
  historial: HistorialEventoTaller[];
}

export interface ConfirmarRecepcionRequest {
  operarioId?: number;
  operarioCodigo?: string;
  notas?: string;
}

export interface EjecutarTransicionRequest {
  codigoTransicion: string;
  notas?: string;
  insumosDetalle?: string;
  supervisorCodigo?: string;
  supervisorPin?: string;
  justificacionSupervisor?: string;
}

export interface CancelarItemRequest {
  motivo: string;
  supervisorCodigo?: string;
  supervisorPin?: string;
  justificacionSupervisor?: string;
}

export interface RegistrarActividadRequest {
  actividadNombre: string;
  subactividades?: string;
  insumosUtilizados?: string;
  evidenciaUrl?: string;
}
