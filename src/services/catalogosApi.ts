import { api } from './api';
import type {
  ItemCatalogo,
  ItemsResponse,
  UnidadPresentacion,
  TipoDocumentoIdentidad,
  CanalOrigen,
  TipoDocumentoBase,
  Caja,
  MedioPagoCategoria,
  MedioPagoInstrumento,
  Cliente,
} from '../types/catalogos';

export const catalogosApi = {
  async getItems(params?: { q?: string; naturaleza?: string; activo?: boolean }): Promise<ItemsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.naturaleza) searchParams.set('naturaleza', params.naturaleza);
    if (params?.activo !== undefined) searchParams.set('activo', String(params.activo));

    const qs = searchParams.toString();
    return api.get<ItemsResponse>(`/catalogos/items${qs ? `?${qs}` : ''}`);
  },

  async getItemByUuid(uuid: string): Promise<ItemCatalogo> {
    return api.get<ItemCatalogo>(`/catalogos/items/${uuid}`);
  },

  async getUnidades(): Promise<{ unidades: UnidadPresentacion[] }> {
    return api.get<{ unidades: UnidadPresentacion[] }>('/catalogos/unidades');
  },

  async getTiposDocumentoIdentidad(): Promise<{ tipos: TipoDocumentoIdentidad[] }> {
    return api.get<{ tipos: TipoDocumentoIdentidad[] }>('/catalogos/tipos-documento-identidad');
  },

  async getCanalesOrigen(): Promise<{ canales: CanalOrigen[] }> {
    return api.get<{ canales: CanalOrigen[] }>('/catalogos/canales-origen');
  },

  async getTiposDocumento(codigoBase?: string): Promise<{ tipos: TipoDocumentoBase[] }> {
    const qs = codigoBase ? `?codigoBase=${encodeURIComponent(codigoBase)}` : '';
    return api.get<{ tipos: TipoDocumentoBase[] }>(`/catalogos/tipos-documento${qs}`);
  },

  async getCajas(): Promise<{ cajas: Caja[] }> {
    return api.get<{ cajas: Caja[] }>('/catalogos/cajas');
  },

  async getMediosPagoArbol(): Promise<{ categorias: MedioPagoCategoria[] }> {
    return api.get<{ categorias: MedioPagoCategoria[] }>('/catalogos/medios-pago/arbol');
  },

  async getMediosPagoInstrumentos(): Promise<{ instrumentos: MedioPagoInstrumento[] }> {
    return api.get<{ instrumentos: MedioPagoInstrumento[] }>('/catalogos/medios-pago/instrumentos');
  },

  async getClientes(q?: string): Promise<{ clientes: Cliente[]; total: number }> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return api.get<{ clientes: Cliente[]; total: number }>(`/catalogos/clientes${qs}`);
  },
};
