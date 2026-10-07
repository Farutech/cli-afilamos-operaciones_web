import type { FormEvent } from 'react';
import React, { useState } from 'react';
import { Card, Button, Badge } from '@farutech/design-system';

export interface LoginScreenProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  error?: string | null;
}

const OrdeonBlade: React.FC = () => (
  <div className="ordeon-blade" aria-label="Afilamos Hermanos Blade" role="img">
    <svg className="blade-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="blade-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dientes exteriores de la sierra con giro suave */}
      <g className="blade-spin">
        {/* Anillo dentado */}
        <circle cx="100" cy="100" r="86" fill="none" stroke="#cbd5e1" strokeWidth="16" strokeDasharray="9 7" />
        {/* Cuerpo del disco de sierra */}
        <circle cx="100" cy="100" r="74" fill="#1e242b" stroke="#334155" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />

        {/* 4 Pernos / Remaches industriales */}
        <circle cx="100" cy="56" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="100" cy="144" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="56" cy="100" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="144" cy="100" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />

        {/* Marcas de expansión térmica */}
        <path d="M100 28 L103 42 L97 42 Z" fill="#94a3b8" />
        <path d="M100 172 L103 158 L97 158 Z" fill="#94a3b8" />
        <path d="M28 100 L42 97 L42 103 Z" fill="#94a3b8" />
        <path d="M172 100 L158 97 L158 103 Z" fill="#94a3b8" />
      </g>

      {/* Núcleo central estático con brillo cian / Ordeon */}
      <circle cx="100" cy="100" r="30" fill="url(#blade-core-glow)" />
      <circle cx="100" cy="100" r="24" fill="#0b1322" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="16" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="5 3" />
      <circle cx="100" cy="100" r="7" fill="#38bdf8" />
    </svg>
  </div>
);

export function LoginScreen({ onSubmit, loading = false, error }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-page">
      {/* Panel Izquierdo: Branding corporativo de Afilamos Hermanos & Ordeon */}
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

        <p className="login-visual__footer">
          Ordeon POS · Un producto de Farutech para Afilamos Hermanos
        </p>
      </section>

      {/* Panel Derecho: Tarjeta de Acceso Seguro basada en el Design System */}
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
            <p className="login-heading__subtitle">
              Ingresa tus credenciales para continuar con tus operaciones.
            </p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-codigo">Usuario o código de operario</label>
              <div className="login-input-group">
                <input
                  id="login-codigo"
                  name="identifier"
                  type="text"
                  placeholder="Ej. admin o CAJERO1"
                  defaultValue="admin"
                  required
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="login-field__pill-btn"
                  title="Opciones de acceso"
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
                  defaultValue="Admin123!"
                  required
                  autoComplete="current-password"
                  disabled={loading}
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

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="login-submit"
            >
              {loading ? 'Validando acceso…' : 'Ingresar a Ordeon'}
            </Button>
          </form>

          <div className="login-card__meta">
            <Badge variant="success" className="login-badge-pill">
              Sistema activo
            </Badge>
            <span className="login-version">v1.0.0</span>
            <span className="login-creator">Creado por Farutech</span>
          </div>
        </Card>
      </section>
    </main>
  );
}

export default LoginScreen;
