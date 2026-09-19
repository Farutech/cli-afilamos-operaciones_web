import type { ReporteConsolidadoDto, ReporteCierreZDto } from '../types/reportes';

const API_BASE = '/api/v1/reportes';

export const reportesApi = {
  getConsolidado: async (desde?: string, hasta?: string, token?: string): Promise<ReporteConsolidadoDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/consolidado${qs}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener reporte consolidado');
    }
    return res.json();
  },

  getCierreZ: async (idTurno: number, token?: string): Promise<ReporteCierreZDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/cierre-z/${idTurno}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al obtener reporte Z para turno ${idTurno}`);
    }
    return res.json();
  },
};
