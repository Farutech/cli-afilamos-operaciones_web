import type { DashboardMetricasDto } from '../types/dashboard';
import { apiBaseUrl } from '../lib/api-client';

export const dashboardApi = {
  getMetricas: async (token?: string): Promise<DashboardMetricasDto> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ordeon_token') : null);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const baseUrl = apiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/v1/reports/dashboard`, { headers });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          return {
            solicitudesActivasCount: data.requestsToday ?? data.solicitudesHoy ?? 0,
            itemsEnTallerCount: data.pendingWorkshop ?? data.pendientesTaller ?? 0,
            itemsListosEntregaCount: data.readyForDelivery ?? data.listosEntrega ?? 0,
            despachadosHoyCount: 0,
            totalRecaudosHoy: data.cashCollectedToday ?? data.recaudadoHoy ?? 0,
            cajaAbierta: (data.activeShiftsCount ?? 0) > 0,
            codigoCaja: data.activeRegisterCode ?? (data.activeShiftsCount > 0 ? 'CAJA' : null),
            turnoActivoCodigo: data.activeShiftCode ?? (data.activeShiftsCount > 0 ? 'TURNO-ACTIVO' : null),
            saldoEfectivoActual: data.cashCollectedToday ?? data.recaudadoHoy ?? 0,
            distribucionCanales: [
              {
                canalCodigo: 'MOSTRADOR',
                canalNombre: 'Mostrador',
                cantidadSolicitudes: data.requestsToday ?? 0,
                totalVentas: data.cashCollectedToday ?? 0,
              },
            ],
            ultimasSolicitudes: [],
            itemsEnTaller: [],
          };
        }
      }
    } catch {
      // Fallback local
    }

    return {
      solicitudesActivasCount: 0,
      itemsEnTallerCount: 0,
      itemsListosEntregaCount: 0,
      despachadosHoyCount: 0,
      totalRecaudosHoy: 0,
      cajaAbierta: false,
      codigoCaja: null,
      turnoActivoCodigo: null,
      saldoEfectivoActual: 0,
      distribucionCanales: [],
      ultimasSolicitudes: [],
      itemsEnTaller: [],
    };
  },
};
