export interface UsuarioSesion {
  publicId: string
  codigo: string
  nombreCompleto: string
  email: string
  rol: 'Administrador' | 'Cajero' | 'Operario' | 'Auditor'
  roles: string[]
  permissions: string[]
  isCashier: boolean
  token: string
  expiresAt?: string
}

export interface LoginPayload {
  codigo: string
  password: string
}

export interface VerificarPinPayload {
  usuarioPublicId: string
  pin: string
}
