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
    uuid: 'srv-1',
    codigoReferencia: 'AFIL-CUCH-01',
    nombre: 'Afilado Cuchillo Profesional / Chef',
    descripcion: 'Afilado artesanal al agua con rectificado de filo y pulido espejo.',
    naturaleza: 'SERVICIO',
    precioBase: 15000,
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
    uuid: 'srv-2',
    codigoReferencia: 'REC-CUCH-30',
    nombre: 'Rectificado Cuchilla Cepillo 30cm',
    descripcion: 'Rectificado plano de precisión con refrigeración y tolerancias micrométricas.',
    naturaleza: 'SERVICIO',
    precioBase: 32000,
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
    uuid: 'srv-3',
    codigoReferencia: 'AFIL-FRES-CNC',
    nombre: 'Vaciado y Calibración Fresa CNC',
    descripcion: 'Afilado helicoidal de geometrías complejas para centros de mecanizado.',
    naturaleza: 'SERVICIO',
    precioBase: 48000,
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
  // Productos / Materiales con unidades UND, KG, LT
  {
    uuid: 'prd-1',
    codigoReferencia: 'MAT-WID-42',
    nombre: 'Diente Widia K20 4.2mm',
    descripcion: 'Plaquita de carburo de tungsteno grano medio para discos de corte.',
    naturaleza: 'INVENTARIO',
    precioBase: 12500,
    stockReferencial: 140,
    activo: true,
    unidadPresentacion: {
      uuid: '28ef0c77-3ec8-46af-bae5-7646a650af67',
      codigo: 'UND',
      nombre: 'Unidad',
      abreviatura: 'UND',
      activo: true,
    },
  },
  {
    uuid: 'prd-2',
    codigoReferencia: 'MAT-MUE-125',
    nombre: 'Muela Diamantada Resinoide 125mm',
    descripcion: 'Disco abrasivo de acabado para afilado de herramientas en húmedo.',
    naturaleza: 'INVENTARIO',
    precioBase: 185000,
    stockReferencial: 8,
    activo: true,
    unidadPresentacion: {
      uuid: '28ef0c77-3ec8-46af-bae5-7646a650af67',
      codigo: 'UND',
      nombre: 'Unidad',
      abreviatura: 'UND',
      activo: true,
    },
  },
  {
    uuid: 'prd-3',
    codigoReferencia: 'MAT-SOL-PL45',
    nombre: 'Soldadura de Plata 45% (Tira / KG)',
    descripcion: 'Varilla para brasaje fuerte de plaquitas de corte con fundente.',
    naturaleza: 'INVENTARIO',
    precioBase: 95000,
    stockReferencial: 25,
    activo: true,
    unidadPresentacion: {
      uuid: 'bb41ad8f-1fb8-4b02-9652-7124853d7649',
      codigo: 'KG',
      nombre: 'Kilogramo',
      abreviatura: 'KG',
      activo: true,
    },
  },
  {
    uuid: 'prd-4',
    codigoReferencia: 'MAT-TAL-GAL',
    nombre: 'Refrigerante Sintético Taladrina (Galón / LT)',
    descripcion: 'Fluido emulsionable biodegradable para refrigeración de rectificadoras.',
    naturaleza: 'INVENTARIO',
    precioBase: 42000,
    stockReferencial: 30,
    activo: true,
    unidadPresentacion: {
      uuid: '915fda04-7175-4b2a-b577-d09648599bed',
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

  async getTiposDocumento(_codigoBase?: string): Promise<{ tipos: TipoDocumentoBase[] }> {
    try {
      const res = await api.get<any>('/catalogs/document-types');
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
            folioActual: st.folioActual ?? 1,
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
          folioActual: st.folioActual ?? 1,
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

  async getClientes(q?: string, pageSize?: number): Promise<{ clientes: Cliente[]; total: number }> {
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
      const res = await api.get<any>(`/customers${qs ? `?${qs}` : ''}`);
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
