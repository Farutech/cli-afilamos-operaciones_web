import React, { useState, useEffect, useCallback } from 'react';
import type { TurnoDto, DetalleSupervisorCierreDto } from '../../types/caja';
import {
  abrirTurno,
  obtenerTurnoActivo,
  registrarEgreso,
  declararArqueoCiego,
  obtenerDetalleSupervisor,
  procesarVoBo
} from '../../services/cajaApi';
import { Badge, Button, Card, Input } from '@farutech/design-system';

interface ModuloCajaProps {
  codigoCajaDefault?: string;
  userRole?: string;
  token?: string;
}

export const ModuloCaja: React.FC<ModuloCajaProps> = ({
  codigoCajaDefault = 'CAJA-01',
  userRole = 'Cajero',
  token,
}) => {
  const [turno, setTurno] = useState<TurnoDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Egreso
  const [mostrarModalEgreso, setMostrarModalEgreso] = useState<boolean>(false);
  const [egresoMonto, setEgresoMonto] = useState<string>('');
  const [egresoMotivo, setEgresoMotivo] = useState<string>('');
  const [guardandoEgreso, setGuardandoEgreso] = useState<boolean>(false);

  // Modal Arqueo Ciego
  const [mostrarModalArqueo, setMostrarModalArqueo] = useState<boolean>(false);
  const [declEfectivo, setDeclEfectivo] = useState<string>('0');
  const [declTarjeta, setDeclTarjeta] = useState<string>('0');
  const [declTransferencia, setDeclTransferencia] = useState<string>('0');
  const [guardandoArqueo, setGuardandoArqueo] = useState<boolean>(false);

  // Apertura
  const [baseInicial, setBaseInicial] = useState<string>('100000');
  const [abriendoTurno, setAbriendoTurno] = useState<boolean>(false);

  // Supervisor VoBo
  const [detalleSupervisor, setDetalleSupervisor] = useState<DetalleSupervisorCierreDto | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [pinSupervisor, setPinSupervisor] = useState<string>('');
  const [observacionVoBo, setObservacionVoBo] = useState<string>('');
  const [procesandoVoBo, setProcesandoVoBo] = useState<boolean>(false);

  const cargarTurno = useCallback(async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const data = await obtenerTurnoActivo(codigoCajaDefault, token);
      setTurno(data);

      if (data && data.estado === 'PENDIENTE_VOBO') {
        try {
          const det = await obtenerDetalleSupervisor(data.id, token);
          setDetalleSupervisor(det);
        } catch {
          // El usuario actual puede no ser supervisor aún
          setDetalleSupervisor(null);
        }
      } else {
        setDetalleSupervisor(null);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al consultar estado de la caja');
    } finally {
      setCargando(false);
    }
  }, [codigoCajaDefault, token]);

  useEffect(() => {
    let activo = true;
    const init = async () => {
      try {
        const t = await obtenerTurnoActivo(codigoCajaDefault, token);
        if (!activo) return;
        setTurno(t);
        if (t && t.estado === 'PENDIENTE_VOBO') {
          try {
            const det = await obtenerDetalleSupervisor(t.id, token);
            if (activo) setDetalleSupervisor(det);
          } catch {
            if (activo) setDetalleSupervisor(null);
          }
        } else {
          if (activo) setDetalleSupervisor(null);
        }
      } catch (err: unknown) {
        if (activo) {
          const e = err as Error;
          setErrorMsg(e.message || 'Error al consultar estado de la caja');
        }
      } finally {
        if (activo) setCargando(false);
      }
    };
    init();
    return () => {
      activo = false;
    };
  }, [codigoCajaDefault, token]);

  const handleAbrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(baseInicial);
    if (isNaN(monto) || monto < 0) {
      setErrorMsg('La base inicial debe ser un número mayor o igual a 0');
      return;
    }

    setAbriendoTurno(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const nuevoTurno = await abrirTurno({
        codigoCaja: codigoCajaDefault,
        baseInicial: monto
      }, token);
      setTurno(nuevoTurno);
      setSuccessMsg(`Turno ${nuevoTurno.codigo} abierto exitosamente con base de $${monto.toLocaleString('es-CO')}`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al abrir el turno');
    } finally {
      setAbriendoTurno(false);
    }
  };

  const handleRegistrarEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turno) return;

    const monto = parseFloat(egresoMonto);
    if (isNaN(monto) || monto <= 0) {
      setErrorMsg('El monto del egreso debe ser mayor a 0');
      return;
    }
    if (!egresoMotivo.trim()) {
      setErrorMsg('El motivo del egreso es obligatorio');
      return;
    }

    setGuardandoEgreso(true);
    setErrorMsg(null);

    try {
      const res = await registrarEgreso(turno.id, {
        monto,
        motivo: egresoMotivo.trim()
      }, token);
      setSuccessMsg(`Egreso ${res.consecutivo} registrado por $${monto.toLocaleString('es-CO')}`);
      setMostrarModalEgreso(false);
      setEgresoMonto('');
      setEgresoMotivo('');
      await cargarTurno();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al registrar comprobante de egreso');
    } finally {
      setGuardandoEgreso(false);
    }
  };

  const handleDeclararArqueoCiego = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turno) return;

    const ef = parseFloat(declEfectivo) || 0;
    const tar = parseFloat(declTarjeta) || 0;
    const trans = parseFloat(declTransferencia) || 0;

    if (ef < 0 || tar < 0 || trans < 0) {
      setErrorMsg('Los montos declarados no pueden ser negativos');
      return;
    }

    setGuardandoArqueo(true);
    setErrorMsg(null);

    try {
      const res = await declararArqueoCiego(turno.id, {
        declaradoEfectivo: ef,
        declaradoTarjeta: tar,
        declaradoTransferencia: trans
      });
      setSuccessMsg(`Arqueo ciego registrado. Turno ${res.codigoTurno} enviado a VoBo de Supervisor.`);
      setMostrarModalArqueo(false);
      await cargarTurno();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al declarar arqueo de cierre');
    } finally {
      setGuardandoArqueo(false);
    }
  };

  const handleCargarDetalleSupervisor = async () => {
    if (!turno) return;
    setCargandoDetalle(true);
    setErrorMsg(null);
    try {
      const det = await obtenerDetalleSupervisor(turno.id, token);
      setDetalleSupervisor(det);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al consultar detalle del supervisor');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleProcesarVoBo = async (decision: 'APROBADO' | 'RECHAZADO') => {
    if (!turno) return;
    if (!pinSupervisor.trim() || pinSupervisor.length < 4) {
      setErrorMsg('Debe ingresar un PIN de supervisor válido (mínimo 4 dígitos)');
      return;
    }

    setProcesandoVoBo(true);
    setErrorMsg(null);

    try {
      const res = await procesarVoBo(turno.id, {
        pin: pinSupervisor.trim(),
        decision,
        observacion: observacionVoBo.trim()
      }, token);
      setSuccessMsg(`Turno ${res.codigo} procesado como ${res.estado} exitosamente.`);
      setPinSupervisor('');
      setObservacionVoBo('');
      await cargarTurno();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al procesar VoBo');
    } finally {
      setProcesandoVoBo(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>💰</span> Gestión de Caja y Turnos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de aperturas con base monetaria obligatoria, arqueos ciegos y VoBo de supervisor.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            Rol: {userRole}
          </span>
          <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            {codigoCajaDefault}
          </span>
          {turno ? (
            <span
              className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                turno.estado === 'ABIERTO'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : turno.estado === 'PENDIENTE_VOBO'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                  : 'bg-slate-100 text-slate-800 border border-slate-300'
              }`}
            >
              ● {turno.estado}
            </span>
          ) : (
            <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              ● SIN TURNO ACTIVO
            </span>
          )}
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded text-sm flex justify-between items-center">
          <div>
            <strong className="font-semibold">Atención:</strong> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded text-sm flex justify-between items-center">
          <div>
            <strong className="font-semibold">Éxito:</strong> {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {cargando ? (
        <div className="p-12 text-center text-slate-400">Cargando estado de la caja...</div>
      ) : !turno || turno.estado === 'CERRADO' ? (
        /* Panel Apertura */
        <Card>
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              💵
            </div>
            <h2 className="text-lg font-bold text-slate-800">Apertura de Turno de Caja</h2>
            <p className="text-sm text-slate-500">
              Para registrar cobros y operaciones, debe inicializar la jornada ingresando la base monetaria en efectivo obligatoria (RF-6.3).
            </p>

            <form onSubmit={handleAbrirTurno} className="space-y-4 text-left pt-2">
              <Input
                label="Caja Física"
                type="text"
                value={codigoCajaDefault}
                disabled
              />
              <Input
                label="Base Inicial en Efectivo (COP) *"
                type="number"
                min="0"
                step="1000"
                required
                value={baseInicial}
                onChange={(e) => setBaseInicial(e.target.value)}
                placeholder="100000"
                helperText="Monto físico entregado al cajero para dar cambio."
              />
              <Button
                type="submit"
                disabled={abriendoTurno}
                variant="primary"
                fullWidth
              >
                {abriendoTurno ? 'Inicializando turno...' : '✨ Abrir Turno de Caja'}
              </Button>
            </form>
          </div>
        </Card>
      ) : turno.estado === 'ABIERTO' ? (
        /* Panel Turno Abierto */
        <div className="space-y-6">
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Turno Actual</span>
              <p className="text-lg font-bold text-slate-800 mt-1">{turno.codigo}</p>
              <p className="text-xs text-slate-500 mt-0.5">Cajero: {turno.nombreCajero}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Base Inicial</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                ${turno.baseInicial.toLocaleString('es-CO')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Efectivo de arranque</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Movimientos</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{turno.movimientos.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Entradas y salidas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Apertura</span>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {new Date(turno.fechaAperturaUtc).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(turno.fechaAperturaUtc).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMostrarModalEgreso(true)}
            >
              <span>💸</span> Registrar Egreso Menor (Caja Menor)
            </Button>
            <Button
              variant="primary"
              size="sm"
              style={{ backgroundColor: '#d97706' }}
              onClick={() => setMostrarModalArqueo(true)}
            >
              <span>🔒</span> Cerrar Turno (Arqueo Ciego)
            </Button>
          </div>

          {/* Tabla de Movimientos del Turno */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Movimientos Inmutables del Turno (RF-6.4, T052)
              </h2>
              <span className="text-xs text-slate-500">Solo inserción (append-only)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Hora</th>
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Concepto / Detalle</th>
                    <th className="px-6 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {turno.movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                        No hay movimientos registrados en este turno.
                      </td>
                    </tr>
                  ) : (
                    turno.movimientos.map((m) => {
                      const esEgreso = m.tipoMovimiento === 'EGRESO_CAJA_MENOR';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-xs text-slate-500">
                            {new Date(m.fechaUtc).toLocaleTimeString('es-CO')}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-500">{m.codigo}</td>
                          <td className="px-6 py-3">
                            <Badge
                              variant={
                                m.tipoMovimiento === 'BASE_INICIAL'
                                  ? 'primary'
                                  : esEgreso
                                  ? 'danger'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {m.tipoMovimiento}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-800">{m.concepto}</td>
                          <td
                            className={`px-6 py-3 text-right font-bold ${
                              esEgreso ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {esEgreso ? '-' : ''}${m.monto.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Panel Turno PENDIENTE_VOBO */
        <div className="space-y-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-xl text-amber-900 space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>⏳</span> Turno {turno.codigo} en espera de VoBo de Supervisor (RF-6.7)
            </h2>
            <p className="text-sm text-amber-800">
              El cajero ha declarado los valores de cierre a ciegas. Un supervisor con rol autorizado debe ingresar su PIN para verificar las diferencias y aprobar o rechazar el cierre.
            </p>
          </div>

          {/* Comparativo de Supervisión */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                Detalle de Auditoría y Saldos Teóricos
              </h3>
              {!detalleSupervisor && (
                <button
                  onClick={handleCargarDetalleSupervisor}
                  disabled={cargandoDetalle}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded shadow"
                >
                  {cargandoDetalle ? 'Consultando...' : '🔍 Cargar Saldos de Supervisión'}
                </button>
              )}
            </div>

            {detalleSupervisor ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Medio</th>
                      <th className="px-4 py-2 text-right">Declarado (Cajero)</th>
                      <th className="px-4 py-2 text-right">Teórico (Sistema)</th>
                      <th className="px-4 py-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2 font-medium">Efectivo</td>
                      <td className="px-4 py-2 text-right">${detalleSupervisor.declarado.efectivo.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-medium">${detalleSupervisor.teorico.efectivo.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-bold">
                        ${(detalleSupervisor.declarado.efectivo - detalleSupervisor.teorico.efectivo).toLocaleString('es-CO')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Tarjeta / Datáfono</td>
                      <td className="px-4 py-2 text-right">${detalleSupervisor.declarado.tarjeta.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-medium">${detalleSupervisor.teorico.tarjeta.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-bold">
                        ${(detalleSupervisor.declarado.tarjeta - detalleSupervisor.teorico.tarjeta).toLocaleString('es-CO')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Transferencia Bancaria</td>
                      <td className="px-4 py-2 text-right">${detalleSupervisor.declarado.transferencia.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-medium">${detalleSupervisor.teorico.transferencia.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-bold">
                        ${(detalleSupervisor.declarado.transferencia - detalleSupervisor.teorico.transferencia).toLocaleString('es-CO')}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td className="px-4 py-2.5">Total General</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">
                        ${detalleSupervisor.declarado.total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-900">
                        ${detalleSupervisor.teorico.total.toLocaleString('es-CO')}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right ${
                          detalleSupervisor.diferencia < 0
                            ? 'text-rose-600'
                            : detalleSupervisor.diferencia > 0
                            ? 'text-blue-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        ${detalleSupervisor.diferencia.toLocaleString('es-CO')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Inicie sesión o autorice con credenciales de Supervisor para ver el desglose teórico.
              </p>
            )}

            {/* Formulario VoBo */}
            <div className="pt-4 border-t border-slate-200 space-y-4 max-w-md">
              <h4 className="text-sm font-bold text-slate-800">Autorización con PIN de Supervisor (T054)</h4>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  PIN de Seguridad *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinSupervisor}
                  onChange={(e) => setPinSupervisor(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest text-lg font-bold"
                />
                <span className="text-xs text-slate-400">
                  Invariante #7: El supervisor no puede ser el mismo cajero del turno.
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Observaciones / Justificación de Cierre
                </label>
                <input
                  type="text"
                  value={observacionVoBo}
                  onChange={(e) => setObservacionVoBo(e.target.value)}
                  placeholder="Ej: Conteo conforme / Justificación de descuadre"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={procesandoVoBo}
                  onClick={() => handleProcesarVoBo('APROBADO')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow text-sm transition-colors"
                >
                  {procesandoVoBo ? 'Procesando...' : '✓ Aprobar Cierre'}
                </button>
                <button
                  type="button"
                  disabled={procesandoVoBo}
                  onClick={() => handleProcesarVoBo('RECHAZADO')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow text-sm transition-colors"
                >
                  {procesandoVoBo ? 'Procesando...' : '✕ Rechazar Cierre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Egreso Menor */}
      {mostrarModalEgreso && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>💸</span> Comprobante de Egreso (Caja Menor)
            </h3>
            <p className="text-xs text-slate-500">
              Registra salidas de dinero autorizadas con asignación de folio consecutivo automático (RF-6.10).
            </p>

            <form onSubmit={handleRegistrarEgreso} className="space-y-4">
              <Input
                label="Monto a Retirar (COP) *"
                type="number"
                min="1"
                step="100"
                required
                value={egresoMonto}
                onChange={(e) => setEgresoMonto(e.target.value)}
                placeholder="15000"
              />
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Motivo / Justificación *
                </label>
                <textarea
                  required
                  rows={2}
                  value={egresoMotivo}
                  onChange={(e) => setEgresoMotivo(e.target.value)}
                  placeholder="Ej: Compra de insumos de limpieza para mostrador"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarModalEgreso(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={guardandoEgreso}
                >
                  {guardandoEgreso ? 'Guardando...' : 'Emitir Comprobante'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Arqueo Ciego */}
      {mostrarModalArqueo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🔒</span> Cierre de Turno: Arqueo Ciego (RF-6.5)
            </h3>
            <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900">
              <strong>Atención — Arqueo Ciego:</strong> Ingrese los valores reales que contó físicamente en su gaveta y datáfono. Los saldos teóricos del sistema están ocultos para asegurar integridad.
            </div>

            <form onSubmit={handleDeclararArqueoCiego} className="space-y-4">
              <Input
                id="arqueo-efectivo"
                label="Efectivo Contado Físicamente (COP) *"
                type="number"
                min="0"
                step="100"
                required
                value={declEfectivo}
                onChange={(e) => setDeclEfectivo(e.target.value)}
              />
              <Input
                id="arqueo-tarjeta"
                label="Vouchers de Tarjeta / Datáfono (COP) *"
                type="number"
                min="0"
                step="100"
                required
                value={declTarjeta}
                onChange={(e) => setDeclTarjeta(e.target.value)}
              />
              <Input
                id="arqueo-transferencia"
                label="Transferencias Bancarias Confirmadas (COP) *"
                type="number"
                min="0"
                step="100"
                required
                value={declTransferencia}
                onChange={(e) => setDeclTransferencia(e.target.value)}
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarModalArqueo(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  style={{ backgroundColor: '#d97706' }}
                  disabled={guardandoArqueo}
                >
                  {guardandoArqueo ? 'Registrando...' : 'Declarar y Enviar a VoBo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
