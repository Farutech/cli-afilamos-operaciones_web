import React, { useState } from 'react'
import { Button, Card, Badge } from '@farutech/design-system'
import { api } from '../../services/api'
import type { UsuarioSesion } from '../../types/auth'
import { isCashier, normalizePermissionList, normalizeRoles, primaryRole } from '../../types/permissions'

export interface LoginFormProps {
  onLoginSuccess?: (sesion: UsuarioSesion) => void
}

const OrdeonBlade: React.FC = () => (
  <div className="ordeon-blade" aria-label="Afilamos Hermanos Blade" role="img">
    <svg className="blade-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="blade-core-glow-form" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dientes exteriores de la sierra */}
      <g className="blade-spin">
        <circle cx="100" cy="100" r="86" fill="none" stroke="#cbd5e1" strokeWidth="16" strokeDasharray="9 7" />
        <circle cx="100" cy="100" r="74" fill="#1e242b" stroke="#334155" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />

        {/* 4 Pernos / Remaches */}
        <circle cx="100" cy="56" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="100" cy="144" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="56" cy="100" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="144" cy="100" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />

        <path d="M100 28 L103 42 L97 42 Z" fill="#94a3b8" />
        <path d="M100 172 L103 158 L97 158 Z" fill="#94a3b8" />
        <path d="M28 100 L42 97 L42 103 Z" fill="#94a3b8" />
        <path d="M172 100 L158 97 L158 103 Z" fill="#94a3b8" />
      </g>

      <circle cx="100" cy="100" r="30" fill="url(#blade-core-glow-form)" />
      <circle cx="100" cy="100" r="24" fill="#0b1322" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="16" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="5 3" />
      <circle cx="100" cy="100" r="7" fill="#38bdf8" />
    </svg>
  </div>
)

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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

      const token = res?.token || res?.accessToken || ''
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

      localStorage.setItem('ordeon_token', sesion.token)
      localStorage.setItem('ordeon_sesion', JSON.stringify(sesion))
      localStorage.setItem('ordeon_permissions', JSON.stringify(permissions))

      if (onLoginSuccess) {
        onLoginSuccess(sesion)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.replace(/^\[\d+\]\s*/, ''))
      } else {
        setError('Ocurrió un error inesperado.')
      }
    } finally {
      setCargando(false)
    }
  }

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
          <p className="login-visual__eyebrow">OPERACIONES EN UN SOLO LUGAR</p>
          <h1>Control claro para decisiones rápidas.</h1>
          <p className="login-visual__description">
            Ordeon conecta tu operación diaria con la información que necesitas para trabajar mejor.
          </p>
          <div className="login-visual__status">
            <span className="login-status-dot" aria-hidden="true" />
            <span>Plataforma operativa disponible</span>
          </div>
        </div>
        <p className="login-visual__footer">Ordeon POS · Un producto de Farutech para Afilamos Hermanos</p>
      </section>

      <section className="login-panel">
        <Card className="login-card">
          <div className="login-heading">
            <div className="login-heading__brand" aria-label="Ordeon">
              <div className="login-heading__icon-box" aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#0ea5e9" strokeWidth="2.5" />
                  <path d="M12 6a6 6 0 1 0 6 6" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="2.5" fill="#38bdf8" />
                </svg>
              </div>
              <span className="login-heading__wordmark">ORDEON</span>
            </div>
            <p className="login-heading__eyebrow">ACCESO SEGURO</p>
            <h2>Bienvenido de nuevo</h2>
            <p className="login-heading__subtitle">Ingresa tus credenciales para continuar con tus operaciones.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-codigo">Usuario o código de operario</label>
              <div className="login-input-group">
                <input
                  id="login-codigo"
                  name="codigo"
                  type="text"
                  placeholder="Ej. admin o CAJERO1"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={cargando}
                  autoFocus
                  autoComplete="username"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="login-field__pill-btn"
                  title="Opciones"
                  aria-hidden="true"
                >
                  ···
                </button>
              </div>
            </div>

            <div className="login-field">
              <div className="login-field__label-row">
                <label htmlFor="login-password">Contraseña</label>
                <span className="login-field__hint">Protegida</span>
              </div>
              <div className="login-input-group">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={cargando}
                  autoComplete="current-password"
                />
                <div className="login-password__actions">
                  <button
                    type="button"
                    tabIndex={-1}
                    className="login-field__pill-btn"
                    title="Opciones"
                    aria-hidden="true"
                  >
                    ···
                  </button>
                  <button
                    type="button"
                    className="login-password__toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <Button type="submit" disabled={cargando} className="login-submit">
              {cargando ? 'Validando acceso…' : 'Ingresar a Ordeon'}
            </Button>
          </form>

          <div className="login-card__meta">
            <Badge variant="success" className="login-badge-pill">Sistema activo</Badge>
            <span className="login-version">v1.0.0</span>
            <span className="login-creator">Creado por Farutech</span>
          </div>
        </Card>
      </section>
    </main>
  )
}
