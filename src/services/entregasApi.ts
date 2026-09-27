import { api } from './api';
import type {
  ItemListoEntrega,
  GenerarRemisionRequest,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
  RemisionDetalle,
} from '../types/entregas';

export const entregasApi = {
  async getItemsListos(_q?: string, clienteUuid?: string, token?: string): Promise<ItemListoEntrega[]> {
    try {
      if (!clienteUuid) {
        return [];
      }
      const res = await api.get<any[]>(`/deliveries/customers/${clienteUuid}/deliverable-items`, token);
      const list = Array.isArray(res) ? res : [];
      return list.map((d: any) => ({
        itemPublicId: d.documentItemId,
        itemCodigo: 'ITEM',
        descripcion: d.itemName,
        cantidad: d.readyQuantity ?? 1,
        precioUnitario: d.unitPrice ?? 0,
        subtotal: d.itemTotal ?? 0,
        anticipoDirectoImputado: d.allocatedPayments ?? 0,
        saldoPendienteItem: d.itemPendingBalance ?? 0,
        documentoSolicitudPublicId: d.documentId,
        documentoSolicitudNumero: d.documentNumber || 'SOL-0001',
        documentoOtPublicId: d.workOrderId || d.documentId,
        documentoOtNumero: d.workOrderNumber || 'OT-0001',
        clientePublicId: clienteUuid,
        clienteNombre: 'Cliente',
        clienteNumeroDocumento: '0000000',
        clienteTelefono: '',
        etapaActualCodigo: 'LISTO_ENTREGA',
        etapaActualNombre: 'Listo para Entrega',
        franjaCompromiso: 'Hoy',
      }));
    } catch {
      return [];
    }
  },

  async generarRemision(data: GenerarRemisionRequest, token?: string): Promise<RemisionDetalle> {
    const res = await api.post<any>('/deliveries', {
      customerId: '00000000-0000-0000-0000-000000000000',
      itemsToDeliver: [],
      recipientName: 'Cliente',
      recipientIdNumber: '0000000',
    }, token);

    return {
      publicId: res?.deliveryId || data.solicitudPublicId,
      codigo: res?.deliveryNumber || 'REM-0001',
      numeroDocumento: res?.deliveryNumber || 'REM-0001',
      estado: res?.status === 'DELIVERED' ? 'DESPACHADO' : 'BORRADOR',
      fechaEmision: res?.deliveredAt || new Date().toISOString(),
      notas: data.notas || '',
      cliente: {
        uuid: 'cli-01',
        numeroDocumento: '222222222',
        nombreRazonSocial: 'Cliente General',
        telefono: '3000000000',
        activo: true,
      },
      canal: {
        uuid: 'can-01',
        codigo: 'MOSTRADOR',
        nombre: 'Mostrador',
        activo: true,
      },
      totalNeto: res?.totalDeliveredAmount ?? 0,
      totalAnticiposPrevios: 0,
      totalPagosEntrega: res?.totalCollectedOnDelivery ?? 0,
      saldoPendiente: 0,
      items: [],
      recaudos: [],
    };
  },

  async getRemisionByUuid(uuid: string, token?: string): Promise<RemisionDetalle> {
    const res = await api.get<any>(`/deliveries/${uuid}`, token);
    return {
      publicId: res?.deliveryId || uuid,
      codigo: res?.deliveryNumber || 'REM-0001',
      numeroDocumento: res?.deliveryNumber || 'REM-0001',
      estado: res?.status === 'DELIVERED' ? 'DESPACHADO' : 'BORRADOR',
      fechaEmision: res?.deliveredAt || new Date().toISOString(),
      notas: '',
      cliente: {
        uuid: 'cli-01',
        numeroDocumento: '222222222',
        nombreRazonSocial: res?.customerName || 'Cliente General',
        telefono: '3000000000',
        activo: true,
      },
      canal: {
        uuid: 'can-01',
        codigo: 'MOSTRADOR',
        nombre: 'Mostrador',
        activo: true,
      },
      totalNeto: res?.totalDeliveredAmount ?? 0,
      totalAnticiposPrevios: 0,
      totalPagosEntrega: res?.totalCollectedOnDelivery ?? 0,
      saldoPendiente: 0,
      items: [],
      recaudos: [],
    };
  },

  async registrarPago(uuid: string, _data: RegistrarPagoEntregaRequest, token?: string): Promise<RemisionDetalle> {
    return this.getRemisionByUuid(uuid, token);
  },

  async despacharRemision(uuid: string, _data: DespacharRemisionRequest, token?: string): Promise<RemisionDetalle> {
    return this.getRemisionByUuid(uuid, token);
  },
};
