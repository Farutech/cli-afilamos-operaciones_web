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

  it('permite hacer clic en "Editar" cuando la solicitud está en BORRADOR', async () => {
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

    const editButtons = screen.getAllByText(/Editar/i);
    expect(editButtons.length).toBeGreaterThan(0);

    fireEvent.click(editButtons[0]);
    expect(handleEditar).toHaveBeenCalledTimes(1);
    expect(handleEditar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'req-borrador-123',
      numeroSolicitud: 'SOL-5555',
      estado: 'BORRADOR',
    }));
  });

  it('abre el modal de impresión al hacer clic en Imprimir y dispara window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <HistorialSolicitudesView
        onNuevaSolicitud={vi.fn()}
        solicitudesExtra={[dummyAsentada]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SOL-1111')).toBeDefined();
    });

    const printBtn = screen.getByText(/Imprimir/i);
    fireEvent.click(printBtn);

    // Modal de comprobante debe estar abierto
    expect(screen.getByText(/Comprobante de Solicitud: SOL-1111/i)).toBeDefined();

    // Clic en Imprimir Comprobante
    const printActionBtn = screen.getByText(/Imprimir Comprobante/i);
    fireEvent.click(printActionBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('preserva las líneas con itemCatalogoId y lineaId de inventario al editar desde el API', async () => {
    vi.mocked(solicitudesApi.getSolicitudes).mockResolvedValue({
      items: [
        {
          publicId: 'req-inv-draft',
          codigo: 'SOL-9999',
          numeroDocumentoVisible: 'SOL-9999',
          subtipoCodigo: 'SOL',
          subtipoNombre: 'Solicitud Estándar',
          clientePublicId: 'cli-99',
          clienteNombre: 'Cliente Con Inventario',
          clienteNumeroDocumento: '12345678',
          canalPublicId: 'can-1',
          canalNombre: 'Mostrador',
          totalNeto: 120000,
          totalInventario: 80000,
          totalServicios: 40000,
          totalAnticiposImputados: 0,
          totalPagadoInventario: 0,
          saldoPendiente: 120000,
          estado: 'BORRADOR',
          fechaEmision: '2026-10-13T10:00:00Z',
          notas: 'Borrador mixto con inventario',
          exigeAnticipoPendienteVoBo: false,
          inventarioPendientePago100: true,
          items: [
            {
              publicId: 'doc-item-01',
              lineaId: 'doc-item-01',
              itemCatalogoId: 'cat-disco-10',
              codigo: 'DISCO-10',
              naturaleza: 'INVENTARIO',
              descripcion: 'Disco Sierra Widia 10 pulg',
              cantidad: 1,
              precioUnitario: 80000,
              subtotal: 80000,
              exigeAnticipoObligatorio: false,
              porcentajeAnticipoMinimo: 0,
              anticipoMinimoRequerido: 0,
              anticipoDirectoImputado: 0,
              saldoPendienteItem: 80000,
              franjaCompromiso: 'Inmediata',
              permiteCancelacion: true,
              stockReferencialDisponible: 15,
              advertenciaStockInsuficiente: false,
            },
          ],
          recaudos: [],
        },
      ],
      total: 1,
    });

    const handleEditar = vi.fn();
    render(
      <HistorialSolicitudesView
        onNuevaSolicitud={vi.fn()}
        onEditarSolicitud={handleEditar}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SOL-9999')).toBeDefined();
    });

    const editButtons = screen.getAllByText(/Editar/i);
    fireEvent.click(editButtons[0]);

    expect(handleEditar).toHaveBeenCalledTimes(1);
    const passedSol = handleEditar.mock.calls[0][0];
    expect(passedSol.lineas).toBeDefined();
    expect(passedSol.lineas?.length).toBe(1);
    expect(passedSol.lineas?.[0].itemCatalogoId).toBe('cat-disco-10');
    expect(passedSol.lineas?.[0].lineaId).toBe('doc-item-01');
    expect(passedSol.lineas?.[0].naturaleza).toBe('INVENTARIO');
  });
});
