import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListadoCrud, type ListadoCrudColumn } from '../../src/components/ui/ListadoCrud';

interface MockItem {
  id: string;
  ot: string;
  cliente: string;
  equipo: string;
  estado: string;
}

const mockColumns: ListadoCrudColumn<MockItem>[] = [
  { key: 'ot', header: 'OT / Solicitud', sortable: true },
  { key: 'cliente', header: 'Cliente', sortable: true },
  { key: 'equipo', header: 'Equipo / Artículo' },
  { key: 'estado', header: 'Estado', render: (item) => <span>{item.estado}</span> },
];

const mockData: MockItem[] = [
  { id: '1', ot: 'OT-001', cliente: 'Carpintería El Roble', equipo: 'Sierra Circular', estado: 'En proceso' },
  { id: '2', ot: 'OT-002', cliente: 'Maderas del Norte', equipo: 'Taladro Industrial', estado: 'Pendiente' },
  { id: '3', ot: 'OT-003', cliente: 'Ferretería Central', equipo: 'Afiladora', estado: 'Listo' },
];

describe('ListadoCrud Component (Canonical Estándar)', () => {
  it('renders header, title, description, and headerChild between them', () => {
    render(
      <ListadoCrud
        eyebrow="Operación > Taller"
        title="Cola de Trabajo de Taller"
        description="Consulta y administra los trabajos del taller en tiempo real."
        headerChild={<div data-testid="kpi-banner">Banner de Métricas Generales</div>}
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Operación > Taller')).toBeInTheDocument();
    expect(screen.getByText('Cola de Trabajo de Taller')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-banner')).toBeInTheDocument();
    expect(screen.getByText('Consulta y administra los trabajos del taller en tiempo real.')).toBeInTheDocument();
  });

  it('renders + Nuevo action and global actions dropdown', () => {
    const handleCreate = vi.fn();
    const handleExport = vi.fn();

    render(
      <ListadoCrud
        title="Cola de Trabajo"
        onCreate={handleCreate}
        createLabel="+ Nuevo Trabajo"
        globalActions={[
          { label: 'Exportar a Excel', onClick: handleExport },
        ]}
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    const btnCreate = screen.getByRole('button', { name: /\+ Nuevo Trabajo/i });
    expect(btnCreate).toBeInTheDocument();
    fireEvent.click(btnCreate);
    expect(handleCreate).toHaveBeenCalledTimes(1);

    const btnGlobal = screen.getByLabelText(/Más acciones globales/i);
    expect(btnGlobal).toBeInTheDocument();
    fireEvent.click(btnGlobal);

    const btnExport = screen.getByText('Exportar a Excel');
    expect(btnExport).toBeInTheDocument();
    fireEvent.click(btnExport);
    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  it('switches between Table and Cards view mode', () => {
    render(
      <ListadoCrud
        title="Cola de Trabajo"
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    // Default is table mode
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Toggle to cards
    const btnCards = screen.getByLabelText('Vista en tarjetas');
    fireEvent.click(btnCards);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Sierra Circular')).toBeInTheDocument();

    // Toggle back to table
    const btnTable = screen.getByLabelText('Vista en tabla');
    fireEvent.click(btnTable);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('handles row selection and displays contextual Bulk Actions bar', () => {
    const handleBulkDelete = vi.fn();

    render(
      <ListadoCrud
        title="Cola de Trabajo"
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        selectable={true}
        bulkActions={[
          { label: 'Eliminar Seleccionados', onClick: handleBulkDelete, variant: 'danger' },
        ]}
      />
    );

    // Initially no bulk actions bar
    expect(screen.queryByText(/registros seleccionados/i)).not.toBeInTheDocument();

    // Select all rows
    const chkSelectAll = screen.getByLabelText(/Seleccionar todos los registros de la página/i);
    fireEvent.click(chkSelectAll);

    // Bulk actions bar appears
    expect(screen.getByText(/3 registros seleccionados/i)).toBeInTheDocument();

    const btnDelete = screen.getByText('Eliminar Seleccionados');
    fireEvent.click(btnDelete);
    expect(handleBulkDelete).toHaveBeenCalledWith(['1', '2', '3'], mockData);
  });

  it('renders complete pagination in a single row with page sizes and page buttons', () => {
    const handlePageChange = vi.fn();
    const handlePageSizeChange = vi.fn();

    render(
      <ListadoCrud
        title="Cola de Trabajo"
        columns={mockColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        pagination={{
          currentPage: 1,
          pageSize: 25,
          totalItems: 142,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    );

    expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText(/Filas por página:/i)).toBeInTheDocument();

    // Click next page button
    const btnNext = screen.getByTitle('Página siguiente');
    fireEvent.click(btnNext);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('renders loading spinner and empty states', () => {
    const { rerender } = render(
      <ListadoCrud
        title="Cola de Trabajo"
        columns={mockColumns}
        data={[]}
        loading={true}
        loadingMessage="Consultando órdenes de taller..."
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Consultando órdenes de taller...')).toBeInTheDocument();

    rerender(
      <ListadoCrud
        title="Cola de Trabajo"
        columns={mockColumns}
        data={[]}
        loading={false}
        emptyTitle="Sin órdenes activas"
        emptyDescription="No hay trabajos pendientes en el taller."
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Sin órdenes activas')).toBeInTheDocument();
    expect(screen.getByText('No hay trabajos pendientes en el taller.')).toBeInTheDocument();
  });
});
