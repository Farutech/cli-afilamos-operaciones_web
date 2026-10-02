import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginForm } from '../../features/auth/LoginForm'

describe('LoginForm Component', () => {
  it('renderiza correctamente el formulario con sus campos e inputs', () => {
    render(<LoginForm />)

    expect(screen.getByText(/Ordeon POS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/código de operario/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingresar a ordeon/i })).toBeInTheDocument()
  })

  it('muestra error de validación cuando se envía el formulario vacío', async () => {
    render(<LoginForm />)

    const submitBtn = screen.getByRole('button', { name: /ingresar a ordeon/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent('Por favor complete todos los campos.')
  })

  it('permite escribir en los campos de código y contraseña', () => {
    render(<LoginForm />)

    const codigoInput = screen.getByLabelText(/código de operario/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText('Contraseña') as HTMLInputElement

    fireEvent.change(codigoInput, { target: { value: 'OPERARIO01' } })
    fireEvent.change(passwordInput, { target: { value: 'Secret123*' } })

    expect(codigoInput.value).toBe('OPERARIO01')
    expect(passwordInput.value).toBe('Secret123*')
  })
})
