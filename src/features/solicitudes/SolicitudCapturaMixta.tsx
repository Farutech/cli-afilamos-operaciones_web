import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ItemSelector } from '../catalogos/ItemSelector';
import { RegistroRapidoClienteModal } from './RegistroRapidoClienteModal';
import type { ItemCatalogo, Cliente, CanalOrigen, TipoDocumentoIdentidad } from '../../types/catalogos';
import type { NaturalezaItem } from '../../types/solicitudes';

export interface LineaDetalleLocal {
  idTemp: string;
  itemCatalogoId?: string;
  naturaleza: NaturalezaItem;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockReferencial?: number | null;
  exigeAnticipo: boolean;
  porcentajeAnticipoMinimo: number;
  anticipoMinimo: number;
  anticipoImputado: number;
  franjaCompromiso: string;
}

interface SolicitudCapturaMixtaProps {
  canales: CanalOrigen[];
  tiposDocumento: TipoDocumentoIdentidad[];
  clientes: Cliente[];
  onAsentarSolicitud: (solicitud: {
    canalUuid: string;
    clienteUuid: string;
    lineas: LineaDetalleLocal[];
    totalPagadoInventario: number;
    anticipoVoBoAutorizado: boolean;
  }) => Promise<void>;
  loading?: boolean;
}

export const SolicitudCapturaMixta: React.FC<SolicitudCapturaMixtaProps> = ({
  canales,
  tiposDocumento,
  clientes: clientesIniciales,
  onAsentarSolicitud,
  loading = false,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [selectedCanal, setSelectedCanal] = useState<string>(canales[0]?.uuid || '');
  const [selectedCliente, setSelectedCliente] = useState<string>(clientesIniciales[0]?.uuid || '');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  const [lineas, setLineas] = useState<LineaDetalleLocal[]>([]);
  const [totalPagadoInventario, setTotalPagadoInventario] = useState<number>(0);
  const [voboAutorizado, setVoboAutorizado] = useState(false);

  // Formulario de nueva línea
  const [naturalezaManual, setNaturalezaManual] = useState<NaturalezaItem>('SERVICIO');
  const [descripcionManual, setDescripcionManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);
  const [precioManual, setPrecioManual] = useState(0);
  const [franjaCompromiso, setFranjaCompromiso] = useState('');
  const [stockRefActual, setStockRefActual] = useState<number | null>(null);
  const [itemCatIdActual, setItemCatIdActual] = useState<string | undefined>(undefined);

  // Modal VoBo Supervisor
  const [isVoBoModalOpen, setIsVoBoModalOpen] = useState(false);
  const [supervisorCodigo, setSupervisorCodigo] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [justificacionVoBo, setJustificacionVoBo] = useState('');
  const [voboError, setVoboError] = useState<string | null>(null);

  // Cálculos de totales
  const totalInventario = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'INVENTARIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  const totalServicios = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.subtotal, 0),
    [lineas],
  );

  const totalAnticipos = useMemo(
    () => lineas.filter((l) => l.naturaleza === 'SERVICIO').reduce((acc, l) => acc + l.anticipoImputado, 0),
    [lineas],
  );

  const totalMinimoAnticiposExigido = useMemo(
    () =>
      lineas
        .filter((l) => l.naturaleza === 'SERVICIO' && l.exigeAnticipo)
        .reduce((acc, l) => acc + l.anticipoMinimo, 0),
    [lineas],
  );

  const totalNeto = totalInventario + totalServicios;
  const saldoPendiente = Math.max(0, totalNeto - (totalPagadoInventario + totalAnticipos));

  // Invariantes
  const inventarioImpago = totalInventario > 0 && totalPagadoInventario < totalInventario;
  const anticipoInsuficiente = totalAnticipos < totalMinimoAnticiposExigido && !voboAutorizado;

  const handleSelectItemCatalogo = (item: ItemCatalogo) => {
    setItemCatIdActual(item.uuid);
    setNaturalezaManual(item.naturaleza);
    setDescripcionManual(item.nombre);
    setPrecioManual(item.precioBase);
    setStockRefActual(item.stockReferencial ?? null);
  };

  const handleAgregarLinea = () => {
    if (!descripcionManual.trim() || cantidadManual <= 0 || precioManual < 0) return;

    const subtotal = cantidadManual * precioManual;
    const esServicio = naturalezaManual === 'SERVICIO';
    const porcentajeMin = esServicio ? 40 : 0;
    const minAnticipo = esServicio ? Math.round(subtotal * (porcentajeMin / 100)) : 0;

    const nuevaLinea: LineaDetalleLocal = {
      idTemp: `linea-${Date.now()}-${Math.random()}`,
      itemCatalogoId: itemCatIdActual,
      naturaleza: naturalezaManual,
      descripcion: descripcionManual.trim(),
      cantidad: cantidadManual,
      precioUnitario: precioManual,
      subtotal,
      stockReferencial: stockRefActual,
      exigeAnticipo: esServicio,
      porcentajeAnticipoMinimo: porcentajeMin,
      anticipoMinimo: minAnticipo,
      anticipoImputado: 0,
      franjaCompromiso: esServicio ? franjaCompromiso.trim() : '',
    };

    setLineas((prev) => [...prev, nuevaLinea]);

    // Reset formulario línea
    setDescripcionManual('');
    setCantidadManual(1);
    setPrecioManual(0);
    setStockRefActual(null);
    setItemCatIdActual(undefined);
    setFranjaCompromiso('');
  };

  const handleEliminarLinea = (idTemp: string) => {
    setLineas((prev) => prev.filter((l) => l.idTemp !== idTemp));
  };

  const handleActualizarAnticipoLinea = (idTemp: string, monto: number) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.idTemp === idTemp && l.naturaleza === 'SERVICIO') {
          const val = Math.max(0, Math.min(l.subtotal, monto));
          return { ...l, anticipoImputado: val };
        }
        return l;
      }),
    );
  };

  const handleClienteCreado = (nuevo: Cliente) => {
    setClientes((prev) => [...prev, nuevo]);
    setSelectedCliente(nuevo.uuid);
  };

  const handleAprobarVoBo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorCodigo.trim() || !supervisorPin.trim() || !justificacionVoBo.trim()) {
      setVoboError('Todos los campos son obligatorios para el VoBo de excepción.');
      return;
    }

    setVoboAutorizado(true);
    setIsVoBoModalOpen(false);
    setVoboError(null);
  };

  const handleAsentar = async () => {
    if (lineas.length === 0) return;
    if (inventarioImpago) {
      alert('Invariante #1: No se puede asentar la solicitud. El inventario debe estar cubierto al 100%.');
      return;
    }
    if (anticipoInsuficiente) {
      alert('Se requiere el anticipo mínimo requerido o VoBo de Supervisor para continuar.');
      return;
    }

    await onAsentarSolicitud({
      canalUuid: selectedCanal || canales[0]?.uuid,
      clienteUuid: selectedCliente || clientes[0]?.uuid,
      lineas,
      totalPagadoInventario,
      anticipoVoBoAutorizado: voboAutorizado,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Cabecera de Solicitud */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="select-canal" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Canal de Origen *
            </label>
            <select
              id="select-canal"
              value={selectedCanal}
              onChange={(e) => setSelectedCanal(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              {canales.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label htmlFor="select-cliente" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setIsClienteModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                + Nuevo Cliente
              </button>
            </div>
            <select
              id="select-cliente"
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              {clientes.map((cli) => (
                <option key={cli.uuid} value={cli.uuid}>
                  {cli.nombreRazonSocial} ({cli.numeroDocumento})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 2. Captura de Línea (Búsqueda o Manual) */}
      <Card>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Agregar Ítems a la Solicitud</h4>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Buscar en Catálogo (Debounced)
          </label>
          <ItemSelector onSelectItem={handleSelectItemCatalogo} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 130px 140px auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="select-naturaleza" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Naturaleza
            </label>
            <select
              id="select-naturaleza"
              value={naturalezaManual}
              onChange={(e) => setNaturalezaManual(e.target.value as NaturalezaItem)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8125rem' }}
            >
              <option value="SERVICIO">SERVICIO</option>
              <option value="INVENTARIO">PRODUCTO</option>
            </select>
          </div>

          <div>
            <Input
              id="input-desc-linea"
              label="Descripción"
              value={descripcionManual}
              onChange={(e) => setDescripcionManual(e.target.value)}
              placeholder="Nombre del servicio o producto"
            />
          </div>

          <div>
            <Input
              id="input-cant-linea"
              label="Cantidad"
              type="number"
              value={cantidadManual}
              onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div>
            <Input
              id="input-precio-linea"
              label="Precio Unit."
              type="number"
              value={precioManual}
              onChange={(e) => setPrecioManual(Math.max(0, Number(e.target.value)))}
            />
          </div>

          {naturalezaManual === 'SERVICIO' ? (
            <div>
              <Input
                id="input-franja-linea"
                label="Compromiso"
                value={franjaCompromiso}
                onChange={(e) => setFranjaCompromiso(e.target.value)}
                placeholder="Ej. MAÑANA"
              />
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingBottom: '0.5rem' }}>
              Stock Ref:{' '}
              <strong style={{ color: stockRefActual != null && stockRefActual < cantidadManual ? '#dc2626' : '#16a34a' }}>
                {stockRefActual != null ? stockRefActual : 'N/A'}
              </strong>
            </div>
          )}

          <Button type="button" variant="primary" onClick={handleAgregarLinea}>
            + Agregar
          </Button>
        </div>
      </Card>

      {/* 3. Tabla de Líneas Mixtas */}
      <Card>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Líneas del Documento ({lineas.length})</h4>

        {lineas.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '2rem 0' }}>
            No hay ítems agregados. Utilice el buscador de catálogo o el formulario superior.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.5rem' }}>Descripción</th>
                  <th style={{ padding: '0.5rem' }}>Cant.</th>
                  <th style={{ padding: '0.5rem' }}>Precio Unit.</th>
                  <th style={{ padding: '0.5rem' }}>Subtotal</th>
                  <th style={{ padding: '0.5rem' }}>Anticipo Imputado</th>
                  <th style={{ padding: '0.5rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea) => {
                  const stockInsuficiente =
                    linea.naturaleza === 'INVENTARIO' &&
                    linea.stockReferencial != null &&
                    linea.cantidad > linea.stockReferencial;

                  return (
                    <tr key={linea.idTemp} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Badge variant={linea.naturaleza === 'INVENTARIO' ? 'info' : 'success'}>
                          {linea.naturaleza === 'INVENTARIO' ? 'PRODUCTO' : 'SERVICIO'}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div>{linea.descripcion}</div>
                        {stockInsuficiente && (
                          <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
                            ⚠️ Cantidad ({linea.cantidad}) supera el stock referencial ({linea.stockReferencial})
                          </span>
                        )}
                        {linea.franjaCompromiso && (
                          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                            📅 Compromiso: {linea.franjaCompromiso}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>{linea.cantidad}</td>
                      <td style={{ padding: '0.5rem' }}>${linea.precioUnitario.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>${linea.subtotal.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {linea.naturaleza === 'SERVICIO' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input
                              type="number"
                              aria-label={`Anticipo para ${linea.descripcion}`}
                              value={linea.anticipoImputado || ''}
                              placeholder={`Mín: $${linea.anticipoMinimo.toLocaleString()}`}
                              onChange={(e) =>
                                handleActualizarAnticipoLinea(linea.idTemp, Number(e.target.value))
                              }
                              style={{
                                width: '110px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.8125rem',
                              }}
                            />
                            {linea.anticipoImputado < linea.anticipoMinimo && (
                              <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                Mín. 40%: ${linea.anticipoMinimo.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>N/A (Pago 100%)</span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleEliminarLinea(linea.idTemp)}
                        >
                          Quitar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Resumen Financiero e Invariantes */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Bloque de advertencias e invariantes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
            {inventarioImpago && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  background: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#991b1b',
                }}
              >
                <strong>Invariante #1:</strong> El inventario (${totalInventario.toLocaleString()}) debe estar
                pagado al 100% para asentar la solicitud. Actualmente pagado: ${totalPagadoInventario.toLocaleString()}.
                <div style={{ marginTop: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalPagadoInventario(totalInventario)}
                  >
                    Simular Cobro Total de Inventario ($ {totalInventario.toLocaleString()})
                  </Button>
                </div>
              </div>
            )}

            {anticipoInsuficiente && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  background: '#fffbeb',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#92400e',
                }}
              >
                <strong>Anticipo Insuficiente:</strong> Los servicios exigen un anticipo mínimo de $
                {totalMinimoAnticiposExigido.toLocaleString()} (actual: ${totalAnticipos.toLocaleString()}).
                <div style={{ marginTop: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVoBoModalOpen(true)}
                  >
                    Solicitar VoBo Supervisor (Excepción)
                  </Button>
                </div>
              </div>
            )}

            {voboAutorizado && (
              <div
                style={{
                  padding: '0.5rem',
                  background: '#ecfdf5',
                  borderLeft: '4px solid #10b981',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#065f46',
                }}
              >
                ✓ Excepción de anticipo autorizada por Supervisor.
              </div>
            )}
          </div>

          {/* Totales */}
          <div style={{ minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Inventario:</span>
              <strong>${totalInventario.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Servicios:</span>
              <strong>${totalServicios.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Total Anticipos Imputados:</span>
              <strong style={{ color: '#16a34a' }}>-${totalAnticipos.toLocaleString()}</strong>
            </div>
            {totalPagadoInventario > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Pago Directo Inventario:</span>
                <strong style={{ color: '#16a34a' }}>-${totalPagadoInventario.toLocaleString()}</strong>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
              <span>Total Neto:</span>
              <span>${totalNeto.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
              <span>Saldo Pendiente:</span>
              <span>${saldoPendiente.toLocaleString()}</span>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Button
                variant="primary"
                fullWidth
                disabled={loading || lineas.length === 0 || inventarioImpago || anticipoInsuficiente}
                onClick={handleAsentar}
              >
                {loading ? 'Asentando...' : 'Asentar Solicitud'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Registro Rápido Cliente */}
      <RegistroRapidoClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onClienteCreado={handleClienteCreado}
        tiposDocumento={tiposDocumento}
      />

      {/* Modal VoBo Supervisor */}
      {isVoBoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>VoBo Excepción Anticipo</h3>
            {voboError && (
              <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#991b1b', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {voboError}
              </div>
            )}
            <form onSubmit={handleAprobarVoBo}>
              <div style={{ marginBottom: '1rem' }}>
                <Input
                  id="vobo-supervisor"
                  label="Código de Supervisor"
                  value={supervisorCodigo}
                  onChange={(e) => setSupervisorCodigo(e.target.value)}
                  placeholder="SUPERVISOR_01"
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <Input
                  id="vobo-pin"
                  label="PIN de Autorización"
                  type="password"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="****"
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <Input
                  id="vobo-justificacion"
                  label="Justificación Obligatoria"
                  value={justificacionVoBo}
                  onChange={(e) => setJustificacionVoBo(e.target.value)}
                  placeholder="Motivo de autorización"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" variant="outline" onClick={() => setIsVoBoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Autorizar VoBo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
