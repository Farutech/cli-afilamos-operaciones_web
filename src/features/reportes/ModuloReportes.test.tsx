import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ModuloReportes } from './ModuloReportes';
import { reportesApi } from '../../services/reportesApi';
import type { ReporteConsolidadoDto, ReporteCierreZDto } from '../../types/reportes';

vi.mock('../../services/reportesApi', () => ({
  reportesApi: {
    getConsolidado: vi.fn(),
    getCierreZ: vi.fn(),
  },
}));

const mockConsolidado: ReporteConsolidadoDto = {
  generadoEnUtc: '2026-09-20T18:00:00Z',
  totalVentas: 1500000,
  totalVentasInventario: 500000,
  totalVentasServicios: 1000000,
  cantidadSolicitudes: 12,
  cantidadRemisiones: 8,
  totalRecaudos: 1400000,
  recaudosPorMedio: [
    {
      medioPagoCodigo: 'EFECTIVO',
      medioPagoNombre: 'Efectivo',
      totalMonto: 900000,
      cantidadTransacciones: 10,
    },
    {
      medioPagoCodigo: 'TARJETA',
      medioPagoNombre: 'Tarjeta',
      totalMonto: 500000,
      cantidadTransacciones: 4,
    },
  ],
  totalEgresos: 80000,
  cantidadEgresos: 2,
  balanceNetoCaja: 1320000,
};

const mockReporteZ: ReporteCierreZDto = {
  turnoId: 1,
  turnoCodigo: 'TRN-0001',
  cajaCodigo: 'CAJA-01',
  cajaNombre: 'Caja Principal',
  cajeroApertura: 'Carlos Cajero',
  supervisorVoBo: 'Ana Supervisora',
  fechaAperturaUtc: '2026-09-20T08:00:00Z',
  fechaCierreUtc: '2026-09-20T17:00:00Z',
  baseInicial: 100000,
  totalRecaudosEfectivo: 900000,
  totalRecaudosTarjeta: 500000,
  totalRecaudosTransferencia: 0,
  totalRecaudosGeneral: 1400000,
  totalEgresos: 80000,
  saldoTeoricoEfectivo: 920000,
  declaradoEfectivo: 920000,
  diferenciaEfectivo: 0,
  saldoTeoricoTarjeta: 500000,
  declaradoTarjeta: 500000,
  diferenciaTarjeta: 0,
  saldoTeoricoTransferencia: 0,
  declaradoTransferencia: 0,
  diferenciaTransferencia: 0,
  diferenciaTotal: 0,
  estadoTurno: 'CERRADO',
  aprobadoVoBo: true,
  observacionesVoBo: 'Conforme',
  movimientos: [
    {
      fechaUtc: '2026-09-20T08:00:00Z',
      codigo: 'MOV-01',
      tipoMovimiento: 'BASE_INICIAL',
      concepto: 'Apertura',
      monto: 100000,
      medioPago: 'Efectivo',
    },
  ],
};

describe('ModuloReportes Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consolidated sales and payments report', async () => {
    vi.mocked(reportesApi.getConsolidado).mockResolvedValue(mockConsolidado);

    render(<ModuloReportes />);

    expect(await screen.findByText(/Reportes Operativos & Fiscales/i)).toBeInTheDocument();
    expect(await screen.findByText(/\$1.500.000/i)).toBeInTheDocument(); // Total Ventas
    expect(screen.getByText(/\$1.400.000/i)).toBeInTheDocument(); // Total Recaudado
    expect(screen.getByText(/\$80.000/i)).toBeInTheDocument(); // Total Egresos
    expect(screen.getByText(/Recaudos por Medio de Pago/i)).toBeInTheDocument();
  });

  it('switches to Reporte Z tab and displays thermal ticket format', async () => {
    vi.mocked(reportesApi.getConsolidado).mockResolvedValue(mockConsolidado);
    vi.mocked(reportesApi.getCierreZ).mockResolvedValue(mockReporteZ);

    render(<ModuloReportes />);

    const btnTabZ = await screen.findByRole('button', { name: /Reporte Z de Cierre/i });
    fireEvent.click(btnTabZ);

    expect(await screen.findByText(/\*\*\* REPORTE Z DE CIERRE DE CAJA \*\*\*/i)).toBeInTheDocument();
    expect(screen.getByText(/TRN-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Supervisora/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ Cierre Aprobado por Supervisor/i)).toBeInTheDocument();
  });

  it('triggers window.print when clicking print button', async () => {
    vi.mocked(reportesApi.getConsolidado).mockResolvedValue(mockConsolidado);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<ModuloReportes />);

    const btnImprimir = await screen.findByRole('button', { name: /Imprimir \/ Exportar/i });
    fireEvent.click(btnImprimir);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
