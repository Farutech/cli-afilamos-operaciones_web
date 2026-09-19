import React, { useState, useEffect } from 'react';
import { reportesApi } from '../../services/reportesApi';
import type { ReporteConsolidadoDto, ReporteCierreZDto } from '../../types/reportes';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface ModuloReportesProps {
  token?: string;
  idTurnoActivo?: number;
}

export const ModuloReportes: React.FC<ModuloReportesProps> = ({ token, idTurnoActivo = 1 }) => {
  const [tab, setTab] = useState<'consolidado' | 'cierreZ'>('consolidado');

  // Reporte Consolidado State
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [consolidado, setConsolidado] = useState<ReporteConsolidadoDto | null>(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);
  const [errorConsolidado, setErrorConsolidado] = useState<string | null>(null);

  // Reporte Z State
  const [idTurnoZ, setIdTurnoZ] = useState<string>(String(idTurnoActivo));
  const [reporteZ, setReporteZ] = useState<ReporteCierreZDto | null>(null);
  const [loadingZ, setLoadingZ] = useState(false);
  const [errorZ, setErrorZ] = useState<string | null>(null);

  const cargarConsolidado = async () => {
    setLoadingConsolidado(true);
    setErrorConsolidado(null);
    try {
      const data = await reportesApi.getConsolidado(desde || undefined, hasta || undefined, token);
      setConsolidado(data);
    } catch (err: unknown) {
      setErrorConsolidado((err as Error).message || 'Error al obtener reporte consolidado');
    } finally {
      setLoadingConsolidado(false);
    }
  };

  const cargarReporteZ = async () => {
    const turnoIdNum = parseInt(idTurnoZ, 10);
    if (isNaN(turnoIdNum) || turnoIdNum <= 0) {
      setErrorZ('Ingrese un ID de turno válido');
      return;
    }

    setLoadingZ(true);
    setErrorZ(null);
    try {
      const data = await reportesApi.getCierreZ(turnoIdNum, token);
      setReporteZ(data);
    } catch (err: unknown) {
      setErrorZ((err as Error).message || `Error al obtener reporte Z para el turno ${idTurnoZ}`);
    } finally {
      setLoadingZ(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const cargarDatos = async () => {
      if (tab === 'consolidado') {
        setLoadingConsolidado(true);
        setErrorConsolidado(null);
        try {
          const data = await reportesApi.getConsolidado(desde || undefined, hasta || undefined, token);
          if (activo) setConsolidado(data);
        } catch (err: unknown) {
          if (activo) setErrorConsolidado((err as Error).message || 'Error al obtener reporte consolidado');
        } finally {
          if (activo) setLoadingConsolidado(false);
        }
      } else {
        const turnoIdNum = parseInt(idTurnoZ, 10);
        if (isNaN(turnoIdNum) || turnoIdNum <= 0) return;
        setLoadingZ(true);
        setErrorZ(null);
        try {
          const data = await reportesApi.getCierreZ(turnoIdNum, token);
          if (activo) setReporteZ(data);
        } catch (err: unknown) {
          if (activo) setErrorZ((err as Error).message || `Error al obtener reporte Z para el turno ${idTurnoZ}`);
        } finally {
          if (activo) setLoadingZ(false);
        }
      }
    };

    cargarDatos();
    return () => {
      activo = false;
    };
  }, [tab, token, desde, hasta, idTurnoZ]);

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header y Selector de Pestaña */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>📈 Reportes Operativos & Fiscales</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Consolidación de un solo nivel y Reporte Z de Cierre de Turno imprimible (RF-9.3, RF-9.4, RF-9.5)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={tab === 'consolidado' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('consolidado')}
            >
              📊 Reporte Consolidado
            </Button>
            <Button
              variant={tab === 'cierreZ' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('cierreZ')}
            >
              🧾 Reporte Z de Cierre
            </Button>
          </div>
        </div>
      </Card>

      {/* PESTAÑA 1: REPORTE CONSOLIDADO */}
      {tab === 'consolidado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filtros de Fecha */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Desde:{' '}
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </label>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Hasta:{' '}
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </label>
              <Button variant="primary" size="sm" onClick={cargarConsolidado}>
                🔍 Filtrar Periodo
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImprimir}>
                🖨️ Imprimir / Exportar
              </Button>
            </div>
          </Card>

          {errorConsolidado && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
              {errorConsolidado}
            </div>
          )}

          {loadingConsolidado ? (
            <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando reporte consolidado...</p></Card>
          ) : consolidado ? (
            <>
              {/* Tarjetas KPI de Resumen Consolidado */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <Card>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Ventas</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '6px' }}>
                    ${consolidado.totalVentas.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Inv: ${consolidado.totalVentasInventario.toLocaleString('es-CO')} · Serv: ${consolidado.totalVentasServicios.toLocaleString('es-CO')}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Recaudado</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
                    ${consolidado.totalRecaudos.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Ingresos confirmados en caja
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Egresos de Caja Menor</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c', marginTop: '6px' }}>
                    ${consolidado.totalEgresos.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {consolidado.cantidadEgresos} comprobantes emitidos
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Balance Neto</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: consolidado.balanceNetoCaja >= 0 ? '#1d4ed8' : '#b91c1c', marginTop: '6px' }}>
                    ${consolidado.balanceNetoCaja.toLocaleString('es-CO')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Recaudos − Egresos
                  </div>
                </Card>
              </div>

              {/* Recaudos por Medio de Pago */}
              <Card>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
                  Recaudos por Medio de Pago (Unificado)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Instrumento / Medio</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Transacciones</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total Recaudado</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consolidado.recaudosPorMedio.map((r) => {
                        const porcentaje = consolidado.totalRecaudos > 0 ? (r.totalMonto / consolidado.totalRecaudos) * 100 : 0;
                        return (
                          <tr key={r.medioPagoCodigo} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{r.medioPagoNombre} ({r.medioPagoCodigo})</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{r.cantidadTransacciones}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>${r.totalMonto.toLocaleString('es-CO')}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{porcentaje.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* PESTAÑA 2: REPORTE Z DE CIERRE DE TURNO */}
      {tab === 'cierreZ' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector de Turno */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                ID de Turno:{' '}
                <input
                  type="number"
                  min="1"
                  value={idTurnoZ}
                  onChange={(e) => setIdTurnoZ(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '100px' }}
                />
              </label>
              <Button variant="primary" size="sm" onClick={cargarReporteZ}>
                🔍 Consultar Turno
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImprimir}>
                🖨️ Imprimir Ticket Z
              </Button>
            </div>
          </Card>

          {errorZ && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
              {errorZ}
            </div>
          )}

          {loadingZ ? (
            <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando Reporte Z...</p></Card>
          ) : reporteZ ? (
            <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
              {/* Formato Ticket Térmico Z (58/80 mm) */}
              <div
                id="ticket-z"
                style={{
                  background: '#ffffff',
                  color: '#111827',
                  fontFamily: 'monospace',
                  padding: '24px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  border: '1px dashed #9ca3af',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>AFILAMOS OPERACIONES</div>
                  <div>NIT: 900.123.456-7</div>
                  <div style={{ fontWeight: 700, margin: '8px 0' }}>*** REPORTE Z DE CIERRE DE CAJA ***</div>
                  <div>Caja: {reporteZ.cajaNombre} ({reporteZ.cajaCodigo})</div>
                  <div>Turno: {reporteZ.turnoCodigo} (ID #{reporteZ.turnoId})</div>
                  <div>Estado: {reporteZ.estadoTurno}</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
                  <div><strong>Cajero Apertura:</strong> {reporteZ.cajeroApertura}</div>
                  <div><strong>Apertura:</strong> {new Date(reporteZ.fechaAperturaUtc).toLocaleString('es-CO')}</div>
                  <div><strong>Cierre:</strong> {reporteZ.fechaCierreUtc ? new Date(reporteZ.fechaCierreUtc).toLocaleString('es-CO') : 'En curso'}</div>
                  {reporteZ.supervisorVoBo && (
                    <div><strong>VoBo Supervisor:</strong> {reporteZ.supervisorVoBo}</div>
                  )}
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>BASE INICIAL:</span>
                    <strong>${reporteZ.baseInicial.toLocaleString('es-CO')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Recaudos Efectivo:</span>
                    <span>${reporteZ.totalRecaudosEfectivo.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(+) Recaudos Otros:</span>
                    <span>${reporteZ.totalRecaudosTarjeta.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>(-) Egresos Menores:</span>
                    <span>${reporteZ.totalEgresos.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                {/* Arqueo y Diferencias */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>BALANCE Y ARQUEO FÍSICO</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Saldo Teórico Efectivo:</span>
                    <span>${reporteZ.saldoTeoricoEfectivo.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Declarado Físico:</span>
                    <span>${reporteZ.declaradoEfectivo.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Diferencia Efectivo:</span>
                    <span style={{ color: reporteZ.diferenciaEfectivo < 0 ? '#dc2626' : '#16a34a' }}>
                      ${reporteZ.diferenciaEfectivo.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* VoBo y Firmas */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '12px', marginTop: '16px', textAlign: 'center' }}>
                  {reporteZ.aprobadoVoBo ? (
                    <Badge variant="success">✓ Cierre Aprobado por Supervisor</Badge>
                  ) : (
                    <Badge variant="warning">⏳ Pendiente de VoBo</Badge>
                  )}
                  {reporteZ.observacionesVoBo && (
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', fontStyle: 'italic' }}>
                      Obs: {reporteZ.observacionesVoBo}
                    </div>
                  )}

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <div>
                      ____________________<br />
                      Firma Cajero
                    </div>
                    <div>
                      ____________________<br />
                      Firma Supervisor
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
