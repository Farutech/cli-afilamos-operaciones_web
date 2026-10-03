export interface UsuarioAdminDto {
  uuid: string;
  codigo: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  activo: boolean;
  tienePin: boolean;
  creadoEn: string;
}

export interface CrearUsuarioDto {
  codigo: string;
  nombreCompleto: string;
  email: string;
  password: string;
  rol: string;
  pin?: string;
}

export interface ActualizarUsuarioDto {
  nombreCompleto: string;
  email: string;
  rol: string;
}

export interface CuentaBancariaConfigDto {
  banco: string;
  numeroCuenta: string;
  tipoCuenta: string;
  titular?: string;
  nitTitular?: string;
  billeteraDigital?: string;
}

export interface WorkflowTransicionAdminDto {
  uuid: string;
  codigo: string;
  nombre: string;
  etapaDestinoCodigo: string;
  etapaDestinoNombre: string;
  rolRequerido?: string;
  requiereAprobacion: boolean;
  efectoTipo: string;
}

export interface WorkflowEtapaAdminDto {
  uuid: string;
  id?: string;
  codigo: string;
  nombre: string;
  orden: number;
  step?: number;
  descripcion?: string;
  rolRequerido?: string;
  tiempoEstimadoMinutos?: number;
  permiteCancelacionDirecta: boolean;
  esFinal: boolean;
  activo?: boolean;
  transicionesSalientes?: WorkflowTransicionAdminDto[];
}

export interface WorkflowServicioItemDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  basePrice?: number;
}

export interface WorkflowDefinicionAdminDto {
  uuid: string;
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  versionNumero: number;
  esVigente: boolean;
  activo: boolean;
  serviciosVinculadosCount?: number;
  serviciosVinculados?: WorkflowServicioItemDto[];
  creadoEn: string;
  etapas: WorkflowEtapaAdminDto[];
}

export interface CrearWorkflowBorradorDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  etapas?: CrearEtapaDto[];
}

export interface ActualizarWorkflowDto {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface CrearEtapaDto {
  codigo: string;
  nombre: string;
  orden?: number;
  descripcion?: string;
  rolRequerido?: string;
  tiempoEstimadoMinutos?: number;
  permiteCancelacionDirecta?: boolean;
  esFinal?: boolean;
}

export interface ActualizarEtapaDto {
  codigo?: string;
  nombre?: string;
  orden?: number;
  descripcion?: string;
  rolRequerido?: string;
  tiempoEstimadoMinutos?: number;
  activo?: boolean;
}

export interface ReordenarEtapasDto {
  etapaIds?: string[];
  stepIds?: string[];
}

export interface CrearTransicionDto {
  etapaOrigenCodigo: string;
  etapaDestinoCodigo: string;
  codigo: string;
  nombre: string;
  rolRequerido?: string;
  requiereAprobacion: boolean;
  efectoTipo?: string;
}
