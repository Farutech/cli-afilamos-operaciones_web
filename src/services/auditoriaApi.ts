import { api } from './api';

export interface EventoAuditoriaDto {
  id: string;
  uuid: string;
  timestamp: string;
  userId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  tipoAccion: string;
  entityType: string;
  tipoEntidad: string;
  entityId: string;
  payloadJson?: string | null;
}

export const auditoriaApi = {
  async getEventos(params?: {
    page?: number;
    pageSize?: number;
    actorId?: string;
    entityType?: string;
    action?: string;
    search?: string;
    from?: string;
    to?: string;
  }, token?: string): Promise<{ items: EventoAuditoriaDto[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.append('page', String(params.page));
    if (params?.pageSize) qs.append('pageSize', String(params.pageSize));
    if (params?.actorId) qs.append('actorId', params.actorId);
    if (params?.entityType) qs.append('entityType', params.entityType);
    if (params?.action) qs.append('action', params.action);
    if (params?.search) qs.append('search', params.search);
    if (params?.from) qs.append('from', params.from);
    if (params?.to) qs.append('to', params.to);

    const url = `/audit${qs.toString() ? `?${qs.toString()}` : ''}`;
    try {
      const res = await api.get<any>(url, token);
      const raw = Array.isArray(res) ? res : (res?.items || []);
      return {
        items: raw.map((a: any) => ({
          id: a.id || a.uuid,
          uuid: a.id || a.uuid,
          timestamp: a.timestamp || a.occurredAt || new Date().toISOString(),
          userId: a.userId || a.actorId,
          actorId: a.actorId || a.userId,
          actorName: a.actorName || a.userName || a.userId || 'Sistema',
          action: a.action || a.eventType || 'ACTION',
          tipoAccion: a.action || a.eventType || 'ACTION',
          entityType: a.entityType || 'ENTITY',
          tipoEntidad: a.entityType || 'ENTITY',
          entityId: a.entityId || '',
          payloadJson: a.payloadJson || a.payload,
        })),
        total: res?.total ?? raw.length,
      };
    } catch {
      return { items: [], total: 0 };
    }
  },
};
