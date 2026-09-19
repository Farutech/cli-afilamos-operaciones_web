import React, { useState, useEffect } from 'react';
import { catalogosApi } from '../../services/catalogosApi';
import type { Cliente, ClienteHistorico } from '../../types/catalogos';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface FichaClienteProps {
  onIniciarSolicitud?: (cliente: Cliente) => void;
}

export const FichaCliente: React.FC<FichaClienteProps> = ({ onIniciarSolicitud }) => {
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [historico, setHistorico] = useState<ClienteHistorico | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar lista inicial de clientes
  useEffect(() => {
    let activo = true;
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const res = await catalogosApi.getClientes(busqueda || undefined);
        if (activo) {
          setClientes(res.clientes);
          setClienteSeleccionado(prev => prev ?? (res.clientes.length > 0 ? res.clientes[0] : null));
        }
      } catch (err: unknown) {
        if (activo) {
          setErrorMsg((err as Error).message || 'Error cargando clientes');
        }
      } finally {
        if (activo) setLoading(false);
      }
    };
    fetchClientes();
    return () => {
      activo = false;
    };
  }, [busqueda]);

  // Cargar histórico cuando cambia el cliente seleccionado
  useEffect(() => {
    if (!clienteSeleccionado) return;

    let activo = true;
    const fetchHistorico = async () => {
      setLoadingHistorico(true);
      setErrorMsg(null);
      try {
        const data = await catalogosApi.getClienteHistorico(clienteSeleccionado.uuid);
        if (activo) setHistorico(data);
      } catch (err: unknown) {
        if (activo) setErrorMsg((err as Error).message || 'Error cargando histórico del cliente');
      } finally {
        if (activo) setLoadingHistorico(false);
      }
    };

    fetchHistorico();
    return () => {
      activo = false;
    };
  }, [clienteSeleccionado]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Barra de búsqueda */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>👥 Ficha y Trazabilidad de Clientes</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Histórico integral de compras, órdenes de servicio y saldo consolidado (RF-7.1, RF-7.4)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Grid Principal: Lista lateral + Detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2.5fr', gap: '20px' }}>
        {/* Lista de clientes */}
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Clientes ({clientes.length})</h3>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando clientes...</p>
          ) : clientes.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No se encontraron clientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
              {clientes.map((c) => {
                const esSeleccionado = clienteSeleccionado?.uuid === c.uuid;
                return (
                  <div
                    key={c.uuid}
                    onClick={() => setClienteSeleccionado(c)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${esSeleccionado ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: esSeleccionado ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.nombreRazonSocial}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {c.tipoDocumento?.codigo ?? 'DOC'}: {c.numeroDocumento} · 📞 {c.telefono}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Ficha e Histórico del Cliente Seleccionado */}
        {clienteSeleccionado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cabecera del cliente */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{clienteSeleccionado.nombreRazonSocial}</h2>
                    <Badge variant={clienteSeleccionado.activo ? 'success' : 'neutral'}>
                      {clienteSeleccionado.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <strong>Documento:</strong> {clienteSeleccionado.tipoDocumento?.codigo ?? 'NIT'} {clienteSeleccionado.numeroDocumento} · <strong>Teléfono:</strong> {clienteSeleccionado.telefono}
                  </div>
                </div>
                {onIniciarSolicitud && (
                  <Button variant="primary" size="sm" onClick={() => onIniciarSolicitud(clienteSeleccionado)}>
                    ➕ Nueva Solicitud para este Cliente
                  </Button>
                )}
              </div>

              {/* Tarjetas KPI de Trazabilidad */}
              {historico && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Gastado</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      ${historico.totalHistoricoGastado.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Solicitudes</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{historico.totalSolicitudes}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Con Saldo Pendiente</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: historico.solicitudesActivas > 0 ? 'var(--color-warning)' : 'inherit' }}>
                      {historico.solicitudesActivas}
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Órdenes de Taller</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{historico.otsEnProceso}</div>
                  </div>
                </div>
              )}
            </Card>

            {/* Tabla de Documentos Históricos */}
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
                Historial de Solicitudes y Documentos (RF-7.4)
              </h3>
              {loadingHistorico ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando documentos...</p>
              ) : !historico || historico.documentos.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Este cliente no tiene documentos registrados.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Documento</th>
                        <th style={{ padding: '8px' }}>Tipo</th>
                        <th style={{ padding: '8px' }}>Fecha</th>
                        <th style={{ padding: '8px' }}>Estado</th>
                        <th style={{ padding: '8px' }}>Canal</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Saldo Pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.documentos.map((d) => (
                        <tr key={d.uuid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{d.numeroDocumentoVisible}</td>
                          <td style={{ padding: '8px' }}>
                            <Badge variant={d.tipoDocumentoBase === 'SOL' ? 'info' : d.tipoDocumentoBase === 'REM' ? 'success' : 'neutral'}>
                              {d.subtipoCodigo}
                            </Badge>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>
                            {new Date(d.fechaEmision).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <Badge variant={d.estado === 'ASENTADO' ? 'success' : d.estado === 'BORRADOR' ? 'neutral' : 'danger'}>
                              {d.estado}
                            </Badge>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{d.canalOrigen ?? 'Mostrador'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>${d.montoTotal.toLocaleString('es-CO')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: d.saldoPendiente > 0 ? '#b45309' : '#15803d', fontWeight: 600 }}>
                            ${d.saldoPendiente.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <p style={{ color: 'var(--color-text-muted)' }}>Seleccione un cliente para ver su ficha y trazabilidad.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
