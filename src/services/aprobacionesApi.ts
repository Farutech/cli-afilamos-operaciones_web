import { api } from './api';

export interface AprobacionDto {
  id: string;
  uuid: string;
  documentId: string;
  documentNumber: string;
  approvalType: string;
  tipoAprobacion: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
  reason?: string | null;
  motivo?: string | null;
  isApproved: boolean;
  isRejected: boolean;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  createdAt: string;
  customerName?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
}

export const aprobacionesApi = {
  async getPendientes(token?: string): Promise<AprobacionDto[]> {
    try {
      const res = await api.get<any[]>('/approvals/pending', token);
      const list = Array.isArray(res) ? res : [];
      return list.map((a: any) => ({
        id: a.id || a.uuid,
        uuid: a.id || a.uuid,
        documentId: a.documentId,
        documentNumber: a.documentNumber || 'DOC-0001',
        approvalType: a.approvalType || a.tipoAprobacion || 'ADVANCE_WAIVER',
        tipoAprobacion: a.approvalType || a.tipoAprobacion || 'Excepción Comercial / Anticipo',
        requestedBy: a.requestedBy || '',
        requestedByName: a.requestedByName || a.solicitadoPor || 'Cajero',
        approvedBy: a.approvedBy || null,
        approvedByName: a.approvedByName || null,
        reason: a.reason || a.motivo || '',
        motivo: a.reason || a.motivo || '',
        isApproved: !!a.approvedAt,
        isRejected: !!a.rejectedAt,
        status: a.rejectedAt ? 'RECHAZADO' : (a.approvedAt ? 'APROBADO' : 'PENDIENTE'),
        createdAt: a.createdAt || new Date().toISOString(),
        customerName: a.customerName || a.clienteNombre || 'Cliente',
        totalAmount: a.totalAmount ?? a.montoTotal ?? 0,
        paidAmount: a.paidAmount ?? a.montoPagado ?? 0,
        balanceDue: a.balanceDue ?? a.saldoPendiente ?? 0,
      }));
    } catch {
      return [];
    }
  },

  async getById(id: string, token?: string): Promise<AprobacionDto | null> {
    try {
      const a = await api.get<any>(`/approvals/${id}`, token);
      return {
        id: a.id || a.uuid,
        uuid: a.id || a.uuid,
        documentId: a.documentId,
        documentNumber: a.documentNumber || 'DOC-0001',
        approvalType: a.approvalType || 'ADVANCE_WAIVER',
        tipoAprobacion: a.approvalType || 'Excepción Comercial',
        requestedBy: a.requestedBy || '',
        requestedByName: a.requestedByName || 'Usuario',
        approvedBy: a.approvedBy || null,
        approvedByName: a.approvedByName || null,
        reason: a.reason || '',
        motivo: a.reason || '',
        isApproved: !!a.approvedAt,
        isRejected: !!a.rejectedAt,
        status: a.rejectedAt ? 'RECHAZADO' : (a.approvedAt ? 'APROBADO' : 'PENDIENTE'),
        createdAt: a.createdAt || new Date().toISOString(),
        customerName: a.customerName,
        totalAmount: a.totalAmount,
        paidAmount: a.paidAmount,
        balanceDue: a.balanceDue,
      };
    } catch {
      return null;
    }
  },

  async aprobar(id: string, supervisorPin: string, reason?: string, token?: string): Promise<void> {
    await api.post<void>(
      `/approvals/${id}/approve`,
      { supervisorPin, reason: reason || 'Aprobado por supervisor' },
      token,
    );
  },

  async rechazar(id: string, reason: string, token?: string): Promise<void> {
    await api.post<void>(
      `/approvals/${id}/reject`,
      { reason },
      token,
    );
  },

  async solicitarAprobacion(dto: {
    documentId: string;
    approvalType: string;
    reason: string;
  }, token?: string): Promise<void> {
    await api.post<void>('/approvals/request', dto, token);
  },
};
