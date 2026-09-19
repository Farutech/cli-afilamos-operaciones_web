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
    const url = etapaCodigo ? `/taller/cola?etapaCodigo=${encodeURIComponent(etapaCodigo)}` : '/taller/cola';
    return api.get<ItemTaller[]>(url, token);
  },

  async getItemByUuid(uuid: string, token?: string): Promise<ItemTaller> {
    return api.get<ItemTaller>(`/taller/items/${uuid}`, token);
  },

  async confirmarRecepcion(
    uuid: string,
    data: ConfirmarRecepcionRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return api.post<ItemTaller>(`/taller/items/${uuid}/confirmar-recepcion`, data, token);
  },

  async ejecutarTransicion(
    uuid: string,
    data: EjecutarTransicionRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return api.post<ItemTaller>(`/taller/items/${uuid}/transiciones`, data, token);
  },

  async cancelarItem(
    uuid: string,
    data: CancelarItemRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return api.post<ItemTaller>(`/taller/items/${uuid}/cancelar`, data, token);
  },

  async registrarActividad(
    uuid: string,
    data: RegistrarActividadRequest,
    token?: string,
  ): Promise<ItemTaller> {
    return api.post<ItemTaller>(`/taller/items/${uuid}/actividades`, data, token);
  },
};
