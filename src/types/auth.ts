export interface UsuarioSesion {
  publicId: string
  codigo: string
  nombreCompleto: string
  email: string
  rol: 'Administrador' | 'Cajero' | 'Operario' | 'Auditor'
  token: string
}

export interface LoginPayload {
  codigo: string
  password: string
}

export interface VerificarPinPayload {
  usuarioPublicId: string
  pin: string
}
