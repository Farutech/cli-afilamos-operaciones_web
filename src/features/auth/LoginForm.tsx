import React, { useState } from 'react'
import { Button, Card, Badge } from '@farutech/design-system'
import { api } from '../../services/api'
import type { UsuarioSesion } from '../../types/auth'
import { isCashier, normalizePermissionList, normalizeRoles, primaryRole } from '../../types/permissions'

export interface LoginFormProps {
  onLoginSuccess?: (sesion: UsuarioSesion) => void
}

const OrdeonBlade: React.FC = () => (
  <div className="ordeon-blade" aria-label="Ordeon" role="img">
    <svg className="blade-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <clipPath id="blade-center-clip"><circle cx="100" cy="100" r="23" /></clipPath>
      </defs>
      <g className="blade-spin">
        <circle cx="100" cy="100" r="86" fill="none" stroke="#c9d4dc" strokeWidth="16" strokeDasharray="9 7" />
        <circle cx="100" cy="100" r="74" fill="#2b2f34" stroke="#4a5158" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#3a4046" strokeWidth="1" />
        <circle cx="100" cy="58" r="5" fill="#14161a" stroke="#4a5158" />
        <circle cx="100" cy="142" r="5" fill="#14161a" stroke="#4a5158" />
        <circle cx="58" cy="100" r="5" fill="#14161a" stroke="#4a5158" />
        <circle cx="142" cy="100" r="5" fill="#14161a" stroke="#4a5158" />
        <path d="M100 30 L104 44 L96 44 Z" fill="#c9d4dc" />
        <path d="M100 170 L104 156 L96 156 Z" fill="#c9d4dc" />
        <path d="M30 100 L44 96 L44 104 Z" fill="#c9d4dc" />
        <path d="M170 100 L156 96 L156 104 Z" fill="#c9d4dc" />
      </g>
      <g className="blade-sparks" aria-hidden="true">
        <circle cx="100" cy="30" r="2" /><circle cx="170" cy="100" r="2" />
        <circle cx="100" cy="170" r="2" /><circle cx="30" cy="100" r="2" />
      </g>
      <circle cx="100" cy="100" r="25" fill="#ffffff" stroke="#c9d4dc" strokeWidth="2" />
      <image href="/ordeon-mark.png" x="77" y="77" width="46" height="46" clipPath="url(#blade-center-clip)" preserveAspectRatio="xMidYMid slice" />
    </svg>
  </div>
)

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
      const roles = normalizeRoles(res?.user?.roles || res?.roles || (res?.rol ? [res.rol] : []))
      const permissions = normalizePermissionList(res?.user?.permissions || res?.permissions)
      const mappedRol = primaryRole(roles.length ? roles : ['Operario'])

      const sesion: UsuarioSesion = {
        publicId: res?.user?.id || res?.publicId || 'usr-default',
        codigo: res?.user?.username || res?.codigo || codigo,
        nombreCompleto: res?.user?.fullName || res?.nombreCompleto || res?.user?.username || codigo,
        email: res?.user?.email || res?.email || '',
        rol: mappedRol,
        roles,
        permissions,
        isCashier: isCashier({ roles, permissions }),
        token,
        expiresAt: res?.expiresAt,
      }

      // La sesión se conserva solo para restaurar la interfaz; el backend sigue siendo la fuente de autorización.
      localStorage.setItem('ordeon_token', sesion.token)
      localStorage.setItem('ordeon_sesion', JSON.stringify(sesion))
      localStorage.setItem('ordeon_permissions', JSON.stringify(permissions))

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
    <main className="login-page">
      <section className="login-visual" aria-label="Afilamos Hermanos">
        <OrdeonBlade />
        <div className="login-visual__content">
          <img
            className="login-brand__logo"
            src="https://afilamoshermanos.com/assets/logo_principal-Bvhb_YuS.png"
            alt="Afilamos Hermanos"
          />
          <div className="login-visual__rule" />
          <p className="login-visual__eyebrow">Operaciones en un solo lugar</p>
          <h1>Control claro para decisiones rápidas.</h1>
          <p className="login-visual__description">
            Ordeon conecta tu operación diaria con la información que necesitas para trabajar mejor.
          </p>
          <div className="login-visual__status">
            <span className="login-status-dot" aria-hidden="true" />
            Plataforma operativa disponible
          </div>
        </div>
        <p className="login-visual__footer">Ordeon POS · Un producto de Farutech para Afilamos Hermanos</p>
      </section>

      <section className="login-panel">
        <Card className="login-card">
          <div className="login-heading">
            <div className="login-heading__brand" aria-label="Ordeon, producto de Farutech">
              <img className="login-heading__mark" src="/ordeon-mark.png" alt="" aria-hidden="true" />
              <span className="login-heading__wordmark">ORDEON</span>
            </div>
            <p className="login-heading__eyebrow">Acceso seguro</p>
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa tus credenciales para continuar con tus operaciones.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-codigo">Usuario o código de operario</label>
              <input
                id="login-codigo"
                type="text"
                placeholder="Ej. admin o CAJERO1"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                disabled={cargando}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <div className="login-field__label-row">
                <label htmlFor="login-password">Contraseña</label>
                <span className="login-field__hint">Protegida</span>
              </div>
              <div className="login-password">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={cargando}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password__toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <Button type="submit" disabled={cargando} className="login-submit">
              {cargando ? 'Validando acceso…' : 'Ingresar a Ordeon'}
            </Button>
          </form>

          <div className="login-card__meta">
            <Badge variant="success">Sistema activo</Badge>
            <span>v1.0.0</span>
          </div>
        </Card>
      </section>
    </main>
  )
}
