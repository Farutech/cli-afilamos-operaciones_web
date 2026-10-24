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

  it('procesa una entrega consolidada y despacha registrando el receptor (nuevo flujo)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 0,
      netBalanceToCollect: 30000,
    });

    const mockDespachada: RemisionDetalle = {
      ...mockRemisionBorradorConSaldo,
      estado: 'DESPACHADO',
      numeroDocumento: 'ENT-0001',
      saldoPendiente: 0,
      recibidoPorNombre: 'Carlos Mendoza',
      recibidoPorDocumento: '1098765432',
    };
    vi.mocked(entregasApi.generarEntregaConsolidada).mockResolvedValue(mockDespachada);

    render(<ModuloEntregas />);

    // Etapa 1: aparece el ítem listo en la tabla de selección
    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
    });

    // Marcar el ítem (checkbox accesible por aria-label con la descripción)
    fireEvent.click(screen.getByLabelText(/Seleccionar Afilado Cuchillo Chef/i));

    // Avanzar a la etapa de proceso
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

    // Etapa 2: formulario de receptor y liquidación
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Nombre de quien retira/i), {
      target: { value: 'Carlos Mendoza' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Cédula o NIT/i), {
      target: { value: '1098765432' },
    });

    const botonDespacho = screen.getByRole('button', { name: /Despachar/i });
    expect(botonDespacho).not.toBeDisabled();
    fireEvent.click(botonDespacho);

    // Debe invocar el endpoint consolidado con el receptor registrado
    await waitFor(() => {
      expect(entregasApi.generarEntregaConsolidada).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteUuid: 'cli-1',
          recibidoPorNombre: 'Carlos Mendoza',
          recibidoPorDocumento: '1098765432',
        }),
        undefined,
      );
    });
  });

  it('mantiene el botón de despacho inhabilitado hasta registrar el receptor (Invariante #3)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 0,
      netBalanceToCollect: 30000,
    });

    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Seleccionar Afilado Cuchillo Chef/i));
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    // El nuevo flujo auto-rellena el receptor con los datos del cliente al marcar el
    // primer ítem (toggleItemGlobal) y preselecciona un instrumento de pago (Efectivo),
    // por lo que el botón de despacho queda habilitado en cuanto hay ítems marcados.
    const botonDespacho = screen.getByRole('button', { name: /Despachar/i });
    expect(botonDespacho).not.toBeDisabled();

    // Si se limpia el nombre del receptor, el botón debe volver a bloquearse (Invariante #3)
    fireEvent.change(screen.getByPlaceholderText(/Nombre de quien retira/i), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Despachar/i })).toBeDisabled();
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

    // Etapa 1: marcar el ítem y avanzar al proceso (flujo consolidado actual)
    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Seleccionar Afilado Cuchillo Chef/i));
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

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

    // Etapa 1: marcar el ítem y avanzar al proceso
    await waitFor(() => {
      expect(screen.getByText('SOL-0001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Seleccionar Afilado Cuchillo Chef/i));
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

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

  it('en vista Por Solicitud selecciona una orden y alimenta la misma columna de liquidación y panel lateral (Fase 2)', async () => {
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

    render(<ModuloEntregas />);

    // Por defecto inicia en 'solicitudes'
    await waitFor(() => {
      expect(screen.getAllByText('SOL-0001')[0]).toBeInTheDocument();
    });

    // Hacer clic en la fila de la solicitud para seleccionarla
    fireEvent.click(screen.getAllByText('SOL-0001')[0]);

    // Avanzar a la etapa de proceso donde vive la columna de liquidación
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

    // Debe poblar la columna de liquidación con los ítems y datos del receptor
    await waitFor(() => {
      expect(screen.getByText(/Resumen de Liquidación/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Cédula o NIT/i)).toBeInTheDocument();
    });

    // El panel lateral sticky debe mostrar el resumen financiero con los campos reales
    expect(screen.getAllByText('$50.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('-$20.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$30.000').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra modal post-despacho con número de remisión, acción de imprimir y permite despachar otra (Fase 2)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 0,
      netBalanceToCollect: 50000,
    });

    const mockDespachada: RemisionDetalle = {
      ...mockRemisionBorradorConSaldo,
      estado: 'DESPACHADO',
      numeroDocumento: 'ENT-2026-0099',
      saldoPendiente: 0,
      totalPagosEntrega: 50000,
      recibidoPorNombre: 'Juan Perez',
      recibidoPorDocumento: 'CC 80123456',
    };
    vi.mocked(entregasApi.generarEntregaConsolidada).mockResolvedValue(mockDespachada);

    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getAllByText('SOL-0001')[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('SOL-0001')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Nombre de quien retira/i), { target: { value: 'Juan Perez' } });
    fireEvent.change(screen.getByPlaceholderText(/Cédula o NIT/i), { target: { value: 'CC 80123456' } });

    const botonDespachar = screen.getByRole('button', { name: /Despachar/i });
    fireEvent.click(botonDespachar);

    // Debe abrirse el modal post-despacho
    await waitFor(() => {
      expect(screen.getByText(/¡Entrega Despachada Exitosamente!/i)).toBeInTheDocument();
      expect(screen.getByText('ENT-2026-0099')).toBeInTheDocument();
      expect(screen.getByText(/Imprimir Comprobante/i)).toBeInTheDocument();
      expect(screen.getByText('Despachar Otra Entrega')).toBeInTheDocument();
    });

    // Probar acción de imprimir
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByText(/Imprimir Comprobante/i));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();

    // Probar acción de "Despachar Otra Entrega"
    fireEvent.click(screen.getByText('Despachar Otra Entrega'));
    await waitFor(() => {
      expect(screen.queryByText(/¡Entrega Despachada Exitosamente!/i)).not.toBeInTheDocument();
    });
  });

  it('permite despachar con monto menor al saldo para cliente con crédito sin bloquear por cobertura (Regla 3b)', async () => {
    vi.mocked(entregasApi.previewEntregaConsolidada).mockResolvedValue({
      customerId: 'cli-1',
      customerName: 'Restaurante Central',
      totalDeliveredAmount: 50000,
      requestAdvances: [],
      customerAdvance: { availableAdvance: 0, maxApplicableAdvance: 0 },
      totalOrderAdvanceSuggested: 0,
      netBalanceToCollect: 50000,
    });

    render(<ModuloEntregas />);

    await waitFor(() => {
      expect(screen.getAllByText('SOL-0001')[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('SOL-0001')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Procesar Entrega/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nombre de quien retira/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Nombre de quien retira/i), { target: { value: 'Cliente Con Credito' } });
    fireEvent.change(screen.getByPlaceholderText(/Cédula o NIT/i), { target: { value: '900999888' } });

    // Poner un monto de cobro menor al saldo (ej. 10.000 de un saldo de 50.000)
    const inputMonto = screen.getByLabelText(/Monto a cobrar/i);
    fireEvent.change(inputMonto, { target: { value: '10000' } });

    // El botón Despachar NO debe estar bloqueado por no cubrir el saldo (Regla 3b)
    const botonDespachar = screen.getByRole('button', { name: /Despachar/i });
    expect(botonDespachar).not.toBeDisabled();
  });
});

