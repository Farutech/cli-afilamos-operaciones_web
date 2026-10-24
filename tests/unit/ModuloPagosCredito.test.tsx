import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ModuloPagosCredito } from '@/features/pagos/ModuloPagosCredito';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/services/catalogosApi', () => ({
  catalogosApi: {
    getMediosPagoArbol: vi.fn().mockResolvedValue({
      categorias: [
        {
          categoria: 'EFECTIVO',
          instrumentos: [
            {
              uuid: 'ins-01',
              codigo: 'EFECTIVO',
              nombre: 'Efectivo Mostrador',
              categoria: 'EFECTIVO',
              esHoja: true,
              requiereReferencia: false,
              activo: true,
            },
          ],
        },
      ],
    }),
  },
}));

const mockSolicitudes = [
  {
    id: 'sol-01',
    number: 'SOL-0001',
    customerId: 'cli-01',
    customerName: 'Juan Pérez',
    customerDocument: '1098765432',
    total: 100000,
    paidAmount: 40000,
    balanceDue: 60000,
    status: 'CONFIRMED',
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'sol-02',
    number: 'SOL-0002',
    customerId: 'cli-02',
    customerName: 'Restaurante Central',
    customerDocument: '900123456',
    total: 80000,
    paidAmount: 80000,
    balanceDue: 0,
    status: 'CONFIRMED',
    createdAt: '2026-10-10T11:00:00Z',
  },
];

describe('ModuloPagosCredito Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockSolicitudes);
  });

  it('renderiza la lista paginada de solicitudes con saldo pendiente', async () => {
    render(<ModuloPagosCredito />);

    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getAllByText(/60\.000/).length).toBeGreaterThan(0);
      expect(screen.getByText('💰 Abonar')).toBeInTheDocument();
    });
  });

  it('abre el modal de abono al hacer clic en Abonar sin scroll', async () => {
    render(<ModuloPagosCredito />);

    await waitFor(() => {
      expect(screen.getByText('💰 Abonar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💰 Abonar'));

    await waitFor(() => {
      expect(screen.getByText(/Registrar Abono · SOL-0001/i)).toBeInTheDocument();
      expect(screen.getByText(/Pagar Saldo Total/i)).toBeInTheDocument();
      expect(screen.getByText('💰 Confirmar y Registrar Abono')).toBeInTheDocument();
    });
  });

  it('registra el abono exitosamente llamando al endpoint /payments', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'pay-01', amount: 60000 });

    render(<ModuloPagosCredito />);

    await waitFor(() => {
      expect(screen.getByText('💰 Abonar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💰 Abonar'));

    await waitFor(() => {
      expect(screen.getByText('💰 Confirmar y Registrar Abono')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💰 Confirmar y Registrar Abono'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/payments',
        expect.objectContaining({
          customerId: 'cli-01',
          documentId: 'sol-01',
          requestId: 'sol-01',
          amount: 60000,
        }),
        undefined
      );
    });
  });

  it('selecciona por defecto la forma de pago marcada con isDefault: true sin valores quemados', async () => {
    const mockCatalogosApi = await import('@/services/catalogosApi');
    vi.mocked(mockCatalogosApi.catalogosApi.getMediosPagoArbol).mockResolvedValueOnce({
      categorias: [
        {
          codigo: 'ELECTRONICO',
          nombre: 'Electrónico',
          uuid: 'cat-elec',
          orden: 1,
          activo: true,
          instrumentos: [
            {
              uuid: 'pm-transferencia',
              codigo: 'TRANSFERENCIA',
              nombre: 'Transferencia Bancaria',
              categoria: 'TRANSFERENCIA',
              esHoja: true,
              requiereReferencia: true,
              activo: true,
              isDefault: false,
            },
            {
              uuid: 'pm-nequi-default',
              codigo: 'NEQUI',
              nombre: 'Nequi',
              categoria: 'TRANSFERENCIA',
              esHoja: true,
              requiereReferencia: true,
              activo: true,
              isDefault: true,
            },
          ],
        },
      ],
    });

    render(<ModuloPagosCredito />);

    await waitFor(() => {
      expect(screen.getByText('💰 Abonar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💰 Abonar'));

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pm-nequi-default');
    });
  });
});
