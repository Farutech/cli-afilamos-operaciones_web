import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ModuloEntregas } from '../../features/entregas/ModuloEntregas';
import { entregasApi } from '../../services/entregasApi';
import type { ItemListoEntrega, RemisionDetalle } from '../../types/entregas';

vi.mock('../../services/entregasApi', () => ({
  entregasApi: {
    getItemsListos: vi.fn(),
    generarRemision: vi.fn(),
    getRemisionByUuid: vi.fn(),
    registrarPago: vi.fn(),
    despacharRemision: vi.fn(),
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
    const botonDespacho = screen.getByText('🚀 Asentar y Despachar al Cliente');
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
});
