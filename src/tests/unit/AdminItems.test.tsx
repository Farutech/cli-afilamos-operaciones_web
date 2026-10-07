import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminItems from '../../components/admin/AdminItems';

vi.mock('@/services/catalogosApi', () => ({
  catalogosApi: {
    getItems: vi.fn().mockResolvedValue({
      items: [
        {
          uuid: 'prd-1',
          codigoReferencia: 'MAT-001',
          nombre: 'Diente Widia K20 4.2mm',
          descripcion: 'Plaquita de carburo de tungsteno',
          naturaleza: 'INVENTARIO',
          precioBase: 12500,
          stockReferencial: 140,
          activo: true,
          categoria: { uuid: 'cat-mat', codigo: 'MAT', nombre: 'Materiales & Plaquitas', activo: true, nivel: 1 },
        },
        {
          uuid: 'srv-1',
          codigoReferencia: 'SRV-001',
          nombre: 'Afilado Sierra Circular Carburo',
          descripcion: 'Afilado integral de dientes',
          naturaleza: 'SERVICIO',
          precioBase: 45000,
          stockReferencial: null,
          activo: true,
          categoria: { uuid: 'cat-afi', codigo: 'AFI', nombre: 'Afilado Especializado', activo: true, nivel: 1 },
        },
      ],
      total: 2,
    }),
    crearItem: vi.fn().mockResolvedValue({
      uuid: 'new-1',
      codigoReferencia: 'NEW-001',
      nombre: 'Nuevo Ítem Test',
      naturaleza: 'INVENTARIO',
      precioBase: 10000,
      stockReferencial: 50,
      activo: true,
    }),
    actualizarItem: vi.fn(),
    setItemActivo: vi.fn(),
  },
}));

describe('AdminItems Component (Catálogo Unificado)', () => {
  it('renders unified catalog table with both products and services', async () => {
    render(<AdminItems token="test-token" />);

    expect(screen.getByText('Productos y Servicios')).toBeInTheDocument();
    expect(screen.getByText(/Gestión unificada de materiales de inventario/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Diente Widia K20/i)).toBeInTheDocument();
      expect(screen.getByText(/Afilado Sierra Circular/i)).toBeInTheDocument();
    });
  });

  it('filters items by query search', async () => {
    render(<AdminItems token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText(/Diente Widia K20/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por código, nombre o descripción/i);
    fireEvent.change(searchInput, { target: { value: 'Afilado Sierra' } });

    await waitFor(() => {
      expect(screen.getByText(/Afilado Sierra Circular/i)).toBeInTheDocument();
      expect(screen.queryByText(/Diente Widia K20/i)).not.toBeInTheDocument();
    });
  });

  it('opens item creation modal with standardized fields and footer', () => {
    render(<AdminItems token="test-token" />);

    const newBtn = screen.getByRole('button', { name: /\+ Nuevo Ítem/i });
    fireEvent.click(newBtn);

    expect(screen.getByRole('heading', { name: /Registro de Producto \/ Servicio/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de Referencia \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre descriptivo \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear ítem/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });
});
