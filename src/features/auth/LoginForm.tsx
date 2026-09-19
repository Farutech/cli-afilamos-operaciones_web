import React, { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
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
      // Simulación / llamada a endpoint
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, password }),
      })

      if (!res.ok) {
        throw new Error('Credenciales inválidas o usuario inactivo.')
      }

      const sesion: UsuarioSesion = await res.json()
      if (onLoginSuccess) {
        onLoginSuccess(sesion)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
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
