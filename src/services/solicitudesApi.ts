import { api } from './api';
import type {
  SolicitudDetalleDto,
  CrearSolicitudRequest,
  RegistroRapidoClienteRequest,
  AutorizarExcepcionRequest,
  ItemSolicitudCreacion,
} from '../types/solicitudes';
import type { Cliente } from '../types/catalogos';

export const solicitudesApi = {
  async crearSolicitud(data: CrearSolicitudRequest, token?: string): Promise<SolicitudDetalleDto> {
    return api.post<SolicitudDetalleDto>('/solicitudes', data, token);
  },

  async getSolicitudByUuid(uuid: string, token?: string): Promise<SolicitudDetalleDto> {
    return api.get<SolicitudDetalleDto>(`/solicitudes/${uuid}`, token);
  },

  async agregarItem(uuid: string, data: ItemSolicitudCreacion, token?: string): Promise<SolicitudDetalleDto> {
    return api.post<SolicitudDetalleDto>(`/solicitudes/${uuid}/items`, data, token);
  },

  async removerItem(uuid: string, itemUuid: string, token?: string): Promise<SolicitudDetalleDto> {
    return api.delete<SolicitudDetalleDto>(`/solicitudes/${uuid}/items/${itemUuid}`, token);
  },

  async registrarAnticipoItem(
    uuid: string,
    itemUuid: string,
    data: {
      monto: number;
      cajeroId: number;
      cajeroCodigo: string;
      desgloses: { instrumentoPublicId: string; monto: number; referenciaTransaccion?: string }[];
    },
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    return api.post<SolicitudDetalleDto>(`/solicitudes/${uuid}/items/${itemUuid}/anticipos`, data, token);
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
    return api.post<SolicitudDetalleDto>(`/solicitudes/${uuid}/pagos-directos`, data, token);
  },

  async autorizarExcepcionAnticipo(
    uuid: string,
    data: AutorizarExcepcionRequest,
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    return api.post<SolicitudDetalleDto>(`/solicitudes/${uuid}/excepcion-anticipo`, data, token);
  },

  async asentarSolicitud(
    uuid: string,
    data: { usuarioAsientaId: number; usuarioAsientaCodigo: string },
    token?: string,
  ): Promise<SolicitudDetalleDto> {
    return api.post<SolicitudDetalleDto>(`/solicitudes/${uuid}/asentar`, data, token);
  },

  async registroRapidoCliente(
    data: RegistroRapidoClienteRequest,
    token?: string,
  ): Promise<Cliente> {
    return api.post<Cliente>('/catalogos/clientes/rapido', data, token);
  },
};
