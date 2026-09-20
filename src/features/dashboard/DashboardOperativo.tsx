import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../../services/dashboardApi';
import type { DashboardMetricasDto } from '../../types/dashboard';
import { Card, Badge, Button } from '@farutech/design-system';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado y configuración de widgets */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>📊 Tablero de Control Operativo en Tiempo Real</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Monitoreo del motor POS, órdenes de trabajo satélite y flujo de entregas (RF-9.1, RF-9.2)
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Widgets Visibles:</span>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={mostrarCanales} onChange={(e) => setMostrarCanales(e.target.checked)} />
              Canales
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={mostrarUltimasSolicitudes} onChange={(e) => setMostrarUltimasSolicitudes(e.target.checked)} />
              Solicitudes
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={mostrarColaTaller} onChange={(e) => setMostrarColaTaller(e.target.checked)} />
              Taller
            </label>
            <Button variant="secondary" size="sm" onClick={cargarMetricas}>
              🔄 Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      {loading && !metricas ? (
        <Card>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando indicadores operativos en vivo...</p>
        </Card>
      ) : metricas ? (
        <>
          {/* Tarjetas KPI Superiores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Card style={{ borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Solicitudes con Saldo Activo
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#1d4ed8' }}>
                {metricas.solicitudesActivasCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                En proceso de anticipo o taller
              </div>
              {onNavigateTab && (
                <Button variant="ghost" size="sm" style={{ marginTop: '8px', padding: 0 }} onClick={() => onNavigateTab('solicitudes')}>
                  Ver solicitudes →
                </Button>
              )}
            </Card>

            <Card style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Ítems en Taller (OT)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#b45309' }}>
                {metricas.itemsEnTallerCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                En etapas técnicas activas
              </div>
              {onNavigateTab && (
                <Button variant="ghost" size="sm" style={{ marginTop: '8px', padding: 0 }} onClick={() => onNavigateTab('taller')}>
                  Ir a cola de taller →
                </Button>
              )}
            </Card>

            <Card style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Listos para Entrega
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#047857' }}>
                {metricas.itemsListosEntregaCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Listos en mostrador para remisión
              </div>
              {onNavigateTab && (
                <Button variant="ghost" size="sm" style={{ marginTop: '8px', padding: 0 }} onClick={() => onNavigateTab('entregas')}>
                  Gestionar despacho →
                </Button>
              )}
            </Card>

            <Card style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Caja & Recaudo Diario
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '8px', color: '#6d28d9' }}>
                ${metricas.totalRecaudosHoy.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Badge variant={metricas.cajaAbierta ? 'success' : 'danger'}>
                  {metricas.cajaAbierta ? `Turno Activo (${metricas.codigoCaja ?? 'CAJA-01'})` : 'Caja Cerrada'}
                </Badge>
              </div>
              {onNavigateTab && (
                <Button variant="ghost" size="sm" style={{ marginTop: '8px', padding: 0 }} onClick={() => onNavigateTab('caja')}>
                  Administrar caja →
                </Button>
              )}
            </Card>
          </div>

          {/* Gráfico / Distribución por Canales de Origen */}
          {mostrarCanales && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
                Distribución por Canal de Origen (RF-8.1, RF-8.2)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {metricas.distribucionCanales.map((c) => (
                  <div
                    key={c.canalCodigo}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.canalNombre}</span>
                      <Badge variant="info">{c.cantidadSolicitudes} ped.</Badge>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-text)' }}>
                      ${c.totalVentas.toLocaleString('es-CO')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Volumen transaccional asentado
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Dos Columnas: Solicitudes Recientes y Cola de Taller */}
          <div style={{ display: 'grid', gridTemplateColumns: mostrarUltimasSolicitudes && mostrarColaTaller ? '1fr 1fr' : '1fr', gap: '20px' }}>
            {/* Últimas Solicitudes */}
            {mostrarUltimasSolicitudes && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Últimas Solicitudes</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Top 5</span>
                </div>
                {metricas.ultimasSolicitudes.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No hay solicitudes registradas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {metricas.ultimasSolicitudes.map((s) => (
                      <div
                        key={s.uuid}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {s.numeroDocumento} · <span style={{ fontWeight: 400 }}>{s.clienteNombre}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {new Date(s.fechaEmision).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {s.canalNombre ?? 'Mostrador'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>${s.total.toLocaleString('es-CO')}</div>
                          <Badge variant={s.estado === 'ASENTADO' ? 'success' : s.estado === 'BORRADOR' ? 'neutral' : 'danger'}>
                            {s.estado}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Trabajos Activos en Taller */}
            {mostrarColaTaller && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Trabajos en Taller (OT Satélite)</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Prioridad / Franja</span>
                </div>
                {metricas.itemsEnTaller.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No hay trabajos activos en taller.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {metricas.itemsEnTaller.map((it) => (
                      <div
                        key={it.itemUuid}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {it.otNumero} · {it.itemDescripcion}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
