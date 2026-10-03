import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginScreen } from '../../features/auth/LoginScreen';

describe('LoginScreen Component', () => {
  it('renders Ordeon brand and form inputs', () => {
    render(<LoginScreen onSubmit={vi.fn()} loading={false} error="" />);

    expect(screen.getByText(/ordeon/i)).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido de nuevo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/usuario o tu@empresa.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ingresa tu contraseña/i)).toBeInTheDocument();
  });

  it('toggles password visibility between text and password', () => {
    render(<LoginScreen onSubmit={vi.fn()} loading={false} error="" />);

    const passwordInput = screen.getByPlaceholderText(/Ingresa tu contraseña/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Mostrar contraseña/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits credentials when form is submitted', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    render(<LoginScreen onSubmit={handleSubmit} loading={false} error="" />);

    const submitBtn = screen.getByRole('button', { name: /Iniciar sesión/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
