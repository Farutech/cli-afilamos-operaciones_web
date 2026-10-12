import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AdminCashRegisters from '@/components/admin/AdminCashRegisters';
import { catalogosApi } from '@/services/catalogosApi';

vi.mock('@/services/catalogosApi', () => ({
  catalogosApi: {
    getCajas: vi.fn(),
    crearCaja: vi.fn(),
    actualizarCaja: vi.fn(),
    setCajaActiva: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCajas = [
  {
    uuid: 'caja-1',
    codigoCaja: 'CAJA1',
    nombre: 'Caja Mostrador Principal',
    ubicacion: 'Mostrador Entrada',
    activa: true,
  },
  {
    uuid: 'caja-2',
    codigoCaja: 'CAJA2',
    nombre: 'Caja Taller Recepción',
    ubicacion: 'Taller Planta Baja',
    activa: true,
  },
  {
    uuid: 'caja-3',
    codigoCaja: 'CAJA3',
    nombre: 'Caja Entregas y Despacho',
    ubicacion: 'Muelle de Despacho',
    activa: false,
  },
];

describe('AdminCashRegisters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (catalogosApi.getCajas as any).mockResolvedValue({ cajas: mockCajas });
  });

  it('renderiza el título, métricas KPI y la lista de cajas configuradas', async () => {
    render(<AdminCashRegisters token="test-token" />);

    expect(screen.getByText(/Cajas y Terminales POS/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
      expect(screen.getByText('CAJA2')).toBeInTheDocument();
      expect(screen.getByText('CAJA3')).toBeInTheDocument();
    });

    expect(screen.getByText('Caja Mostrador Principal')).toBeInTheDocument();
    expect(screen.getByText('Caja Taller Recepción')).toBeInTheDocument();
  });

  it('permite buscar y filtrar cajas por código o nombre', async () => {
    render(<AdminCashRegisters token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por código/i);
    fireEvent.change(searchInput, { target: { value: 'Taller' } });

    expect(screen.queryByText('Caja Mostrador Principal')).not.toBeInTheDocument();
    expect(screen.getByText('Caja Taller Recepción')).toBeInTheDocument();
  });

  it('abre el modal de creación y registra una nueva caja exitosamente', async () => {
    (catalogosApi.crearCaja as any).mockResolvedValue({
      uuid: 'caja-4',
      codigoCaja: 'CAJA4',
      nombre: 'Caja Auxiliar Nueva',
      ubicacion: 'Segundo Piso',
      activa: true,
    });

    render(<AdminCashRegisters token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
    });

    const btnNuevo = screen.getByRole('button', { name: /Nueva Caja de Mostrador/i });
    fireEvent.click(btnNuevo);

    expect(screen.getByText(/Registrar Nueva Caja de Mostrador/i)).toBeInTheDocument();

    const inputCodigo = screen.getByPlaceholderText(/Ej: CAJA2, CAJA-02/i);
    const inputNombre = screen.getByPlaceholderText(/Ej: Caja Principal Mostrador/i);

    fireEvent.change(inputCodigo, { target: { value: 'CAJA4' } });
    fireEvent.change(inputNombre, { target: { value: 'Caja Auxiliar Nueva' } });

    const btnSubmit = screen.getByRole('button', { name: /Guardar y Habilitar Caja/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(catalogosApi.crearCaja).toHaveBeenCalledWith(
        expect.objectContaining({
          codigoCaja: 'CAJA4',
          nombre: 'Caja Auxiliar Nueva',
        }),
        'test-token'
      );
      expect(screen.getByText('CAJA4')).toBeInTheDocument();
    });
  });

  it('permite abrir el modal de confirmación para cambiar el estado de activación de una caja', async () => {
    (catalogosApi.setCajaActiva as any).mockResolvedValue(undefined);

    render(<AdminCashRegisters token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
    });

    const btnDesactivar = screen.getAllByRole('button', { name: /Desactivar/i })[0];
    fireEvent.click(btnDesactivar);

    expect(screen.getByText(/¿Está seguro de desactivar la caja/i)).toBeInTheDocument();

    const btnConfirmar = screen.getByRole('button', { name: /Sí, Desactivar Caja/i });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(catalogosApi.setCajaActiva).toHaveBeenCalledWith('caja-1', false, 'test-token');
    });
  });

  it('muestra mensaje elegante de no se encontraron registros cuando no hay coincidencias', async () => {
    render(<AdminCashRegisters token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por código/i);
    fireEvent.change(searchInput, { target: { value: 'INEXISTENTE_XYZ' } });

    expect(screen.getByText(/No se encontraron cajas registradas/i)).toBeInTheDocument();
    expect(screen.getByText(/Limpiar filtros/i)).toBeInTheDocument();

    // Al hacer clic en limpiar filtros, se restablece la lista
    fireEvent.click(screen.getByText(/Limpiar filtros/i));
    expect(screen.getByText('CAJA1')).toBeInTheDocument();
  });

  it('muestra la barra de paginación con selector de filas y total de registros', async () => {
    render(<AdminCashRegisters token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('CAJA1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
    expect(screen.getByText(/Filas:/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Página siguiente/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Página anterior/i)).toBeInTheDocument();
  });
});


