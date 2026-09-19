import type { DashboardMetricasDto } from '../types/dashboard';

const API_BASE = '/api/v1/dashboard';

export const dashboardApi = {
  getMetricas: async (token?: string): Promise<DashboardMetricasDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/metricas`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener métricas del dashboard');
    }
    return res.json();
  },
};
