import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { adminApi } from '../../services/adminApi';
import type {
  UsuarioAdminDto,
  CrearUsuarioDto,
  CuentaBancariaConfigDto,
  WorkflowDefinicionAdminDto,
  CrearWorkflowBorradorDto,
} from '../../types/admin';

interface ModuloAdminProps {
  token?: string;
}

type TabType = 'usuarios' | 'banco' | 'workflows';

export const ModuloAdmin: React.FC<ModuloAdminProps> = ({ token }) => {
  const [tab, setTab] = useState<TabType>('usuarios');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- 1. USUARIOS STATE ---
  const [usuarios, setUsuarios] = useState<UsuarioAdminDto[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');

  // Modal Crear Usuario
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState<CrearUsuarioDto>({
    codigo: '',
    nombreCompleto: '',
    email: '',
    password: '',
    rol: 'Cajero',
    pin: '',
  });

  // Modal Reset PIN
  const [usuarioPinTarget, setUsuarioPinTarget] = useState<UsuarioAdminDto | null>(null);
  const [nuevoPin, setNuevoPin] = useState('');

  // --- 2. BANCO STATE ---
  const [cuentaBancaria, setCuentaBancaria] = useState<CuentaBancariaConfigDto>({
    banco: '',
    numeroCuenta: '',
    tipoCuenta: 'Ahorros',
    titular: '',
    nitTitular: '',
    billeteraDigital: '',
  });
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [guardandoBanco, setGuardandoBanco] = useState(false);

  // --- 3. WORKFLOWS STATE ---
  const [workflows, setWorkflows] = useState<WorkflowDefinicionAdminDto[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [workflowSeleccionado, setWorkflowSeleccionado] = useState<WorkflowDefinicionAdminDto | null>(null);
  const [mostrarModalNuevoWf, setMostrarModalNuevoWf] = useState(false);
  const [nuevoWf, setNuevoWf] = useState<CrearWorkflowBorradorDto>({
    codigo: '',
    nombre: '',
    descripcion: '',
  });

  // Fetch callbacks for actions
  const fetchUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    setErrorMsg(null);
    try {
      const [uList, rList] = await Promise.all([
        adminApi.getUsuarios(token),
        adminApi.getRoles(token),
      ]);
      setUsuarios(uList);
      setRoles(rList);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cargar usuarios');
    } finally {
      setLoadingUsuarios(false);
    }
  }, [token]);

  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    setErrorMsg(null);
    try {
      const wfs = await adminApi.getWorkflows(true, token);
      setWorkflows(wfs);
      setWorkflowSeleccionado((prev) => prev ?? (wfs.length > 0 ? wfs[0] : null));
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cargar workflows');
    } finally {
      setLoadingWorkflows(false);
    }
  }, [token]);

  // Initial load effect
  useEffect(() => {
    let activo = true;
    const initTab = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (tab === 'usuarios') {
        setLoadingUsuarios(true);
        try {
          const [uList, rList] = await Promise.all([
            adminApi.getUsuarios(token),
            adminApi.getRoles(token),
          ]);
          if (activo) {
            setUsuarios(uList);
            setRoles(rList);
          }
        } catch (err: unknown) {
          if (activo) setErrorMsg((err as Error).message || 'Error al cargar usuarios');
        } finally {
          if (activo) setLoadingUsuarios(false);
        }
      } else if (tab === 'banco') {
        setLoadingBanco(true);
        try {
          const cuenta = await adminApi.getCuentaBancaria(token);
          if (activo) setCuentaBancaria(cuenta);
        } catch (err: unknown) {
          if (activo) setErrorMsg((err as Error).message || 'Error al cargar cuenta bancaria');
        } finally {
          if (activo) setLoadingBanco(false);
        }
      } else {
        setLoadingWorkflows(true);
        try {
          const wfs = await adminApi.getWorkflows(true, token);
          if (activo) {
            setWorkflows(wfs);
            setWorkflowSeleccionado(prev => prev ?? (wfs.length > 0 ? wfs[0] : null));
          }
        } catch (err: unknown) {
          if (activo) setErrorMsg((err as Error).message || 'Error al cargar workflows');
        } finally {
          if (activo) setLoadingWorkflows(false);
        }
      }
    };

    initTab();
    return () => {
      activo = false;
    };
  }, [tab, token]);

  // --- Handlers: Usuarios ---
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await adminApi.crearUsuario(nuevoUsuario, token);
      setSuccessMsg(`Usuario '${nuevoUsuario.codigo}' creado exitosamente.`);
      setMostrarModalUsuario(false);
      setNuevoUsuario({
        codigo: '',
        nombreCompleto: '',
        email: '',
        password: '',
        rol: 'Cajero',
        pin: '',
      });
      await fetchUsuarios();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear usuario');
    }
  };

  const handleToggleEstado = async (u: UsuarioAdminDto) => {
    setErrorMsg(null);
    try {
      await adminApi.cambiarEstadoUsuario(u.uuid, !u.activo, token);
      setSuccessMsg(`Estado de '${u.codigo}' cambiado a ${!u.activo ? 'Activo' : 'Inactivo'}.`);
      await fetchUsuarios();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al cambiar estado');
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioPinTarget) return;
    setErrorMsg(null);
    try {
      await adminApi.resetearPinUsuario(usuarioPinTarget.uuid, nuevoPin, token);
      setSuccessMsg(`PIN del usuario '${usuarioPinTarget.codigo}' actualizado con éxito.`);
      setUsuarioPinTarget(null);
      setNuevoPin('');
      await fetchUsuarios();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al resetear PIN');
    }
  };

  // --- Handlers: Banco ---
  const handleGuardarBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoBanco(true);
    setErrorMsg(null);
    try {
      const updated = await adminApi.guardarCuentaBancaria(cuentaBancaria, token);
      setCuentaBancaria(updated);
      setSuccessMsg('Configuración de cuenta bancaria y recaudos actualizada.');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al guardar cuenta bancaria');
    } finally {
      setGuardandoBanco(false);
    }
  };

  // --- Handlers: Workflows ---
  const handleCrearWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const wf = await adminApi.crearBorradorWorkflow(nuevoWf, token);
      setSuccessMsg(`Borrador de workflow '${wf.codigo}' creado exitosamente.`);
      setMostrarModalNuevoWf(false);
      setNuevoWf({ codigo: '', nombre: '', descripcion: '' });
      await fetchWorkflows();
      setWorkflowSeleccionado(wf);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al crear workflow');
    }
  };

  const handlePublicarWf = async (wf: WorkflowDefinicionAdminDto) => {
    setErrorMsg(null);
    try {
      const pub = await adminApi.publicarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow '${pub.codigo}' v${pub.versionNumero} publicado como vigente.`);
      await fetchWorkflows();
      setWorkflowSeleccionado(pub);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al publicar workflow');
    }
  };

  const handleRetirarWf = async (wf: WorkflowDefinicionAdminDto) => {
    setErrorMsg(null);
    try {
      const ret = await adminApi.retirarWorkflow(wf.uuid, token);
      setSuccessMsg(`Workflow '${ret.codigo}' v${ret.versionNumero} retirado.`);
      await fetchWorkflows();
      setWorkflowSeleccionado(ret);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Error al retirar workflow');
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busquedaUsuario.toLowerCase();
    return (
      u.codigo.toLowerCase().includes(q) ||
      u.nombreCompleto.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header y Selector de Pestañas */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>⚙️ Administración y Configuración Central</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Control de usuarios, roles, parámetros bancarios y administración de workflows versionados (Fase H - RF-13.1, RF-13.4, RF-13.5)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-hover)', padding: '4px', borderRadius: '8px' }}>
            <Button
              variant={tab === 'usuarios' ? 'primary' : 'outline'}
              onClick={() => setTab('usuarios')}
            >
              👥 Usuarios y Roles
            </Button>
            <Button
              variant={tab === 'banco' ? 'primary' : 'outline'}
              onClick={() => setTab('banco')}
            >
              🏦 Cuenta Bancaria
            </Button>
            <Button
              variant={tab === 'workflows' ? 'primary' : 'outline'}
              onClick={() => setTab('workflows')}
            >
              🔄 Workflows
            </Button>
          </div>
        </div>
      </Card>

      {/* Alertas */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* 1. PESTAÑA USUARIOS Y ROLES (T070) */}
      {tab === 'usuarios' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar por código, nombre o rol..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  minWidth: '280px',
                }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Total: {usuariosFiltrados.length}
              </span>
            </div>
            <Button variant="primary" onClick={() => setMostrarModalUsuario(true)}>
              + Crear Nuevo Usuario
            </Button>
          </div>

          {loadingUsuarios ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando usuarios...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '10px 8px' }}>Código</th>
                    <th style={{ padding: '10px 8px' }}>Nombre</th>
                    <th style={{ padding: '10px 8px' }}>Email</th>
                    <th style={{ padding: '10px 8px' }}>Rol</th>
                    <th style={{ padding: '10px 8px' }}>PIN de Autorización</th>
                    <th style={{ padding: '10px 8px' }}>Estado</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.uuid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{u.codigo}</td>
                      <td style={{ padding: '10px 8px' }}>{u.nombreCompleto}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--color-text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <Badge variant={u.rol === 'Administrador' ? 'danger' : u.rol === 'Supervisor' ? 'warning' : 'info'}>
                          {u.rol}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {u.tienePin ? (
                          <Badge variant="success">✓ Configurado</Badge>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Sin PIN</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <Badge variant={u.activo ? 'success' : 'neutral'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setUsuarioPinTarget(u);
                              setNuevoPin('');
                            }}
                          >
                            🔑 PIN
                          </Button>
                          <Button
                            variant={u.activo ? 'outline' : 'primary'}
                            onClick={() => handleToggleEstado(u)}
                          >
                            {u.activo ? 'Bloquear' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. PESTAÑA CUENTA BANCARIA (T071) */}
      {tab === 'banco' && (
        <Card>
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              🏦 Parametrización de Cuentas para Transferencias (RF-13.4)
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              Esta información se utiliza en el comprobante y en la pantalla de cobro de anticipos y recaudos por transferencia electrónica.
            </p>

            {loadingBanco ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando datos bancarios...</p>
            ) : (
              <form onSubmit={handleGuardarBanco} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="input-banco" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Entidad Bancaria Principal *
                  </label>
                  <input
                    id="input-banco"
                    type="text"
                    required
                    value={cuentaBancaria.banco}
                    onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, banco: e.target.value })}
                    placeholder="Ej. Bancolombia"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="input-num-cuenta" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Número de Cuenta *
                    </label>
                    <input
                      id="input-num-cuenta"
                      type="text"
                      required
                      value={cuentaBancaria.numeroCuenta}
                      onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, numeroCuenta: e.target.value })}
                      placeholder="Ej. 12345678901"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="input-tipo-cuenta" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Tipo de Cuenta
                    </label>
                    <select
                      id="input-tipo-cuenta"
                      value={cuentaBancaria.tipoCuenta}
                      onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, tipoCuenta: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="input-titular" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Titular de la Cuenta
                    </label>
                    <input
                      id="input-titular"
                      type="text"
                      value={cuentaBancaria.titular || ''}
                      onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, titular: e.target.value })}
                      placeholder="Ej. Afilamos S.A.S."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="input-nit" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      NIT / Documento Titular
                    </label>
                    <input
                      id="input-nit"
                      type="text"
                      value={cuentaBancaria.nitTitular || ''}
                      onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, nitTitular: e.target.value })}
                      placeholder="Ej. 900.123.456-7"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-billetera" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Billeteras Digitales / Enlace QR
                  </label>
                  <input
                    id="input-billetera"
                    type="text"
                    value={cuentaBancaria.billeteraDigital || ''}
                    onChange={(e) => setCuentaBancaria({ ...cuentaBancaria, billeteraDigital: e.target.value })}
                    placeholder="Ej. Nequi: 3001234567 / Daviplata: 3159876543"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <Button variant="primary" type="submit" disabled={guardandoBanco}>
                    {guardandoBanco ? 'Guardando...' : '💾 Guardar Parámetros Bancarios'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      )}

      {/* 3. PESTAÑA WORKFLOWS (T072) */}
      {tab === 'workflows' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '20px' }}>
          {/* Lista de Workflows */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Workflows ({workflows.length})</h3>
              <Button variant="outline" onClick={() => setMostrarModalNuevoWf(true)}>
                + Nuevo Borrador
              </Button>
            </div>

            {loadingWorkflows ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando workflows...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workflows.map((w) => {
                  const sel = workflowSeleccionado?.uuid === w.uuid;
                  return (
                    <div
                      key={w.uuid}
                      onClick={() => setWorkflowSeleccionado(w)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: sel ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.codigo}</span>
                        <Badge variant={w.esVigente ? 'success' : w.activo ? 'warning' : 'neutral'}>
                          {w.esVigente ? 'Vigente' : w.activo ? 'Borrador' : 'Retirado'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {w.nombre} · v{w.versionNumero} ({w.etapas.length} etapas)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Detalle y Etapas del Workflow Seleccionado */}
          <Card>
            {workflowSeleccionado ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                        {workflowSeleccionado.nombre} ({workflowSeleccionado.codigo})
                      </h3>
                      <Badge variant={workflowSeleccionado.esVigente ? 'success' : 'neutral'}>
                        v{workflowSeleccionado.versionNumero} - {workflowSeleccionado.esVigente ? 'Vigente' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                      {workflowSeleccionado.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!workflowSeleccionado.esVigente && workflowSeleccionado.activo && (
                      <Button variant="primary" onClick={() => handlePublicarWf(workflowSeleccionado)}>
                        ✓ Publicar Versión
                      </Button>
                    )}
                    {workflowSeleccionado.esVigente && (
                      <Button variant="outline" onClick={() => handleRetirarWf(workflowSeleccionado)}>
                        Retirar Workflow
                      </Button>
                    )}
                  </div>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
                  Etapas y Transiciones ({workflowSeleccionado.etapas.length})
                </h4>

                {workflowSeleccionado.etapas.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Este borrador aún no tiene etapas configuradas.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {workflowSeleccionado.etapas.map((et) => (
                      <div
                        key={et.uuid}
                        style={{
                          padding: '12px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          background: 'var(--color-surface-hover)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            #{et.orden} {et.nombre} ({et.codigo})
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {et.esFinal && <Badge variant="success">Etapa Final</Badge>}
                            {et.permiteCancelacionDirecta && <Badge variant="info">Canc. Directa</Badge>}
                          </div>
                        </div>

                        {et.transicionesSalientes.length > 0 && (
                          <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--color-primary)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                              Transiciones salientes:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {et.transicionesSalientes.map((tr) => (
                                <span
                                  key={tr.uuid}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    background: 'var(--color-surface)',
                                    borderRadius: '4px',
                                    border: '1px solid var(--color-border)',
                                  }}
                                >
                                  ➔ {tr.nombre} ({tr.etapaDestinoNombre || tr.etapaDestinoCodigo}) {tr.rolRequerido ? `[${tr.rolRequerido}]` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Seleccione un workflow para ver su diseño y transiciones.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: Crear Usuario */}
      {mostrarModalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <Card style={{ width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Crear Nuevo Usuario</h3>
            <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="input-user-codigo" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Código *</label>
                <input
                  id="input-user-codigo"
                  type="text"
                  required
                  placeholder="Ej. OPERARIO_02"
                  value={nuevoUsuario.codigo}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, codigo: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label htmlFor="input-user-nombre" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Nombre Completo *</label>
                <input
                  id="input-user-nombre"
                  type="text"
                  required
                  placeholder="Ej. Carlos Martinez"
                  value={nuevoUsuario.nombreCompleto}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombreCompleto: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label htmlFor="input-user-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                <input
                  id="input-user-email"
                  type="email"
                  required
                  placeholder="carlos@afilamos.com"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label htmlFor="input-user-pass" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Contraseña *</label>
                <input
                  id="input-user-pass"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={nuevoUsuario.password}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-user-rol" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Rol *</label>
                  <select
                    id="input-user-rol"
                    value={nuevoUsuario.rol}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="input-user-pin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>PIN (4-6 dígitos)</label>
                  <input
                    id="input-user-pin"
                    type="password"
                    maxLength={6}
                    placeholder="Ej. 1234"
                    value={nuevoUsuario.pin || ''}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, pin: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="outline" type="button" onClick={() => setMostrarModalUsuario(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  Crear Usuario
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: Reset PIN */}
      {usuarioPinTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <Card style={{ width: '100%', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              🔑 Resetear PIN: {usuarioPinTarget.codigo}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              El PIN se utiliza para firmas de aprobación supervisada (VoBo).
            </p>
            <form onSubmit={handleResetPin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="input-nuevo-pin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Nuevo PIN Numérico (4-6 dígitos) *
                </label>
                <input
                  id="input-nuevo-pin"
                  type="password"
                  required
                  maxLength={6}
                  placeholder="Ej. 5678"
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button variant="outline" type="button" onClick={() => setUsuarioPinTarget(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  Guardar PIN
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: Nuevo Workflow */}
      {mostrarModalNuevoWf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <Card style={{ width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Nuevo Borrador de Workflow</h3>
            <form onSubmit={handleCrearWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="input-wf-codigo" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Código *</label>
                <input
                  id="input-wf-codigo"
                  type="text"
                  required
                  placeholder="Ej. TALLER-URGENTE"
                  value={nuevoWf.codigo}
                  onChange={(e) => setNuevoWf({ ...nuevoWf, codigo: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label htmlFor="input-wf-nombre" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Nombre *</label>
                <input
                  id="input-wf-nombre"
                  type="text"
                  required
                  placeholder="Ej. Flujo de Taller Express"
                  value={nuevoWf.nombre}
                  onChange={(e) => setNuevoWf({ ...nuevoWf, nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label htmlFor="input-wf-desc" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Descripción</label>
                <input
                  id="input-wf-desc"
                  type="text"
                  placeholder="Descripción del flujo técnico..."
                  value={nuevoWf.descripcion}
                  onChange={(e) => setNuevoWf({ ...nuevoWf, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="outline" type="button" onClick={() => setMostrarModalNuevoWf(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  Crear Borrador
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
