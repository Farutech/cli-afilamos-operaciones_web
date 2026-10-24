import { api } from './api';

export interface PagoDto {
  id: string;
  uuid: string;
  customerId: string;
  customerName?: string;
  documentId?: string;
  documentNumber?: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  amount: number;
  currency: string;
  receivedAt: string;
  reference?: string;
  isVoided: boolean;
  voidReason?: string;
  cashierName?: string;
}

export interface RegistrarPagoRequest {
  customerId: string;
  documentId?: string;
  documentDeliveryId?: string;
  paymentMethodId: string;
  amount: number;
  currency?: string;
  cashShiftId?: string;
  reference?: string;
  notes?: string;
}

export const pagosApi = {
  async getPagos(params?: {
    requestId?: string;
    customerId?: string;
    cashShiftId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }, token?: string): Promise<{ items: PagoDto[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.requestId) qs.append('requestId', params.requestId);
    if (params?.customerId) qs.append('customerId', params.customerId);
    if (params?.cashShiftId) qs.append('cashShiftId', params.cashShiftId);
    if (params?.from) qs.append('from', params.from);
    if (params?.to) qs.append('to', params.to);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.pageSize) qs.append('pageSize', String(params.pageSize));

    const url = `/payments${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await api.get<any>(url, token);
    const rawItems = Array.isArray(res) ? res : (res?.items || []);

    return {
      items: rawItems.map((p: any) => ({
        id: p.id || p.uuid,
        uuid: p.id || p.uuid,
        customerId: p.customerId,
        customerName: p.customerName || p.clienteNombre,
        documentId: p.documentId,
        documentNumber: p.documentNumber,
        paymentMethodId: p.paymentMethodId,
        paymentMethodName: p.paymentMethodName || p.metodoPagoNombre,
        amount: p.amount ?? p.monto ?? 0,
        currency: p.currency || 'COP',
        receivedAt: p.receivedAt || p.fecha || new Date().toISOString(),
        reference: p.reference || p.referencia,
        isVoided: p.isVoided ?? false,
        voidReason: p.voidReason,
        cashierName: p.cashierName || p.cajeroNombre,
      })),
      total: res?.total ?? rawItems.length,
    };
  },

  async getPagoById(id: string, token?: string): Promise<PagoDto> {
    const p = await api.get<any>(`/payments/${id}`, token);
    return {
      id: p.id || p.uuid,
      uuid: p.id || p.uuid,
      customerId: p.customerId,
      customerName: p.customerName,
      documentId: p.documentId,
      documentNumber: p.documentNumber,
      paymentMethodId: p.paymentMethodId,
      paymentMethodName: p.paymentMethodName,
      amount: p.amount ?? 0,
      currency: p.currency || 'COP',
      receivedAt: p.receivedAt || new Date().toISOString(),
      reference: p.reference,
      isVoided: p.isVoided ?? false,
      voidReason: p.voidReason,
      cashierName: p.cashierName,
    };
  },

  async registrarPago(req: RegistrarPagoRequest, token?: string): Promise<PagoDto> {
    const res = await api.post<any>('/payments', req, token);
    return {
      id: res.id || res.uuid,
      uuid: res.id || res.uuid,
      customerId: req.customerId,
      paymentMethodId: req.paymentMethodId,
      amount: req.amount,
      currency: req.currency || 'COP',
      receivedAt: new Date().toISOString(),
      reference: req.reference,
      isVoided: false,
    };
  },

  async anularPago(id: string, reason: string, token?: string): Promise<void> {
    await api.post<void>(`/payments/${id}/void`, { reason }, token);
  },

  async conciliarPago(id: string, notes?: string, token?: string): Promise<void> {
    await api.post<void>(`/payments/${id}/reconcile`, { notes }, token);
  },
};
