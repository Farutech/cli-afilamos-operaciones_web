import React, { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, BanknotesIcon, ClipboardDocumentListIcon, CubeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { dashboardApi } from '../../services/dashboardApi';
import type { DashboardMetricasDto } from '../../types/dashboard';
import { Badge, Button, StatsCard, StatsCardGroup } from '@farutech/design-system';

interface DashboardOperativoProps {
  token?: string;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardOperativo: React.FC<DashboardOperativoProps> = ({ token, onNavigateTab }) => {
  const [metricas, setMetricas] = useState<DashboardMetricasDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Widgets configurables (RF-9.2)
  const [mostrarCanales, setMostrarCanales] = useState(true);
  const [mostrarUltimasSolicitudes, setMostrarUltimasSolicitudes] = useState(true);
  const [mostrarColaTaller, setMostrarColaTaller] = useState(true);

  const cargarMetricas = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await dashboardApi.getMetricas(token);
      setMetricas(data);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error cargando métricas operativas');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let activo = true;
    const init = async () => {
      try {
        const data = await dashboardApi.getMetricas(token);
        if (activo) setMetricas(data);
      } catch (err: unknown) {
        if (activo) setErrorMsg((err as Error).message || 'Error cargando métricas');
      } finally {
        if (activo) setLoading(false);
      }
    };
    init();
    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Glassmorphism estilo Apple / Vercel */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Operación · Tiempo Real POS & Taller
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📊</span> Tablero de Control Operativo en Tiempo Real
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Monitoreo del motor POS, órdenes de trabajo satélite y flujo de entregas (RF-9.1, RF-9.2)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-3 text-xs text-slate-300 shadow-inner">
            <span className="font-semibold text-slate-400">Widgets Visibles:</span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                aria-label="Canales"
                checked={mostrarCanales}
                onChange={(e) => setMostrarCanales(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
              />
              <span>Canales</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                aria-label="Solicitudes"
                checked={mostrarUltimasSolicitudes}
                onChange={(e) => setMostrarUltimasSolicitudes(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
              />
              <span>Solicitudes</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                aria-label="Taller"
                checked={mostrarColaTaller}
                onChange={(e) => setMostrarColaTaller(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
              />
              <span>Taller</span>
            </label>
          </div>

          <Button variant="secondary" size="sm" onClick={cargarMetricas}>
            <ArrowPathIcon aria-hidden="true" className="w-4 h-4 mr-1 inline" />
            Actualizar
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-2xl text-sm flex items-center justify-between backdrop-blur-md shadow-lg">
          <div>{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 font-bold ml-2">✕</button>
        </div>
      )}

      {loading && !metricas ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-3xl border border-white/10 backdrop-blur-md">
          Cargando indicadores operativos en vivo...
        </div>
      ) : metricas ? (
        <>
          {/* Tarjetas KPI Superiores usando Farutech Design System */}
          <StatsCardGroup>
            <StatsCard
              title="Solicitudes con Saldo Activo"
              value={metricas.solicitudesActivasCount}
              icon={<ClipboardDocumentListIcon aria-hidden="true" />}
              variant="primary"
              description="En proceso de anticipo o taller"
              onClick={onNavigateTab ? () => onNavigateTab('solicitudes') : undefined}
            />
            <StatsCard
              title="Ítems en Taller (OT)"
              value={metricas.itemsEnTallerCount}
              icon={<WrenchScrewdriverIcon aria-hidden="true" />}
              variant="warning"
              description="En etapas técnicas activas"
              onClick={onNavigateTab ? () => onNavigateTab('taller') : undefined}
            />
            <StatsCard
              title="Listos para Entrega"
              value={metricas.itemsListosEntregaCount}
              icon={<CubeIcon aria-hidden="true" />}
              variant="success"
              description="Listos en mostrador para remisión"
              onClick={onNavigateTab ? () => onNavigateTab('entregas') : undefined}
            />
            <StatsCard
              title="Recaudo Diario en Caja"
              value={`$${metricas.totalRecaudosHoy.toLocaleString('es-CO')}`}
              icon={<BanknotesIcon aria-hidden="true" />}
              variant="info"
              description={metricas.cajaAbierta ? `Turno Activo (${metricas.codigoCaja ?? 'CAJA-01'})` : 'Caja Cerrada'}
              onClick={onNavigateTab ? () => onNavigateTab('caja') : undefined}
            />
          </StatsCardGroup>

          {/* Gráfico / Distribución por Canales de Origen */}
          {mostrarCanales && (
            <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📡</span> Distribución por Canal de Origen (RF-8.1, RF-8.2)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {metricas.distribucionCanales.map((c) => (
                  <div
                    key={c.canalCodigo}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-white/20 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-white">{c.canalNombre}</span>
                      <Badge variant="info">{c.cantidadSolicitudes} ped.</Badge>
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      ${c.totalVentas.toLocaleString('es-CO')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Volumen transaccional asentado
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bento Grid: Solicitudes Recientes y Cola de Taller */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas Solicitudes */}
            {mostrarUltimasSolicitudes && (
              <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>🧾</span> Últimas Solicitudes
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Top 5</span>
                </div>
                {metricas.ultimasSolicitudes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay solicitudes registradas.</p>
                ) : (
                  <div className="dashboard-records-scroll space-y-2" role="region" aria-label="Últimas solicitudes">
                    {metricas.ultimasSolicitudes.map((s) => (
                      <div
                        key={s.uuid}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-all flex justify-between items-center gap-3"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">
                            <span className="font-mono text-indigo-400">{s.numeroDocumento}</span> · {s.clienteNombre}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {new Date(s.fechaEmision).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {s.canalNombre ?? 'Mostrador'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm text-white">${s.total.toLocaleString('es-CO')}</div>
                          <Badge variant={s.estado === 'ASENTADO' ? 'success' : s.estado === 'BORRADOR' ? 'neutral' : 'danger'}>
                            {s.estado}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trabajos Activos en Taller */}
            {mostrarColaTaller && (
              <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>⚙️</span> Trabajos en Taller (OT Satélite)
                  </h3>
                  <div className="flex items-center gap-2">
                    {onNavigateTab && (
                      <Button variant="secondary" size="sm" onClick={() => onNavigateTab('taller')}>
                        Ir a cola de taller →
                      </Button>
                    )}
                    <span className="text-xs text-slate-400 font-mono">Prioridad</span>
                  </div>
                </div>
                {metricas.itemsEnTaller.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay trabajos activos en taller.</p>
                ) : (
                  <div className="dashboard-records-scroll space-y-2" role="region" aria-label="Trabajos activos en taller">
                    {metricas.itemsEnTaller.map((it) => (
                      <div
                        key={it.itemUuid}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-all flex justify-between items-center gap-3"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">
                            <span className="font-mono text-amber-400">{it.otNumero}</span> · {it.itemDescripcion}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Promesa: {it.franjaCompromiso || 'Sin franja'}
                          </div>
                        </div>
                        <div>
                          <Badge variant="warning">{it.etapaActualNombre}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
