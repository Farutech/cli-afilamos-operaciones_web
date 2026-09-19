import { api } from './api';
import type {
  ItemListoEntrega,
  GenerarRemisionRequest,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
  RemisionDetalle,
} from '../types/entregas';

export const entregasApi = {
  async getItemsListos(q?: string, clienteUuid?: string, token?: string): Promise<ItemListoEntrega[]> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (clienteUuid) params.set('clienteUuid', clienteUuid);
    const qs = params.toString();
    return api.get<ItemListoEntrega[]>(`/entregas/listos${qs ? `?${qs}` : ''}`, token);
  },

  async generarRemision(data: GenerarRemisionRequest, token?: string): Promise<RemisionDetalle> {
    return api.post<RemisionDetalle>('/entregas/remisiones', data, token);
  },

  async getRemisionByUuid(uuid: string, token?: string): Promise<RemisionDetalle> {
    return api.get<RemisionDetalle>(`/entregas/remisiones/${uuid}`, token);
  },

  async registrarPago(uuid: string, data: RegistrarPagoEntregaRequest, token?: string): Promise<RemisionDetalle> {
    return api.post<RemisionDetalle>(`/entregas/remisiones/${uuid}/pagos`, data, token);
  },

  async despacharRemision(uuid: string, data: DespacharRemisionRequest, token?: string): Promise<RemisionDetalle> {
    return api.post<RemisionDetalle>(`/entregas/remisiones/${uuid}/despachar`, data, token);
  },
};
