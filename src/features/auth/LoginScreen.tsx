import type { FormEvent } from 'react';
import { useState } from 'react';

export interface LoginScreenProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string;
}

export function LoginScreen({ onSubmit, loading, error }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="login-brand-block">
          <div className="brand-lockup login-brand">
            <div className="brand-mark">O</div>
            <div>
              <p className="brand-name">ordeon</p>
              <p className="brand-subtitle">operaciones</p>
            </div>
          </div>
          <span className="login-status">
            <i /> Acceso seguro
          </span>
        </div>

        <div className="login-intro">
          <p className="eyebrow">PLATAFORMA OPERATIVA</p>
          <h1>Bienvenido de nuevo</h1>
          <p className="login-copy">
            Ingresa con tu usuario o correo electrónico para continuar con la operación de tu taller.
          </p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <label>
            <span>Usuario o correo electrónico</span>
            <input
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="usuario o tu@empresa.com"
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" name="remember" defaultChecked />{' '}
              <span>Recordarme en este dispositivo</span>
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Para restablecer tu contraseña o PIN, por favor contacta al administrador del sistema Farutech.');
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button className="primary-button login-button" disabled={loading} type="submit">
            {loading ? 'Conectando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footer">
          Creado por <strong>Farutech</strong>
        </p>
      </div>
    </main>
  );
}

export default LoginScreen;
