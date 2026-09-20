import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ModuloCaja } from '../../features/caja/ModuloCaja';
import * as cajaApi from '../../services/cajaApi';
import type { TurnoDto, DetalleSupervisorCierreDto } from '../../types/caja';

vi.mock('../../services/cajaApi', () => ({
  abrirTurno: vi.fn(),
  obtenerTurnoActivo: vi.fn(),
  registrarEgreso: vi.fn(),
  declararArqueoCiego: vi.fn(),
  obtenerDetalleSupervisor: vi.fn(),
  procesarVoBo: vi.fn(),
}));

const mockTurnoActivo: TurnoDto = {
  id: 1,
  publicId: 'turno-uuid-1',
  codigo: 'TUR-0001',
  codigoCaja: 'CAJA-01',
  nombreCaja: 'Caja Principal',
  idUsuarioApertura: 10,
  nombreCajero: 'Carlos Cajero',
  fechaAperturaUtc: '2026-09-20T08:00:00Z',
  baseInicial: 100000,
  estado: 'ABIERTO',
  movimientos: [
    {
      id: 101,
      publicId: 'mov-1',
      codigo: 'MOV-001',
      tipoMovimiento: 'BASE_INICIAL',
      monto: 100000,
      concepto: 'Apertura de turno',
      fechaUtc: '2026-09-20T08:00:00Z',
    },
    {
      id: 102,
      publicId: 'mov-2',
      codigo: 'MOV-002',
      tipoMovimiento: 'RECAUDO_VENTA',
      monto: 50000,
      concepto: 'Recaudo por Solicitud SOL-001',
      fechaUtc: '2026-09-20T09:30:00Z',
    },
  ],
};

const mockTurnoPendienteVoBo: TurnoDto = {
  ...mockTurnoActivo,
  estado: 'PENDIENTE_VOBO',
  fechaCierreUtc: '2026-09-20T17:00:00Z',
  declaradoTotal: 165000,
};

const mockDetalleSupervisor: DetalleSupervisorCierreDto = {
  idTurno: 1,
  codigoTurno: 'TUR-0001',
  cajero: 'Carlos Cajero',
  declarado: {
    efectivo: 135000,
    tarjeta: 30000,
    transferencia: 0,
    total: 165000,
  },
  teorico: {
    efectivo: 135000,
    tarjeta: 30000,
    transferencia: 0,
    total: 165000,
  },
  diferencia: 0,
  estado: 'PENDIENTE_VOBO',
};

describe('ModuloCaja Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shift opening form when no active shift exists', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(null);

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Cajero" />);

    expect(await screen.findByText(/Apertura de Turno de Caja/i)).toBeInTheDocument();
    expect(screen.getByText(/Base Inicial en Efectivo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir Turno de Caja/i })).toBeInTheDocument();
  });

  it('calls abrirTurno with base inicial when submitted', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(null);
    vi.mocked(cajaApi.abrirTurno).mockResolvedValue(mockTurnoActivo);

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Cajero" />);

    const inputBase = await screen.findByRole('spinbutton');
    fireEvent.change(inputBase, { target: { value: '150000' } });

    const btnAbrir = screen.getByRole('button', { name: /Abrir Turno de Caja/i });
    fireEvent.click(btnAbrir);

    await waitFor(() => {
      expect(cajaApi.abrirTurno).toHaveBeenCalledWith(
        {
          codigoCaja: 'CAJA-01',
          baseInicial: 150000,
        },
        undefined
      );
    });
  });

  it('displays active shift data and movements table', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(mockTurnoActivo);

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Cajero" />);

    expect(await screen.findByText(/Carlos Cajero/i)).toBeInTheDocument();
    expect(screen.getByText(/TUR-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/Recaudo por Solicitud SOL-001/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar Egreso Menor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cerrar Turno \(Arqueo Ciego\)/i })).toBeInTheDocument();
  });

  it('opens egreso modal and submits minor expense', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(mockTurnoActivo);
    vi.mocked(cajaApi.registrarEgreso).mockResolvedValue({
      idDocumento: 201,
      consecutivo: 'EGR-GEN-0001',
      monto: 12000,
      motivo: 'Compra de papel de lija',
      fechaUtc: '2026-09-20T10:00:00Z',
    });

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Cajero" />);

    const btnEgreso = await screen.findByRole('button', { name: /Registrar Egreso Menor/i });
    fireEvent.click(btnEgreso);

    expect(screen.getByText(/Comprobante de Egreso \(Caja Menor\)/i)).toBeInTheDocument();

    const montoInput = screen.getByPlaceholderText(/15000/i);
    const motivoInput = screen.getByPlaceholderText(/Ej: Compra de insumos de limpieza para mostrador/i);

    fireEvent.change(montoInput, { target: { value: '12000' } });
    fireEvent.change(motivoInput, { target: { value: 'Compra de papel de lija' } });

    const btnConfirmar = screen.getByRole('button', { name: /Emitir Comprobante/i });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(cajaApi.registrarEgreso).toHaveBeenCalledWith(
        1,
        {
          monto: 12000,
          motivo: 'Compra de papel de lija',
        },
        undefined
      );
    });
  });

  it('opens blind count modal and enforces Invariant #4 (no theoretical balances shown to cashier)', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(mockTurnoActivo);
    vi.mocked(cajaApi.declararArqueoCiego).mockResolvedValue({
      estado: 'PENDIENTE_VOBO',
      idCierre: 1,
      codigoTurno: 'TUR-0001',
    });

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Cajero" />);

    const btnCierre = await screen.findByRole('button', { name: /Cerrar Turno \(Arqueo Ciego\)/i });
    fireEvent.click(btnCierre);

    // Modal title & blind count warning
    expect(screen.getByText(/Cierre de Turno: Arqueo Ciego/i)).toBeInTheDocument();
    expect(screen.getByText(/Los saldos teóricos del sistema están ocultos/i)).toBeInTheDocument();

    const efectivoInput = screen.getByLabelText(/Efectivo Contado Físicamente/i);
    fireEvent.change(efectivoInput, { target: { value: '135000' } });

    const btnDeclarar = screen.getByRole('button', { name: /Declarar y Enviar a VoBo/i });
    fireEvent.click(btnDeclarar);

    await waitFor(() => {
      expect(cajaApi.declararArqueoCiego).toHaveBeenCalledWith(1, {
        declaradoEfectivo: 135000,
        declaradoTarjeta: 0,
        declaradoTransferencia: 0,
      });
    });
  });

  it('allows supervisor to inspect discrepancy and approve closing with PIN', async () => {
    vi.mocked(cajaApi.obtenerTurnoActivo).mockResolvedValue(mockTurnoPendienteVoBo);
    vi.mocked(cajaApi.obtenerDetalleSupervisor).mockResolvedValue(mockDetalleSupervisor);
    vi.mocked(cajaApi.procesarVoBo).mockResolvedValue({
      id: 1,
      publicId: 'turno-uuid-1',
      codigo: 'TUR-0001',
      estado: 'CERRADO',
      mensaje: 'Turno cerrado con éxito',
    });

    render(<ModuloCaja codigoCajaDefault="CAJA-01" userRole="Supervisor" />);

    // In PENDIENTE_VOBO, supervisor sees the prompt to inspect and the auto-loaded audit table
    expect(await screen.findByText(/en espera de VoBo de Supervisor/i)).toBeInTheDocument();
    expect(await screen.findByText(/Total General/i)).toBeInTheDocument();

    // Enter PIN and approve
    const pinInput = screen.getByPlaceholderText(/••••/i);
    fireEvent.change(pinInput, { target: { value: '9999' } });

    const btnAprobar = screen.getByRole('button', { name: /✓ Aprobar Cierre/i });
    fireEvent.click(btnAprobar);

    await waitFor(() => {
      expect(cajaApi.procesarVoBo).toHaveBeenCalledWith(
        1,
        {
          pin: '9999',
          decision: 'APROBADO',
          observacion: '',
        },
        undefined
      );
    });
  });
});
