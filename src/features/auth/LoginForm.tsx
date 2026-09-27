import React, { useState } from 'react'
import { Button, Card, Input, Badge } from '@farutech/design-system'
import { api } from '../../services/api'
import type { UsuarioSesion } from '../../types/auth'

export interface LoginFormProps {
  onLoginSuccess?: (sesion: UsuarioSesion) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!codigo.trim() || !password.trim()) {
      setError('Por favor complete todos los campos.')
      return
    }

    setCargando(true)
    try {
      const res = await api.post<any>('/auth/login', { codigo, password })

      // Resolver token
      const token = res?.token || res?.accessToken || ''

      // Extraer y normalizar rol
      const rawRole = (
        res?.user?.roles?.[0] ||
        res?.roles?.[0] ||
        res?.rol ||
        'Administrador'
      ).toString()

      let mappedRol: UsuarioSesion['rol'] = 'Administrador'
      const upperRole = rawRole.toUpperCase()
      if (upperRole.includes('ADMIN')) {
        mappedRol = 'Administrador'
      } else if (upperRole.includes('CAJ')) {
        mappedRol = 'Cajero'
      } else if (upperRole.includes('OPER')) {
        mappedRol = 'Operario'
      } else if (upperRole.includes('AUDIT')) {
        mappedRol = 'Auditor'
      } else {
        mappedRol = 'Administrador'
      }

      const sesion: UsuarioSesion = {
        publicId: res?.user?.id || res?.publicId || 'usr-default',
        codigo: res?.user?.username || res?.codigo || codigo,
        nombreCompleto: res?.user?.fullName || res?.nombreCompleto || res?.user?.username || codigo,
        email: res?.user?.email || res?.email || '',
        rol: mappedRol,
        token: token,
      }

      // Persistir token y sesión para que no se pierdan al recargar la página
      localStorage.setItem('ordeon_token', sesion.token)
      localStorage.setItem('ordeon_sesion', JSON.stringify(sesion))

      const permissions = res?.user?.permissions || res?.permissions
      if (permissions && Array.isArray(permissions)) {
        localStorage.setItem('ordeon_permissions', JSON.stringify(permissions))
      }

      if (onLoginSuccess) {
        onLoginSuccess(sesion)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Strip [status] prefix if present for clean UI display
        setError(err.message.replace(/^\[\d+\]\s*/, ''))
      } else {
        setError('Ocurrió un error inesperado.')
      }
    } finally {
      setCargando(false)
    }

  }

  return (
    <Card style={{ maxWidth: '420px', margin: '40px auto' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Ordeon POS</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Afilamos Operaciones · Inicie sesión para comenzar turno
        </p>
        <div style={{ marginTop: '10px' }}>
          <Badge variant="info">Fase A · Fundacional</Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Código de Operario"
          placeholder="Ej: CAJERO1 o ADMIN"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          disabled={cargando}
          autoFocus
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={cargando}
        />

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <Button type="submit" disabled={cargando} style={{ marginTop: '8px', width: '100%' }}>
          {cargando ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
        </Button>
      </form>
    </Card>
  )
}
