import { useEffect, useState } from 'react';
import { Tag, Wrench, DollarSign, Clock } from 'lucide-react';
import { dashboardApi } from '@/services/dashboardApi';
import * as cajaApi from '@/services/cajaApi';
import { apiBaseUrl } from '@/lib/api-client';

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
  variant = 'violet',
  icon: Icon = Tag,
}: {
  label: string;
  value: string;
  change: string;
  variant?: 'violet' | 'amber' | 'green' | 'blue';
  icon?: typeof Tag;
}) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <div className={`metric-icon ${variant}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="metric-trend">{change.replace(' vs. ayer', '')}</span>
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
    </article>
  );
}

interface ActividadRecienteItem {
  id: string;
  orden: string;
  cliente: string;
  estado: string;
  hora: string;
  total: string;
}

export function OrdeonDashboard({
  userName,
  token,
  onNew,
  showCashSummary,
  onNavigateSection,
}: OrdeonDashboardProps) {
  const [metricData, setMetricData] = useState({
    solicitudesHoy: '0',
    ordenesTaller: '0',
    ingresosDia: '$ 0',
    porCobrar: '$ 0',
    saldoCaja: '$ 0',
    ingresosCaja: '$ 0',
    egresosCaja: '$ 0',
    transacciones: '0 transacciones',
    turnoAbierto: false,
  });

  const [actividadReciente, setActividadReciente] = useState<ActividadRecienteItem[]>([]);
  const [loadingActividad, setLoadingActividad] = useState(true);

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

  const firstName = userName ? userName.split(' ')[0] : 'Usuario';
  const shouldShowCash = showCashSummary && (token ? metricData.turnoAbierto : true);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoadingActividad(true);

    Promise.all([
      dashboardApi.getMetricas(token).catch(() => null),
      cajaApi.obtenerTurnoActivo('CAJA-01', token).catch(() => null),
      fetch(`${apiBaseUrl()}/api/v1/work-orders?page=1&pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([metricas, turno, workOrdersRes]) => {
      if (!isMounted) return;

      if (metricas) {
        setMetricData((prev) => ({
          ...prev,
          solicitudesHoy: String(metricas.solicitudesActivasCount ?? 0),
          ordenesTaller: String(metricas.itemsEnTallerCount ?? 0),
          ingresosDia: metricas.totalRecaudosHoy
            ? `$ ${metricas.totalRecaudosHoy.toLocaleString('es-CO')}`
            : '$ 0',
          porCobrar: '$ 0',
          saldoCaja: metricas.saldoEfectivoActual
            ? `$ ${metricas.saldoEfectivoActual.toLocaleString('es-CO')}`
            : '$ 0',
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

      const rawOrders = workOrdersRes?.items || (Array.isArray(workOrdersRes) ? workOrdersRes : []);
      if (rawOrders && rawOrders.length > 0) {
        setActividadReciente(
          rawOrders.slice(0, 5).map((o: any) => ({
            id: o.id || o.workOrderId || String(Math.random()),
            orden: o.number || o.workOrderNumber || 'OT-0000',
            cliente: o.customerName || 'Cliente Mostrador',
            estado: o.statusName || (o.isCompleted ? 'Finalizado' : 'En taller'),
            hora: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
            total: o.totalAmount ? `$ ${Number(o.totalAmount).toLocaleString('es-CO')}` : '—',
          }))
        );
      } else {
        setActividadReciente([]);
      }
      setLoadingActividad(false);
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
          variant="violet"
          icon={Tag}
        />
        <Metric
          label="Órdenes en taller"
          value={metricData.ordenesTaller}
          change="4 urgentes vs. ayer"
          variant="amber"
          icon={Wrench}
        />
        <Metric
          label="Ingresos del día"
          value={metricData.ingresosDia}
          change="+8.2% vs. ayer"
          variant="green"
          icon={DollarSign}
        />
        <Metric
          label="Por cobrar"
          value={metricData.porCobrar}
          change="12 cuentas vs. ayer"
          variant="blue"
          icon={Clock}
        />
      </div>

      <div className={`content-grid ${shouldShowCash ? '' : 'without-cash'}`}>
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
                {loadingActividad ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Cargando actividad reciente...</span>
                      </div>
                    </td>
                  </tr>
                ) : actividadReciente.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                      No hay actividad u órdenes de trabajo registradas recientemente.
                    </td>
                  </tr>
                ) : (
                  actividadReciente.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onNavigateSection?.('Órdenes de trabajo')}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong className="order-id">{row.orden}</strong>
                      </td>
                      <td>
                        <strong>{row.cliente}</strong>
                        <span className="table-detail">Servicio operativo</span>
                      </td>
                      <td>
                        <span className={`status-pill ${
                          row.estado.toLowerCase().includes('taller') || row.estado.toLowerCase().includes('proceso')
                            ? 'status-progress'
                            : row.estado.toLowerCase().includes('listo') || row.estado.toLowerCase().includes('finaliz')
                            ? 'status-ready'
                            : 'status-pending'
                        }`}>
                          <i /> {row.estado}
                        </span>
                      </td>
                      <td className="muted-cell">{row.hora}</td>
                      <td>
                        <strong>{row.total}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {shouldShowCash && (
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
