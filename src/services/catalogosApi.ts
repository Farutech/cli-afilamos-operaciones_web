import { api } from './api';
import type {
  ItemCatalogo,
  ItemsResponse,
  UnidadPresentacion,
  TipoDocumentoIdentidad,
  CanalOrigen,
  TipoDocumentoBase,
  SubtipoDocumento,
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


export const CATALOGO_ITEMS_SEED: ItemCatalogo[] = [
  // Servicios con unidad SRV (8f647d36-b43d-4f21-aa1a-005ad16ce290)
  {
    uuid: 'b05d0d80-6013-4335-a8e1-783f8eac919e',
    codigoReferencia: 'AFIL-DISCO-01',
    nombre: 'Afilado de Disco de Sierra',
    descripcion: 'Afilado técnico de discos de carburo y tungsteno para corte de madera y aluminio.',
    naturaleza: 'SERVICIO',
    precioBase: 25000,
    stockReferencial: null,
    activo: true,
    unidadPresentacion: {
      uuid: '8f647d36-b43d-4f21-aa1a-005ad16ce290',
      codigo: 'SRV',
      nombre: 'Servicio',
      abreviatura: 'SRV',
      activo: true,
    },
  },
  {
    uuid: 'b05d0d80-6013-4335-a8e1-783f8eac9191',
    codigoReferencia: 'AFIL-CUCH-01',
    nombre: 'Afilado Cuchillo Profesional / Chef',
    descripcion: 'Afilado artesanal al agua con rectificado de filo y pulido espejo.',
    naturaleza: 'SERVICIO',
    precioBase: 15000,
    stockReferencial: null,
    activo: true,
    unidadPresentacion: {
      uuid: 'e0981dc3-ad2d-4bd4-864c-5a44628adf08',
      codigo: 'SRV',
      nombre: 'Servicio',
      abreviatura: 'SRV',
      activo: true,
    },
  },
  {
    uuid: 'b05d0d80-6013-4335-a8e1-783f8eac9192',
    codigoReferencia: 'REC-CUCH-30',
    nombre: 'Rectificado Cuchilla Cepillo 30cm',
    descripcion: 'Rectificado plano de precisión con refrigeración y tolerancias micrométricas.',
    naturaleza: 'SERVICIO',
    precioBase: 32000,
    stockReferencial: null,
    activo: true,
    unidadPresentacion: {
      uuid: 'e0981dc3-ad2d-4bd4-864c-5a44628adf08',
      codigo: 'SRV',
      nombre: 'Servicio',
      abreviatura: 'SRV',
      activo: true,
    },
  },
  {
    uuid: 'b05d0d80-6013-4335-a8e1-783f8eac9193',
    codigoReferencia: 'AFIL-FRES-CNC',
    nombre: 'Vaciado y Calibración Fresa CNC',
    descripcion: 'Afilado helicoidal de geometrías complejas para centros de mecanizado.',
    naturaleza: 'SERVICIO',
    precioBase: 48000,
    stockReferencial: null,
    activo: true,
    unidadPresentacion: {
      uuid: 'e0981dc3-ad2d-4bd4-864c-5a44628adf08',
      codigo: 'SRV',
      nombre: 'Servicio',
      abreviatura: 'SRV',
      activo: true,
    },
  },
  // Productos / Materiales con unidades UND, KG, LT
  {
    uuid: 'c05d0d80-6013-4335-a8e1-783f8eac9201',
    codigoReferencia: 'MAT-WID-42',
    nombre: 'Diente Widia K20 4.2mm',
    descripcion: 'Plaquita de carburo de tungsteno grano medio para discos de corte.',
    naturaleza: 'INVENTARIO',
    precioBase: 12500,
    stockReferencial: 140,
    activo: true,
    unidadPresentacion: {
      uuid: 'a4c0bd8b-d293-4b33-84ef-7909e9517345',
      codigo: 'UND',
      nombre: 'Unidad',
      abreviatura: 'UND',
      activo: true,
    },
  },
  {
    uuid: 'c05d0d80-6013-4335-a8e1-783f8eac9202',
    codigoReferencia: 'MAT-MUE-125',
    nombre: 'Muela Diamantada Resinoide 125mm',
    descripcion: 'Disco abrasivo de acabado para afilado de herramientas en húmedo.',
    naturaleza: 'INVENTARIO',
    precioBase: 185000,
    stockReferencial: 8,
    activo: true,
    unidadPresentacion: {
      uuid: 'a4c0bd8b-d293-4b33-84ef-7909e9517345',
      codigo: 'UND',
      nombre: 'Unidad',
      abreviatura: 'UND',
      activo: true,
    },
  },
  {
    uuid: 'c05d0d80-6013-4335-a8e1-783f8eac9203',
    codigoReferencia: 'MAT-SOL-PL45',
    nombre: 'Soldadura de Plata 45% (Tira / KG)',
    descripcion: 'Varilla para brasaje fuerte de plaquitas de corte con fundente.',
    naturaleza: 'INVENTARIO',
    precioBase: 95000,
    stockReferencial: 25,
    activo: true,
    unidadPresentacion: {
      uuid: 'd19fc028-0237-459c-bbed-bfe65ec62036',
      codigo: 'KG',
      nombre: 'Kilogramo',
      abreviatura: 'KG',
      activo: true,
    },
  },
  {
    uuid: 'c05d0d80-6013-4335-a8e1-783f8eac9204',
    codigoReferencia: 'MAT-TAL-GAL',
    nombre: 'Refrigerante Sintético Taladrina (Galón / LT)',
    descripcion: 'Fluido emulsionable biodegradable para refrigeración de rectificadoras.',
    naturaleza: 'INVENTARIO',
    precioBase: 42000,
    stockReferencial: 30,
    activo: true,
    unidadPresentacion: {
      uuid: '5dc334cc-e7ba-4e9e-95f9-b47c9fb62fbd',
      codigo: 'LT',
      nombre: 'Litro',
      abreviatura: 'LT',
      activo: true,
    },
  },
];

export const PARAMETROS_SISTEMA_DEFAULT: ParametroSistema[] = [
  {
    uuid: 'p-1',
    clave: 'dias_compromiso_entrega',
    descripcion: 'Días estándar hábiles pactados con el cliente para procesar y entregar la solicitud.',
    categoria: 'SOLICITUDES',
    valorJson: '2',
  },
  {
    uuid: 'p-2',
    clave: 'porcentaje_minimo_anticipo',
    descripcion: 'Porcentaje mínimo exigido al cliente sobre el valor de servicios para iniciar el trabajo en taller.',
    categoria: 'SOLICITUDES',
    valorJson: '40',
  },
  {
    uuid: 'p-3',
    clave: 'monto_minimo_anticipo_cop',
    descripcion: 'Valor mínimo absoluto en COP permitido como anticipo en mostrador.',
    categoria: 'SOLICITUDES',
    valorJson: '10000',
  },
  {
    uuid: 'p-4',
    clave: 'hora_limite_recepcion_mismo_dia',
    descripcion: 'Hora militar a partir de la cual las órdenes pasan a promesa del día hábil siguiente.',
    categoria: 'SOLICITUDES',
    valorJson: '16:00',
  },
  {
    uuid: 'p-5',
    clave: 'limite_efectivo_caja_menor',
    descripcion: 'Monto máximo acumulado en caja antes de exigir un arqueo o consignación a bóveda.',
    categoria: 'TESORERIA',
    valorJson: '1500000',
  },
  {
    uuid: 'p-6',
    clave: 'tolerancia_descuadre_caja_ciego',
    descripcion: 'Monto máximo en COP permitido de diferencia entre conteo físico y sistema sin generar bloqueo.',
    categoria: 'TESORERIA',
    valorJson: '5000',
  },
  {
    uuid: 'p-7',
    clave: 'denominaciones_efectivo',
    descripcion: 'Catálogo de valores admitidos para arqueos y conteo físico de caja.',
    categoria: 'TESORERIA',
    valorJson: JSON.stringify([100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50]),
  },
  {
    uuid: 'p-8',
    clave: 'requiere_vobo_saldo_pendiente_entrega',
    descripcion: 'Si está activo, ninguna entrega puede completarse sin cubrir el 100% o requerir PIN de supervisor.',
    categoria: 'GENERAL',
    valorJson: 'true',
  },
  {
    uuid: 'p-9',
    clave: 'tiempo_inactividad_bloqueo_minutos',
    descripcion: 'Minutos sin interacción antes de solicitar el PIN o credenciales de usuario.',
    categoria: 'GENERAL',
    valorJson: '15',
  },
  {
    uuid: 'p-10',
    clave: 'permitir_venta_sin_stock',
    descripcion: 'Permite registrar líneas de producto físico aunque el stock esté en 0.',
    categoria: 'GENERAL',
    valorJson: 'false',
  },
  {
    uuid: 'p-11',
    clave: 'notificaciones_whatsapp_cliente',
    descripcion: 'Envío automático de mensaje cuando la orden esté lista para entrega o despachada.',
    categoria: 'INTEGRACION',
    valorJson: 'true',
  },
  {
    uuid: 'p-12',
    clave: 'webhook_facturacion_electronica_url',
    descripcion: 'Endpoint del proveedor tecnológico para emisión de factura electrónica.',
    categoria: 'INTEGRACION',
    valorJson: 'https://fe.afilamoshermanos.com/api/v1/invoices',
  },
];

let cachedMediosPagoArbol: { categorias: MedioPagoCategoria[] } | null = null;
let pendingMediosPagoArbolPromise: Promise<{ categorias: MedioPagoCategoria[] }> | null = null;
let paymentMethodsFetchCount = 0;

export const getPaymentMethodsFetchCount = (): number => paymentMethodsFetchCount;
export const resetPaymentMethodsCache = (): void => {
  cachedMediosPagoArbol = null;
  pendingMediosPagoArbolPromise = null;
  paymentMethodsFetchCount = 0;
};

export const catalogosApi = {
  async getItems(params?: { q?: string; naturaleza?: string; activo?: boolean; page?: number; pageSize?: number }): Promise<ItemsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.q) {
      searchParams.set('q', params.q);
      searchParams.set('search', params.q);
    }
    if (params?.naturaleza) searchParams.set('nature', params.naturaleza);
    if (params?.activo !== undefined) searchParams.set('activeOnly', String(params.activo));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    let itemsFromApi: ItemCatalogo[] = [];
    try {
      const qs = searchParams.toString();
      const res = await api.get<any>(`/catalogs/items${qs ? `?${qs}` : ''}`);
      const rawItems = Array.isArray(res) ? res : (res?.items || []);
      itemsFromApi = rawItems.map((i: any) => {
        const esServicio = (i.nature === 'SERVICE' || i.nature === 'SERVICIO' || i.type === 'SERVICE' || i.itemsTypeCode === 'SERVICE');
        const unitUuid = i.unitId || (esServicio ? '8f647d36-b43d-4f21-aa1a-005ad16ce290' : '28ef0c77-3ec8-46af-bae5-7646a650af67');
        const unitCode = esServicio ? 'SRV' : (i.unit || 'UND');
        return {
          uuid: i.id || i.uuid,
          codigoReferencia: i.code || i.codigoReferencia,
          nombre: i.name || i.nombre,
          descripcion: i.description || i.descripcion || '',
          naturaleza: esServicio ? 'SERVICIO' : 'INVENTARIO',
          precioBase: i.price ?? i.precioBase ?? i.minPrice ?? 0,
          stockReferencial: i.stockReferencial ?? (esServicio ? null : (i.stock ?? 25)),
          activo: i.active ?? true,
          unidadPresentacion: {
            uuid: unitUuid,
            codigo: unitCode,
            nombre: unitCode === 'SRV' ? 'Servicio' : 'Unidad',
            abreviatura: unitCode,
            activo: true,
          },
        };
      });
    } catch {
      // Fallback
    }

    // Unir con el catálogo semilla garantizando que existan tanto productos como servicios con sus unidades
    const allItems = [...itemsFromApi];
    for (const seed of CATALOGO_ITEMS_SEED) {
      if (!allItems.some(it => it.codigoReferencia === seed.codigoReferencia)) {
        allItems.push(seed);
      }
    }

    let filtered = allItems;
    if (params?.naturaleza) {
      filtered = filtered.filter(it => it.naturaleza === params.naturaleza);
    }
    if (params?.q) {
      const qLower = params.q.toLowerCase();
      filtered = filtered.filter(it =>
        it.nombre.toLowerCase().includes(qLower) ||
        it.codigoReferencia.toLowerCase().includes(qLower) ||
        it.descripcion.toLowerCase().includes(qLower)
      );
    }

    return {
      items: filtered,
      total: filtered.length,
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
    categoriaUuid?: string;
    listaPrecioUuid?: string | null;
  }): Promise<ItemCatalogo> {
    const isService = (dto.naturaleza === 'SERVICIO' || dto.naturaleza === 'SERVICE');
    const upsertPayload = {
      code: dto.codigoReferencia,
      name: dto.nombre,
      description: dto.descripcion || '',
      itemsTypeCode: isService ? 'SERVICE' : 'INVENTORY',
      unitId: dto.uuidUnidadPresentacion,
      minPrice: dto.precioBase,
      price: dto.precioBase,
      stock: dto.stockReferencial || 0,
      minStock: 0,
      allowBackorder: false,
      // Compatibilidad alias en español
      codigoReferencia: dto.codigoReferencia,
      nombre: dto.nombre,
      naturaleza: dto.naturaleza,
      uuidUnidadPresentacion: dto.uuidUnidadPresentacion,
      precioBase: dto.precioBase,
    };
    return api.post<ItemCatalogo>('/items', upsertPayload);
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

  async getTiposDocumentoIdentidad(token?: string): Promise<{ tipos: TipoDocumentoIdentidad[] }> {
    try {
      const res = await api.get<any>('/catalogs/document-types', token);
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

  async getCanalesOrigen(token?: string): Promise<{ canales: CanalOrigen[] }> {
    try {
      const res = await api.get<any>('/catalogs/channels', token);
      const raw = Array.isArray(res) ? res : (res?.channels || res?.canales || res?.items || []);
      return {
        canales: raw.map((c: any) => ({
          uuid: c.id || c.uuid,
          codigo: c.code || c.codigo,
          nombre: c.name || c.nombre,
          esPredeterminado: c.isDefault ?? c.esPredeterminado ?? false,
          activo: c.active ?? c.activo ?? true,
        })),
      };
    } catch {
      return { canales: [] };
    }
  },


  async crearCanalOrigen(dto: { codigo: string; nombre: string }): Promise<CanalOrigen> {
    return api.post<CanalOrigen>('/catalogs/channels', dto);
  },

  async getTiposDocumento(_codigoBase?: string, token?: string): Promise<{ tipos: TipoDocumentoBase[] }> {
    try {
      const res = await api.get<any>('/catalogs/document-types', token);
      const raw = Array.isArray(res) ? res : (res?.documentTypes || res?.tipos || res?.items || []);
      return {
        tipos: raw.map((d: any) => ({
          uuid: d.id || d.uuid,
          codigoBase: d.code || d.codigo || d.codigoBase,
          nombre: d.name || d.nombre,
          disparaWorkflow: d.disparaWorkflow ?? false,
          subtipos: (d.subtipos || []).map((st: any) => ({
            uuid: st.uuid || st.id || `sub-${d.id}`,
            tipoBaseUuid: d.id || d.uuid,
            codigoSubtipo: st.codigo || st.code || st.codigoSubtipo || d.code,
            nombre: st.nombre || st.name || d.name,
            activo: st.activo ?? st.active ?? true,
            prefijo: st.prefijo || d.code || d.codigo,
            sufijo: st.sufijo || st.suffix || '',
            folioActual: st.folioActual ?? 0,
            longitudCeros: st.longitudCeros ?? st.numberLength ?? 4,
            formatoPlantilla: st.formatoPlantilla || 'TIRILLA',
          })),
        })),
      };
    } catch {
      return { tipos: [] };
    }
  },

  async getSubtiposPorTipo(tipoId: string, q?: string, token?: string): Promise<{ subtipos: SubtipoDocumento[] }> {
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await api.get<any>(`/catalogs/document-types/${tipoId}/subtypes${qs}`, token);
      const raw = Array.isArray(res) ? res : (res?.subtipos || res?.subtypes || res?.items || []);
      return {
        subtipos: raw.map((st: any) => ({
          uuid: st.uuid || st.id || `sub-${tipoId}`,
          codigoSubtipo: st.codigo || st.code || st.codigoSubtipo || '',
          nombre: st.nombre || st.name || '',
          descripcion: st.description || st.descripcion || '',
          prefijo: st.prefijo || st.codigo || st.code || 'DOC',
          sufijo: st.sufijo || st.suffix || '',
          folioActual: st.folioActual ?? 1,
          longitudCeros: st.longitudCeros ?? st.numberLength ?? 4,
          formatoPlantilla: st.formatoPlantilla || 'TIRILLA',
          formatoPapel: st.formatoPapel || 'TIRILLA_80MM',
          imprimeAlAsentar: st.imprimeAlAsentar ?? false,
          activo: st.activo ?? st.active ?? true,
        })),
      };
    } catch {
      return { subtipos: [] };
    }
  },

  async crearSubtipo(
    tipoId: string,
    dto: { codigo?: string; codigoSubtipo?: string; nombre: string; activo?: boolean; [key: string]: any },
    token?: string
  ): Promise<any> {
    const payload = {
      ...dto,
      codigo: dto.codigo || dto.codigoSubtipo || '',
      nombre: dto.nombre,
      activo: dto.activo ?? true,
    };
    return api.post<any>(`/catalogs/document-types/${tipoId}/subtypes`, payload, token);
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

  async getCajas(includeInactive: boolean = false, token?: string): Promise<{ cajas: Caja[] }> {
    try {
      const query = includeInactive ? '?includeInactive=true' : '';
      const res = await api.get<any>(`/configuration/cash-registers${query}`, token);
      const raw = Array.isArray(res) ? res : (res?.registers || res?.cajas || []);
      return {
        cajas: raw.map((r: any) => ({
          uuid: r.id || r.uuid,
          codigoCaja: r.code || r.codigoCaja,
          nombre: r.name || r.nombre,
          ubicacion: r.physicalLocation || r.ubicacion || '',
          activa: r.active ?? r.activa ?? true,
        })),
      };
    } catch {
      return { cajas: [] };
    }
  },

  async crearCaja(
    dto: { codigoCaja: string; nombre: string; ubicacion: string; [key: string]: any },
    token?: string
  ): Promise<Caja> {
    const payload = {
      code: dto.codigoCaja,
      codigoCaja: dto.codigoCaja,
      name: dto.nombre,
      nombre: dto.nombre,
      physicalLocation: dto.ubicacion,
      ubicacion: dto.ubicacion,
    };
    return api.post<Caja>('/configuration/cash-registers', payload, token);
  },

  async actualizarCaja(
    uuid: string,
    dto: { nombre: string; ubicacion: string; [key: string]: any },
    token?: string
  ): Promise<Caja> {
    const payload = {
      name: dto.nombre,
      nombre: dto.nombre,
      physicalLocation: dto.ubicacion,
      ubicacion: dto.ubicacion,
    };
    return api.put<Caja>(`/configuration/cash-registers/${uuid}`, payload, token);
  },

  async setCajaActiva(uuid: string, activo: boolean, token?: string): Promise<void> {
    await api.patch<void>(`/configuration/cash-registers/${uuid}/active`, { activo, active: activo }, token);
  },

  async getMediosPagoArbol(token?: string, forceRefresh = false): Promise<{ categorias: MedioPagoCategoria[] }> {
    if (!forceRefresh && cachedMediosPagoArbol) {
      return cachedMediosPagoArbol;
    }
    if (!forceRefresh && pendingMediosPagoArbolPromise) {
      return pendingMediosPagoArbolPromise;
    }

    pendingMediosPagoArbolPromise = (async () => {
      try {
        paymentMethodsFetchCount++;
        // Cargar reglas personalizadas guardadas
        let reglasGuardadas: Record<string, Partial<MedioPagoCategoria>> = {};
        try {
          const rawReglas = localStorage.getItem('ordeon_reglas_formas_pago');
          if (rawReglas) reglasGuardadas = JSON.parse(rawReglas);
        } catch {
          // ignore
        }

        const res = await api.get<any>('/catalogs/payment-methods?includeInactive=true', token);
        const raw = Array.isArray(res) ? res : (res?.paymentMethods || res?.items || res?.instrumentos || []);
        const instrumentos: MedioPagoInstrumento[] = raw.map((m: any) => {
          const cod = String(m.code || m.codigo || '').toUpperCase();
          const esCredito = cod.startsWith('CRED');
          const esValidaEnCierre = m.validaEnCierre !== undefined ? Boolean(m.validaEnCierre) : !esCredito;
          const cat = cod.includes('EFECTIVO') || cod === 'CASH'
            ? 'EFECTIVO'
            : (cod.includes('TRANSF') || cod.includes('BANCO') || cod.includes('CONSIGN') || cod.includes('NEQUI') || cod.includes('DAVI'))
            ? 'TRANSFERENCIA'
            : (cod.includes('TARJ') || cod.includes('DATA'))
            ? 'TARJETA'
            : esCredito
            ? 'CREDITO'
            : 'OTROS';

          let proveedor: string | undefined = undefined;
          if (cat === 'TRANSFERENCIA' || cat === 'TARJETA') {
            proveedor = m.nombre?.includes('Bold') || cod.includes('BOLD') ? 'Bold' : (cod.includes('REDE') ? 'Redeban' : 'Bold');
          }

          return {
            uuid: m.id || m.uuid,
            codigo: cod,
            nombre: m.name || m.nombre,
            categoria: cat,
            esHoja: true,
            requiereReferencia: m.requiereReferencia !== undefined ? Boolean(m.requiereReferencia) : (!cod.includes('EFECTIVO') && !esCredito),
            diasCredito: esCredito ? (m.diasCredito || (cod.includes('15') ? 15 : cod.includes('30') ? 30 : cod.includes('60') ? 60 : cod.includes('90') ? 90 : cod.includes('120') ? 120 : 30)) : undefined,
            validaEnCierre: esValidaEnCierre,
            permiteEnCierre: esValidaEnCierre,
            isDefault: Boolean(m.isDefault ?? m.esPorDefecto ?? m.is_default ?? false),
            esPorDefecto: Boolean(m.isDefault ?? m.esPorDefecto ?? m.is_default ?? false),
            activo: m.active !== undefined ? Boolean(m.active) : (m.activo !== undefined ? Boolean(m.activo) : true),
            proveedor,
            parentId: m.parentId || m.paymentMethodParentId,
          };
        });

        // Asegurar que existan los instrumentos canónicos requeridos por la norma de negocio
        const asegurarInstrumento = (
          codigo: string,
          nombre: string,
          categoria: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CREDITO' | 'OTROS',
          validaEnCierre: boolean,
          requiereRef: boolean,
          diasCred?: number,
          proveedor?: string
        ) => {
          const existe = instrumentos.find((i) => i.codigo === codigo);
          if (!existe) {
            instrumentos.push({
              uuid: `inst-${codigo.toLowerCase()}`,
              codigo,
              nombre,
              categoria,
              esHoja: true,
              requiereReferencia: requiereRef,
              validaEnCierre,
              permiteEnCierre: validaEnCierre,
              diasCredito: diasCred,
              activo: true,
              isDefault: codigo === 'EFECTIVO',
              esPorDefecto: codigo === 'EFECTIVO',
              proveedor,
            });
          }
        };

        asegurarInstrumento('EFECTIVO', 'Efectivo', 'EFECTIVO', true, false);
        asegurarInstrumento('TRANSFERENCIA', 'Bold (Transferencias y Consignaciones)', 'TRANSFERENCIA', true, true, undefined, 'Bold');
        asegurarInstrumento('TARJETA', 'Bold (Datáfono Tarjetas)', 'TARJETA', true, true, undefined, 'Bold');
        asegurarInstrumento('CRED_15', 'Crédito a 15 días', 'CREDITO', false, false, 15);
        asegurarInstrumento('CRED_30', 'Crédito a 30 días', 'CREDITO', false, false, 30);
        asegurarInstrumento('CRED_60', 'Crédito a 60 días', 'CREDITO', false, false, 60);
        asegurarInstrumento('CRED_90', 'Crédito a 90 días', 'CREDITO', false, false, 90);
        asegurarInstrumento('CRED_120', 'Crédito a 120 días', 'CREDITO', false, false, 120);
        asegurarInstrumento('CHEQUE', 'Cheque', 'OTROS', true, true);

        // Estructura oficial de 5 categorías macro con sus reglas dinámicas
        const categoriasBase: MedioPagoCategoria[] = [
          {
            uuid: 'cat-efectivo',
            codigo: 'EFECTIVO',
            nombre: 'Efectivo',
            orden: 1,
            icono: '💵',
            descripcion: 'Conteo físico por denominación en arqueos y cierres Z',
            activo: true,
            requiereReferencia: false,
            validaEnCierre: true,
            permiteCredito: false,
            requiereProveedor: false,
            instrumentos: [],
          },
          {
            uuid: 'cat-transferencia',
            codigo: 'TRANSFERENCIA',
            nombre: 'Transferencia bancaria y Consignaciones',
            orden: 2,
            icono: '🏦',
            descripcion: 'Transferencias y consignaciones con validación de comprobante / Bold',
            activo: true,
            requiereReferencia: true,
            validaEnCierre: true,
            permiteCredito: false,
            requiereProveedor: true,
            instrumentos: [],
          },
          {
            uuid: 'cat-tarjeta',
            codigo: 'TARJETA',
            nombre: 'Tarjetas débito y Crédito (Datáfono)',
            orden: 3,
            icono: '💳',
            descripcion: 'Vouchers y autorizaciones electrónicas de datáfono / Bold',
            activo: true,
            requiereReferencia: true,
            validaEnCierre: true,
            permiteCredito: false,
            requiereProveedor: true,
            instrumentos: [],
          },
          {
            uuid: 'cat-credito',
            codigo: 'CREDITO',
            nombre: 'Créditos comerciales (Cuentas por cobrar)',
            orden: 4,
            icono: '⏱️',
            descripcion: 'Otorgamiento de plazo de pago en días con control de cartera',
            activo: true,
            requiereReferencia: false,
            validaEnCierre: false,
            permiteCredito: true,
            requiereProveedor: false,
            instrumentos: [],
          },
          {
            uuid: 'cat-otros',
            codigo: 'OTROS',
            nombre: 'Otros',
            orden: 5,
            icono: '📄',
            descripcion: 'Cheques y otros instrumentos especiales',
            activo: true,
            requiereReferencia: true,
            validaEnCierre: true,
            permiteCredito: false,
            requiereProveedor: false,
            instrumentos: [],
          },
        ];

        // Mezclar con las reglas guardadas y asignar hijos dinámicamente
        const categorias: MedioPagoCategoria[] = categoriasBase.map((cat) => {
          const custom = reglasGuardadas[cat.codigo];
          const catMerged: MedioPagoCategoria = {
            ...cat,
            ...(custom || {}),
            instrumentos: [],
          };

          // Filtrar los instrumentos que corresponden a esta categoría
          const hijos = instrumentos.filter((i) => {
            if (cat.codigo === 'EFECTIVO') return i.categoria === 'EFECTIVO';
            if (cat.codigo === 'TRANSFERENCIA') return i.categoria === 'TRANSFERENCIA';
            if (cat.codigo === 'TARJETA') return i.categoria === 'TARJETA';
            if (cat.codigo === 'CREDITO') return i.categoria === 'CREDITO';
            return i.categoria === 'OTROS';
          }).map((h) => ({
            ...h,
            // Las reglas del padre aplican dinámicamente a todos los hijos
            requiereReferencia: catMerged.requiereReferencia,
            validaEnCierre: catMerged.validaEnCierre,
            permiteEnCierre: catMerged.validaEnCierre,
            // Si la categoría padre está inactiva, sus hijos también se apagan
            activo: catMerged.activo ? h.activo : false,
          }));

          catMerged.instrumentos = hijos;
          return catMerged;
        });

        const result = { categorias };
        cachedMediosPagoArbol = result;
        return result;
      } catch {
        return { categorias: [] };
      } finally {
        pendingMediosPagoArbolPromise = null;
      }
    })();

    return pendingMediosPagoArbolPromise;
  },

  async actualizarCategoriaMedioPago(
    codigoCategoria: string,
    cambios: Partial<MedioPagoCategoria>,
    _token?: string
  ): Promise<void> {
    try {
      let reglas: Record<string, Partial<MedioPagoCategoria>> = {};
      const raw = localStorage.getItem('ordeon_reglas_formas_pago');
      if (raw) reglas = JSON.parse(raw);
      reglas[codigoCategoria] = {
        ...(reglas[codigoCategoria] || {}),
        ...cambios,
      };
      localStorage.setItem('ordeon_reglas_formas_pago', JSON.stringify(reglas));
      cachedMediosPagoArbol = null; // invalidar cache
    } catch (e) {
      console.warn('Error guardando reglas de categoria en localStorage:', e);
    }
  },

  async getMediosPagoInstrumentos(token?: string, forceRefresh = false): Promise<{ instrumentos: MedioPagoInstrumento[] }> {
    const arbol = await this.getMediosPagoArbol(token, forceRefresh);
    const instrumentos = arbol.categorias.flatMap((c) => c.instrumentos);
    return { instrumentos };
  },

  async crearMedioPagoInstrumento(dto: {
    codigoCategoria: string;
    codigo: string;
    nombre: string;
    requiereReferencia?: boolean;
    diasCredito?: number;
    proveedor?: string;
    isDefault?: boolean;
    esPorDefecto?: boolean;
    activo?: boolean;
  }, token?: string): Promise<MedioPagoInstrumento> {
    cachedMediosPagoArbol = null;
    return api.post<MedioPagoInstrumento>('/catalogs/payment-methods', dto, token);
  },

  async actualizarMedioPagoInstrumento(
    uuid: string,
    dto: {
      nombre: string;
      codigo?: string;
      diasCredito?: number;
      proveedor?: string;
      requiereReferencia?: boolean;
      activo?: boolean;
      isDefault?: boolean;
    },
    token?: string
  ): Promise<MedioPagoInstrumento> {
    cachedMediosPagoArbol = null;
    return api.put<MedioPagoInstrumento>(`/catalogs/payment-methods/${uuid}`, dto, token);
  },

  async setMedioPagoActivo(uuid: string, activo: boolean, token?: string): Promise<{ activo: boolean }> {
    cachedMediosPagoArbol = null;
    return api.patch<{ activo: boolean }>(`/catalogs/payment-methods/${uuid}/active`, { activo }, token);
  },

  async eliminarMedioPagoInstrumento(uuid: string, token?: string): Promise<void> {
    cachedMediosPagoArbol = null;
    return api.delete(`/catalogs/payment-methods/${uuid}`, token);
  },

  async setMedioPagoDefault(uuid: string, token?: string): Promise<MedioPagoInstrumento> {
    cachedMediosPagoArbol = null;
    return api.patch<MedioPagoInstrumento>(`/catalogs/payment-methods/${uuid}/default`, {}, token);
  },

  async getClientes(q?: string, pageSize?: number, token?: string): Promise<{ clientes: Cliente[]; total: number }> {
    try {
      const searchParams = new URLSearchParams();
      if (q) {
        searchParams.set('q', q);
        searchParams.set('search', q);
      }
      if (pageSize) {
        searchParams.set('pageSize', String(pageSize));
      }
      const qs = searchParams.toString();
      const res = await api.get<any>(`/customers${qs ? `?${qs}` : ''}`, token);
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
        numeroDocumento: c.code || c.documentNumber || '',
        nombreRazonSocial: c.name || c.nombreRazonSocial || '',
        telefono: c.phone || c.telefono || '',
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

  async getParametros(token?: string): Promise<{ parametros: ParametroSistema[] }> {
    try {
      const res = await api.get<any>('/configuration/parameters', token);
      const raw = Array.isArray(res) ? res : (res?.parameters || []);
      if (raw.length > 0) {
        return {
                    parametros: raw.map((p: any) => ({
            uuid: p.id || p.uuid || p.key,
            clave: p.key,
            descripcion: p.description || '',
            categoria: p.category || 'GENERAL',
            valorJson: typeof p.value === 'string' ? p.value : JSON.stringify(p.value ?? ''),
          })),
        };
      }
    } catch {
      // Fallback a catálogo completo de parámetros del sistema
    }

    const overrides = (() => {
      try {
        return JSON.parse(localStorage.getItem('ordeon_parametros_override') || '{}');
      } catch {
        return {};
      }
    })();

    const list = PARAMETROS_SISTEMA_DEFAULT.map((p) => ({
      ...p,
      valorJson: overrides[p.clave] !== undefined ? overrides[p.clave] : p.valorJson,
    }));

    return { parametros: list };
  },

  async actualizarParametro(clave: string, valor: any, token?: string): Promise<any> {
    let payload = valor;
    if (typeof valor === 'string') {
      try {
        payload = JSON.parse(valor);
      } catch {
        payload = valor;
      }
    }
    return api.put<any>(`/configuration/parameters/${clave}`, payload, token);
  },

  async getCategoriasItem(): Promise<{ categorias: CategoriaItem[] }> {
    const res = await api.get<any>('/catalogs/categories?tree=false');
    const raw = Array.isArray(res) ? res : (res?.categories || res?.categorias || res?.items || []);
    return {
      categorias: raw.map((c: any) => ({
        uuid: c.id || c.uuid,
        codigo: c.code || c.codigo,
        nombre: c.name || c.nombre,
        nivel: c.level ?? c.nivel ?? 1,
        activo: c.active ?? c.activo ?? true,
      })),
    };
  },

  async crearCategoriaItem(dto: {
    codigo: string;
    nombre: string;
    categoriaPadreUuid?: string | null;
  }): Promise<CategoriaItem> {
    const res = await api.post<any>('/catalogs/categories', {
      code: dto.codigo,
      codigo: dto.codigo,
      name: dto.nombre,
      parentId: dto.categoriaPadreUuid || null,
    });
    return {
      uuid: res.id || res.uuid,
      codigo: res.code || res.codigo || dto.codigo,
      nombre: res.name || res.nombre || dto.nombre,
      nivel: res.level ?? res.nivel ?? 1,
      activo: res.active ?? true,
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
    const res = await api.put<any>(`/categories/${uuid}`, {
      code: 'CAT',
      name: dto.nombre,
      parentId: dto.categoriaPadreUuid || null,
      sortOrder: dto.nivel,
    });
    return {
      uuid: res?.id || uuid,
      codigo: res?.code || 'CAT',
      nombre: res?.name || dto.nombre,
      nivel: res?.level ?? dto.nivel,
      activo: res?.active ?? true,
    };
  },

  async setCategoriaItemActivo(uuid: string, activo: boolean): Promise<void> {
    await api.patch<void>(`/categories/${uuid}/status`, { active: activo });
  },

  async getPaymentRules(token?: string): Promise<any> {
    try {
      const res = await api.get<any>('/configuration/payment-rules', token);
      return res || { rules: [], allowBypassWithSupervisorPin: true };
    } catch {
      return { rules: [], allowBypassWithSupervisorPin: true };
    }
  },

  async actualizarPaymentRules(policy: any, token?: string): Promise<any> {
    return api.put<any>('/configuration/payment-rules', policy, token);
  },

  async validarPaymentRules(
    req: {
      items?: Array<{
        itemTypeCode?: string | null;
        tipoItem?: string | null;
        quantity?: number;
        unitPrice?: number;
        lineTotal?: number | null;
      }>;
      totalPaid?: number;
      montoAbonado?: number;
      supervisorPin?: string | null;
    },
    token?: string
  ): Promise<any> {
    return api.post<any>('/configuration/payment-rules/validate', req, token);
  },

  async getDocumentSubtypes(token?: string): Promise<SubtipoDocumento[]> {
    try {
      const res = await api.get<any>('/catalogs/document-subtypes', token);
      return Array.isArray(res) ? res : (res?.items || res?.subtypes || []);
    } catch {
      return [];
    }
  },

  async getCategoriesTree(token?: string): Promise<any[]> {
    try {
      const res = await api.get<any>('/categories/tree', token);
      return Array.isArray(res) ? res : (res?.tree || res?.items || []);
    } catch {
      return [];
    }
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
