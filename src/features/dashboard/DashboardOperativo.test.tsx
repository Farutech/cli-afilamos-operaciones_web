import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DashboardOperativo } from './DashboardOperativo';
import { dashboardApi } from '../../services/dashboardApi';
import type { DashboardMetricasDto } from '../../types/dashboard';

vi.mock('../../services/dashboardApi', () => ({
  dashboardApi: {
    getMetricas: vi.fn(),
  },
}));

const mockMetricas: DashboardMetricasDto = {
  solicitudesActivasCount: 7,
  itemsEnTallerCount: 12,
  itemsListosEntregaCount: 4,
  despachadosHoyCount: 5,
  totalRecaudosHoy: 450000,
  cajaAbierta: true,
  codigoCaja: 'CAJA-01',
  turnoActivoCodigo: 'TRN-001',
  saldoEfectivoActual: 550000,
  distribucionCanales: [
    {
      canalCodigo: 'MOSTRADOR',
      canalNombre: 'Mostrador Directo',
      cantidadSolicitudes: 15,
      totalVentas: 800000,
    },
    {
      canalCodigo: 'WHATSAPP',
      canalNombre: 'WhatsApp Comercial',
      cantidadSolicitudes: 8,
      totalVentas: 400000,
    },
  ],
  ultimasSolicitudes: [
    {
      uuid: 'sol-1',
      numeroDocumento: 'SOL-001',
      clienteNombre: 'Restaurante Central',
      fechaEmision: '2026-09-20T11:00:00Z',
      estado: 'ASENTADO',
      total: 120000,
      canalNombre: 'Mostrador Directo',
    },
  ],
  itemsEnTaller: [
    {
      itemUuid: 'itm-1',
      otNumero: 'OT-001',
      itemDescripcion: 'Afilado Disco Sierra',
      etapaActualCodigo: 'EN_PROCESO',
      etapaActualNombre: 'En Proceso Técnico',
      franjaCompromiso: '2026-09-21 16:00',
    },
  ],
};

describe('DashboardOperativo Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders operational KPIs and metrics', async () => {
    vi.mocked(dashboardApi.getMetricas).mockResolvedValue(mockMetricas);

    render(<DashboardOperativo />);

    expect(await screen.findByText(/Tablero de Control Operativo en Tiempo Real/i)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument(); // Solicitudes activas
    expect(screen.getByText('12')).toBeInTheDocument(); // Items en taller
    expect(screen.getByText('4')).toBeInTheDocument(); // Listos entrega
    expect(screen.getByText(/\$450.000/i)).toBeInTheDocument(); // Recaudos hoy
    expect(screen.getByText(/Turno Activo \(CAJA-01\)/i)).toBeInTheDocument();
  });

  it('allows toggling configurable widget checkboxes (RF-9.2)', async () => {
    vi.mocked(dashboardApi.getMetricas).mockResolvedValue(mockMetricas);

    render(<DashboardOperativo />);

    expect(await screen.findByText(/Distribución por Canal de Origen/i)).toBeInTheDocument();

    // Desmarcar checkbox de Canales
    const checkboxCanales = screen.getByLabelText(/Canales/i);
    fireEvent.click(checkboxCanales);

    // Debe ocultarse el widget de Canales
    expect(screen.queryByText(/Distribución por Canal de Origen/i)).not.toBeInTheDocument();
  });

  it('navigates to relevant tab when clicking shortcut links', async () => {
    vi.mocked(dashboardApi.getMetricas).mockResolvedValue(mockMetricas);
    const mockNavigate = vi.fn();

    render(<DashboardOperativo onNavigateTab={mockNavigate} />);

    const linkTaller = await screen.findByRole('button', { name: /Ir a cola de taller →/i });
    fireEvent.click(linkTaller);

    expect(mockNavigate).toHaveBeenCalledWith('taller');
  });
});
