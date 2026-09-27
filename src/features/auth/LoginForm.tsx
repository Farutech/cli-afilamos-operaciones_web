import React, { useState } from 'react'
import { Button, Card, Badge } from '@farutech/design-system'
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

  const [showPassword, setShowPassword] = useState(false)

  return (
    <div style={{ maxWidth: '440px', width: '100%', margin: '20px auto' }}>
      <Card style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '1rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.1)',
        padding: '2rem',
      }}>
        {/* Logo y Encabezado Design System */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', position: 'relative', marginBottom: '1rem' }}>
            <div style={{
              position: 'absolute',
              inset: '-4px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: '1.25rem',
              filter: 'blur(10px)',
              opacity: 0.6,
            }} />
            <div style={{
              position: 'relative',
              width: '4.5rem',
              height: '4.5rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
              borderRadius: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
            }}>
              ⚙️
            </div>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.025em' }}>
            Afilamos Hermanos
          </h1>
          <p style={{ color: '#93c5fd', fontSize: '0.9rem', fontWeight: 600, margin: '4px 0 8px 0' }}>
            Ordeon POS · Control de Operaciones
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            <Badge variant="info">v1.0.0</Badge>
            <Badge variant="success">Sistema Activo</Badge>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Usuario / Código de Operario / Correo
            </label>
            <input
              type="text"
              placeholder="Ej: admin o CAJERO1"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={cargando}
              autoFocus
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#475569'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#475569'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '2px',
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Atajo rápido de prueba demo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px dashed #6366f1',
            borderRadius: '0.5rem',
            padding: '6px 10px',
            fontSize: '0.75rem',
          }}>
            <span style={{ color: '#c7d2fe' }}>💡 Demo: <strong>admin</strong></span>
            <button
              type="button"
              onClick={() => {
                setCodigo('admin')
                setPassword('Admin123*')
              }}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Autocompletar
            </button>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '0.5rem',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={cargando}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '0.75rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              cursor: cargando ? 'not-allowed' : 'pointer',
            }}
          >
            {cargando ? '🔄 Iniciando sesión...' : '🚀 Ingresar al Sistema'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
