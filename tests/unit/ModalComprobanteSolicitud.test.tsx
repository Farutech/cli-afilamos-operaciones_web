import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ModalComprobanteSolicitud,
  type ComprobanteSolicitudData,
} from '@/features/solicitudes/ModalComprobanteSolicitud';

describe('ModalComprobanteSolicitud Component', () => {
  const dummySolicitud: ComprobanteSolicitudData = {
    numeroSolicitud: 'SOL-0001-A',
    subtipo: 'SOL-GEN',
    fecha: '2026-10-12',
    clienteNombre: 'Construcciones El Roble S.A.S.',
    clienteDocumento: '901234567-8',
    canalNombre: 'Mostrador Central',
    observaciones: 'Afilado urgente para obra',
    lineas: [
      {
        descripcion: 'Afilado Disco Sierra 12"',
        naturaleza: 'SERVICIO',
        cantidad: 2,
        precioUnitario: 35000,
        subtotal: 70000,
        fechaEntregaCompromiso: '2026-10-13',
        franjaCompromiso: 'MAÑANA',
      },
    ],
    pagosAbono: [
      {
        instrumentoNombre: 'Transferencia Bancolombia',
        monto: 30000,
        referencia: 'TRX-987654',
      },
    ],
    totalNetoCop: 70000,
    anticipoCop: 30000,
    saldoCop: 40000,
    estado: 'ASENTADA',
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ModalComprobanteSolicitud
        isOpen={false}
        onClose={vi.fn()}
        solicitud={dummySolicitud}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la vista previa del comprobante con consecutivo, datos de cliente y líneas', () => {
    render(
      <ModalComprobanteSolicitud
        isOpen={true}
        onClose={vi.fn()}
        solicitud={dummySolicitud}
      />
    );

    // Consecutivo con prefijo y sufijo
    expect(screen.getByText('SOL-0001-A')).toBeDefined();
    expect(screen.getByText('Construcciones El Roble S.A.S.')).toBeDefined();
    expect(screen.getByText('Afilado Disco Sierra 12"')).toBeDefined();
    expect(screen.getAllByText('$ 70.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$ 30.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$ 40.000').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el banner de notificación y pregunta de impresión cuando esConfirmacionAsentada es true', () => {
    render(
      <ModalComprobanteSolicitud
        isOpen={true}
        onClose={vi.fn()}
        solicitud={dummySolicitud}
        esConfirmacionAsentada={true}
      />
    );

    expect(screen.getByText(/¡La solicitud SOL-0001-A fue asentada con éxito!/i)).toBeDefined();
    expect(
      screen.getByText(/¿Desea imprimir el documento o comprobante para el cliente y taller\?/i)
    ).toBeDefined();
  });

  it('dispara window.print al hacer clic en Imprimir Comprobante', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <ModalComprobanteSolicitud
        isOpen={true}
        onClose={vi.fn()}
        solicitud={dummySolicitud}
      />
    );

    const printBtn = screen.getByText(/🖨️ Imprimir Comprobante/i);
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
