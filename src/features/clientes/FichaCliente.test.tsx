import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { FichaCliente } from './FichaCliente';
import { catalogosApi } from '../../services/catalogosApi';
import type { Cliente, ClienteHistorico } from '../../types/catalogos';

vi.mock('../../services/catalogosApi', () => ({
  catalogosApi: {
    getClientes: vi.fn(),
    getClienteHistorico: vi.fn(),
  },
}));

const mockClientes: Cliente[] = [
  {
    uuid: 'cli-uuid-1',
    numeroDocumento: '900123456',
    nombreRazonSocial: 'Restaurante Central',
    telefono: '3001234567',
    activo: true,
  },
  {
    uuid: 'cli-uuid-2',
    numeroDocumento: '1020304050',
    nombreRazonSocial: 'Juan Perez',
    telefono: '3119876543',
    activo: true,
  },
];

const mockHistorico: ClienteHistorico = {
  uuid: 'cli-uuid-1',
  numeroDocumento: '900123456',
  nombreRazonSocial: 'Restaurante Central',
  telefono: '3001234567',
  activo: true,
  creadoEn: '2026-09-01T10:00:00Z',
  totalHistoricoGastado: 350000,
  totalSolicitudes: 4,
  solicitudesActivas: 1,
  otsEnProceso: 2,
  documentos: [
    {
      uuid: 'doc-1',
      numeroDocumentoVisible: 'SOL-0001',
      tipoDocumentoBase: 'SOL',
      subtipoCodigo: 'SOL-STD',
      estado: 'ASENTADO',
      fechaEmision: '2026-09-20T10:00:00Z',
      montoTotal: 150000,
      saldoPendiente: 50000,
      cantidadItems: 3,
      canalOrigen: 'Mostrador',
    },
  ],
};

describe('FichaCliente Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders client list and loads selected client history', async () => {
    vi.mocked(catalogosApi.getClientes).mockResolvedValue({ clientes: mockClientes, total: 2 });
    vi.mocked(catalogosApi.getClienteHistorico).mockResolvedValue(mockHistorico);

    render(<FichaCliente />);

    expect(await screen.findByText(/Ficha y Trazabilidad de Clientes/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Restaurante Central/i)).length).toBeGreaterThan(0);

    // Check KPIs from history
    expect(await screen.findByText(/\$350.000/i)).toBeInTheDocument();
    expect(screen.getByText(/SOL-0001/i)).toBeInTheDocument();
  });

  it('filters clients on search input change', async () => {
    vi.mocked(catalogosApi.getClientes).mockResolvedValue({ clientes: [mockClientes[1]], total: 1 });
    vi.mocked(catalogosApi.getClienteHistorico).mockResolvedValue({
      ...mockHistorico,
      nombreRazonSocial: 'Juan Perez',
      documentos: [],
    });

    render(<FichaCliente />);

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre o documento.../i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    await waitFor(() => {
      expect(catalogosApi.getClientes).toHaveBeenCalledWith('Juan');
    });
  });

  it('triggers onIniciarSolicitud callback when button is clicked', async () => {
    vi.mocked(catalogosApi.getClientes).mockResolvedValue({ clientes: mockClientes, total: 2 });
    vi.mocked(catalogosApi.getClienteHistorico).mockResolvedValue(mockHistorico);
    const mockOnIniciar = vi.fn();

    render(<FichaCliente onIniciarSolicitud={mockOnIniciar} />);

    const btnNuevaSol = await screen.findByRole('button', { name: /Nueva Solicitud para este Cliente/i });
    fireEvent.click(btnNuevaSol);

    expect(mockOnIniciar).toHaveBeenCalledWith(mockClientes[0]);
  });
});
