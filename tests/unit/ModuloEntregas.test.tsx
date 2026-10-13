import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ModuloEntregas } from '@/features/entregas/ModuloEntregas';
import { entregasApi } from '@/services/entregasApi';
import type { ItemListoEntrega, RemisionDetalle } from '@/types/entregas';

vi.mock('@/services/entregasApi', () => ({
  entregasApi: {
    getItemsListos: vi.fn(),
    generarRemision: vi.fn(),
    getRemisionByUuid: vi.fn(),
    registrarPago: vi.fn(),
    despacharRemision: vi.fn(),
    previewEntregaConsolidada: vi.fn(),
    generarEntregaConsolidada: vi.fn(),
  },
}));

const mockItemsListos: ItemListoEntrega[] = [
  {
    itemPublicId: 'item-1',
    itemCodigo: 'ITM-01',
    descripcion: 'Afilado Cuchillo Chef',
    cantidad: 1,
    precioUnitario: 50000,
    subtotal: 50000,
    anticipoDirectoImputado: 20000,
    saldoPendienteItem: 30000,
    documentoSolicitudPublicId: 'sol-1',
    documentoSolicitudNumero: 'SOL-0001',
    documentoOtPublicId: 'ot-1',
    documentoOtNumero: 'OT-0001',
    clientePublicId: 'cli-1',
    clienteNombre: 'Restaurante Central',
    clienteNumeroDocumento: '900123456',
    clienteTelefono: '3001234567',
    etapaActualCodigo: 'FINALIZADO_TALLER',
    etapaActualNombre: 'Finalizado Taller',
    franjaCompromiso: '2026-09-21 16:00',
  },
];

const mockRemisionBorradorConSaldo: RemisionDetalle = {
  publicId: 'rem-1',
  codigo: 'REM-001',
  numeroDocumento: 'BORRADOR-RM',
  estado: 'BORRADOR',
  fechaEmision: '2026-09-21T10:00:00Z',
  notas: 'Remisión de entrega',
  cliente: {
    uuid: 'cli-1',
    tipoDocumento: {
      uuid: 'tip-1',
      codigo: 'NIT',
      nombre: 'NIT',
      aplicaPersona: 'JURIDICA',
      activo: true,
    },
    numeroDocumento: '900123456',
    nombreRazonSocial: 'Restaurante Central',
    telefono: '3001234567',
    activo: true,
    creadoEn: '2026-09-20',
  },
  canal: {
    uuid: 'can-1',
    codigo: 'MOSTRADOR',
    nombre: 'Mostrador',
    activo: true,
  },
  totalNeto: 50000,
  totalAnticiposPrevios: 20000,
  totalPagosEntrega: 0,
  saldoPendiente: 30000,
  items: [
    {
      publicId: 'it-rem-1',
      codigo: 'ITM-01',
      naturaleza: 'SERVICIO',
      descripcion: 'Afilado Cuchillo Chef',
      cantidad: 1,
      precioUnitario: 50000,
      subtotal: 50000,
      exigeAnticipoObligatorio: true,
      porcentajeAnticipoMinimo: 40,
      anticipoMinimoRequerido: 20000,
      anticipoDirectoImputado: 20000,
      saldoPendienteItem: 30000,
      franjaCompromiso: '2026-09-21 16:00',
      permiteCancelacion: false,
    },
  ],
  recaudos: [],
};

describe('ModuloEntregas Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(entregasApi.getItemsListos).mockResolvedValue(mockItemsListos);
  });

  it('renderiza solicitudes listas para entrega con sus totales y anticipos', async () => {
    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
      expect(screen.getByText('Restaurante Central')).toBeInTheDocument();
      expect(screen.getByText('$50.000')).toBeInTheDocument();
      expect(screen.getByText('$20.000')).toBeInTheDocument();
      expect(screen.getByText('$30.000')).toBeInTheDocument();
    });
  });

  it('genera remisión borrador y bloquea el botón de despacho si saldo > 0 (Invariante #3)', async () => {
    vi.mocked(entregasApi.generarRemision).mockResolvedValue(mockRemisionBorradorConSaldo);

    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getByText('📄 Generar Remisión')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('📄 Generar Remisión'));

    await waitFor(() => {
      expect(screen.getByText(/Invariante #3/i)).toBeInTheDocument();
      expect(screen.getByText('💳 Registrar Cobro ($30.000)')).toBeInTheDocument();
    });

    // El botón de despacho final debe estar deshabilitado
    const botonDespacho = screen.getByRole('button', { name: /Asentar y Despachar al Cliente/i });
    expect(botonDespacho).toBeDisabled();
  });

  it('permite registrar cobro de saldo y luego asentar y despachar registrando el receptor', async () => {
    vi.mocked(entregasApi.generarRemision).mockResolvedValue(mockRemisionBorradorConSaldo);

    const mockRemisionLiquidada: RemisionDetalle = {
      ...mockRemisionBorradorConSaldo,
      totalPagosEntrega: 30000,
      saldoPendiente: 0,
    };

    vi.mocked(entregasApi.registrarPago).mockResolvedValue(mockRemisionLiquidada);

    const mockRemisionDespachada: RemisionDetalle = {
      ...mockRemisionLiquidada,
      estado: 'ASENTADO',
      numeroDocumento: 'RM-0001',
      recibidoPorNombre: 'Carlos Mendoza',
      recibidoPorDocumento: '1098765432',
    };

    vi.mocked(entregasApi.despacharRemision).mockResolvedValue(mockRemisionDespachada);

    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getByText('📄 Generar Remisión')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('📄 Generar Remisión'));

    await waitFor(() => {
      expect(screen.getByText('💳 Registrar Cobro ($30.000)')).toBeInTheDocument();
    });

    // Abrir modal de cobro
    fireEvent.click(screen.getByText('💳 Registrar Cobro ($30.000)'));

    await waitFor(() => {
      expect(screen.getByText('Confirmar Recaudo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirmar Recaudo'));

    await waitFor(() => {
      expect(screen.getByText(/Saldo 100% liquidado/i)).toBeInTheDocument();
    });

    // Rellenar campos de receptor
    const inputNombre = screen.getByPlaceholderText('Ej: Carlos Mendoza');
    const inputDoc = screen.getByPlaceholderText('Ej: 1098765432');

    fireEvent.change(inputNombre, { target: { value: 'Carlos Mendoza' } });
    fireEvent.change(inputDoc, { target: { value: '1098765432' } });

    const botonDespacho = screen.getByText('🚀 Asentar y Despachar al Cliente');
    expect(botonDespacho).not.toBeDisabled();

    fireEvent.click(botonDespacho);

    await waitFor(() => {
      expect(entregasApi.despacharRemision).toHaveBeenCalledWith(
        'rem-1',
        {
          usuarioDespachaCodigo: 'CAJ-01',
          recibidoPorNombre: 'Carlos Mendoza',
          recibidoPorDocumento: '1098765432',
        },
        undefined,
      );
    });
  });

  it('llama payment-methods una sola vez al montar y 0 veces al volver a entrar (P1)', async () => {
    const { getPaymentMethodsFetchCount, resetPaymentMethodsCache } = await import('@/services/catalogosApi');
    resetPaymentMethodsCache();

    // Primer montaje: debe realizar 1 petición
    const { unmount } = render(<ModuloEntregas />);

    await waitFor(() => {
      expect(getPaymentMethodsFetchCount()).toBe(1);
    });

    // Desmontar el módulo y volver a entrar
    unmount();
    render(<ModuloEntregas />);

    // Al volver a entrar, el contador de peticiones a /catalogs/payment-methods debe seguir en 1 (0 peticiones adicionales)
    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
    });
    expect(getPaymentMethodsFetchCount()).toBe(1);
  });

  it('construye correctamente el payload de despacho con settlementPayments y anticipos (1.6)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [
        {
          documentId: 'sol-1',
          documentNumber: 'SOL-0001',
          totalPendingAllItems: 50000,
          deliveringItemsPending: 50000,
          undeliveredItemsPending: 0,
          availableAdvance: 20000,
          minAdvanceToApply: 20000,
          maxAdvanceToApply: 20000,
          suggestedAdvanceToApply: 20000,
        },
      ],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 20000,
      netBalanceToCollect: 30000,
    });

    const mockDespachada: RemisionDetalle = {
      ...mockRemisionBorradorConSaldo,
      estado: 'ENTREGADO',
      numeroDocumento: 'ENT-0001',
      saldoPendiente: 0,
    };
    vi.mocked(entregasApi.generarEntregaConsolidada).mockResolvedValue(mockDespachada);

    render(<ModuloEntregas />);

    // Cambiar a la vista consolidada por cliente
    fireEvent.click(screen.getByText(/Por Cliente \(Consolidada\)/i));

    await waitFor(() => {
      expect(screen.getByText(/Restaurante Central/i)).toBeInTheDocument();
    });

    // Seleccionar cliente
    fireEvent.click(screen.getByText('Restaurante Central'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    // Rellenar receptor
    const inputNombre = screen.getByPlaceholderText(/Nombre de quien retira/i);
    const inputDoc = screen.getByPlaceholderText(/Cédula o NIT/i);
    fireEvent.change(inputNombre, { target: { value: 'Gloria Receptor' } });
    fireEvent.change(inputDoc, { target: { value: 'CC 52123456' } });

    // Pulsar botón de despacho
    const botonDespachar = screen.getByRole('button', { name: /Despachar/i });
    fireEvent.click(botonDespachar);

    await waitFor(() => {
      expect(entregasApi.generarEntregaConsolidada).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteUuid: 'cli-1',
          items: expect.arrayContaining([
            expect.objectContaining({ itemPublicId: 'item-1', cantidad: 1 }),
          ]),
          recibidoPorNombre: 'Gloria Receptor',
          recibidoPorDocumento: 'CC 52123456',
          pagoLiquidacion: expect.objectContaining({
            monto: 30000,
          }),
        }),
        undefined,
      );
    });
  });

  it('muestra errores del backend y los limpia al cambiar cliente, ítem o medio de pago (1.5 y 1.6)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 0,
      netBalanceToCollect: 50000,
    });

    // Simular error 422 UNSETTLED_BALANCE del backend
    vi.mocked(entregasApi.generarEntregaConsolidada).mockRejectedValue(
      new Error('Existe un saldo pendiente de 50.000 COP no cubierto por recaudos ni cupo de crédito disponible (0 COP).')
    );

    render(<ModuloEntregas />);
    fireEvent.click(screen.getByText(/Por Cliente \(Consolidada\)/i));

    await waitFor(() => {
      expect(screen.getByText(/Restaurante Central/i)).toBeInTheDocument();
    });

    // Seleccionar cliente
    fireEvent.click(screen.getByText('Restaurante Central'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    const inputNombre = screen.getByPlaceholderText(/Nombre de quien retira/i);
    const inputDoc = screen.getByPlaceholderText(/Cédula o NIT/i);
    fireEvent.change(inputNombre, { target: { value: 'Receptor Prueba' } });
    fireEvent.change(inputDoc, { target: { value: '123456' } });

    const botonDespachar = screen.getByRole('button', { name: /Despachar/i });
    fireEvent.click(botonDespachar);

    // Debe mostrarse el error retornado por el backend
    await waitFor(() => {
      expect(screen.getAllByText(/Existe un saldo pendiente de 50.000 COP/i).length).toBeGreaterThanOrEqual(1);
    });

    // Al desmarcar/cambiar un ítem, el error debe limpiarse
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Existe un saldo pendiente de 50.000 COP/i)).not.toBeInTheDocument();
    });
  });
});

