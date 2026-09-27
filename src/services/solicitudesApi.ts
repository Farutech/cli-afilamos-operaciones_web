import { api } from './api';
import type {
  SolicitudDetalleDto,
  CrearSolicitudRequest,
  RegistroRapidoClienteRequest,
  AutorizarExcepcionRequest,
  ItemSolicitudCreacion,
  ItemOperacionDto,
} from '../types/solicitudes';
import type { Cliente } from '../types/catalogos';

function mapRequestDetails(res: any): SolicitudDetalleDto {
  const items: ItemOperacionDto[] = (res?.items || []).map((it: any) => ({
    publicId: it.id || it.publicId || String(it.lineNumber),
    codigo: it.itemCode || it.codigo || 'SRV',
    naturaleza: (it.itemsTypeCode === 'SERVICE' || it.naturaleza === 'SERVICIO') ? 'SERVICIO' : 'INVENTARIO',
    descripcion: it.itemName || it.descripcion || it.technicalObservation || 'Item',
    cantidad: it.quantity ?? 1,
    precioUnitario: it.unitPrice ?? 0,
    subtotal: it.lineTotal ?? (it.quantity * it.unitPrice),
    exigeAnticipoObligatorio: it.itemsTypeCode === 'SERVICE',
    porcentajeAnticipoMinimo: 30,
    anticipoMinimoRequerido: (it.lineTotal ?? 0) * 0.3,
    anticipoDirectoImputado: 0,
    saldoPendienteItem: it.remainingQuantity ? (it.remainingQuantity * it.unitPrice) : (it.lineTotal ?? 0),
    franjaCompromiso: it.promisedDeliveryAt ? new Date(it.promisedDeliveryAt).toLocaleDateString('es-CO') : 'Normal',
    permiteCancelacion: true,
    stockReferencialDisponible: it.itemsTypeCode === 'INVENTORY' ? 25 : null,
    advertenciaStockInsuficiente: false,
  }));

  return {
    publicId: res?.id || res?.publicId || 'sol-01',
    codigo: res?.number || res?.codigo || 'SOL-0001',
    numeroDocumentoVisible: res?.number || res?.numeroDocumentoVisible || 'SOL-0001',
    subtipoCodigo: 'SOL',
    subtipoNombre: 'Solicitud Estándar',
    clientePublicId: res?.customerId || res?.clientePublicId || '',
    clienteNombre: res?.customerName || res?.clienteNombre || 'Mostrador',
    clienteNumeroDocumento: res?.customerCode || res?.clienteNumeroDocumento || '',
    canalPublicId: res?.channelId || res?.canalPublicId || '',
    canalNombre: 'Mostrador',
    totalNeto: res?.totalAmount ?? res?.totalNeto ?? 0,
    totalInventario: res?.subtotalInventory ?? res?.totalInventario ?? 0,
    totalServicios: res?.subtotalService ?? res?.totalServicios ?? 0,
    totalAnticiposImputados: res?.paidAmount ?? res?.totalAnticiposImputados ?? 0,
    totalPagadoInventario: 0,
    saldoPendiente: res?.balanceDue ?? res?.saldoPendiente ?? 0,
    estado: res?.isCancelled ? 'ANULADO' : (res?.isConfirmed ? 'ASENTADO' : 'BORRADOR'),
    fechaEmision: res?.issuedAt || new Date().toISOString(),
    notas: res?.observation || res?.notas || '',
    exigeAnticipoPendienteVoBo: false,
    inventarioPendientePago100: false,
    items,
    recaudos: [],
  };
}

export const solicitudesApi = {
  async crearSolicitud(data: CrearSolicitudRequest, token?: string): Promise<SolicitudDetalleDto> {
    const res = await api.post<any>('/requests', {
      customerId: data.clientePublicId,
      channelId: data.canalPublicId,
      observation: data.notas,
    }, token);
    return mapRequestDetails(res);
  },

  async getSolicitudByUuid(uuid: string, token?: string): Promise<SolicitudDetalleDto> {
    const res = await api.get<any>(`/requests/${uuid}`, token);
    return mapRequestDetails(res);
  },

  async agregarItem(uuid: string, data: ItemSolicitudCreacion, token?: string): Promise<SolicitudDetalleDto> {
    const res = await api.post<any>(`/requests/${uuid}/items`, {
      itemId: data.itemCatalogoPublicId,
      quantity: data.cantidad,
      unitPrice: data.precioUnitario,
      promisedDeliveryAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      technicalObservation: data.descripcion,
    }, token);
    return mapRequestDetails(res);
  },

  async removerItem(uuid: string, itemUuid: string, token?: string): Promise<SolicitudDetalleDto> {
    const res = await api.delete<any>(`/requests/${uuid}/items/${itemUuid}`, token);
    return mapRequestDetails(res);
  },

  async registrarAnticipoItem(
    uuid: string,
    _itemUuid: string,
    data: {
      monto: number;
      cajeroId: number;
      cajeroCodigo: string;
      desgloses: { instrumentoPublicId: string; monto: number; referenciaTransaccion?: string }[];
    },
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    const payments = (data.desgloses || []).map((d) => ({
      paymentMethodId: d.instrumentoPublicId,
      amount: d.monto,
      referenceNumber: d.referenciaTransaccion,
    }));
    const res = await api.post<any>(`/requests/${uuid}/confirm`, {
      requestId: uuid,
      initialPayments: payments,
    }, token);
    return mapRequestDetails(res);
  },

  async registrarPagoDirecto(
    uuid: string,
    data: {
      monto: number;
      cajeroId: number;
      cajeroCodigo: string;
      desgloses: { instrumentoPublicId: string; monto: number; referenciaTransaccion?: string }[];
    },
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    const payments = (data.desgloses || []).map((d) => ({
      paymentMethodId: d.instrumentoPublicId,
      amount: d.monto,
      referenceNumber: d.referenciaTransaccion,
    }));
    const res = await api.post<any>(`/requests/${uuid}/confirm`, {
      requestId: uuid,
      initialPayments: payments,
    }, token);
    return mapRequestDetails(res);
  },

  async autorizarExcepcionAnticipo(
    uuid: string,
    data: AutorizarExcepcionRequest,
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    const res = await api.post<any>(`/requests/${uuid}/confirm`, {
      requestId: uuid,
      supervisorPin: data.supervisorPin,
    }, token);
    return mapRequestDetails(res);
  },

  async asentarSolicitud(
    uuid: string,
    _data: { usuarioAsientaId: number; usuarioAsientaCodigo: string },
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    const res = await api.post<any>(`/requests/${uuid}/confirm`, {
      requestId: uuid,
    }, token);
    return mapRequestDetails(res);
  },

  async registroRapidoCliente(
    data: RegistroRapidoClienteRequest,
    token?: string,
  ): Promise<Cliente> {
    const res = await api.post<any>('/customers', {
      code: data.numeroDocumento,
      name: data.nombreRazonSocial,
      phone: data.telefono,
    }, token);
    return {
      uuid: res.id,
      tipoDocumento: {
        uuid: 'doc-cc',
        codigo: 'CC',
        nombre: 'Cédula de Ciudadanía',
        aplicaPersona: 'NATURAL',
        activo: true,
      },
      numeroDocumento: res.code,
      nombreRazonSocial: res.name,
      telefono: res.phone || '',
      activo: true,
    };
  },
};
