import type { ReporteConsolidadoDto, ReporteCierreZDto } from '../types/reportes';

const API_BASE = '/api/v1/reports';

export const reportesApi = {
  getConsolidado: async (desde?: string, hasta?: string, token?: string): Promise<ReporteConsolidadoDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ordeon_token') : null);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const params = new URLSearchParams();
    if (desde) params.append('from', desde);
    if (hasta) params.append('to', hasta);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/consolidated${qs}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener reporte consolidado');
    }
    return res.json();
  },

  getCierreZ: async (idTurno: number | string, token?: string): Promise<ReporteCierreZDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ordeon_token') : null);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE}/cash-closure/${idTurno}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al obtener reporte Z para turno ${idTurno}`);
    }
    return res.json();
  },

  exportarCsv: async (tipo: 'consolidated' | 'cash' | 'payments' = 'consolidated', desde?: string, hasta?: string, token?: string): Promise<Blob> => {
    const headers: Record<string, string> = {};
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ordeon_token') : null);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const params = new URLSearchParams({ type: tipo, format: 'csv' });
    if (desde) params.append('from', desde);
    if (hasta) params.append('to', hasta);

    const res = await fetch(`${API_BASE}/export?${params.toString()}`, { headers });
    if (!res.ok) {
      throw new Error('Error al descargar exportación CSV');
    }
    return res.blob();
  },
};
