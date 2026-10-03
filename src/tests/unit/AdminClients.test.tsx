import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminClients from '../../components/admin-clients';

vi.mock('@/lib/api-client', () => ({
  ordeonRequest: vi.fn().mockResolvedValue([
    { id: '1', code: 'CLI-001', name: 'María Fernanda López', email: 'maria.lopez@empresa.com', phone: '+52 55 2180 4421', ordersCount: 8, isActive: true },
    { id: '2', code: 'CLI-002', name: 'Restaurante La Casona', email: 'contacto@lacasona.com', phone: '+52 55 2104 8830', ordersCount: 14, isActive: true },
    { id: '3', code: 'CLI-003', name: 'Carlos Ramírez', email: 'carlos.ramirez@email.com', phone: '+52 55 3380 1142', ordersCount: 3, isActive: true },
  ]),
}));

describe('AdminClients Component', () => {
  it('renders directory title and client list', async () => {
    render(<AdminClients token="test-token" />);

    expect(screen.getByText(/Directorio de clientes/i)).toBeInTheDocument();
    expect(screen.getByText('CLIENTE')).toBeInTheDocument();
    expect(screen.getByText('CONTACTO')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/María Fernanda López/i)).toBeInTheDocument();
    });
  });

  it('filters clients when typing in search input', async () => {
    render(<AdminClients token="test-token" />);

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre, teléfono o correo/i);
    fireEvent.change(searchInput, { target: { value: 'La Casona' } });

    await waitFor(() => {
      expect(screen.getByText(/Restaurante La Casona/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Carlos Ramírez/i)).not.toBeInTheDocument();
  });

  it('opens new client modal when clicking Nuevo cliente', () => {
    render(<AdminClients token="test-token" />);

    const newBtn = screen.getByRole('button', { name: /Nuevo cliente/i });
    fireEvent.click(newBtn);

    expect(screen.getByRole('heading', { name: /Nuevo cliente/i })).toBeInTheDocument();
    expect(screen.getByText(/Código o documento/i)).toBeInTheDocument();
  });
});
