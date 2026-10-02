import { api } from './api';
import type {
  ItemListoEntrega,
  GenerarRemisionRequest,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
  RemisionDetalle,
} from '../types/entregas';

function mapDeliveryDetails(res: any, defaultUuid?: string): RemisionDetalle {
  const cliente = res?.cliente || {
    uuid: res?.customerId || 'cli-01',
    numeroDocumento: res?.recipientIdNumber || '0000000',
    nombreRazonSocial: res?.customerName || res?.recipientName || 'Cliente General',
    telefono: '',
    activo: true,
  };

  const canal = res?.canal || {
    uuid: 'can-01',
    codigo: 'MOSTRADOR',
    nombre: 'Mostrador',
    activo: true,
  };

  const totalNeto = res?.totalNeto ?? res?.totalDeliveredAmount ?? 0;
  const totalPagos = res?.totalPagosEntrega ?? res?.totalCollectedOnDelivery ?? 0;
  const saldo = res?.saldoPendiente ?? Math.max(0, totalNeto - totalPagos);

  return {
    publicId: res?.publicId || res?.deliveryId || res?.uuid || defaultUuid || 'REM-0001',
    codigo: res?.codigo || res?.deliveryNumber || 'REM-0001',
    numeroDocumento: res?.numeroDocumento || res?.deliveryNumber || 'REM-0001',
    estado: (res?.estado === 'ENTREGADO' || res?.status === 'ENTREGADO' || res?.status === 'DELIVERED') ? 'DESPACHADO' : 'BORRADOR',
    fechaEmision: res?.fechaEmision || res?.deliveredAt || new Date().toISOString(),
    notas: res?.notas || res?.observation || '',
    cliente,
    canal,
    totalNeto,
    totalAnticiposPrevios: res?.totalAnticiposPrevios ?? 0,
    totalPagosEntrega: totalPagos,
    saldoPendiente: saldo,
    recibidoPorNombre: res?.recibidoPorNombre || res?.recipientName || null,
    recibidoPorDocumento: res?.recibidoPorDocumento || res?.recipientIdNumber || null,
    documentoSolicitudPublicId: res?.documentoSolicitudPublicId || res?.documentId || null,
    documentoSolicitudNumero: res?.documentoSolicitudNumero || res?.documentNumber || null,
    documentoOtPublicId: res?.documentoOtPublicId || res?.workOrderId || null,
    documentoOtNumero: res?.documentoOtNumero || res?.workOrderNumber || null,
    items: Array.isArray(res?.items) ? res.items : [],
    recaudos: Array.isArray(res?.recaudos) ? res.recaudos : [],
  };
}

export const entregasApi = {
  async getItemsListos(q?: string, clienteUuid?: string, token?: string): Promise<ItemListoEntrega[]> {
    try {
      const endpoint = clienteUuid
        ? `/deliveries/customers/${clienteUuid}/deliverable-items`
        : `/deliveries/deliverable-items`;
      const res = await api.get<any>(endpoint, token);
      const list = Array.isArray(res) ? res : (res?.items || []);

      const items: ItemListoEntrega[] = list.map((d: any) => ({
        itemPublicId: d.documentItemId || d.id,
        itemCodigo: d.itemCode || 'ITEM',
        descripcion: d.itemName || 'Ítem',
        cantidad: d.readyQuantity ?? d.quantity ?? 1,
        precioUnitario: d.unitPrice ?? 0,
        subtotal: d.itemTotal ?? 0,
        anticipoDirectoImputado: d.allocatedPayments ?? 0,
        saldoPendienteItem: d.itemPendingBalance ?? (d.itemTotal - (d.allocatedPayments ?? 0)),
        documentoSolicitudPublicId: d.documentId,
        documentoSolicitudNumero: d.documentNumber || 'SOL-0001',
        documentoOtPublicId: d.workOrderId || d.documentId,
        documentoOtNumero: d.workOrderNumber || 'OT-0001',
        clientePublicId: d.customerId || clienteUuid || '',
        clienteNombre: d.customerName || 'Cliente',
        clienteNumeroDocumento: d.customerCode || '0000000',
        clienteTelefono: d.customerPhone || '',
        etapaActualCodigo: 'LISTO_ENTREGA',
        etapaActualNombre: 'Listo para Entrega',
        franjaCompromiso: 'Hoy',
      }));

      if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        return items.filter(
          (i) =>
            i.clienteNombre.toLowerCase().includes(query) ||
            i.clienteNumeroDocumento.toLowerCase().includes(query) ||
            i.itemCodigo.toLowerCase().includes(query) ||
            i.documentoSolicitudNumero.toLowerCase().includes(query) ||
            i.documentoOtNumero.toLowerCase().includes(query),
        );
      }

      return items;
    } catch {
      return [];
    }
  },

  async generarRemision(data: GenerarRemisionRequest, token?: string): Promise<RemisionDetalle> {
    const res = await api.post<any>(
      '/deliveries',
      {
        solicitudPublicId: data.solicitudPublicId,
        notes: data.notas,
        observation: data.notas,
      },
      token,
    );
    return mapDeliveryDetails(res, data.solicitudPublicId);
  },

  async getRemisionByUuid(uuid: string, token?: string): Promise<RemisionDetalle> {
    const res = await api.get<any>(`/deliveries/${uuid}`, token);
    return mapDeliveryDetails(res, uuid);
  },

  async registrarPago(uuid: string, data: RegistrarPagoEntregaRequest, token?: string): Promise<RemisionDetalle> {
    const res = await api.post<any>(
      `/deliveries/${uuid}/payments`,
      {
        monto: data.monto,
        amount: data.monto,
        desgloses: data.desgloses,
      },
      token,
    );
    return mapDeliveryDetails(res, uuid);
  },

  async despacharRemision(uuid: string, data: DespacharRemisionRequest, token?: string): Promise<RemisionDetalle> {
    const res = await api.post<any>(
      `/deliveries/${uuid}/dispatch`,
      {
        recibidoPorNombre: data.recibidoPorNombre,
        recibidoPorDocumento: data.recibidoPorDocumento,
        usuarioDespachaCodigo: data.usuarioDespachaCodigo,
      },
      token,
    );
    return mapDeliveryDetails(res, uuid);
  },
};
