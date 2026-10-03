import { useEffect, useState } from 'react';
import { Tag, Wrench, DollarSign, Clock } from 'lucide-react';
import { dashboardApi } from '@/services/dashboardApi';
import { cajaApi } from '@/services/cajaApi';

export interface OrdeonDashboardProps {
  userName: string;
  token?: string;
  onNew: () => void;
  showCashSummary: boolean;
  onNavigateSection?: (section: string) => void;
}

function Metric({
  label,
  value,
  change,
  icon: Icon = Tag,
}: {
  label: string;
  value: string;
  change: string;
  icon?: typeof Tag;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon className="w-4 h-4" />
      </div>
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <strong
          className={`metric-value ${
            value.startsWith('$') ? 'metric-value-currency' : ''
          }`}
        >
          {value}
        </strong>
        <span className="metric-period">Comparado con ayer</span>
      </div>
      <span className="metric-trend">{change.replace(' vs. ayer', '')}</span>
    </article>
  );
}

export function OrdeonDashboard({
  userName,
  token,
  onNew,
  showCashSummary,
  onNavigateSection,
}: OrdeonDashboardProps) {
  const [metricData, setMetricData] = useState({
    solicitudesHoy: '24',
    ordenesTaller: '18',
    ingresosDia: '$ 18,460',
    porCobrar: '$ 42,850',
    saldoCaja: '$ 26,480.00',
    ingresosCaja: '+ $ 31,820.00',
    egresosCaja: '- $ 5,340.00',
    transacciones: '18 transacciones',
    turnoAbierto: true,
  });

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

  const firstName = userName ? userName.split(' ')[0] : 'Javier';

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    Promise.all([
      dashboardApi.getMetricas(token).catch(() => null),
      cajaApi.obtenerTurnoActivo('CAJA-01', token).catch(() => null),
    ]).then(([metricas, turno]) => {
      if (!isMounted) return;
      if (metricas) {
        setMetricData((prev) => ({
          ...prev,
          solicitudesHoy: String(metricas.solicitudesActivasCount ?? prev.solicitudesHoy),
          ordenesTaller: String(metricas.itemsEnTallerCount ?? prev.ordenesTaller),
          ingresosDia: metricas.totalRecaudosHoy
            ? `$ ${metricas.totalRecaudosHoy.toLocaleString('es-CO')}`
            : prev.ingresosDia,
          porCobrar: '$ 42,850',
          saldoCaja: metricas.saldoEfectivoActual
            ? `$ ${metricas.saldoEfectivoActual.toLocaleString('es-CO')}`
            : prev.saldoCaja,
        }));
      }
      if (turno) {
        setMetricData((prev) => ({
          ...prev,
          turnoAbierto: turno.estado === 'ABIERTO',
          saldoCaja: turno.baseInicial
            ? `$ ${turno.baseInicial.toLocaleString('es-CO')}`
            : prev.saldoCaja,
        }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{formattedDate}</p>
          <h1>Buenos días, {firstName}</h1>
          <p className="heading-copy">Esto es lo que está pasando en tu operación hoy.</p>
        </div>
        <button className="primary-button" onClick={onNew} id="btn-nueva-solicitud">
          + Nueva solicitud
        </button>
      </div>

      <div className="metric-grid">
        <Metric
          label="Solicitudes de hoy"
          value={metricData.solicitudesHoy}
          change="+12.5% vs. ayer"
          icon={Tag}
        />
        <Metric
          label="Órdenes en taller"
          value={metricData.ordenesTaller}
          change="4 urgentes vs. ayer"
          icon={Wrench}
        />
        <Metric
          label="Ingresos del día"
          value={metricData.ingresosDia}
          change="+8.2% vs. ayer"
          icon={DollarSign}
        />
        <Metric
          label="Por cobrar"
          value={metricData.porCobrar}
          change="12 cuentas vs. ayer"
          icon={Clock}
        />
      </div>

      <div className={`content-grid ${showCashSummary ? '' : 'without-cash'}`}>
        <section className="panel orders-panel">
          <div className="panel-heading">
            <div>
              <h2>Actividad reciente</h2>
              <p>Órdenes de trabajo actualizadas recientemente</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigateSection?.('Órdenes de trabajo')}
            >
              Ver todas →
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ORDEN</th>
                  <th>CLIENTE</th>
                  <th>ESTADO</th>
                  <th>HORA</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['OT-2026-0148', 'María Fernanda López', 'En taller', '09:42', '$ 1,280.00'],
                  ['OT-2026-0147', 'Restaurante La Casona', 'Listo para entrega', '09:15', '$ 3,640.00'],
                  ['OT-2026-0146', 'Carlos Ramírez', 'Pendiente', '08:50', '$ 760.00'],
                  ['OT-2026-0145', 'Hotel Casa Real', 'En taller', '08:30', '$ 5,420.00'],
                ].map((row) => (
                  <tr
                    key={row[0]}
                    onClick={() => onNavigateSection?.('Órdenes de trabajo')}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <strong className="order-id">{row[0]}</strong>
                    </td>
                    <td>
                      <strong>{row[1]}</strong>
                      <span className="table-detail">Servicio operativo</span>
                    </td>
                    <td>
                      <span className="status-pill">● {row[2]}</span>
                    </td>
                    <td className="muted-cell">{row[3]}</td>
                    <td>
                      <strong>{row[4]}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showCashSummary && (
          <section className="panel summary-panel">
            <div className="panel-heading">
              <div>
                <h2>Resumen de caja</h2>
                <p>Turno actual · Caja 01</p>
              </div>
            </div>
            <div className="cash-balance">
              <span>Saldo disponible</span>
              <strong>{metricData.saldoCaja}</strong>
              <small>
                {metricData.turnoAbierto
                  ? '● Turno abierto desde 08:00'
                  : '○ Sin turno activo'}
              </small>
            </div>
            <div className="cash-list">
              <div>
                <span>Ingresos</span>
                <strong style={{ color: '#53d580' }}>{metricData.ingresosCaja}</strong>
              </div>
              <div>
                <span>Egresos</span>
                <strong style={{ color: '#f87171' }}>{metricData.egresosCaja}</strong>
              </div>
              <div>
                <span>Pagos en efectivo</span>
                <strong>{metricData.transacciones}</strong>
              </div>
            </div>
            <button
              className="secondary-button"
              onClick={() => onNavigateSection?.('Caja y turnos')}
            >
              Ver detalle de caja →
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

export default OrdeonDashboard;
