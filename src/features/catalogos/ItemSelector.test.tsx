import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ItemSelector } from './ItemSelector'
import { catalogosApi } from '../../services/catalogosApi'
import type { ItemCatalogo } from '../../types/catalogos'

vi.mock('../../services/catalogosApi', () => ({
  catalogosApi: {
    getItems: vi.fn(),
  },
}))

const mockItems: ItemCatalogo[] = [
  {
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    codigoReferencia: 'INV-001',
    nombre: 'Cuchillo chef 8"',
    descripcion: 'Cuchillo profesional',
    naturaleza: 'INVENTARIO',
    precioBase: 45000,
    stockReferencial: 12,
    activo: true,
    unidadPresentacion: {
      uuid: 'und-uuid',
      codigo: 'UNID',
      nombre: 'Unidad',
      abreviatura: 'und',
      activo: true,
    },
  },
  {
    uuid: '550e8400-e29b-41d4-a716-446655440002',
    codigoReferencia: 'SRV-001',
    nombre: 'Afilado tijera',
    descripcion: 'Servicio de afilado',
    naturaleza: 'SERVICIO',
    precioBase: 100000,
    stockReferencial: null,
    activo: true,
  },
]

describe('ItemSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza correctamente el input con el placeholder especificado', () => {
    render(<ItemSelector onSelectItem={vi.fn()} placeholder="Buscar ítem de prueba..." />)

    const input = screen.getByPlaceholderText('Buscar ítem de prueba...')
    expect(input).toBeInTheDocument()
  })

  it('ejecuta búsqueda debounced al escribir y muestra los resultados', async () => {
    vi.mocked(catalogosApi.getItems).mockResolvedValueOnce({
      items: mockItems,
      total: 2,
    })

    render(<ItemSelector onSelectItem={vi.fn()} />)

    const input = screen.getByLabelText('Buscar ítem')
    fireEvent.change(input, { target: { value: 'cuchillo' } })

    await waitFor(
      () => {
        expect(catalogosApi.getItems).toHaveBeenCalledWith({
          q: 'cuchillo',
          naturaleza: undefined,
          activo: true,
        })
      },
      { timeout: 1000 },
    )

    expect(await screen.findByText('INV-001')).toBeInTheDocument()
    expect(screen.getByText('Cuchillo chef 8"')).toBeInTheDocument()
    expect(screen.getByText('SRV-001')).toBeInTheDocument()
  })

  it('llama onSelectItem con los datos completos del ítem al hacer clic', async () => {
    vi.mocked(catalogosApi.getItems).mockResolvedValueOnce({
      items: mockItems,
      total: 2,
    })

    const onSelectMock = vi.fn()
    render(<ItemSelector onSelectItem={onSelectMock} />)

    const input = screen.getByLabelText('Buscar ítem')
    fireEvent.change(input, { target: { value: 'cuch' } })

    const itemOption = await screen.findByText('INV-001')
    fireEvent.click(itemOption)

    expect(onSelectMock).toHaveBeenCalledTimes(1)
    expect(onSelectMock).toHaveBeenCalledWith(mockItems[0])
  })
})
