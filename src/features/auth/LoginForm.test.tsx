import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm Component', () => {
  it('renderiza correctamente el formulario con sus campos e inputs', () => {
    render(<LoginForm />)

    expect(screen.getByText('Ordeon POS')).toBeInTheDocument()
    expect(screen.getByLabelText('Código de Operario')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingresar al sistema/i })).toBeInTheDocument()
  })

  it('muestra error de validación cuando se envía el formulario vacío', async () => {
    render(<LoginForm />)

    const submitBtn = screen.getByRole('button', { name: /ingresar al sistema/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent('Por favor complete todos los campos.')
  })

  it('permite escribir en los campos de código y contraseña', () => {
    render(<LoginForm />)

    const codigoInput = screen.getByLabelText('Código de Operario') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Contraseña') as HTMLInputElement

    fireEvent.change(codigoInput, { target: { value: 'OPERARIO01' } })
    fireEvent.change(passwordInput, { target: { value: 'Secret123*' } })

    expect(codigoInput.value).toBe('OPERARIO01')
    expect(passwordInput.value).toBe('Secret123*')
  })
})
