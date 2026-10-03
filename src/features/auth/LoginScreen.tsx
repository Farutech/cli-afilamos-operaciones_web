import type { FormEvent } from 'react';
import { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

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
        {/* Encabezado de Marca y Estado de Seguridad */}
        <div className="login-brand-block">
          <div className="brand-lockup login-brand">
            <div className="brand-mark">O</div>
            <div>
              <p className="brand-name">ordeon</p>
              <p className="brand-subtitle">operaciones</p>
            </div>
          </div>
          <span className="login-status">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Acceso seguro
          </span>
        </div>

        {/* Introducción y Contexto Operativo */}
        <div className="login-intro">
          <p className="eyebrow">PLATAFORMA OPERATIVA</p>
          <h1>Bienvenido de nuevo</h1>
          <p className="login-copy">
            Ingresa con tu usuario o correo electrónico para continuar con la operación de tu taller.
          </p>
        </div>

        {/* Formulario de Autenticación */}
        <form onSubmit={onSubmit} className="login-form">
          <label>
            <span>Usuario o correo electrónico</span>
            <div className="login-input-wrap">
              <User className="login-input-icon" />
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="usuario o tu@empresa.com"
                required
              />
            </div>
          </label>

          <label>
            <span>Contraseña</span>
            <div className="login-input-wrap password-field">
              <Lock className="login-input-icon" />
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
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1 inline" />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1 inline" />
                    <span>Mostrar</span>
                  </>
                )}
              </button>
            </div>
          </label>

          {/* Mensaje de Error */}
          {error && (
            <div className="form-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* Opciones Adicionales */}
          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" name="remember" defaultChecked />{' '}
              <span>Recordarme en este dispositivo</span>
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Para restablecer tu contraseña o PIN, por favor contacta al supervisor o administrador de Farutech.');
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Botón Principal */}
          <button className="primary-button login-button" disabled={loading} type="submit">
            {loading ? (
              <span>Conectando...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Iniciar sesión <ArrowRight className="w-4 h-4 inline" />
              </span>
            )}
          </button>
        </form>

        {/* Crédito Farutech */}
        <p className="login-footer">
          Desarrollado por <strong>Farutech</strong>
        </p>
      </div>
    </main>
  );
}

export default LoginScreen;

