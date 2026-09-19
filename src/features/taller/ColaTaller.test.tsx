import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ColaTaller } from './ColaTaller';
import { tallerApi } from '../../services/tallerApi';
import type { ItemTaller } from '../../types/taller';

vi.mock('../../services/tallerApi', () => ({
  tallerApi: {
    getCola: vi.fn(),
    confirmarRecepcion: vi.fn(),
    ejecutarTransicion: vi.fn(),
    cancelarItem: vi.fn(),
    registrarActividad: vi.fn(),
  },
}));

const mockItems: ItemTaller[] = [
  {
    itemPublicId: 'item-uuid-1',
    itemCodigo: 'ITM-001',
    descripcion: 'Afilado Cuchillo Chef 20cm',
    cantidad: 2,
    franjaCompromiso: '2026-09-20 14:00',
    documentoOtPublicId: 'ot-uuid-1',
    documentoOtNumero: 'OT-0001',
    documentoSolicitudPublicId: 'sol-uuid-1',
    documentoSolicitudNumero: 'SOL-0001',
    clienteNombre: 'Restaurante Central',
    clienteTelefono: '3001234567',
    workflowInstanciaPublicId: 'wf-uuid-1',
    etapaActualCodigo: 'RECEPCION_TECNICA',
    etapaActualNombre: 'Recepción Técnica',
    etapaActualOrden: 1,
    permiteCancelacionDirecta: true,
    esFinal: false,
    transicionesPermitidas: [
      {
        transicionPublicId: 'tr-1',
        codigo: 'TR_INICIAR',
        nombre: 'Iniciar Afilado',
        requiereAprobacion: false,
        etapaDestinoCodigo: 'EN_PROCESO',
        etapaDestinoNombre: 'En Proceso',
        esDestinoFinal: false,
      },
    ],
    historial: [],
  },
  {
    itemPublicId: 'item-uuid-2',
    itemCodigo: 'ITM-002',
    descripcion: 'Vaciado y Rectificado Tijera Quirúrgica',
    cantidad: 1,
    franjaCompromiso: '2026-09-21 10:00',
    documentoOtPublicId: 'ot-uuid-2',
    documentoOtNumero: 'OT-0002',
    documentoSolicitudPublicId: 'sol-uuid-2',
    documentoSolicitudNumero: 'SOL-0002',
    clienteNombre: 'Clínica San José',
    clienteTelefono: '3109876543',
    workflowInstanciaPublicId: 'wf-uuid-2',
    etapaActualCodigo: 'EN_PROCESO',
    etapaActualNombre: 'En Proceso',
    etapaActualOrden: 2,
    permiteCancelacionDirecta: false, // Invariante #8: Requiere VoBo Supervisor
    esFinal: false,
    transicionesPermitidas: [
      {
        transicionPublicId: 'tr-2',
        codigo: 'TR_FINALIZAR',
        nombre: 'Finalizar Trabajo',
        requiereAprobacion: false,
        etapaDestinoCodigo: 'FINALIZADO_TALLER',
        etapaDestinoNombre: 'Finalizado Taller',
        esDestinoFinal: false,
      },
    ],
    historial: [],
  },
];

describe('ColaTaller Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tallerApi.getCola).mockResolvedValue(mockItems);
  });

  it('renderiza la lista de ítems de taller con números de OT y solicitud', async () => {
    render(<ColaTaller />);

    await waitFor(() => {
      expect(screen.getByText('OT-0001')).toBeInTheDocument();
      expect(screen.getByText('OT-0002')).toBeInTheDocument();
    });

    expect(screen.getByText('Afilado Cuchillo Chef 20cm')).toBeInTheDocument();
    expect(screen.getByText('Vaciado y Rectificado Tijera Quirúrgica')).toBeInTheDocument();
    expect(screen.getAllByText('Recepción Técnica').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('En Proceso').length).toBeGreaterThanOrEqual(1);
  });

  it('permite realizar recepción rápida en 1 clic para ítems en RECEPCION_TECNICA', async () => {
    vi.mocked(tallerApi.confirmarRecepcion).mockResolvedValue({
      ...mockItems[0],
      etapaActualCodigo: 'EN_PROCESO',
      etapaActualNombre: 'En Proceso',
    });

    render(<ColaTaller />);

    await waitFor(() => {
      expect(screen.getByText('⚡ Recibir en Taller')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('⚡ Recibir en Taller'));

    await waitFor(() => {
      expect(tallerApi.confirmarRecepcion).toHaveBeenCalledWith(
        'item-uuid-1',
        expect.objectContaining({
          operarioCodigo: 'OP-01',
        }),
        undefined,
      );
    });
  });

  it('aplica Invariante #8 requiriendo VoBo de supervisor al cancelar ítem en etapa avanzada', async () => {
    render(<ColaTaller />);

    await waitFor(() => {
      expect(screen.getByText('Vaciado y Rectificado Tijera Quirúrgica')).toBeInTheDocument();
    });

    // Encontrar los botones de cancelar (✕)
    const cancelButtons = screen.getAllByText('✕');
    // El segundo botón corresponde a mockItems[1] que tiene permiteCancelacionDirecta = false
    fireEvent.click(cancelButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Invariante #8/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('SUP-01')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••')).toBeInTheDocument();
    });
  });

  it('permite abrir modal y ejecutar transición técnica disponible', async () => {
    vi.mocked(tallerApi.ejecutarTransicion).mockResolvedValue({
      ...mockItems[0],
      etapaActualCodigo: 'EN_PROCESO',
      etapaActualNombre: 'En Proceso',
    });

    render(<ColaTaller />);

    await waitFor(() => {
      expect(screen.getByText('Iniciar Afilado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Iniciar Afilado'));

    await waitFor(() => {
      expect(screen.getByText('Ejecutar Transición: Iniciar Afilado')).toBeInTheDocument();
    });

    const inputNotas = screen.getByPlaceholderText('Detalles sobre el avance técnico...');
    fireEvent.change(inputNotas, { target: { value: 'Iniciando primer afilado al agua' } });

    fireEvent.click(screen.getByText('Confirmar Transición'));

    await waitFor(() => {
      expect(tallerApi.ejecutarTransicion).toHaveBeenCalledWith(
        'item-uuid-1',
        expect.objectContaining({
          codigoTransicion: 'TR_INICIAR',
          notas: 'Iniciando primer afilado al agua',
        }),
        undefined,
      );
    });
  });
});
