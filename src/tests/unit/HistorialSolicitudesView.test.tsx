import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HistorialSolicitudesView, type SolicitudHistorialItem } from '@/features/solicitudes/HistorialSolicitudesView';
import { solicitudesApi } from '@/services/solicitudesApi';

vi.mock('@/services/solicitudesApi', () => ({
  solicitudesApi: {
    getSolicitudes: vi.fn(),
  },
}));

describe('HistorialSolicitudesView Component', () => {
  const dummyBorrador: SolicitudHistorialItem = {
    id: 'req-borrador-123',
    numeroSolicitud: 'SOL-5555',
    subtipo: 'SOL-GEN',
    fecha: '2026-10-07',
    clienteNombre: 'Ferretería El Triunfo',
    clienteDocumento: '900123456-1',
    clienteUuid: 'cli-001',
    canalUuid: 'can-001',
    observaciones: 'Borrador para confirmar más tarde',
    totalItems: 2,
    totalNetoCop: 45000,
    anticipoCop: 15000,
    saldoCop: 30000,
    estado: 'BORRADOR',
  };

  const dummyAsentada: SolicitudHistorialItem = {
    id: 'req-asentada-456',
    numeroSolicitud: 'SOL-1111',
    subtipo: 'SOL-GEN',
    fecha: '2026-10-06',
    clienteNombre: 'Taller San Juan',
    clienteDocumento: '800654321-2',
    totalItems: 1,
    totalNetoCop: 20000,
    anticipoCop: 20000,
    saldoCop: 0,
    estado: 'ASENTADA',
  };

  beforeEach(() => {
    vi.mocked(solicitudesApi.getSolicitudes).mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it('renderiza la lista de solicitudes y muestra el badge de BORRADOR', async () => {
    render(
      <HistorialSolicitudesView
        onNuevaSolicitud={vi.fn()}
        solicitudesExtra={[dummyBorrador, dummyAsentada]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SOL-5555')).toBeDefined();
    });

    expect(screen.getByText('Ferretería El Triunfo')).toBeDefined();
    expect(screen.getByText('BORRADOR')).toBeDefined();
  });

  it('permite hacer clic en "Continuar / Editar" cuando la solicitud está en BORRADOR', async () => {
    const handleEditar = vi.fn();
    render(
      <HistorialSolicitudesView
        onNuevaSolicitud={vi.fn()}
        onEditarSolicitud={handleEditar}
        solicitudesExtra={[dummyBorrador]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SOL-5555')).toBeDefined();
    });

    const editButtons = screen.getAllByText(/Continuar \/ Editar/i);
    expect(editButtons.length).toBeGreaterThan(0);

    fireEvent.click(editButtons[0]);
    expect(handleEditar).toHaveBeenCalledTimes(1);
    expect(handleEditar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'req-borrador-123',
      numeroSolicitud: 'SOL-5555',
      estado: 'BORRADOR',
    }));
  });
});
