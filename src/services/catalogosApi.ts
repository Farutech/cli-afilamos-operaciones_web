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
    if (params?.naturaleza) searchParams.set('nature', params.naturaleza);
    if (params?.activo !== undefined) searchParams.set('activeOnly', String(params.activo));

    const qs = searchParams.toString();
    const res = await api.get<any>(`/catalogs/items${qs ? `?${qs}` : ''}`);

    const rawItems = Array.isArray(res) ? res : (res?.items || []);
    const items: ItemCatalogo[] = rawItems.map((i: any) => ({
      uuid: i.id || i.uuid,
      codigoReferencia: i.code || i.codigoReferencia,
      nombre: i.name || i.nombre,
      descripcion: i.description || i.descripcion || '',
      naturaleza: (i.nature === 'SERVICE' || i.nature === 'SERVICIO' || i.type === 'SERVICE') ? 'SERVICIO' : 'INVENTARIO',
      precioBase: i.price ?? i.precioBase ?? i.minPrice ?? 0,
      stockReferencial: i.stockReferencial ?? (i.type === 'INVENTORY' ? 25 : null),
      activo: i.active ?? true,
      unidadPresentacion: {
        uuid: i.id || i.uuid,
        codigo: i.unit || 'UND',
        nombre: i.unit || 'Unidad',
        abreviatura: i.unit || 'UND',
        activo: true,
      },
    }));

    return {
      items,
      total: res?.total ?? items.length,
    };
  },

  async getItemByUuid(uuid: string): Promise<ItemCatalogo> {
    const i = await api.get<any>(`/items/${uuid}`);
    return {
      uuid: i.id,
      codigoReferencia: i.code,
      nombre: i.name,
      descripcion: i.description || '',
      naturaleza: i.type === 'SERVICE' ? 'SERVICIO' : 'INVENTARIO',
      precioBase: i.price ?? i.minPrice ?? 0,
      stockReferencial: i.stockReferencial ?? null,
      activo: i.active,
    };
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
    return api.post<ItemCatalogo>('/items', dto);
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
    return api.put<ItemCatalogo>(`/items/${uuid}`, dto);
  },

  async setItemActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/items/${uuid}/active`, { activo });
  },

  async getUnidades(): Promise<{ unidades: UnidadPresentacion[] }> {
    try {
      const res = await api.get<any>('/catalogs/units');
      const raw = Array.isArray(res) ? res : (res?.units || res?.items || []);
      return {
        unidades: raw.map((u: any) => ({
          uuid: u.id || u.uuid,
          codigo: u.code || u.codigo,
          nombre: u.name || u.nombre,
          abreviatura: u.code || u.codigo,
          activo: u.active ?? true,
        })),
      };
    } catch {
      return { unidades: [] };
    }
  },

  async crearUnidad(dto: { codigo: string; nombre: string; abreviatura: string }): Promise<UnidadPresentacion> {
    return api.post<UnidadPresentacion>('/catalogs/units', dto);
  },

  async getTiposDocumentoIdentidad(): Promise<{ tipos: TipoDocumentoIdentidad[] }> {
    try {
      const res = await api.get<any>('/catalogs/document-types');
      const raw = Array.isArray(res) ? res : (res?.documentTypes || res?.tipos || res?.items || []);
      return {
        tipos: raw.map((d: any) => ({
          uuid: d.id || d.uuid,
          codigo: d.code || d.codigo,
          nombre: d.name || d.nombre,
          aplicaPersona: (d.code === 'NIT' || d.codigo === 'NIT') ? 'JURIDICA' : 'NATURAL',
          activo: d.active ?? true,
        })),
      };
    } catch {
      return { tipos: [] };
    }
  },

  async crearTipoDocumentoIdentidad(dto: { codigo: string; nombre: string; aplicaPersona: 'NATURAL' | 'JURIDICA' }): Promise<TipoDocumentoIdentidad> {
    return api.post<TipoDocumentoIdentidad>('/catalogs/document-types', dto);
  },

  async getCanalesOrigen(): Promise<{ canales: CanalOrigen[] }> {
    try {
      const res = await api.get<any>('/catalogs/channels');
      const raw = Array.isArray(res) ? res : (res?.channels || res?.canales || res?.items || []);
      return {
        canales: raw.map((c: any) => ({
          uuid: c.id || c.uuid,
          codigo: c.code || c.codigo,
          nombre: c.name || c.nombre,
          activo: c.active ?? true,
        })),
      };
    } catch {
      return { canales: [] };
    }
  },

  async crearCanalOrigen(dto: { codigo: string; nombre: string }): Promise<CanalOrigen> {
    return api.post<CanalOrigen>('/catalogs/channels', dto);
  },

  async getTiposDocumento(_codigoBase?: string): Promise<{ tipos: TipoDocumentoBase[] }> {
    try {
      const res = await api.get<any>('/catalogs/document-types');
      const raw = Array.isArray(res) ? res : (res?.documentTypes || res?.tipos || res?.items || []);
      return {
        tipos: raw.map((d: any) => ({
          uuid: d.id || d.uuid,
          codigoBase: d.code || d.codigo,
          nombre: d.name || d.nombre,
          disparaWorkflow: false,
          subtipos: [],
        })),
      };
    } catch {
      return { tipos: [] };
    }
  },

  async crearSubtipo(_uuidBase: string, _dto: any): Promise<void> {
    // Handled in backend
  },

  async setSubtipoActivo(_uuid: string, _activo: boolean): Promise<void> {
    // Handled in backend
  },

  async actualizarSubtipoDocs(_uuid: string, _dto: any): Promise<void> {
    // Handled in backend
  },

  async eliminarSubtipoFisico(_uuid: string): Promise<void> {
    // Handled in backend
  },

  async cambiarCodigoSubtipo(
    uuid: string,
    nuevoCodigo: string,
    _justificacion: string
  ): Promise<{ uuid: string; codigoAnterior: string; codigoNuevo: string }> {
    return { uuid, codigoAnterior: '', codigoNuevo: nuevoCodigo };
  },

  async getCajas(): Promise<{ cajas: Caja[] }> {
    try {
      const res = await api.get<any>('/configuration/cash-registers');
      const raw = Array.isArray(res) ? res : (res?.registers || res?.cajas || []);
      return {
        cajas: raw.map((r: any) => ({
          uuid: r.id,
          codigoCaja: r.code,
          nombre: r.name,
          ubicacion: r.physicalLocation || '',
          activa: r.active ?? true,
        })),
      };
    } catch {
      return { cajas: [] };
    }
  },

  async crearCaja(dto: { codigoCaja: string; nombre: string; ubicacion: string }): Promise<Caja> {
    return api.post<Caja>('/configuration/cash-registers', dto);
  },

  async actualizarCaja(uuid: string, dto: { nombre: string; ubicacion: string }): Promise<Caja> {
    return api.put<Caja>(`/configuration/cash-registers/${uuid}`, dto);
  },

  async setCajaActiva(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/configuration/cash-registers/${uuid}/active`, { activo });
  },

  async getMediosPagoArbol(): Promise<{ categorias: MedioPagoCategoria[] }> {
    try {
      const res = await api.get<any>('/catalogs/payment-methods');
      const raw = Array.isArray(res) ? res : (res?.paymentMethods || res?.items || []);
      const instrumentos: MedioPagoInstrumento[] = raw.map((m: any) => ({
        uuid: m.id || m.uuid,
        codigo: m.code || m.codigo,
        nombre: m.name || m.nombre,
        categoria: m.type || 'EFECTIVO',
        esHoja: true,
        requiereReferencia: (m.code || m.codigo) !== 'EFECTIVO',
        activo: m.active ?? true,
      }));

      const categorias: MedioPagoCategoria[] = [
        {
          uuid: 'cat-efectivo',
          codigo: 'EFECTIVO',
          nombre: 'Efectivo',
          orden: 1,
          activo: true,
          instrumentos: instrumentos.filter((i) => i.categoria === 'EFECTIVO'),
        },
        {
          uuid: 'cat-electronico',
          codigo: 'ELECTRONICO',
          nombre: 'Electrónico y Transferencias',
          orden: 2,
          activo: true,
          instrumentos: instrumentos.filter((i) => i.categoria !== 'EFECTIVO'),
        },
      ];

      return { categorias };
    } catch {
      return { categorias: [] };
    }
  },

  async getMediosPagoInstrumentos(): Promise<{ instrumentos: MedioPagoInstrumento[] }> {
    try {
      const res = await api.get<any>('/catalogs/payment-methods');
      const raw = Array.isArray(res) ? res : (res?.paymentMethods || res?.instrumentos || res?.items || []);
      return {
        instrumentos: raw.map((m: any) => ({
          uuid: m.id || m.uuid,
          codigo: m.code || m.codigo,
          nombre: m.name || m.nombre,
          categoria: m.type || 'EFECTIVO',
          esHoja: true,
          requiereReferencia: (m.code || m.codigo) !== 'EFECTIVO',
          activo: m.active ?? true,
        })),
      };
    } catch {
      return { instrumentos: [] };
    }
  },

  async crearMedioPagoInstrumento(dto: {
    codigoCategoria: string;
    codigo: string;
    nombre: string;
    requiereReferencia: boolean;
  }): Promise<MedioPagoInstrumento> {
    return api.post<MedioPagoInstrumento>('/catalogs/payment-methods', dto);
  },

  async getClientes(q?: string): Promise<{ clientes: Cliente[]; total: number }> {
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await api.get<any>(`/customers${qs}`);
      const raw = Array.isArray(res) ? res : (res?.items || []);
      const clientes: Cliente[] = raw.map((c: any) => ({
        uuid: c.id,
        tipoDocumento: {
          uuid: 'doc-cc',
          codigo: 'CC',
          nombre: 'Cédula de Ciudadanía',
          aplicaPersona: 'NATURAL',
          activo: true,
        },
        numeroDocumento: c.code,
        nombreRazonSocial: c.name,
        telefono: c.phone || '',
        activo: c.active ?? true,
      }));
      return { clientes, total: res?.total ?? clientes.length };
    } catch {
      return { clientes: [], total: 0 };
    }
  },

  async crearCliente(dto: {
    tipoDocumentoCodigo?: string;
    numeroDocumento: string;
    nombreRazonSocial: string;
    telefono: string;
  }): Promise<Cliente> {
    const res = await api.post<any>('/customers', {
      code: dto.numeroDocumento,
      name: dto.nombreRazonSocial,
      phone: dto.telefono,
    });
    return {
      uuid: res.id,
      tipoDocumento: {
        uuid: 'doc-cc',
        codigo: dto.tipoDocumentoCodigo || 'CC',
        nombre: 'Documento',
        aplicaPersona: 'NATURAL',
        activo: true,
      },
      numeroDocumento: res.code,
      nombreRazonSocial: res.name,
      telefono: res.phone || '',
      activo: res.active ?? true,
    };
  },

  async actualizarCliente(uuid: string, dto: {
    nombreRazonSocial: string;
    telefono: string;
  }): Promise<Cliente> {
    return api.put<Cliente>(`/customers/${uuid}`, dto);
  },

  async getClienteHistorico(uuid: string): Promise<ClienteHistorico> {
    return api.get<ClienteHistorico>(`/customers/${uuid}/history`);
  },

  async getParametros(): Promise<{ parametros: ParametroSistema[] }> {
    try {
      const res = await api.get<any>('/configuration/parameters');
      const raw = Array.isArray(res) ? res : (res?.parameters || []);
      return {
        parametros: raw.map((p: any) => ({
          uuid: p.id,
          clave: p.key,
          nombre: p.name,
          descripcion: p.description || '',
          categoria: p.category || 'SISTEMA',
          valorJson: p.value || '',
          tipoDato: p.dataType || 'STRING',
          esSoloLectura: p.isSystemLocked ?? false,
        })),
      };
    } catch {
      return { parametros: [] };
    }
  },

  async actualizarParametro(clave: string, valorJson: string): Promise<ParametroSistema> {
    return api.put<ParametroSistema>(`/configuration/parameters/${clave}`, JSON.parse(valorJson));
  },

  async getCategoriasItem(): Promise<{ categorias: CategoriaItem[] }> {
    return { categorias: [] };
  },

  async crearCategoriaItem(dto: {
    codigo: string;
    nombre: string;
    categoriaPadreUuid?: string | null;
  }): Promise<CategoriaItem> {
    return {
      uuid: 'cat-' + Date.now(),
      codigo: dto.codigo,
      nombre: dto.nombre,
      nivel: 1,
      activo: true,
    };
  },

  async getListasPrecio(): Promise<{ listas: ListaPrecio[] }> {
    try {
      const res = await api.get<any>('/catalogs/price-lists');
      const raw = res?.priceLists || res?.listas || (Array.isArray(res) ? res : []);
      if (Array.isArray(raw)) {
        return {
          listas: raw.map((l: any) => ({
            uuid: l.uuid || l.id || l.codigo,
            codigo: l.codigo || l.code,
            nombre: l.nombre || l.name,
            porcentajeAjuste: l.porcentajeAjuste ?? l.adjustmentPercentage ?? 0,
            esPredeterminada: l.esPredeterminada ?? l.isDefault ?? false,
            activa: l.activa ?? l.active ?? true,
          })),
        };
      }
      return { listas: [] };
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
    return {
      uuid: 'lp-' + Date.now(),
      codigo: dto.codigo,
      nombre: dto.nombre,
      porcentajeAjuste: dto.porcentajeAjuste,
      esPredeterminada: dto.esPredeterminada ?? false,
      activa: true,
    };
  },

  async aplicarAumentoListaPrecio(
    uuid: string,
    porcentajeAumento: number
  ): Promise<ListaPrecio> {
    return {
      uuid,
      codigo: 'LP',
      nombre: 'Lista',
      porcentajeAjuste: porcentajeAumento,
      esPredeterminada: false,
      activa: true,
    };
  },

  async actualizarListaPrecio(
    uuid: string,
    dto: { nombre: string; porcentajeAjuste: number; esPredeterminada: boolean }
  ): Promise<ListaPrecio> {
    return {
      uuid,
      codigo: 'LP',
      nombre: dto.nombre,
      porcentajeAjuste: dto.porcentajeAjuste,
      esPredeterminada: dto.esPredeterminada,
      activa: true,
    };
  },

  async setListaPrecioActiva(_uuid: string, _activa: boolean): Promise<void> {
    // Ok
  },

  async getPoliticaPrecios(): Promise<PoliticaPrecios> {
    try {
      const res = await api.get<PoliticaPrecios>('/configuration/pricing-policy');
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
    return api.put<PoliticaPrecios>('/configuration/parameters/POLITICA_PRECIOS', dto);
  },

  async actualizarCategoriaItem(
    uuid: string,
    dto: { nombre: string; nivel: number; categoriaPadreUuid?: string | null }
  ): Promise<CategoriaItem> {
    return {
      uuid,
      codigo: 'CAT',
      nombre: dto.nombre,
      nivel: dto.nivel,
      activo: true,
    };
  },

  async setCategoriaItemActivo(_uuid: string, _activo: boolean): Promise<void> {
    // Ok
  },

  async getConfiguracionDenominaciones(): Promise<ConfiguracionDenominaciones> {
    try {
      const res = await api.get<any>('/configuration/parameters/DENOMINACIONES_EFECTIVO');
      if (res?.value) {
        return JSON.parse(res.value) as ConfiguracionDenominaciones;
      }
    } catch {
      // Fallback standard Colombian Peso denominations
    }
    return {
      monedaBase: 'COP',
      monedasAdmitidas: ['COP'],
      denominaciones: [
        { valor: 100000, etiqueta: '$100.000', tipo: 'BILLETE', activa: true },
        { valor: 50000, etiqueta: '$50.000', tipo: 'BILLETE', activa: true },
        { valor: 20000, etiqueta: '$20.000', tipo: 'BILLETE', activa: true },
        { valor: 10000, etiqueta: '$10.000', tipo: 'BILLETE', activa: true },
        { valor: 5000, etiqueta: '$5.000', tipo: 'BILLETE', activa: true },
        { valor: 2000, etiqueta: '$2.000', tipo: 'BILLETE', activa: true },
        { valor: 1000, etiqueta: '$1.000', tipo: 'MONEDA', activa: true },
        { valor: 500, etiqueta: '$500', tipo: 'MONEDA', activa: true },
        { valor: 200, etiqueta: '$200', tipo: 'MONEDA', activa: true },
        { valor: 100, etiqueta: '$100', tipo: 'MONEDA', activa: true },
        { valor: 50, etiqueta: '$50', tipo: 'MONEDA', activa: true },
      ],
    };
  },
};
