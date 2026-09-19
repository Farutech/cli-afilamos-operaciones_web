import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ModuloAdmin } from '../../features/admin/ModuloAdmin';
import { adminApi } from '../../services/adminApi';
import type {
  UsuarioAdminDto,
  CuentaBancariaConfigDto,
  WorkflowDefinicionAdminDto,
} from '../../types/admin';

vi.mock('../../services/adminApi', () => ({
  adminApi: {
    getUsuarios: vi.fn(),
    crearUsuario: vi.fn(),
    actualizarUsuario: vi.fn(),
    cambiarEstadoUsuario: vi.fn(),
    resetearPinUsuario: vi.fn(),
    getRoles: vi.fn(),
    getCuentaBancaria: vi.fn(),
    guardarCuentaBancaria: vi.fn(),
    getWorkflows: vi.fn(),
    crearBorradorWorkflow: vi.fn(),
    agregarEtapa: vi.fn(),
    agregarTransicion: vi.fn(),
    publicarWorkflow: vi.fn(),
    retirarWorkflow: vi.fn(),
  },
}));

const mockUsuarios: UsuarioAdminDto[] = [
  {
    uuid: 'usr-1',
    codigo: 'ADMIN',
    nombreCompleto: 'Administrador Principal',
    email: 'admin@afilamos.com',
    rol: 'Administrador',
    activo: true,
    tienePin: true,
    creadoEn: '2026-09-01T10:00:00Z',
  },
  {
    uuid: 'usr-2',
    codigo: 'CAJERO_01',
    nombreCompleto: 'Juan Cajero',
    email: 'cajero@afilamos.com',
    rol: 'Cajero',
    activo: true,
    tienePin: false,
    creadoEn: '2026-09-02T10:00:00Z',
  },
];

const mockRoles = ['Administrador', 'Supervisor', 'Cajero', 'Operario', 'Auditor'];

const mockCuentaBancaria: CuentaBancariaConfigDto = {
  banco: 'Bancolombia',
  numeroCuenta: '123456789',
  tipoCuenta: 'Ahorros',
  titular: 'Afilamos Operaciones',
  nitTitular: '900123456',
  billeteraDigital: 'Nequi: 3001234567',
};

const mockWorkflows: WorkflowDefinicionAdminDto[] = [
  {
    uuid: 'wf-1',
    codigo: 'TALLER-ESTANDAR',
    nombre: 'Plantilla Estándar de Taller',
    descripcion: 'Flujo estándar de afilado',
    versionNumero: 1,
    esVigente: true,
    activo: true,
    creadoEn: '2026-09-01T10:00:00Z',
    etapas: [
      {
        uuid: 'et-1',
        codigo: 'RECIBIDO',
        nombre: 'Recepción Mostrador',
        orden: 1,
        permiteCancelacionDirecta: true,
        esFinal: false,
        transicionesSalientes: [
          {
            uuid: 'tr-1',
            codigo: 'INICIAR',
            nombre: 'Iniciar Afilado',
            etapaDestinoCodigo: 'EN_PROCESO',
            etapaDestinoNombre: 'En Proceso Técnico',
            rolRequerido: 'Operario',
            requiereAprobacion: false,
            efectoTipo: 'Ninguno',
          },
        ],
      },
      {
        uuid: 'et-2',
        codigo: 'LISTO_ENTREGA',
        nombre: 'Listo para Entrega',
        orden: 2,
        permiteCancelacionDirecta: false,
        esFinal: true,
        transicionesSalientes: [],
      },
    ],
  },
];

describe('ModuloAdmin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders users list and roles in first tab', async () => {
    vi.mocked(adminApi.getUsuarios).mockResolvedValue(mockUsuarios);
    vi.mocked(adminApi.getRoles).mockResolvedValue(mockRoles);

    render(<ModuloAdmin />);

    expect(await screen.findByText(/Administrador Principal/i)).toBeInTheDocument();
    expect(screen.getByText(/Juan Cajero/i)).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('CAJERO_01')).toBeInTheDocument();
  });

  it('allows opening user creation modal and submitting new user', async () => {
    vi.mocked(adminApi.getUsuarios).mockResolvedValue(mockUsuarios);
    vi.mocked(adminApi.getRoles).mockResolvedValue(mockRoles);
    vi.mocked(adminApi.crearUsuario).mockResolvedValue({
      uuid: 'usr-3',
      codigo: 'OPERARIO_01',
      nombreCompleto: 'Pedro Operario',
      email: 'pedro@afilamos.com',
      rol: 'Operario',
      activo: true,
      tienePin: true,
      creadoEn: '2026-09-19T10:00:00Z',
    });

    render(<ModuloAdmin />);

    const btnCrear = await screen.findByRole('button', { name: /\+ Crear Nuevo Usuario/i });
    fireEvent.click(btnCrear);

    expect(screen.getByRole('heading', { name: /Crear Nuevo Usuario/i })).toBeInTheDocument();

    const inputCodigo = screen.getByPlaceholderText(/Ej. OPERARIO_02/i);
    const inputNombre = screen.getByPlaceholderText(/Ej. Carlos Martinez/i);
    const inputEmail = screen.getByPlaceholderText(/carlos@afilamos.com/i);
    const inputPass = screen.getByPlaceholderText(/Mínimo 6 caracteres/i);

    fireEvent.change(inputCodigo, { target: { value: 'OPERARIO_01' } });
    fireEvent.change(inputNombre, { target: { value: 'Pedro Operario' } });
    fireEvent.change(inputEmail, { target: { value: 'pedro@afilamos.com' } });
    fireEvent.change(inputPass, { target: { value: 'Secret123*' } });

    const btnSubmit = screen.getByRole('button', { name: /^Crear Usuario$/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(adminApi.crearUsuario).toHaveBeenCalled();
    });
  });

  it('switches to bank account tab and saves parameters', async () => {
    vi.mocked(adminApi.getUsuarios).mockResolvedValue(mockUsuarios);
    vi.mocked(adminApi.getRoles).mockResolvedValue(mockRoles);
    vi.mocked(adminApi.getCuentaBancaria).mockResolvedValue(mockCuentaBancaria);
    vi.mocked(adminApi.guardarCuentaBancaria).mockResolvedValue({
      ...mockCuentaBancaria,
      banco: 'Davivienda',
    });

    render(<ModuloAdmin />);

    const tabBanco = await screen.findByRole('button', { name: /🏦 Cuenta Bancaria/i });
    fireEvent.click(tabBanco);

    expect(await screen.findByDisplayValue('Bancolombia')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123456789')).toBeInTheDocument();

    const inputBanco = screen.getByDisplayValue('Bancolombia');
    fireEvent.change(inputBanco, { target: { value: 'Davivienda' } });

    const btnGuardar = screen.getByRole('button', { name: /💾 Guardar Parámetros Bancarios/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(adminApi.guardarCuentaBancaria).toHaveBeenCalled();
    });
  });

  it('switches to workflows tab and renders workflow details', async () => {
    vi.mocked(adminApi.getUsuarios).mockResolvedValue(mockUsuarios);
    vi.mocked(adminApi.getRoles).mockResolvedValue(mockRoles);
    vi.mocked(adminApi.getWorkflows).mockResolvedValue(mockWorkflows);

    render(<ModuloAdmin />);

    const tabWf = await screen.findByRole('button', { name: /🔄 Workflows/i });
    fireEvent.click(tabWf);

    expect((await screen.findAllByText(/TALLER-ESTANDAR/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Plantilla Estándar de Taller/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/#1 Recepción Mostrador/i)).toBeInTheDocument();
    expect(screen.getByText(/#2 Listo para Entrega/i)).toBeInTheDocument();
  });
});
