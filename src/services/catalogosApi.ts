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
  CategoriaItem,
  ListaPrecio,
  PoliticaPrecios,
  ConfiguracionDenominaciones,
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
    naturaleza?: string;
    uuidUnidadPresentacion: string;
    precioBase: number;
    stockReferencial?: number;
    workflowDefinicionUuid?: string;
    categoriaUuid?: string | null;
    listaPrecioUuid?: string | null;
  }): Promise<ItemCatalogo> {
    return api.put<ItemCatalogo>(`/catalogos/items/${uuid}`, dto);
  },

  async setItemActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/items/${uuid}/activo`, { activo });
  },

  async getUnidades(): Promise<{ unidades: UnidadPresentacion[] }> {
    try {
      const res = await api.get<any>('/catalogos/unidades');
      if (Array.isArray(res)) {
        return {
          unidades: res.map((u: any) => ({
            uuid: u.id || u.uuid,
            codigo: u.code || u.codigo,
            nombre: u.name || u.nombre,
            abreviatura: u.code || u.abreviatura || u.codigo,
            activo: u.active ?? u.activo ?? true,
          })),
        };
      }
      return {
        unidades: Array.isArray(res?.unidades)
          ? res.unidades.map((u: any) => ({
              uuid: u.id || u.uuid,
              codigo: u.code || u.codigo,
              nombre: u.name || u.nombre,
              abreviatura: u.code || u.abreviatura || u.codigo,
              activo: u.active ?? u.activo ?? true,
            }))
          : [],
      };
    } catch {
      return { unidades: [] };
    }
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
    try {
      const qs = codigoBase ? `?codigoBase=${encodeURIComponent(codigoBase)}` : '';
      const res = await api.get<any>(`/catalogos/tipos-documento${qs}`);
      if (Array.isArray(res)) return { tipos: res };
      return { tipos: res?.tipos || [] };
    } catch {
      return { tipos: [] };
    }
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

  async actualizarSubtipoDocs(
    uuid: string,
    dto: {
      nombre: string;
      descripcion: string;
      formatoPlantilla: string;
      formatoPapel: string;
      imprimeAlAsentar: boolean;
    }
  ): Promise<void> {
    await api.put<void>(`/catalogos/tipos-documento/subtipos/${uuid}`, dto);
  },

  async eliminarSubtipoFisico(uuid: string): Promise<void> {
    await api.delete<void>(`/catalogos/tipos-documento/subtipos/${uuid}`);
  },

  async cambiarCodigoSubtipo(
    uuid: string,
    nuevoCodigo: string,
    justificacion: string
  ): Promise<{ uuid: string; codigoAnterior: string; codigoNuevo: string }> {
    return api.post<{ uuid: string; codigoAnterior: string; codigoNuevo: string }>(
      `/catalogos/tipos-documento/subtipos/${uuid}/cambiar-codigo`,
      { nuevoCodigo, justificacion }
    );
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

  // --- Categorías de Ítems (Árbol Multinivel) ---
  async getCategoriasItem(): Promise<{ categorias: CategoriaItem[] }> {
    return api.get<{ categorias: CategoriaItem[] }>('/catalogos/categorias-items/arbol');
  },

  async crearCategoriaItem(dto: {
    codigo: string;
    nombre: string;
    categoriaPadreUuid?: string | null;
  }): Promise<CategoriaItem> {
    return api.post<CategoriaItem>('/catalogos/categorias-items', dto);
  },

  // --- Listas de Precios ---
  async getListasPrecio(): Promise<{ listas: ListaPrecio[] }> {
    try {
      const res = await api.get<any>('/catalogos/listas-precio');
      if (Array.isArray(res)) return { listas: res };
      return { listas: res?.listas || [] };
    } catch {
      return { listas: [] };
    }
  },

  async crearListaPrecio(dto: {
    codigo: string;
    nombre: string;
    porcentajeAjuste: number;
    esPredeterminada?: boolean;
  }): Promise<ListaPrecio> {
    return api.post<ListaPrecio>('/catalogos/listas-precio', dto);
  },

  async aplicarAumentoListaPrecio(
    uuid: string,
    porcentajeAumento: number
  ): Promise<ListaPrecio> {
    return api.post<ListaPrecio>(`/catalogos/listas-precio/${uuid}/aumento`, {
      porcentajeAumento,
    });
  },

  async actualizarListaPrecio(
    uuid: string,
    dto: { nombre: string; porcentajeAjuste: number; esPredeterminada: boolean }
  ): Promise<ListaPrecio> {
    return api.put<ListaPrecio>(`/catalogos/listas-precio/${uuid}`, dto);
  },

  async setListaPrecioActiva(uuid: string, activa: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/listas-precio/${uuid}/activa`, {
      activo: activa,
    });
  },

  // --- Política Global de Precios en Mostrador ---
  async getPoliticaPrecios(): Promise<PoliticaPrecios> {
    try {
      const res = await api.get<PoliticaPrecios>('/catalogos/politica-precios');
      return res || {
        permiteModificarPrecio: true,
        maxDiferenciaPorcentaje: 25,
        requiereVoBoSuperaTolerancia: true,
        permitirMultiplicadorLista: true,
      };
    } catch {
      return {
        permiteModificarPrecio: true,
        maxDiferenciaPorcentaje: 25,
        requiereVoBoSuperaTolerancia: true,
        permitirMultiplicadorLista: true,
      };
    }
  },

  async actualizarPoliticaPrecios(dto: {
    permiteModificarPrecio: boolean;
    maxDiferenciaPorcentaje: number;
    requiereVoBoSuperaTolerancia: boolean;
    permitirMultiplicadorLista: boolean;
  }): Promise<PoliticaPrecios> {
    return api.put<PoliticaPrecios>('/catalogos/politica-precios', dto);
  },

  // --- Categorías de Ítems: edición y activación ---
  async actualizarCategoriaItem(
    uuid: string,
    dto: { nombre: string; nivel: number; categoriaPadreUuid?: string | null }
  ): Promise<CategoriaItem> {
    return api.put<CategoriaItem>(`/catalogos/categorias-items/${uuid}`, dto);
  },

  async setCategoriaItemActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/catalogos/categorias-items/${uuid}/activo`, { activo });
  },

  // --- Denominaciones de Efectivo (parametrizadas vía Parámetros del Sistema) ---
  // La configuración vive como definición (`denominaciones_efectivo` en ValorJson),
  // de modo que el arqueo renderiza la planilla sin inventar billetes/monedas.
  async getConfiguracionDenominaciones(): Promise<ConfiguracionDenominaciones> {
    const res = await api.get<{ parametros: ParametroSistema[] }>('/catalogos/parametros');
    const parametro = (res.parametros || []).find((p) => p.clave === 'denominaciones_efectivo');
    if (!parametro) {
      throw new Error('Parametro denominaciones_efectivo no configurado');
    }
    return JSON.parse(parametro.valorJson) as ConfiguracionDenominaciones;
  },
};

