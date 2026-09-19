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
  codigo: string;
  nombre: string;
  orden: number;
  permiteCancelacionDirecta: boolean;
  esFinal: boolean;
  transicionesSalientes: WorkflowTransicionAdminDto[];
}

export interface WorkflowDefinicionAdminDto {
  uuid: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  versionNumero: number;
  esVigente: boolean;
  activo: boolean;
  creadoEn: string;
  etapas: WorkflowEtapaAdminDto[];
}

export interface CrearWorkflowBorradorDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface CrearEtapaDto {
  codigo: string;
  nombre: string;
  orden: number;
  permiteCancelacionDirecta: boolean;
  esFinal: boolean;
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
