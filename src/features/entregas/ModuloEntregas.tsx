import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Badge, Input, Modal } from '@farutech/design-system';
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

  // Modal de Selección para Nueva Entrega
  const [mostrarModalNuevaEntrega, setMostrarModalNuevaEntrega] = useState(false);

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Módulo de Entregas y Despacho</h1>
          <p className="text-sm text-gray-400">
            Liquidación final de saldos, generación de remisiones y entrega formal al cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={cargarItemsListos} disabled={loading}>
            {loading ? 'Actualizando...' : 'Refrescar'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (solicitudesAgrupadas.length === 1) {
                handleGenerarRemision(solicitudesAgrupadas[0].solicitudPublicId);
              } else {
                setMostrarModalNuevaEntrega(true);
              }
            }}
          >
            + Registrar Entrega / Despacho
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold">✕</button>
        </div>
      )}

      {/* Buscador */}
      <Card className="p-4 bg-gray-900/80 border border-white/10 rounded-xl">
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
        <Card className="p-6 border border-blue-500/50 bg-blue-950/20 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Remisión: {remisionActiva.numeroDocumento}
                </h2>
                <Badge variant={remisionActiva.estado === 'ASENTADO' ? 'success' : 'warning'}>
                  {remisionActiva.estado}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Cliente: <span className="font-bold text-white">{remisionActiva.cliente.nombreRazonSocial}</span> ({remisionActiva.cliente.numeroDocumento}) | Solicitud: <span className="font-mono text-blue-300 font-bold">{remisionActiva.documentoSolicitudNumero}</span>
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setRemisionActiva(null)}>
              ✕ Cerrar Vista
            </Button>
          </div>

          {/* Tabla de Ítems en la Remisión */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 mb-2">Ítems a Entregar</h3>
            <div className="overflow-x-auto bg-gray-900/90 rounded-xl border border-white/10 shadow-inner">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-300">Descripción</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-300">Cantidad</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-300">Precio Unitario</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-300">Subtotal</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-300">Anticipo Aplicado</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-300">Saldo Ítem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {remisionActiva.items.map((it) => (
                    <tr key={it.publicId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-white">{it.descripcion}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300">{it.cantidad}</td>
                      <td className="px-4 py-2.5 text-right text-gray-300 font-mono">${it.precioUnitario.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-white font-mono">${it.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400 font-mono">${it.anticipoDirectoImputado.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-200 font-mono">${it.saldoPendienteItem.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Liquidación Financiera (T042) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-900/90 rounded-xl border border-white/10">
            <div>
              <span className="text-xs text-gray-400">Total Facturado</span>
              <div className="text-lg font-bold text-white font-mono">${remisionActiva.totalNeto.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-400">Anticipos Solicitud</span>
              <div className="text-lg font-bold text-emerald-400 font-mono">-${remisionActiva.totalAnticiposPrevios.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-400">Pagos en Entrega</span>
              <div className="text-lg font-bold text-blue-400 font-mono">-${remisionActiva.totalPagosEntrega.toLocaleString()}</div>
            </div>
            <div className="border-l pl-4 border-white/10">
              <span className="text-xs font-bold text-gray-300">Saldo Pendiente a Cobrar</span>
              <div className={`text-xl font-black font-mono ${remisionActiva.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${remisionActiva.saldoPendiente.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Formulario de Despacho y Cobro */}
          {remisionActiva.estado === 'BORRADOR' && (
            <div className="space-y-4 pt-2">
              {remisionActiva.saldoPendiente > 0 ? (
                <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-amber-300">
                    <span className="font-bold">⚠️ Invariante #3:</span> Existe un saldo pendiente de <strong className="font-mono">${remisionActiva.saldoPendiente.toLocaleString()}</strong>. El sistema bloquea el despacho hasta que el saldo esté 100% saldado.
                  </div>
                  <Button variant="primary" onClick={handleAbrirPago}>
                    💳 Registrar Cobro (${remisionActiva.saldoPendiente.toLocaleString()})
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <span>✅</span> Saldo 100% liquidado. La remisión está lista para asentar y despachar al cliente.
                </div>
              )}

              {/* Registro de Recibido Por (RF-5.5, T044) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900/80 rounded-xl border border-white/10">
                <div>
                  <Input
                    label="Entregado a (Nombre Completo) *"
                    value={recibidoPorNombre}
                    onChange={(e) => setRecibidoPorNombre(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    required
                    fullWidth
                  />
                </div>
                <div>
                  <Input
                    label="Cédula / Documento Identidad *"
                    value={recibidoPorDocumento}
                    onChange={(e) => setRecibidoPorDocumento(e.target.value)}
                    placeholder="Ej: 1098765432"
                    required
                    fullWidth
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
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-sm text-gray-200 space-y-1">
              <div className="font-bold text-emerald-300">📦 Remisión Finalizada y Despachada</div>
              <div>Recibido por: <strong className="text-white">{remisionActiva.recibidoPorNombre}</strong> (Doc: {remisionActiva.recibidoPorDocumento})</div>
              <div className="text-xs text-gray-400">Fecha de entrega: {new Date(remisionActiva.fechaEmision).toLocaleString()}</div>
            </div>
          )}
        </Card>
      )}

      {/* TABLA DE SOLICITUDES LISTAS PARA GENERAR REMISIÓN */}
      <Card className="overflow-hidden bg-gray-900/80 border border-white/10 rounded-2xl shadow-xl">
        <div className="p-4 border-b border-white/10 bg-gray-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Órdenes Listas para Entrega (1 Solicitud por Remisión)</h2>
            <p className="text-xs text-gray-400">
              Trabajos de taller terminados pendientes de entrega y liquidación en mostrador.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-gray-800 text-gray-300 border border-white/10">
            {solicitudesAgrupadas.length} pendientes
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Solicitud</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Ítems Listos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Anticipos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Saldo a Cobrar</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {solicitudesAgrupadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Cargando órdenes listas...' : 'No hay órdenes listas para entrega pendientes.'}
                  </td>
                </tr>
              ) : (
                solicitudesAgrupadas.map((sol) => (
                  <tr key={sol.solicitudPublicId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-bold font-mono text-white">{sol.solicitudNumero}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{sol.clienteNombre}</div>
                      <div className="text-xs text-gray-400 font-mono">{sol.clienteDocumento}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {sol.items.map((it) => (
                          <div key={it.itemPublicId} className="text-xs text-gray-300 flex items-center gap-2">
                            <span>• {it.descripcion} (Cant: {it.cantidad})</span>
                            <Badge variant="success">{it.etapaActualNombre}</Badge>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white font-semibold">${sol.totalNeto.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">${sol.totalAnticipos.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">${sol.saldoPendiente.toLocaleString()}</td>
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

      {/* MODAL NUEVA ENTREGA / SELECCIONAR SOLICITUD */}
      <Modal
        isOpen={mostrarModalNuevaEntrega}
        onClose={() => setMostrarModalNuevaEntrega(false)}
        title="Registrar Nueva Entrega / Despacho"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-400">
            Seleccione la solicitud u orden de servicio finalizada en taller para liquidar saldos y generar remisión formal de despacho.
          </p>

          {solicitudesAgrupadas.length === 0 ? (
            <div className="p-8 text-center text-gray-400 border border-dashed border-white/10 rounded-xl">
              No hay órdenes listas para entrega pendientes en cola de taller.
            </div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-gray-950/40">
              {solicitudesAgrupadas.map((sol) => (
                <div key={sol.solicitudPublicId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{sol.solicitudNumero}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-medium">
                        {sol.items.length} {sol.items.length === 1 ? 'ítem listo' : 'ítems listos'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-200 mt-1">{sol.clienteNombre}</div>
                    <div className="text-xs text-gray-400 font-mono">Doc: {sol.clienteDocumento}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Saldo a Cobrar</div>
                      <div className={`text-base font-black font-mono ${sol.saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${sol.saldoPendiente.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setMostrarModalNuevaEntrega(false);
                        handleGenerarRemision(sol.solicitudPublicId);
                      }}
                    >
                      📦 Iniciar Entrega
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-white/10">
            <Button variant="secondary" onClick={() => setMostrarModalNuevaEntrega(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL COBRAR SALDO PENDIENTE */}
      <Modal
        isOpen={isPagoModalOpen && !!remisionActiva}
        onClose={() => setIsPagoModalOpen(false)}
        title="Cobro de Saldo de Entrega"
        size="md"
      >
        {remisionActiva && (
          <div className="p-4 space-y-4">
            <div className="bg-gray-900/60 p-3 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400">Remisión: </span>
              <span className="font-bold font-mono text-white">{remisionActiva.numeroDocumento}</span>
              <div className="text-xs text-gray-300 mt-0.5">Cliente: {remisionActiva.cliente.nombreRazonSocial}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Monto a Cobrar (COP) *</label>
                <Input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(Number(e.target.value))}
                  max={remisionActiva.saldoPendiente}
                  min={1}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Medio de Pago *</label>
                <select
                  value={instrumentoSeleccionado}
                  onChange={(e) => setInstrumentoSeleccionado(e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <Input
                  label="Referencia Transacción (Opcional)"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Aprobación datáfono #987654"
                  fullWidth
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsPagoModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmarPago} disabled={montoPago <= 0}>
                Confirmar Recaudo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
