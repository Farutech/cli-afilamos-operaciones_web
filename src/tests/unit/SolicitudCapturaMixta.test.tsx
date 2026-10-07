import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SolicitudCapturaMixta } from '../../features/solicitudes/SolicitudCapturaMixta'
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente } from '../../types/catalogos'

vi.mock('../../features/catalogos/ItemSelector', () => ({
  ItemSelector: ({ onSelectItem }: { onSelectItem: (item: unknown) => void }) => (
    <div data-testid="mock-item-selector">
      <button
        type="button"
        onClick={() =>
          onSelectItem({
            uuid: 'item-inv-1',
            codigoReferencia: 'INV-TIJERA',
            nombre: 'Tijera Quirúrgica',
            naturaleza: 'INVENTARIO',
            precioBase: 50000,
            stockReferencial: 2,
          })
        }
      >
        Seleccionar Tijera (Stock: 2)
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectItem({
            uuid: 'item-srv-1',
            codigoReferencia: 'SRV-AFILADO',
            nombre: 'Afilado Cuchillo',
            naturaleza: 'SERVICIO',
            precioBase: 20000,
            stockReferencial: null,
          })
        }
      >
        Seleccionar Afilado
      </button>
    </div>
  ),
}))

vi.mock('../../services/catalogosApi', () => ({
  catalogosApi: {
    getTiposDocumento: vi.fn().mockResolvedValue({
      tipos: [
        {
          uuid: 'tipo-sol-1',
          codigoBase: 'SOL',
          nombre: 'Solicitud de servicio',
          subtipos: [
            {
              uuid: 'sub-sol-1',
              codigoSubtipo: 'SOL_EST',
              nombre: 'Solicitud estándar',
              prefijo: 'SOL',
              folioActual: 101,
              formatoPlantilla: 'TIRILLA',
            },
          ],
        },
      ],
    }),
    getSubtiposPorTipo: vi.fn().mockResolvedValue({ subtipos: [] }),
    getPoliticaPrecios: vi.fn().mockResolvedValue({
      permiteModificarPrecio: true,
      maxDiferenciaPorcentaje: 15,
      requiereVoBoSuperaTolerancia: true,
      permitirMultiplicadorLista: true,
    }),
    getListasPrecio: vi.fn().mockResolvedValue({ listas: [] }),
    getMediosPagoInstrumentos: vi.fn().mockResolvedValue({
      instrumentos: [
        { uuid: 'medio-1', codigo: 'CREDITO_INTERNO', nombre: 'Crédito interno', activo: true },
        { uuid: 'medio-2', codigo: 'EFECTIVO', nombre: 'Efectivo', activo: true },
      ],
    }),
    getClientes: vi.fn().mockResolvedValue([]),
    buscarClientesPredictivo: vi.fn().mockResolvedValue([]),
    getDocumentSubtypes: vi.fn().mockResolvedValue([]),
  },
}))

const mockCanales: CanalOrigen[] = [
  { uuid: 'canal-1', codigo: 'MOSTRADOR', nombre: 'Mostrador Principal', activo: true },
]

const mockTiposDoc: TipoDocumentoIdentidad[] = [
  { uuid: 'td-1', codigo: 'CC', nombre: 'Cédula de Ciudadanía', requiereDigitoVerificacion: false, activo: true },
]

const mockClientes: Cliente[] = [
  {
    uuid: 'cli-1',
    tipoDocumentoId: 'td-1',
    numeroDocumento: '12345678',
    nombreRazonSocial: 'Juan Pérez',
    telefono: '3001234567',
    email: 'juan@example.com',
    activo: true,
  },
]

describe('SolicitudCapturaMixta Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza correctamente los selectores de canal y cliente', () => {
    render(
      <SolicitudCapturaMixta
        canales={mockCanales}
        tiposDocumento={mockTiposDoc}
        clientes={mockClientes}
        onAsentarSolicitud={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Canal de Origen/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cliente \*/i)).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez (12345678)')).toBeInTheDocument()
    expect(screen.getByText('+ Nuevo Cliente')).toBeInTheDocument()
  })

  it('permite agregar ítems mixtos (servicio e inventario) y muestra alerta de Invariante #1', async () => {
    const handleAsentar = vi.fn()
    render(
      <SolicitudCapturaMixta
        canales={mockCanales}
        tiposDocumento={mockTiposDoc}
        clientes={mockClientes}
        onAsentarSolicitud={handleAsentar}
      />,
    )

    // Agregar producto de inventario desde el selector
    fireEvent.click(screen.getByText('Seleccionar Tijera (Stock: 2)'))

    // Aumentar la cantidad a 5 para probar advertencia de stock referencial
    const cantInput = screen.getByLabelText('Cantidad')
    fireEvent.change(cantInput, { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar Línea/i }))

    // Verificar que la línea aparece en la tabla
    expect(screen.getByText('Tijera Quirúrgica')).toBeInTheDocument()
    expect(screen.getAllByText('PRODUCTO').length).toBeGreaterThanOrEqual(1)

    // Verificar advertencia de stock referencial (5 > 2)
    expect(
      screen.getByText(/supera el stock referencial/i),
    ).toBeInTheDocument()

    // Verificar Invariante #1 (Inventario impago)
    const alertInvariante1 = screen.getByRole('alert')
    expect(alertInvariante1).toHaveTextContent(/Invariante #1/i)
    expect(alertInvariante1).toHaveTextContent(/debe estar pagado al 100%/i)

    // El botón de asentar debe estar deshabilitado
    const asentarBtn = screen.getByRole('button', { name: /Asentar Solicitud/i })
    expect(asentarBtn).toBeDisabled()

    // Autorizar VoBo de supervisor para asentar con excepción de inventario
    fireEvent.click(screen.getByRole('button', { name: /Solicitar VoBo Supervisor/i }))
    fireEvent.change(screen.getByLabelText(/Código de Supervisor/i), { target: { value: 'SUPERVISOR_01' } })
    fireEvent.change(screen.getByLabelText(/PIN de Autorización/i), { target: { value: '9999' } })
    fireEvent.change(screen.getByLabelText(/Justificación Obligatoria/i), { target: { value: 'Entrega autorizada por gerencia' } })
    fireEvent.click(screen.getByRole('button', { name: /Autorizar VoBo/i }))

    // Una vez cubierto el inventario al 100%, el botón de asentar debe habilitarse
    await waitFor(() => {
      expect(asentarBtn).not.toBeDisabled()
    })

    // Hacer clic en asentar
    fireEvent.click(asentarBtn)
    expect(handleAsentar).toHaveBeenCalledTimes(1)
  })

  it('exige anticipo mínimo en servicios o autorización de VoBo', async () => {
    const handleAsentar = vi.fn()
    render(
      <SolicitudCapturaMixta
        canales={mockCanales}
        tiposDocumento={mockTiposDoc}
        clientes={mockClientes}
        onAsentarSolicitud={handleAsentar}
      />,
    )

    // Agregar un servicio
    fireEvent.click(screen.getByText('Seleccionar Afilado'))
    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar Línea/i }))

    expect(screen.getByText('Afilado Cuchillo')).toBeInTheDocument()
    expect(screen.getAllByText('SERVICIO').length).toBeGreaterThanOrEqual(1)

    // Debe mostrar advertencia de anticipo insuficiente (40% de 20.000 = 8.000)
    expect(screen.getByText(/Anticipo Insuficiente/i)).toBeInTheDocument()
    const asentarBtn = screen.getByRole('button', { name: /Asentar Solicitud/i })
    expect(asentarBtn).toBeDisabled()

    // Imputar el anticipo suficiente
    const inputAnticipo = screen.getByLabelText(/Anticipo para Afilado Cuchillo/i)
    fireEvent.change(inputAnticipo, { target: { value: '8000' } })

    await waitFor(() => {
      expect(asentarBtn).not.toBeDisabled()
    })
  })

  it('permite omitir anticipo mediante flujo de VoBo de supervisor', async () => {
    render(
      <SolicitudCapturaMixta
        canales={mockCanales}
        tiposDocumento={mockTiposDoc}
        clientes={mockClientes}
        onAsentarSolicitud={vi.fn()}
      />,
    )

    // Agregar un servicio
    fireEvent.click(screen.getByText('Seleccionar Afilado'))
    fireEvent.click(screen.getByRole('button', { name: /\+ Agregar Línea/i }))

    // Abrir modal de VoBo
    fireEvent.click(screen.getByRole('button', { name: /Solicitar VoBo Supervisor/i }))

    expect(screen.getByText('VoBo Excepción Anticipo')).toBeInTheDocument()

    // Llenar campos del supervisor
    fireEvent.change(screen.getByLabelText(/Código de Supervisor/i), { target: { value: 'SUPERVISOR_01' } })
    fireEvent.change(screen.getByLabelText(/PIN de Autorización/i), { target: { value: '9999' } })
    fireEvent.change(screen.getByLabelText(/Justificación Obligatoria/i), { target: { value: 'Cliente VIP corporativo' } })

    fireEvent.click(screen.getByRole('button', { name: /Autorizar VoBo/i }))

    await waitFor(() => {
      expect(screen.getByText(/Excepción de anticipo autorizada por Supervisor/i)).toBeInTheDocument()
    })

    // Botón de asentar ahora habilitado sin haber pagado anticipo
    const asentarBtn = screen.getByRole('button', { name: /Asentar Solicitud/i })
    expect(asentarBtn).not.toBeDisabled()
  })

  it('muestra la distribución de Medios de Pago y Abonos con campos requeridos y botón de registro', () => {
    render(
      <SolicitudCapturaMixta
        canales={mockCanales}
        tiposDocumento={mockTiposDoc}
        clientes={mockClientes}
        onAsentarSolicitud={vi.fn()}
      />,
    )

    // Cabecera: Título y Botón Registrar Abono
    expect(screen.getByText('MEDIOS DE PAGO Y ABONOS DE LA SOLICITUD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Registrar Abono/i })).toBeInTheDocument()

    // Fila 1: Instrumento de pago y Monto
    expect(screen.getByLabelText(/Instrumento de pago/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Monto/i)).toBeInTheDocument()

    // Fila 2: Referencia / Comprobante
    expect(screen.getByLabelText(/Referencia \/ Comprobante/i)).toBeInTheDocument()

    // Fila 3: Observaciones del Recaudo / Pago
    expect(screen.getByLabelText(/Observaciones del Recaudo \/ Pago/i)).toBeInTheDocument()
  })
})

