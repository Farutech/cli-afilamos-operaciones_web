import React, { useState, useEffect, useCallback } from 'react';
import type { TurnoDto, DetalleSupervisorCierreDto, DeclararArqueoCiegoRequest } from '../../types/caja';
import {
  abrirTurno,
  obtenerTurnoActivo,
  registrarEgreso,
  declararArqueoCiego,
  forzarCierreTurno,
  obtenerDetalleSupervisor,
  procesarVoBo
} from '../../services/cajaApi';
import { catalogosApi } from '../../services/catalogosApi';
import type { DenominacionEfectivo, Caja } from '../../types/catalogos';
import { Badge, Button, Card, Input } from '@farutech/design-system';
import { RotateCcw } from 'lucide-react';
import { ListPageLayout, CurrencyInput } from '../../components/ui';

/** Planilla de conteo por denominación (cantidad + subtotal calculado). */
interface ConteoDenominacion {
  valor: number;
  etiqueta: string;
  tipo: 'BILLETE' | 'MONEDA';
  cantidad: number;
}

const aConteo = (d: DenominacionEfectivo): ConteoDenominacion => ({
  valor: d.valor,
  etiqueta: d.etiqueta,
  tipo: d.tipo,
  cantidad: 0,
});

/** Fallback estándar COP (solo si el backend aún no define la configuración). */
const DENOMINACIONES_DEFAULT: DenominacionEfectivo[] = [
  { valor: 100000, etiqueta: '$100.000', tipo: 'BILLETE', activa: true },
  { valor: 50000, etiqueta: '$50.000', tipo: 'BILLETE', activa: true },
  { valor: 20000, etiqueta: '$20.000', tipo: 'BILLETE', activa: true },
  { valor: 10000, etiqueta: '$10.000', tipo: 'BILLETE', activa: true },
  { valor: 5000, etiqueta: '$5.000', tipo: 'BILLETE', activa: true },
  { valor: 2000, etiqueta: '$2.000', tipo: 'BILLETE', activa: true },
  { valor: 1000, etiqueta: '$1.000', tipo: 'BILLETE', activa: true },
  { valor: 1000, etiqueta: '$1.000', tipo: 'MONEDA', activa: true },
  { valor: 500, etiqueta: '$500', tipo: 'MONEDA', activa: true },
  { valor: 200, etiqueta: '$200', tipo: 'MONEDA', activa: true },
  { valor: 100, etiqueta: '$100', tipo: 'MONEDA', activa: true },
  { valor: 50, etiqueta: '$50', tipo: 'MONEDA', activa: true },
];

interface ModuloCajaProps {
  codigoCajaDefault?: string;
  userRole?: string;
  token?: string;
  usuarioActual?: {
    name?: string;
    role?: string;
    publicId?: string;
    codigo?: string;
  };
}

export const ModuloCaja: React.FC<ModuloCajaProps> = ({
  codigoCajaDefault = 'CAJA-01',
  userRole = 'Cajero',
  token,
  usuarioActual,
}) => {
  const [codigoCajaSeleccionada, setCodigoCajaSeleccionada] = useState<string>(codigoCajaDefault);
  const [cajasDisponibles, setCajasDisponibles] = useState<Caja[]>([]);
  const [turno, setTurno] = useState<TurnoDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const esAdmin = Boolean(
    userRole && (
      userRole.toUpperCase().includes('ADMIN') ||
      userRole.toUpperCase().includes('SUPERVISOR')
    )
  );

  const esMiTurno = Boolean(
    !turno ||
    !usuarioActual?.name ||
    turno.nombreCajero?.toLowerCase().trim() === usuarioActual.name?.toLowerCase().trim() ||
    turno.nombreCajero?.toLowerCase().includes(usuarioActual.name?.toLowerCase()) ||
    usuarioActual.name?.toLowerCase().includes(turno.nombreCajero?.toLowerCase())
  );

  // Cargar catálogo de cajas configuradas en la base de datos
  useEffect(() => {
    let cancelado = false;
    const cargarCajas = async () => {
      try {
        const res = await catalogosApi.getCajas();
        if (cancelado) return;
        if (res.cajas && res.cajas.length > 0) {
          setCajasDisponibles(res.cajas);
          const existe = res.cajas.find(c => c.activa && c.codigoCaja === codigoCajaDefault);
          if (existe) {
            setCodigoCajaSeleccionada(existe.codigoCaja);
          } else {
            const primeraActiva = res.cajas.find(c => c.activa);
            if (primeraActiva) setCodigoCajaSeleccionada(primeraActiva.codigoCaja);
          }
        }
      } catch { }
    };
    cargarCajas();
    return () => { cancelado = true; };
  }, [codigoCajaDefault]);

  // Modal Egreso
  const [mostrarModalEgreso, setMostrarModalEgreso] = useState<boolean>(false);
  const [egresoMonto, setEgresoMonto] = useState<string>('');
  const [egresoMotivo, setEgresoMotivo] = useState<string>('');
  const [guardandoEgreso, setGuardandoEgreso] = useState<boolean>(false);

  // Modal Arqueo Ciego & Desglose de Denominaciones
  const [mostrarModalArqueo, setMostrarModalArqueo] = useState<boolean>(false);
  const [declEfectivo, setDeclEfectivo] = useState<string>('0');
  const [declTarjeta, setDeclTarjeta] = useState<string>('0');
  const [declCantidadTarjeta, setDeclCantidadTarjeta] = useState<string>('');
  const [declTransferencia, setDeclTransferencia] = useState<string>('0');
  const [declCantidadTransferencia, setDeclCantidadTransferencia] = useState<string>('');
  const [guardandoArqueo, setGuardandoArqueo] = useState<boolean>(false);
  const [modoDesgloseEfectivo, setModoDesgloseEfectivo] = useState<boolean>(true);

  const [conteoDenominaciones, setConteoDenominaciones] = useState<ConteoDenominacion[]>(
    DENOMINACIONES_DEFAULT.map(aConteo)
  );
  const [denominacionesConfiguradas, setDenominacionesConfiguradas] = useState<boolean>(false);

  // Las denominaciones admitidas viven como definición en el backend; el arqueo
  // solo renderiza la planilla y calcula subtotales, sin inventar billetes/monedas.
  useEffect(() => {
    let cancelado = false;
    const cargarDenominaciones = async () => {
      try {
        const config = await catalogosApi.getConfiguracionDenominaciones();
        const activas = (config.denominaciones || []).filter((d) => d.activa);
        if (cancelado) return;
        if (activas.length > 0) {
          setConteoDenominaciones(activas.map(aConteo));
          setDenominacionesConfiguradas(true);
        }
      } catch {
        // Se mantiene el fallback estándar COP hasta que el administrador
        // configure las denominaciones desde Administración.
        if (!cancelado) setDenominacionesConfiguradas(false);
      }
    };
    cargarDenominaciones();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleCantidadDenominacionChange = (index: number, cantidad: number) => {
    setConteoDenominaciones((prev) => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], cantidad: Math.max(0, cantidad) };
      const suma = nuevo.reduce((acc, d) => acc + d.valor * d.cantidad, 0);
      setDeclEfectivo(String(suma));
      return nuevo;
    });
  };

  const handleReiniciarConteo = () => {
    setConteoDenominaciones((prev) => prev.map((d) => ({ ...d, cantidad: 0 })));
    setDeclEfectivo('0');
  };

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
      const data = await obtenerTurnoActivo(codigoCajaSeleccionada, token);
      setTurno(data);

      if (data && data.estado === 'PENDIENTE_VOBO') {
        try {
          const targetId = data.id ?? data.publicId;
          const det = token ? await obtenerDetalleSupervisor(targetId, token) : await obtenerDetalleSupervisor(targetId);
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
  }, [codigoCajaSeleccionada, token]);

  useEffect(() => {
    cargarTurno();
  }, [cargarTurno]);

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
      const payload: { codigoCaja: string; baseInicial: number; idUsuario?: number } = {
        codigoCaja: codigoCajaSeleccionada,
        baseInicial: monto,
      };
      if (usuarioActual?.publicId) {
        payload.idUsuario = Number(usuarioActual.publicId.replace(/\D/g, '')) || 1;
      }
      const nuevoTurno = await abrirTurno(payload, token);
      if (usuarioActual?.name && nuevoTurno) {
        nuevoTurno.nombreCajero = usuarioActual.name;
      }
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
      const targetShiftId = turno.id ?? turno.publicId;
      const payload: DeclararArqueoCiegoRequest = {
        declaradoEfectivo: ef,
        declaradoTarjeta: tar,
        declaradoTransferencia: trans,
      };
      const cantTar = parseInt(declCantidadTarjeta);
      if (!isNaN(cantTar) && cantTar > 0) {
        payload.cantidadTransaccionesTarjeta = cantTar;
      }
      const cantTrans = parseInt(declCantidadTransferencia);
      if (!isNaN(cantTrans) && cantTrans > 0) {
        payload.cantidadTransaccionesTransferencia = cantTrans;
      }

      const res = token
        ? await declararArqueoCiego(targetShiftId, payload, token)
        : await declararArqueoCiego(targetShiftId, payload);
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

  const handleForzarCierreAdmin = async () => {
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
      const targetShiftId = turno.publicId || turno.id;
      await forzarCierreTurno(targetShiftId, {
        declaradoEfectivo: ef,
        declaradoTarjeta: tar,
        declaradoTransferencia: trans,
        observacion: 'Cierre forzado y auditado por Administrador'
      }, token);
      setSuccessMsg('🛡️ Turno cerrado exitosamente por el Administrador. Caja liquidada y lista para nueva apertura.');
      setMostrarModalArqueo(false);
      await cargarTurno();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al forzar cierre de turno');
    } finally {
      setGuardandoArqueo(false);
    }
  };

  const handleCargarDetalleSupervisor = async () => {
    if (!turno) return;
    setCargandoDetalle(true);
    setErrorMsg(null);
    try {
      const targetShiftId = turno.id ?? turno.publicId;
      const det = token
        ? await obtenerDetalleSupervisor(targetShiftId, token)
        : await obtenerDetalleSupervisor(targetShiftId);
      setDetalleSupervisor(det);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Error al consultar detalle del supervisor');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleProcesarVoBo = async (decision: 'APROBADO' | 'RECHAZADO', esCierreDirectoAdmin: boolean = false) => {
    if (!turno) return;
    if (!esCierreDirectoAdmin && (!pinSupervisor.trim() || pinSupervisor.length < 4)) {
      setErrorMsg('Debe ingresar un PIN de supervisor válido (mínimo 4 dígitos)');
      return;
    }

    setProcesandoVoBo(true);
    setErrorMsg(null);

    try {
      const targetShiftId = turno.id ?? turno.publicId;
      const res = await procesarVoBo(targetShiftId, {
        pin: pinSupervisor.trim() || (esCierreDirectoAdmin ? 'ADMIN' : ''),
        decision,
        observacion: observacionVoBo.trim() || (esCierreDirectoAdmin ? 'Aprobación directa por Administrador' : '')
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
    <ListPageLayout
      title="Caja y Turnos"
      eyebrow="OPERACIÓN · TESORERÍA"
      description="Control de aperturas con base monetaria obligatoria, arqueos ciegos y control por roles."
      actions={
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Terminal / Caja selector: Solo Administrador puede ver y seleccionar todas las cajas */}
          {esAdmin && cajasDisponibles.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-indigo-700/60 shadow-sm">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Caja:</span>
              <select
                value={codigoCajaSeleccionada}
                onChange={(e) => setCodigoCajaSeleccionada(e.target.value)}
                className="text-xs font-semibold uppercase bg-transparent text-white focus:outline-none cursor-pointer"
                title="Administrador: Seleccionar Terminal de Caja Operativa"
              >
                {cajasDisponibles.map((c) => (
                  <option key={c.uuid || c.codigoCaja} value={c.codigoCaja} className="bg-slate-900 text-white">
                    {c.codigoCaja} — {c.nombre} {!c.activa ? '(Inactiva)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
              Terminal: {codigoCajaSeleccionada}
            </span>
          )}

          {/* Badge de Rol */}
          <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/10">
            Rol: {userRole}
          </span>

          {/* Badge de Estado del Turno */}
          {turno ? (
            <span
              className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                turno.estado === 'ABIERTO'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : turno.estado === 'PENDIENTE_VOBO'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              ● {turno.estado}
            </span>
          ) : (
            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/40">
              ● SIN TURNO
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={cargarTurno}
            disabled={cargando}
            className="h-8 px-2.5 border-slate-700 bg-slate-900 text-slate-200"
            title="Refrescar estado de caja"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      }
    >

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-sm flex justify-between items-center">
          <div>
            <strong className="font-semibold">Atención:</strong> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-sm flex justify-between items-center">
          <div>
            <strong className="font-semibold">Éxito:</strong> {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {cargando ? (
        <div className="p-12 text-center text-gray-400">Cargando estado de la caja...</div>
      ) : !turno || turno.estado === 'CERRADO' ? (
        /* Panel Apertura Premium */
        <div className="max-w-xl mx-auto my-6">
          <Card className="p-8 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-white/15 rounded-2xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-950/40">
                💵
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Apertura de Turno de Caja</h2>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Para habilitar cobros, anticipos y ventas en mostrador, asigne el fondo de arranque en efectivo para cambio (RF-6.3).
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 font-mono font-bold">
                  Terminal: {codigoCajaSeleccionada}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-800 border border-white/10 text-gray-300">
                  Operador: {userRole}
                </span>
              </div>
            </div>

            <form onSubmit={handleAbrirTurno} className="space-y-5 pt-2">
              {/* Chips de Selección Rápida */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Selección Rápida de Base Inicial
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50000, 100000, 200000, 500000].map((val) => {
                    const esSeleccionado = Number(baseInicial) === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBaseInicial(String(val))}
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                          esSeleccionado
                            ? 'bg-primary-600 text-white border-2 border-primary-400 shadow-md shadow-primary-900/50 scale-[1.02]'
                            : 'bg-gray-800/80 text-gray-300 border border-white/10 hover:border-white/20 hover:bg-gray-800'
                        }`}
                      >
                        ${val.toLocaleString('es-CO')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input de Monto Personalizado */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Base Inicial en Efectivo (COP) *
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ${Number(baseInicial || 0).toLocaleString('es-CO')} COP
                  </span>
                </div>
                <CurrencyInput
                  id="base-inicial-caja-input"
                  required
                  value={baseInicial ? Number(baseInicial) : undefined}
                  onChange={(val) => setBaseInicial(val !== undefined ? String(val) : '')}
                  placeholder="100000"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Monto físico contado entregado en la gaveta para cambio.
                </p>
              </div>

              <Button
                type="submit"
                aria-label="Abrir Turno de Caja"
                disabled={abriendoTurno || !baseInicial || Number(baseInicial) < 0}
                variant="primary"
                size="lg"
                fullWidth
              >
                {abriendoTurno
                  ? 'Inicializando jornada...'
                  : `✨ Abrir Turno de Caja ($${Number(baseInicial || 0).toLocaleString('es-CO')})`}
              </Button>
            </form>
          </Card>
        </div>
      ) : turno.estado === 'ABIERTO' ? (
        !esAdmin && !esMiTurno ? (
          /* Caja abierta por otro usuario: vista restringida para cajeros no administradores */
          <Card className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-2xl max-w-xl mx-auto space-y-4 my-6 shadow-xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg">
              🔒
            </div>
            <h3 className="text-lg font-bold text-white">Terminal Operada por Otro Cajero</h3>
            <p className="text-xs text-slate-300">
              La terminal <strong className="text-white font-mono">{codigoCajaSeleccionada}</strong> está siendo operada actualmente por <strong className="text-indigo-400">{turno.nombreCajero}</strong> (Turno: {turno.codigo}).
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-400 text-left space-y-1.5">
              <div>• <strong>Segregación de Cajas:</strong> Como cajero solo puedes visualizar y operar la caja que tú abriste.</div>
              <div>• <strong>Control de Administrador:</strong> Solo el Administrador tiene autorización para auditar movimientos o cerrar turnos ajenos.</div>
            </div>
            <p className="text-[11px] text-slate-500">
              Para operar, solicita a un Administrador que cierre el turno anterior o asigna tu terminal correspondiente.
            </p>
          </Card>
        ) : (
          /* Panel Turno Abierto (Admin o Dueño del Turno) */
          <div className="space-y-5">
            {/* Métricas Principales en una sola línea horizontal (5 Columnas) */}
            <div className="grid grid-cols-5 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-3">
              {/* 1. Turno Actual */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Turno Actual</span>
                <p className="text-base font-bold text-white font-mono mt-0.5 truncate">{turno.codigo}</p>
                <p className="text-[11px] text-slate-400 truncate">Cajero: {turno.nombreCajero}</p>
              </div>

              {/* 2. Base Inicial */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Inicial</span>
                <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  ${turno.baseInicial.toLocaleString('es-CO')}
                </p>
                <p className="text-[11px] text-slate-400">Efectivo de arranque</p>
              </div>

              {/* 3. Movimientos */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Movimientos</span>
                <p className="text-base font-bold text-white font-mono mt-0.5">{turno.movimientos.length}</p>
                <p className="text-[11px] text-slate-400">Entradas y salidas</p>
              </div>

              {/* 4. Apertura */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apertura</span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">
                  {new Date(turno.fechaAperturaUtc).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date(turno.fechaAperturaUtc).toLocaleDateString('es-CO')}
                </p>
              </div>

              {/* 5. Recaudos por Forma de Pago en el Turno */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recaudos en Turno</span>
                  <span className="text-[10px] font-mono text-indigo-400">
                    {turno.totalesPorMetodoPago?.reduce((acc, m) => acc + (m.cantidad || 0), 0) || 0} rec.
                  </span>
                </div>
                <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  ${(turno.totalesPorMetodoPago?.reduce((acc, m) => acc + (m.total || 0), 0) || 0).toLocaleString('es-CO')}
                </p>
                <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-400">
                  {turno.totalesPorMetodoPago && turno.totalesPorMetodoPago.length > 0 ? (
                    turno.totalesPorMetodoPago.map((tp) => (
                      <span
                        key={tp.metodoPagoId || tp.codigo}
                        className="px-1 py-0.5 rounded bg-slate-950 border border-white/5 font-mono text-[9px] text-slate-300 truncate"
                        title={`${tp.nombre}: $${tp.total.toLocaleString('es-CO')} (${tp.cantidad} pagos)`}
                      >
                        {tp.nombre.slice(0, 4)}: ${tp.total.toLocaleString('es-CO')}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500">Sin recaudos aún</span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-wrap items-center gap-3">
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
                <span>🔒</span> {esAdmin ? 'Cerrar Turno (Administrador)' : 'Cerrar Turno (Arqueo Ciego)'}
              </Button>
              {esAdmin && (
                <span className="text-xs text-amber-400 font-medium ml-1">
                  🛡️ Modo Administrador: Autorizado para auditar y forzar cierre de cualquier caja.
                </span>
              )}
            </div>

            {/* Tabla de Movimientos del Turno */}
            <div className="bg-gray-900/80 rounded-xl shadow-sm border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-gray-950/40 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm uppercase tracking-wide">
                Movimientos Inmutables del Turno (RF-6.4, T052)
              </h2>
              <span className="text-xs text-gray-400">Solo inserción (append-only)</span>
            </div>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-xs uppercase text-gray-400 font-semibold border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3">Hora</th>
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Concepto / Detalle</th>
                    <th className="px-6 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {turno.movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                        No hay movimientos registrados en este turno.
                      </td>
                    </tr>
                  ) : (
                    turno.movimientos.map((m) => {
                      const esEgreso =
                        m.tipoMovimiento === 'EGRESO_CAJA_MENOR' ||
                        m.tipoMovimiento === 'OUT' ||
                        m.monto < 0;
                      const esBase = m.tipoMovimiento === 'BASE_INICIAL';
                      const absMonto = Math.abs(m.monto);

                      return (
                        <tr key={m.publicId || m.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-3 text-xs text-gray-400">
                            {new Date(m.fechaUtc).toLocaleTimeString('es-CO')}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-blue-300 font-bold">{m.codigo}</td>
                          <td className="px-6 py-3">
                            <Badge
                              variant={
                                esBase
                                  ? 'info'
                                  : esEgreso
                                  ? 'danger'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {esBase ? 'BASE_INICIAL' : (esEgreso ? 'EGRESO' : 'RECAUDO')}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 font-medium text-white">{m.concepto}</td>
                          <td
                            className={`px-6 py-3 text-right font-bold font-mono ${
                              esEgreso ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {esEgreso ? '-' : '+'}${absMonto.toLocaleString('es-CO')}
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
      )
    ) : (
      /* Panel Turno PENDIENTE_VOBO */
        <div className="space-y-6">
          <div className="bg-amber-950/30 border-l-4 border-amber-500 p-6 rounded-xl text-amber-200 space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-amber-300">
              <span>⏳</span> Turno {turno.codigo} en espera de VoBo de Supervisor (RF-6.7)
            </h2>
            <p className="text-sm text-amber-300/80">
              El cajero ha declarado los valores de cierre a ciegas. Un supervisor con rol autorizado debe ingresar su PIN para verificar las diferencias y aprobar o rechazar el cierre.
            </p>
          </div>

          {/* Comparativo de Supervisión */}
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Detalle de Auditoría y Saldos Teóricos
              </h3>
              {!detalleSupervisor && (
                <button
                  onClick={handleCargarDetalleSupervisor}
                  disabled={cargandoDetalle}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-white/10 shadow"
                >
                  {cargandoDetalle ? 'Consultando...' : '🔍 Cargar Saldos de Supervisión'}
                </button>
              )}
            </div>

            {detalleSupervisor ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2">Medio</th>
                      <th className="px-4 py-2 text-right">Declarado (Cajero)</th>
                      <th className="px-4 py-2 text-right">Teórico (Sistema)</th>
                      <th className="px-4 py-2 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="px-4 py-2 font-medium text-white">Efectivo</td>
                      <td className="px-4 py-2 text-right">${detalleSupervisor.declarado.efectivo.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-300">${detalleSupervisor.teorico.efectivo.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-2 text-right font-bold text-white">
                        ${(detalleSupervisor.declarado.efectivo - detalleSupervisor.teorico.efectivo).toLocaleString('es-CO')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-white">
                        <div>Tarjeta / Datáfono</div>
                        {(detalleSupervisor.declarado.cantidadTarjeta !== undefined || detalleSupervisor.teorico.cantidadTarjeta !== undefined) && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Vouchers: {detalleSupervisor.declarado.cantidadTarjeta ?? 0} decl. vs {detalleSupervisor.teorico.cantidadTarjeta ?? 0} sist.
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div>${detalleSupervisor.declarado.tarjeta.toLocaleString('es-CO')}</div>
                        {detalleSupervisor.declarado.cantidadTarjeta !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">{detalleSupervisor.declarado.cantidadTarjeta} vouchers</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-300">
                        <div>${detalleSupervisor.teorico.tarjeta.toLocaleString('es-CO')}</div>
                        {detalleSupervisor.teorico.cantidadTarjeta !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">{detalleSupervisor.teorico.cantidadTarjeta} trans.</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-white">
                        <div>${(detalleSupervisor.declarado.tarjeta - detalleSupervisor.teorico.tarjeta).toLocaleString('es-CO')}</div>
                        {detalleSupervisor.diferenciaCantidadTarjeta !== undefined && (
                          <div className={`text-[10px] font-mono ${detalleSupervisor.diferenciaCantidadTarjeta !== 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {detalleSupervisor.diferenciaCantidadTarjeta > 0 ? `+${detalleSupervisor.diferenciaCantidadTarjeta}` : detalleSupervisor.diferenciaCantidadTarjeta} vouchers
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-white">
                        <div>Transferencia Bancaria</div>
                        {(detalleSupervisor.declarado.cantidadTransferencia !== undefined || detalleSupervisor.teorico.cantidadTransferencia !== undefined) && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Comprobantes: {detalleSupervisor.declarado.cantidadTransferencia ?? 0} decl. vs {detalleSupervisor.teorico.cantidadTransferencia ?? 0} sist.
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div>${detalleSupervisor.declarado.transferencia.toLocaleString('es-CO')}</div>
                        {detalleSupervisor.declarado.cantidadTransferencia !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">{detalleSupervisor.declarado.cantidadTransferencia} comp.</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-300">
                        <div>${detalleSupervisor.teorico.transferencia.toLocaleString('es-CO')}</div>
                        {detalleSupervisor.teorico.cantidadTransferencia !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono">{detalleSupervisor.teorico.cantidadTransferencia} trans.</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-white">
                        <div>${(detalleSupervisor.declarado.transferencia - detalleSupervisor.teorico.transferencia).toLocaleString('es-CO')}</div>
                        {detalleSupervisor.diferenciaCantidadTransferencia !== undefined && (
                          <div className={`text-[10px] font-mono ${detalleSupervisor.diferenciaCantidadTransferencia !== 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {detalleSupervisor.diferenciaCantidadTransferencia > 0 ? `+${detalleSupervisor.diferenciaCantidadTransferencia}` : detalleSupervisor.diferenciaCantidadTransferencia} comp.
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700">
                      <td className="px-4 py-2.5 text-white">Total General</td>
                      <td className="px-4 py-2.5 text-right text-white">
                        ${detalleSupervisor.declarado.total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white">
                        ${detalleSupervisor.teorico.total.toLocaleString('es-CO')}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right ${
                          detalleSupervisor.diferencia < 0
                            ? 'text-rose-400'
                            : detalleSupervisor.diferencia > 0
                            ? 'text-sky-400'
                            : 'text-emerald-400'
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
            <div className="pt-4 border-t border-slate-800 space-y-4 max-w-md">
              <h4 className="text-sm font-bold text-white">Autorización con PIN de Supervisor (T054)</h4>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  PIN de Seguridad *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinSupervisor}
                  onChange={(e) => setPinSupervisor(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-center tracking-widest text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">
                  Invariante #7: El supervisor no puede ser el mismo cajero del turno.
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Observaciones / Justificación de Cierre
                </label>
                <input
                  type="text"
                  value={observacionVoBo}
                  onChange={(e) => setObservacionVoBo(e.target.value)}
                  placeholder="Ej: Conteo conforme / Justificación de descuadre"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {esAdmin && (
                <div className="p-3 bg-indigo-950/50 border border-indigo-700/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <span>🛡️</span> Modo Administrador: Aprobación Directa
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Como Administrador puedes validar y cerrar el turno directamente sin ingresar PIN secundario de supervisor.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold"
                    disabled={procesandoVoBo}
                    onClick={() => handleProcesarVoBo('APROBADO', true)}
                  >
                    {procesandoVoBo ? 'Procesando...' : '⚡ Aprobar y Cerrar Turno Directo (Admin)'}
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={procesandoVoBo}
                  onClick={() => handleProcesarVoBo('APROBADO')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow text-sm transition-colors"
                >
                  {procesandoVoBo ? 'Procesando...' : '✓ Aprobar Cierre con PIN'}
                </button>
                <button
                  type="button"
                  disabled={procesandoVoBo}
                  onClick={() => handleProcesarVoBo('RECHAZADO')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow text-sm transition-colors"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💸</span> Comprobante de Egreso (Caja Menor)
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalEgreso(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Registra salidas de dinero autorizadas con asignación de folio consecutivo automático (RF-6.10).
            </p>

            <form onSubmit={handleRegistrarEgreso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Monto a Retirar (COP) *
                </label>
                <CurrencyInput
                  required
                  value={egresoMonto ? Number(egresoMonto) : undefined}
                  onChange={(val) => setEgresoMonto(val !== undefined ? String(val) : '')}
                  placeholder="15000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Motivo / Justificación *
                </label>
                <textarea
                  required
                  rows={2}
                  value={egresoMotivo}
                  onChange={(e) => setEgresoMotivo(e.target.value)}
                  placeholder="Ej: Compra de insumos de limpieza para mostrador"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
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

      {/* Modal Arqueo Ciego con Desglose de Denominaciones (Dark Mode) */}
      {mostrarModalArqueo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔒</span> Cierre de Turno: Arqueo Ciego (RF-6.5)
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalArqueo(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-xs text-amber-200">
              <strong>Atención — Arqueo Ciego:</strong> Ingrese los valores reales que contó físicamente en su gaveta y datáfono. Los saldos teóricos del sistema están ocultos para asegurar integridad.
            </div>

            {esAdmin && (
              <div className="p-3 bg-indigo-950/60 border border-indigo-600/50 rounded-xl text-xs text-indigo-200 flex items-start gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <strong className="text-white block font-bold">Modo Administrador de Cierre:</strong>
                  Como Administrador puedes enviar este arqueo a <strong>VoBo de Supervisión</strong> para auditoría previa, o presionar <strong>⚡ Forzar Cierre Definitivo (Admin)</strong> para cerrar la caja de inmediato en la base de datos sin requerir PIN adicional.
                </div>
              </div>
            )}

            <form onSubmit={handleDeclararArqueoCiego} className="space-y-4">
              {/* Sección Efectivo: Selector de Modo (Desglose vs Directo) */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <span>💵</span> Efectivo Contado en Gaveta (COP) *
                    </label>
                    <span className="text-[11px] text-slate-400 block">
                      Total contado:{' '}
                      <strong className="text-emerald-400 font-mono text-sm font-bold">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        }).format(Number(declEfectivo) || 0)}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setModoDesgloseEfectivo(true)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        modoDesgloseEfectivo
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🪙 Por Monedas / Billetes
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoDesgloseEfectivo(false)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        !modoDesgloseEfectivo
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⌨️ Total Directo
                    </button>
                  </div>
                </div>

                {modoDesgloseEfectivo && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                      <span className="flex items-center gap-2">
                        Planilla de Conteo Físico por Denominación:
                        {denominacionesConfiguradas ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 text-[10px] font-semibold">
                            ✓ Configuradas por Administración
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                            Estándar COP (fallback)
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleReiniciarConteo}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        ↺ Poner en ceros
                      </button>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-left">Denominación</th>
                            <th className="px-2 py-2 text-center">Tipo</th>
                            <th className="px-3 py-2 text-center w-28">Cantidad</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {conteoDenominaciones.map((d, idx) => (
                            <tr key={`${d.tipo}-${d.valor}-${idx}`} className="hover:bg-slate-800/40">
                              <td className="px-3 py-2 font-mono font-bold text-white">
                                {d.etiqueta}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    d.tipo === 'BILLETE'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {d.tipo === 'BILLETE' ? '💵 Billete' : '🪙 Moneda'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={d.cantidad || ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleCantidadDenominacionChange(
                                      idx,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-200">
                                {new Intl.NumberFormat('es-CO', {
                                  style: 'currency',
                                  currency: 'COP',
                                  maximumFractionDigits: 0,
                                }).format(d.cantidad * d.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Input
                    id="arqueo-efectivo"
                    label="Efectivo Contado Físicamente (COP) *"
                    aria-label="Efectivo Contado Físicamente"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={declEfectivo}
                    onChange={(e) => setDeclEfectivo(e.target.value)}
                    helperText={modoDesgloseEfectivo ? "Calculado automáticamente por el conteo de billetes y monedas, o modifique si requiere ajuste manual." : undefined}
                  />
                </div>
              </div>

              {/* Tarjeta & Transferencia con Monto y Cantidad de Procesos/Comprobantes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input
                    id="arqueo-tarjeta"
                    label="Vouchers Datáfono (Monto COP) *"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={declTarjeta}
                    onChange={(e) => setDeclTarjeta(e.target.value)}
                  />
                  <div className="pt-1">
                    <label htmlFor="arqueo-cantidad-tarjeta" className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Cantidad de Vouchers (Tirilla Lote)
                    </label>
                    <input
                      id="arqueo-cantidad-tarjeta"
                      type="number"
                      min="0"
                      placeholder="Ej: 12"
                      value={declCantidadTarjeta}
                      onChange={(e) => setDeclCantidadTarjeta(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Input
                    id="arqueo-transferencia"
                    label="Transferencias Bancarias (Monto COP) *"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={declTransferencia}
                    onChange={(e) => setDeclTransferencia(e.target.value)}
                  />
                  <div className="pt-1">
                    <label htmlFor="arqueo-cantidad-transferencia" className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Cantidad de Transferencias (Comprobantes)
                    </label>
                    <input
                      id="arqueo-cantidad-transferencia"
                      type="number"
                      min="0"
                      placeholder="Ej: 5"
                      value={declCantidadTransferencia}
                      onChange={(e) => setDeclCantidadTransferencia(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-amber-400 font-bold">ℹ️ Cartera y Créditos:</span>
                <span>Los pagos a crédito comercial (15, 30, 60, 90 y 120 días) representan cobro diferido; no requieren arqueo físico ni afectan el cuadre de este turno.</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarModalArqueo(false)}
                >
                  Cancelar
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  {esAdmin && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      style={{ backgroundColor: '#dc2626' }}
                      disabled={guardandoArqueo}
                      onClick={handleForzarCierreAdmin}
                      title="Administrador: Registra conteo y fuerza el cierre inmediato del turno en la base de datos"
                    >
                      {guardandoArqueo ? 'Cerrando Turno...' : '⚡ Forzar Cierre Definitivo (Admin)'}
                    </Button>
                  )}
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
              </div>
            </form>
          </div>
        </div>
      )}
    </ListPageLayout>
  );
};
