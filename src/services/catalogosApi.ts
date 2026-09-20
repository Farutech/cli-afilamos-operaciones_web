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
  ClienteHistorico,
  ParametroSistema,
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

  async crearItem(dto: {
    codigoReferencia: string;
    nombre: string;
    descripcion: string;
    naturaleza: string;
    uuidUnidadPresentacion: string;
    precioBase: number;
    stockReferencial?: number;
    workflowDefinicionUuid?: string;
  }): Promise<ItemCatalogo> {
    return api.post<ItemCatalogo>('/catalogos/items', dto);
  },

  async actualizarItem(uuid: string, dto: {
    nombre: string;
    descripcion: string;
    uuidUnidadPresentacion: string;
    precioBase: number;
    workflowDefinicionUuid?: string;
  }): Promise<ItemCatalogo> {
    return api.put<ItemCatalogo>(`/catalogos/items/${uuid}`, dto);
  },

  async setItemActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/items/${uuid}/activo`, { activo });
  },

  async getUnidades(): Promise<{ unidades: UnidadPresentacion[] }> {
    return api.get<{ unidades: UnidadPresentacion[] }>('/catalogos/unidades');
  },

  async crearUnidad(dto: { codigo: string; nombre: string; abreviatura: string }): Promise<UnidadPresentacion> {
    return api.post<UnidadPresentacion>('/catalogos/unidades', dto);
  },

  async getTiposDocumentoIdentidad(): Promise<{ tipos: TipoDocumentoIdentidad[] }> {
    return api.get<{ tipos: TipoDocumentoIdentidad[] }>('/catalogos/tipos-documento-identidad');
  },

  async crearTipoDocumentoIdentidad(dto: { codigo: string; nombre: string; aplicaPersona: 'NATURAL' | 'JURIDICA' }): Promise<TipoDocumentoIdentidad> {
    return api.post<TipoDocumentoIdentidad>('/catalogos/tipos-documento-identidad', dto);
  },

  async getCanalesOrigen(): Promise<{ canales: CanalOrigen[] }> {
    return api.get<{ canales: CanalOrigen[] }>('/catalogos/canales-origen');
  },

  async crearCanalOrigen(dto: { codigo: string; nombre: string }): Promise<CanalOrigen> {
    return api.post<CanalOrigen>('/catalogos/canales-origen', dto);
  },

  async getTiposDocumento(codigoBase?: string): Promise<{ tipos: TipoDocumentoBase[] }> {
    const qs = codigoBase ? `?codigoBase=${encodeURIComponent(codigoBase)}` : '';
    return api.get<{ tipos: TipoDocumentoBase[] }>(`/catalogos/tipos-documento${qs}`);
  },

  async crearSubtipo(uuidBase: string, dto: {
    codigoSubtipo: string;
    nombre: string;
    descripcion: string;
    prefijo: string;
    formatoPlantilla: string;
    formatoPapel: string;
    imprimeAlAsentar: boolean;
  }): Promise<void> {
    await api.post<void>(`/catalogos/tipos-documento/${uuidBase}/subtipos`, dto);
  },

  async setSubtipoActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/tipos-documento/subtipos/${uuid}/activo`, { activo });
  },

  async getCajas(): Promise<{ cajas: Caja[] }> {
    return api.get<{ cajas: Caja[] }>('/catalogos/cajas');
  },

  async crearCaja(dto: { codigoCaja: string; nombre: string; ubicacion: string }): Promise<Caja> {
    return api.post<Caja>('/catalogos/cajas', dto);
  },

  async actualizarCaja(uuid: string, dto: { nombre: string; ubicacion: string }): Promise<Caja> {
    return api.put<Caja>(`/catalogos/cajas/${uuid}`, dto);
  },

  async setCajaActiva(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/cajas/${uuid}/activo`, { activo });
  },

  async getMediosPagoArbol(): Promise<{ categorias: MedioPagoCategoria[] }> {
    return api.get<{ categorias: MedioPagoCategoria[] }>('/catalogos/medios-pago/arbol');
  },

  async getMediosPagoInstrumentos(): Promise<{ instrumentos: MedioPagoInstrumento[] }> {
    return api.get<{ instrumentos: MedioPagoInstrumento[] }>('/catalogos/medios-pago/instrumentos');
  },

  async crearMedioPagoInstrumento(dto: {
    codigoCategoria: string;
    codigo: string;
    nombre: string;
    requiereReferencia: boolean;
  }): Promise<MedioPagoInstrumento> {
    return api.post<MedioPagoInstrumento>('/catalogos/medios-pago/instrumentos', dto);
  },

  async getClientes(q?: string): Promise<{ clientes: Cliente[]; total: number }> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return api.get<{ clientes: Cliente[]; total: number }>(`/catalogos/clientes${qs}`);
  },

  async crearCliente(dto: {
    tipoDocumentoCodigo?: string;
    numeroDocumento: string;
    nombreRazonSocial: string;
    telefono: string;
  }): Promise<Cliente> {
    return api.post<Cliente>('/catalogos/clientes', dto);
  },

  async actualizarCliente(uuid: string, dto: {
    nombreRazonSocial: string;
    telefono: string;
  }): Promise<Cliente> {
    return api.put<Cliente>(`/catalogos/clientes/${uuid}`, dto);
  },

  async getClienteHistorico(uuid: string): Promise<ClienteHistorico> {
    return api.get<ClienteHistorico>(`/catalogos/clientes/${uuid}/historico`);
  },

  async getParametros(): Promise<{ parametros: ParametroSistema[] }> {
    return api.get<{ parametros: ParametroSistema[] }>('/catalogos/parametros');
  },

  async actualizarParametro(clave: string, valorJson: string): Promise<ParametroSistema> {
    return api.put<ParametroSistema>(`/catalogos/parametros/${clave}`, { valorJson });
  },
};

