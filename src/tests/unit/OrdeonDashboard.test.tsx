import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrdeonDashboard } from '../../features/dashboard/OrdeonDashboard';

describe('OrdeonDashboard Component', () => {
  it('renders greeting with user name and metric cards', () => {
    render(
      <OrdeonDashboard
        userName="Javier Ramírez"
        onNew={vi.fn()}
        showCashSummary={true}
      />
    );

    expect(screen.getByText(/Buenos días, Javier/i)).toBeInTheDocument();
    expect(screen.getByText(/Solicitudes de hoy/i)).toBeInTheDocument();
    expect(screen.getByText(/Órdenes en taller/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresos del día/i)).toBeInTheDocument();
  });

  it('triggers onNew callback when + Nueva solicitud is clicked', () => {
    const handleNew = vi.fn();
    render(
      <OrdeonDashboard
        userName="Javier Ramírez"
        onNew={handleNew}
        showCashSummary={false}
      />
    );

    const newBtn = screen.getByRole('button', { name: /\+ Nueva solicitud/i });
    fireEvent.click(newBtn);
    expect(handleNew).toHaveBeenCalledTimes(1);
  });

  it('displays cash summary when showCashSummary is true', () => {
    render(
      <OrdeonDashboard
        userName="Javier Ramírez"
        onNew={vi.fn()}
        showCashSummary={true}
      />
    );

    expect(screen.getByText(/Resumen de caja/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo disponible/i)).toBeInTheDocument();
  });
});
