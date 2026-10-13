import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ListPageLayout,
  StandardDataTable,
  PanelFormaPago,
  DocumentPrintPreviewModal,
} from '@/components/ui';

describe('Standard UI Components Suite', () => {
  describe('ListPageLayout', () => {
    it('renderiza título, eyebrow, buscador y acciones en fila única', () => {
      const handleSearch = vi.fn();
      render(
        <ListPageLayout
          eyebrow="Operaciones / Admin"
          title="Gestión de Clientes"
          description="Directorio de clientes y cupos de crédito"
          search={{
            value: '',
            onChange: handleSearch,
            placeholder: 'Buscar cliente...',
          }}
          actions={<button type="button">Nuevo Cliente</button>}
        >
          <div>Contenido de prueba</div>
        </ListPageLayout>
      );

      expect(screen.getByText('Operaciones / Admin')).toBeDefined();
      expect(screen.getByText('Gestión de Clientes')).toBeDefined();
      expect(screen.getByText('Directorio de clientes y cupos de crédito')).toBeDefined();
      expect(screen.getByPlaceholderText('Buscar cliente...')).toBeDefined();
      expect(screen.getByText('Nuevo Cliente')).toBeDefined();
      expect(screen.getByText('Contenido de prueba')).toBeDefined();
    });

    it('permite cambiar la densidad de tabla', () => {
      const handleDensity = vi.fn();
      render(
        <ListPageLayout
          title="Prueba Densidad"
          density={{
            value: 'standard',
            onChange: handleDensity,
          }}
        >
          <div />
        </ListPageLayout>
      );

      const compactBtn = screen.getByText('Compacta');
      fireEvent.click(compactBtn);
      expect(handleDensity).toHaveBeenCalledWith('compact');
    });
  });

  describe('StandardDataTable', () => {
    interface TestRow {
      id: string;
      codigo: string;
      nombre: string;
      total: number;
    }

    const testData: TestRow[] = [
      { id: '1', codigo: 'ORD-01', nombre: 'Afilado Disco', total: 45000 },
      { id: '2', codigo: 'ORD-02', nombre: 'Cuchilla Cepillo', total: 60000 },
    ];

    const testColumns = [
      { key: 'codigo', header: 'Código', sortable: true },
      { key: 'nombre', header: 'Descripción' },
      {
        key: 'total',
        header: 'Total',
        align: 'right' as const,
        render: (row: TestRow) => `$ ${row.total.toLocaleString()}`,
      },
    ];

    it('renderiza cabeceras, filas de datos y formatos correctamente', () => {
      render(
        <StandardDataTable
          columns={testColumns}
          data={testData}
          keyExtractor={(r) => r.id}
          density="standard"
        />
      );

      expect(screen.getByText('Código')).toBeDefined();
      expect(screen.getByText('Descripción')).toBeDefined();
      expect(screen.getByText('Total')).toBeDefined();
      expect(screen.getByText('ORD-01')).toBeDefined();
      expect(screen.getByText('Afilado Disco')).toBeDefined();
      expect(screen.getByText('$ 45.000')).toBeDefined();
    });

    it('muestra estado vacío cuando no hay registros', () => {
      render(
        <StandardDataTable
          columns={testColumns}
          data={[]}
          keyExtractor={(r) => r.id}
          emptyTitle="Sin pedidos"
          emptyDescription="No hay órdenes registradas"
        />
      );

      expect(screen.getByText('Sin pedidos')).toBeDefined();
      expect(screen.getByText('No hay órdenes registradas')).toBeDefined();
    });

    it('permite seleccionar filas y muestra la barra de acciones masivas', () => {
      const handleSelect = vi.fn();
      const handleBulkAction = vi.fn();

      render(
        <StandardDataTable
          columns={testColumns}
          data={testData}
          keyExtractor={(r) => r.id}
          selectable
          selectedKeys={new Set(['1'])}
          onSelectionChange={handleSelect}
          bulkActions={[
            { label: 'Exportar Seleccionados', onClick: handleBulkAction },
          ]}
        />
      );

      expect(screen.getByText('1 registro seleccionado')).toBeDefined();
      const bulkBtn = screen.getByText('Exportar Seleccionados');
      fireEvent.click(bulkBtn);
      expect(handleBulkAction).toHaveBeenCalledWith(['1']);
    });
  });

  describe('PanelFormaPago', () => {
    it('permite agregar un nuevo pago y calcula el total abonado y saldo', () => {
      const handleChange = vi.fn();
      render(
        <PanelFormaPago
          totalDocumento={100000}
          abonosPrevios={20000}
          pagos={[]}
          onChangePagos={handleChange}
        />
      );

      expect(screen.getByText('$ 100.000')).toBeDefined();
      expect(screen.getByText('$ 20.000')).toBeDefined();
      expect(screen.getByText('$ 80.000')).toBeDefined();

      const inputMonto = screen.getByPlaceholderText('Monto a abonar...');
      fireEvent.change(inputMonto, { target: { value: '50000' } });

      const addBtn = screen.getByText('Agregar Pago');
      fireEvent.click(addBtn);

      expect(handleChange).toHaveBeenCalledTimes(1);
      const nuevoPago = handleChange.mock.calls[0][0][0];
      expect(nuevoPago.monto).toBe(50000);
      expect(nuevoPago.instrumentoNombre).toBe('Efectivo');
    });

    it('muestra el banner de prelación de inventario si hay desglose mixto', () => {
      render(
        <PanelFormaPago
          totalDocumento={150000}
          pagos={[]}
          onChangePagos={vi.fn()}
          resumenPrelacion={{
            subtotalInventario: 50000,
            subtotalServicios: 100000,
          }}
        />
      );

      expect(screen.getByText(/Regla de Prelación Financiera: 100% Inventario Primero/i)).toBeDefined();
    });
  });

  describe('DocumentPrintPreviewModal', () => {
    const dummyDoc = {
      tipoDocumento: 'SOLICITUD DE SERVICIO',
      numeroDocumento: 'SOL-8888',
      fechaEmision: '2026-10-13',
      cliente: {
        nombre: 'Industrias Metálicas',
        documento: '900888777-1',
      },
      items: [
        {
          descripcion: 'Disco Sierra Widia',
          cantidad: 1,
          precioUnitario: 50000,
          subtotal: 50000,
        },
      ],
      totales: {
        subtotalNeto: 50000,
        totalDocumento: 50000,
        totalAbonado: 50000,
        saldoPendiente: 0,
      },
    };

    it('cambia entre formatos Tirilla 80mm y Media Carta y dispara impresión', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <DocumentPrintPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          documentData={dummyDoc}
        />
      );

      expect(screen.getByText(/SOLICITUD DE SERVICIO: SOL-8888/i)).toBeDefined();
      expect(screen.getByText('Industrias Metálicas')).toBeDefined();

      // Cambiar a Media Carta
      const mediaCartaBtn = screen.getByText('Media Carta');
      fireEvent.click(mediaCartaBtn);
      expect(screen.getByText('ENTREGADO POR')).toBeDefined();

      // Disparar Imprimir
      const imprimirBtn = screen.getByText('Imprimir');
      fireEvent.click(imprimirBtn);
      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });
  });
});
