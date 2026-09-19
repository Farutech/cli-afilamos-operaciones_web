import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { entregasApi } from '../../services/entregasApi';
import type {
  ItemListoEntrega,
  RemisionDetalle,
  RegistrarPagoEntregaRequest,
  DespacharRemisionRequest,
} from '../../types/entregas';
import type { MedioPagoInstrumento } from '../../types/catalogos';

interface ModuloEntregasProps {
  token?: string;
  instrumentosPago?: MedioPagoInstrumento[];
  usuarioActual?: {
    id?: number;
    publicId?: string;
    codigo: string;
    rol: string;
  };
}

export const ModuloEntregas: React.FC<ModuloEntregasProps> = ({
  token,
  instrumentosPago = [],
  usuarioActual = { codigo: 'CAJ-01', rol: 'Cajero' },
}) => {
  const [itemsListos, setItemsListos] = useState<ItemListoEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Remisión Activa en edición / despacho
  const [remisionActiva, setRemisionActiva] = useState<RemisionDetalle | null>(null);

  // Modal de Pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState<string>(
    instrumentosPago[0]?.uuid || '',
  );
  const [referenciaPago, setReferenciaPago] = useState('');

  // Formulario de Despacho (T044)
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorDocumento, setRecibidoPorDocumento] = useState('');

  const cargarItemsListos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await entregasApi.getItemsListos(busqueda || undefined, undefined, token);
      setItemsListos(data);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error cargando ítems listos para entrega');
    } finally {
      setLoading(false);
    }
  }, [busqueda, token]);

  useEffect(() => {
    let activo = true;
    const init = async () => {
      try {
        const data = await entregasApi.getItemsListos(undefined, undefined, token);
        if (activo) setItemsListos(data);
      } catch (err: unknown) {
        if (activo) setErrorMsg((err as { message?: string }).message || 'Error cargando ítems listos');
      }
    };
    init();
    return () => {
      activo = false;
    };
  }, [token]);

  // Agrupar ítems por Solicitud (RF-5.1: 1 Solicitud por Remisión)
  const solicitudesAgrupadas = useMemo(() => {
    const map = new Map<string, {
      solicitudNumero: string;
      clienteNombre: string;
      clienteDocumento: string;
      items: ItemListoEntrega[];
      totalNeto: number;
      totalAnticipos: number;
      saldoPendiente: number;
    }>();

    for (const item of itemsListos) {
      const solId = item.documentoSolicitudPublicId;
      if (!map.has(solId)) {
        map.set(solId, {
          solicitudNumero: item.documentoSolicitudNumero,
          clienteNombre: item.clienteNombre,
          clienteDocumento: item.clienteNumeroDocumento,
          items: [],
          totalNeto: 0,
          totalAnticipos: 0,
          saldoPendiente: 0,
        });
      }
      const entry = map.get(solId)!;
      entry.items.push(item);
      entry.totalNeto += item.subtotal;
      entry.totalAnticipos += item.anticipoDirectoImputado;
      entry.saldoPendiente += item.saldoPendienteItem;
    }

    return Array.from(map.entries()).map(([solicitudPublicId, data]) => ({
      solicitudPublicId,
      ...data,
    }));
  }, [itemsListos]);

  // Generar Remisión Borrador (T040)
  const handleGenerarRemision = async (solicitudPublicId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const rem = await entregasApi.generarRemision(
        {
          solicitudPublicId,
          usuarioGeneraCodigo: usuarioActual.codigo,
        },
        token,
      );
      setRemisionActiva(rem);
      setRecibidoPorNombre(rem.cliente.nombreRazonSocial || '');
      setRecibidoPorDocumento(rem.cliente.numeroDocumento || '');
      setSuccessMsg(`Remisión ${rem.numeroDocumento} creada en borrador.`);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error generando remisión');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para pagar saldo restante (T042)
  const handleAbrirPago = () => {
    if (!remisionActiva) return;
    setMontoPago(remisionActiva.saldoPendiente);
    setReferenciaPago('');
    if (!instrumentoSeleccionado && instrumentosPago.length > 0) {
      setInstrumentoSeleccionado(instrumentosPago[0].uuid);
    }
    setIsPagoModalOpen(true);
  };

  // Confirmar Pago de Entrega
  const handleConfirmarPago = async () => {
    if (!remisionActiva || montoPago <= 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const req: RegistrarPagoEntregaRequest = {
      monto: montoPago,
      cajeroCodigo: usuarioActual.codigo,
      desgloses: [
        {
          instrumentoPublicId: instrumentoSeleccionado,
          monto: montoPago,
          referenciaTransaccion: referenciaPago,
        },
      ],
    };

    try {
      const remActualizada = await entregasApi.registrarPago(remisionActiva.publicId, req, token);
      setRemisionActiva(remActualizada);
      setIsPagoModalOpen(false);
      setSuccessMsg(`Pago de $${montoPago.toLocaleString()} registrado con éxito.`);
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error registrando el pago');
    }
  };

  // Asentar y Despachar Remisión (Invariante #3, T043, T044, T045)
  const handleDespacharRemision = async () => {
    if (!remisionActiva) return;
    if (!recibidoPorNombre.trim() || !recibidoPorDocumento.trim()) {
      setErrorMsg('Debe ingresar el nombre y documento de quien recibe la entrega (RF-5.5).');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const req: DespacharRemisionRequest = {
      usuarioDespachaCodigo: usuarioActual.codigo,
      recibidoPorNombre: recibidoPorNombre.trim(),
      recibidoPorDocumento: recibidoPorDocumento.trim(),
    };

    try {
      const remDespachada = await entregasApi.despacharRemision(remisionActiva.publicId, req, token);
      setRemisionActiva(remDespachada);
      setSuccessMsg(`¡Remisión ${remDespachada.numeroDocumento} despachada y entregada con éxito a ${recibidoPorNombre}!`);
      cargarItemsListos();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message || 'Error al despachar la remisión');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Entregas y Despacho</h1>
          <p className="text-sm text-gray-500">
            Liquidación final de saldos, generación de remisiones y entrega formal al cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={cargarItemsListos} disabled={loading}>
            {loading ? 'Actualizando...' : 'Refrescar'}
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}

      {/* Buscador */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, cédula, código de ítem u OT..."
            />
          </div>
          <Button variant="primary" onClick={cargarItemsListos}>
            🔍 Buscar
          </Button>
        </div>
      </Card>

      {/* VISTA DETALLE REMISIÓN ACTIVA */}
      {remisionActiva && (
        <Card className="p-6 border-2 border-blue-500 bg-blue-50/20 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-gray-900">
                  Remisión: {remisionActiva.numeroDocumento}
                </h2>
                <Badge variant={remisionActiva.estado === 'ASENTADO' ? 'success' : 'warning'}>
                  {remisionActiva.estado}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cliente: <span className="font-bold text-gray-700">{remisionActiva.cliente.nombreRazonSocial}</span> ({remisionActiva.cliente.numeroDocumento}) | Solicitud: {remisionActiva.documentoSolicitudNumero}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRemisionActiva(null)}>
              ✕ Cerrar Vista
            </Button>
          </div>

          {/* Tabla de Ítems en la Remisión */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Ítems a Entregar</h3>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Cantidad</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Precio Unitario</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Subtotal</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Anticipo Aplicado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Saldo Ítem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {remisionActiva.items.map((it) => (
                    <tr key={it.publicId}>
                      <td className="px-4 py-2 font-medium text-gray-900">{it.descripcion}</td>
                      <td className="px-4 py-2 text-center text-gray-600">{it.cantidad}</td>
                      <td className="px-4 py-2 text-right text-gray-600">${it.precioUnitario.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">${it.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-green-600">${it.anticipoDirectoImputado.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">${it.saldoPendienteItem.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Liquidación Financiera (T042) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <span className="text-xs text-gray-500">Total Facturado</span>
              <div className="text-lg font-bold text-gray-900">${remisionActiva.totalNeto.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Anticipos Solicitud</span>
              <div className="text-lg font-bold text-green-600">-${remisionActiva.totalAnticiposPrevios.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Pagos en Entrega</span>
              <div className="text-lg font-bold text-blue-600">-${remisionActiva.totalPagosEntrega.toLocaleString()}</div>
            </div>
            <div className="border-l pl-4 border-gray-200">
              <span className="text-xs font-bold text-gray-700">Saldo Pendiente a Cobrar</span>
              <div className={`text-xl font-black ${remisionActiva.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${remisionActiva.saldoPendiente.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Formulario de Despacho y Cobro */}
          {remisionActiva.estado === 'BORRADOR' && (
            <div className="space-y-4 pt-2">
              {remisionActiva.saldoPendiente > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-amber-800">
                    <span className="font-bold">⚠️ Invariante #3:</span> Existe un saldo pendiente de <strong>${remisionActiva.saldoPendiente.toLocaleString()}</strong>. El sistema bloquea el despacho hasta que el saldo esté 100% saldado.
                  </div>
                  <Button variant="primary" onClick={handleAbrirPago}>
                    💳 Registrar Cobro (${remisionActiva.saldoPendiente.toLocaleString()})
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <span>✅</span> Saldo 100% liquidado. La remisión está lista para asentar y despachar.
                </div>
              )}

              {/* Registro de Recibido Por (RF-5.5, T044) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Entregado a (Nombre Completo) *
                  </label>
                  <Input
                    value={recibidoPorNombre}
                    onChange={(e) => setRecibidoPorNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cédula / Documento Identidad *
                  </label>
                  <Input
                    value={recibidoPorDocumento}
                    onChange={(e) => setRecibidoPorDocumento(e.target.value)}
                    placeholder="Ej: 1098765432"
                    required
                  />
                </div>
              </div>

              {/* Botón Final Despachar */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={
                    remisionActiva.saldoPendiente > 0 ||
                    !recibidoPorNombre.trim() ||
                    !recibidoPorDocumento.trim()
                  }
                  onClick={handleDespacharRemision}
                >
                  🚀 Asentar y Despachar al Cliente
                </Button>
              </div>
            </div>
          )}

          {remisionActiva.estado === 'ASENTADO' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 space-y-1">
              <div className="font-bold text-green-700">📦 Remisión Finalizada y Despachada</div>
              <div>Recibido por: <strong>{remisionActiva.recibidoPorNombre}</strong> (Doc: {remisionActiva.recibidoPorDocumento})</div>
              <div className="text-xs text-gray-400">Fecha de entrega: {new Date(remisionActiva.fechaEmision).toLocaleString()}</div>
            </div>
          )}
        </Card>
      )}

      {/* TABLA DE SOLICITUDES LISTAS PARA GENERAR REMISIÓN */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Órdenes Listas para Entrega (1 Solicitud por Remisión)</h2>
          <p className="text-xs text-gray-500">
            Trabajos de taller terminados pendientes de entrega en mostrador.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Solicitud</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ítems Listos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Anticipos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Saldo a Cobrar</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {solicitudesAgrupadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Cargando órdenes listas...' : 'No hay órdenes listas para entrega pendientes.'}
                  </td>
                </tr>
              ) : (
                solicitudesAgrupadas.map((sol) => (
                  <tr key={sol.solicitudPublicId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{sol.solicitudNumero}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sol.clienteNombre}</div>
                      <div className="text-xs text-gray-400">{sol.clienteDocumento}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {sol.items.map((it) => (
                          <div key={it.itemPublicId} className="text-xs text-gray-600 flex items-center gap-2">
                            <span>• {it.descripcion} (Cant: {it.cantidad})</span>
                            <Badge variant="success">{it.etapaActualNombre}</Badge>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">${sol.totalNeto.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">${sol.totalAnticipos.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">${sol.saldoPendiente.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleGenerarRemision(sol.solicitudPublicId)}
                        disabled={loading}
                      >
                        📄 Generar Remisión
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL COBRAR SALDO PENDIENTE */}
      {isPagoModalOpen && remisionActiva && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Cobro de Entrega</h3>
            <p className="text-xs text-gray-500">
              Remisión: <span className="font-semibold">{remisionActiva.numeroDocumento}</span> | Cliente: {remisionActiva.cliente.nombreRazonSocial}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Monto a Cobrar ($) *</label>
                <Input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(Number(e.target.value))}
                  max={remisionActiva.saldoPendiente}
                  min={1}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Medio de Pago *</label>
                <select
                  value={instrumentoSeleccionado}
                  onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {instrumentosPago.length === 0 ? (
                    <option value="">Efectivo Mostrador (Predeterminado)</option>
                  ) : (
                    instrumentosPago.map((inst) => (
                      <option key={inst.uuid} value={inst.uuid}>
                        {inst.nombre} ({inst.codigo})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Referencia Transacción (Opcional)</label>
                <Input
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Aprobación datáfono #987654"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setIsPagoModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmarPago} disabled={montoPago <= 0}>
                Confirmar Recaudo
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
