import { api } from './api';
import type {
  ItemTaller,
  ConfirmarRecepcionRequest,
  EjecutarTransicionRequest,
  CancelarItemRequest,
  RegistrarActividadRequest,
} from '../types/taller';

export const tallerApi = {
  async getCola(etapaCodigo?: string, token?: string): Promise<ItemTaller[]> {
    try {
      const columns = await api.get<any[]>('/work-orders/kanban', token);
      const items: ItemTaller[] = [];
      const colList = Array.isArray(columns) ? columns : [];

      for (const col of colList) {
        for (const card of (col.cards || [])) {
          if (!etapaCodigo || col.stepCode === etapaCodigo || card.currentStepCode === etapaCodigo) {
            items.push({
              itemPublicId: card.workOrderItemId,
              itemCodigo: 'ITEM',
              descripcion: card.itemName,
              cantidad: card.quantity ?? 1,
              franjaCompromiso: card.promisedDeliveryAt ? new Date(card.promisedDeliveryAt).toLocaleDateString('es-CO') : 'Normal',
              documentoOtPublicId: card.workOrderId,
              documentoOtNumero: card.workOrderNumber,
              documentoSolicitudPublicId: card.workOrderId,
              documentoSolicitudNumero: card.requestNumber,
              clienteNombre: card.customerName,
              clienteTelefono: '',
              workflowInstanciaPublicId: card.workOrderItemId,
              etapaActualCodigo: card.currentStepCode || col.stepCode,
              etapaActualNombre: card.currentStepName || col.stepName,
              etapaActualOrden: col.sequenceOrder ?? 1,
              permiteCancelacionDirecta: false,
              esFinal: card.isCompleted ?? false,
              transicionesPermitidas: [
                {
                  transicionPublicId: 'next',
                  codigo: 'AVANZAR',
                  nombre: 'Avanzar etapa',
                  requiereAprobacion: false,
                  etapaDestinoCodigo: 'SIGUIENTE',
                  etapaDestinoNombre: 'Siguiente etapa',
                  esDestinoFinal: false,
                },
              ],
              historial: [],
            });
          }
        }
      }
      return items;
    } catch {
      return [];
    }
  },

  async getItemByUuid(uuid: string, token?: string): Promise<ItemTaller> {
    const list = await this.getCola(undefined, token);
    const found = list.find((i) => i.itemPublicId === uuid);
    if (found) return found;
    throw new Error('Item de taller no encontrado');
  },

  async confirmarRecepcion(
    uuid: string,
    data: ConfirmarRecepcionRequest,
    token?: string,
  ): Promise<ItemTaller> {
    await api.post<any>(`/work-orders/items/${uuid}/advance`, {
      technicalNotes: data.notas || 'Recepción confirmada',
    }, token);
    return this.getItemByUuid(uuid, token);
  },

  async ejecutarTransicion(
    uuid: string,
    data: EjecutarTransicionRequest,
    token?: string,
  ): Promise<ItemTaller> {
    await api.post<any>(`/work-orders/items/${uuid}/advance`, {
      technicalNotes: data.notas,
    }, token);
    return this.getItemByUuid(uuid, token);
  },

  async cancelarItem(
    uuid: string,
    _data: CancelarItemRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return this.getItemByUuid(uuid, token);
  },

  async registrarActividad(
    uuid: string,
    _data: RegistrarActividadRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return this.getItemByUuid(uuid, token);
  },
};
