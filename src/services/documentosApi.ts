import { api } from './api';
import type {
  Documento,
  CreateDocumentoDraft,
  AsentarDocumentoResponse,
  DocumentoDependencia,
} from '../types/documentos';

export const documentosApi = {
  async crearBorrador(data: CreateDocumentoDraft, token?: string): Promise<Documento> {
    return api.post<Documento>('/documentos/borradores', data, token);
  },

  async getDocumentoByUuid(uuid: string, token?: string): Promise<Documento> {
    return api.get<Documento>(`/documentos/${uuid}`, token);
  },

  async getDocumentos(
    params?: { estado?: string; subtipoUuid?: string; clienteUuid?: string },
    token?: string,
  ): Promise<{ documentos: Documento[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.estado) searchParams.set('estado', params.estado);
    if (params?.subtipoUuid) searchParams.set('subtipoUuid', params.subtipoUuid);
    if (params?.clienteUuid) searchParams.set('clienteUuid', params.clienteUuid);

    const qs = searchParams.toString();
    return api.get<{ documentos: Documento[]; total: number }>(`/documentos${qs ? `?${qs}` : ''}`, token);
  },

  async asentar(uuid: string, token?: string): Promise<AsentarDocumentoResponse> {
    return api.post<AsentarDocumentoResponse>(`/documentos/${uuid}/asentar`, null, token);
  },

  async anular(uuid: string, motivo: string, token?: string): Promise<Documento> {
    return api.post<Documento>(`/documentos/${uuid}/anular`, { motivo }, token);
  },

  async eliminarBorrador(uuid: string, token?: string): Promise<void> {
    return api.delete<void>(`/documentos/${uuid}`, token);
  },

  async crearDependencia(
    uuidOrigen: string,
    data: { uuidDocumentoDestino: string; tipoRelacion: string; notas?: string },
    token?: string,
  ): Promise<DocumentoDependencia> {
    return api.post<DocumentoDependencia>(`/documentos/${uuidOrigen}/dependencias`, data, token);
  },

  async getDependencias(uuid: string, token?: string): Promise<{ dependencias: DocumentoDependencia[] }> {
    return api.get<{ dependencias: DocumentoDependencia[] }>(`/documentos/${uuid}/dependencias`, token);
  },
};
