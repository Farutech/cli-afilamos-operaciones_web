import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Power,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  MapPin,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Badge, Button } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { Caja } from '@/types/catalogos';

const FALLBACK_CAJAS: Caja[] = [
  {
    uuid: 'caja-01',
    codigoCaja: 'CAJA1',
    nombre: 'Caja Principal Mostrador',
    ubicacion: 'Mostrador Principal - Entrada',
    activa: true,
  },
  {
    uuid: 'caja-02',
    codigoCaja: 'CAJA2',
    nombre: 'Caja Taller y Recepción',
    ubicacion: 'Planta de Afilado - Recepción Técnica',
    activa: true,
  },
  {
    uuid: 'caja-03',
    codigoCaja: 'CAJA3',
    nombre: 'Caja Entregas y Despacho',
    ubicacion: 'Muelle de Despacho y Entrega',
    activa: true,
  },
  {
    uuid: 'caja-04',
    codigoCaja: 'CAJA4',
    nombre: 'Caja Auxiliar Comercial',
    ubicacion: 'Oficina Comercial / Mostrador 2',
    activa: false,
  },
];

export interface AdminCashRegistersProps {
  token?: string;
}

export default function AdminCashRegisters({ token }: AdminCashRegistersProps) {
  const [cajas, setCajas] = useState<Caja[]>(FALLBACK_CAJAS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');

  // Paginación estándar para evitar scroll
  const [paginaActual, setPaginaActual] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(5);

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarTarget, setModalEditarTarget] = useState<Caja | null>(null);
  const [modalToggleTarget, setModalToggleTarget] = useState<Caja | null>(null);

  // Formulario Crear
  const [formNuevo, setFormNuevo] = useState({
    codigoCaja: '',
    nombre: '',
    ubicacion: 'Mostrador Principal',
  });

  // Formulario Editar
  const [formEditar, setFormEditar] = useState({
    nombre: '',
    ubicacion: '',
  });

  const cargarCajas = async () => {
    setLoading(true);
    try {
      const res = await catalogosApi.getCajas(true, token);
      if (res.cajas && res.cajas.length > 0) {
        setCajas(res.cajas);
      } else {
        setCajas(FALLBACK_CAJAS);
      }
    } catch {
      setCajas(FALLBACK_CAJAS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarCajas();
  }, [token]);

  // Filtrado reactivo
  const cajasFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cajas.filter((c) => {
      const matchQ =
        !q ||
        c.codigoCaja.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        (c.ubicacion || '').toLowerCase().includes(q);

      const matchEstado =
        filtroEstado === 'TODAS' ||
        (filtroEstado === 'ACTIVAS' && c.activa) ||
        (filtroEstado === 'INACTIVAS' && !c.activa);

      return matchQ && matchEstado;
    });
  }, [cajas, searchQuery, filtroEstado]);

  // Control de paginación
  const totalRegistros = cajasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / tamanoPagina));

  // Reset de página si la búsqueda o filtro la excede
  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(1);
    }
  }, [totalPaginas, paginaActual]);

  const indiceInicio = (paginaActual - 1) * tamanoPagina;
  const indiceFin = Math.min(indiceInicio + tamanoPagina, totalRegistros);

  const cajasPaginadas = useMemo(() => {
    return cajasFiltradas.slice(indiceInicio, indiceFin);
  }, [cajasFiltradas, indiceInicio, indiceFin]);

  // Estadísticas compactas
  const stats = useMemo(() => {
    const total = cajas.length;
    const activas = cajas.filter((c) => c.activa).length;
    const inactivas = total - activas;
    return { total, activas, inactivas };
  }, [cajas]);

  const handleCrearCaja = async (e: FormEvent) => {
    e.preventDefault();
    const codigo = formNuevo.codigoCaja.trim().toUpperCase();
    const nombre = formNuevo.nombre.trim();
    const ubicacion = formNuevo.ubicacion.trim() || 'Mostrador Principal';

    if (!codigo) {
      toast.error('El código de la caja es obligatorio (ej: CAJA2, CAJA-02).');
      return;
    }
    if (!nombre) {
      toast.error('El nombre descriptivo de la caja es obligatorio.');
      return;
    }

    if (cajas.some((c) => c.codigoCaja.toUpperCase() === codigo)) {
      toast.error(`Ya existe una caja registrada con el código '${codigo}'.`);
      return;
    }

    setSaving(true);
    try {
      const nueva = await catalogosApi.crearCaja(
        {
          codigoCaja: codigo,
          nombre,
          ubicacion,
        },
        token
      );

      const cajaAgregada: Caja = {
        uuid: nueva.uuid || (nueva as any).id || `caja-${Date.now()}`,
        codigoCaja: nueva.codigoCaja || codigo,
        nombre: nueva.nombre || nombre,
        ubicacion: nueva.ubicacion || ubicacion,
        activa: nueva.activa ?? true,
      };

      setCajas((prev) => [...prev, cajaAgregada]);
      toast.success(`Caja ${codigo} creada y habilitada exitosamente.`);
      setModalNuevoOpen(false);
      setFormNuevo({ codigoCaja: '', nombre: '', ubicacion: 'Mostrador Principal' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al crear la caja.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirEditar = (caja: Caja) => {
    setModalEditarTarget(caja);
    setFormEditar({
      nombre: caja.nombre,
      ubicacion: caja.ubicacion,
    });
  };

  const handleGuardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalEditarTarget) return;

    const nombre = formEditar.nombre.trim();
    const ubicacion = formEditar.ubicacion.trim();

    if (!nombre) {
      toast.error('El nombre descriptivo de la caja no puede estar vacío.');
      return;
    }

    setSaving(true);
    try {
      await catalogosApi.actualizarCaja(
        modalEditarTarget.uuid,
        {
          nombre,
          ubicacion,
        },
        token
      );

      setCajas((prev) =>
        prev.map((c) =>
          c.uuid === modalEditarTarget.uuid ? { ...c, nombre, ubicacion } : c
        )
      );

      toast.success(`Caja ${modalEditarTarget.codigoCaja} actualizada correctamente.`);
      setModalEditarTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al actualizar la caja.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarToggleActiva = async () => {
    if (!modalToggleTarget) return;
    const nuevoEstado = !modalToggleTarget.activa;

    setSaving(true);
    try {
      await catalogosApi.setCajaActiva(modalToggleTarget.uuid, nuevoEstado, token);

      setCajas((prev) =>
        prev.map((c) =>
          c.uuid === modalToggleTarget.uuid ? { ...c, activa: nuevoEstado } : c
        )
      );

      toast.success(
        nuevoEstado
          ? `Caja ${modalToggleTarget.codigoCaja} activada. Ahora está disponible para abrir turnos.`
          : `Caja ${modalToggleTarget.codigoCaja} inactivada. No estará seleccionable en apertura de turno.`
      );
      setModalToggleTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al cambiar estado de la caja.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setSearchQuery('');
    setFiltroEstado('TODAS');
    setPaginaActual(1);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 text-slate-100">
      {/* Encabezado Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            Catálogos · Administración de Tesorería
          </p>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
            <span>🏧</span> Cajas y Terminales POS
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure las N terminales físicas de caja autorizadas para apertura de turnos, arqueos y recaudo.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalNuevoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 shadow-md shadow-blue-500/20 text-xs font-semibold cursor-pointer transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Caja de Mostrador</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen KPI Horizontales y Compactas (Evita Scroll) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 bg-slate-900/70 border border-white/10 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Cajas en Total</div>
              <div className="text-xl font-bold text-white leading-tight">{stats.total}</div>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded">
            Registradas
          </span>
        </div>

        <div className="p-3 bg-slate-900/70 border border-white/10 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Cajas Activas</div>
              <div className="text-xl font-bold text-emerald-400 leading-tight">{stats.activas}</div>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
            Operativas
          </span>
        </div>

        <div className="p-3 bg-slate-900/70 border border-white/10 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Cajas Inactivas</div>
              <div className="text-xl font-bold text-amber-400 leading-tight">{stats.inactivas}</div>
            </div>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
            Inhabilitadas
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-gray-900/60 p-2.5 rounded-xl border border-white/10">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código (ej: CAJA1), nombre o ubicación..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPaginaActual(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-950/80 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] text-gray-400 font-medium mr-1">Filtrar:</span>
          {(['TODAS', 'ACTIVAS', 'INACTIVAS'] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => {
                setFiltroEstado(estado);
                setPaginaActual(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filtroEstado === estado
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {estado === 'TODAS' ? 'Todas' : estado === 'ACTIVAS' ? 'Activas' : 'Inactivas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Cajas con Controles de Paginación */}
      <div className="bg-gray-900/70 border border-white/10 rounded-xl overflow-hidden shadow-lg flex flex-col">
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-gray-950/80 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Código</th>
                <th className="py-2.5 px-3.5">Nombre Descriptivo</th>
                <th className="py-2.5 px-3.5">Ubicación Física</th>
                <th className="py-2.5 px-3.5">Estado</th>
                <th className="py-2.5 px-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Cargando catálogo de cajas y terminales...</span>
                    </div>
                  </td>
                </tr>
              ) : cajasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="max-w-sm mx-auto space-y-2 p-4">
                      <Wallet className="w-9 h-9 mx-auto text-gray-500 opacity-80" />
                      <p className="font-semibold text-white text-sm">No se encontraron cajas registradas</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery || filtroEstado !== 'TODAS'
                          ? 'No hay cajas que coincidan con los filtros de búsqueda aplicados.'
                          : 'Haga clic en "+ Nueva Caja de Mostrador" para crear una nueva terminal.'}
                      </p>
                      {(searchQuery || filtroEstado !== 'TODAS') && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleLimpiarFiltros}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-blue-300 rounded-lg text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Limpiar filtros</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                cajasPaginadas.map((caja) => (
                  <tr
                    key={caja.uuid || caja.codigoCaja}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2 px-3.5">
                      <span className="font-mono font-bold text-xs text-blue-300 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded">
                        {caja.codigoCaja}
                      </span>
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="font-semibold text-white">{caja.nombre}</div>
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        <span>{caja.ubicacion || 'Mostrador Principal'}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3.5">
                      <Badge variant={caja.activa ? 'success' : 'neutral'}>
                        {caja.activa ? '● Activa (Operativa)' : '○ Inactiva'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3.5 text-right">
                      {/* Botones de acción mejorados con iconos y hover estilizado */}
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(caja)}
                          title="Editar nombre y ubicación de la terminal"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
                        >
                          <Pencil className="w-3 h-3 text-slate-400 group-hover:text-white" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalToggleTarget(caja)}
                          title={caja.activa ? 'Inactivar caja para bloquear apertura de turnos' : 'Activar caja para permitir turnos'}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                            caja.activa
                              ? 'text-rose-300 bg-rose-950/30 hover:bg-rose-600 hover:text-white border-rose-800/40 hover:border-rose-500'
                              : 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-600 hover:text-white border-emerald-800/40 hover:border-emerald-500'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{caja.activa ? 'Desactivar' : 'Activar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación Estándar */}
        <div className="px-3.5 py-2.5 bg-gray-950/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              {totalRegistros === 0 ? (
                '0 registros'
              ) : (
                <>
                  Mostrando <strong className="text-white">{indiceInicio + 1}</strong> -{' '}
                  <strong className="text-white">{indiceFin}</strong> de{' '}
                  <strong className="text-white">{totalRegistros}</strong> cajas
                </>
              )}
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
              <span className="text-[11px] text-gray-500">Filas:</span>
              <select
                value={tamanoPagina}
                onChange={(e) => {
                  setTamanoPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={paginaActual === 1 || totalRegistros === 0}
              onClick={() => setPaginaActual(1)}
              title="Primera página"
              className="p-1 rounded border border-white/10 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={paginaActual === 1 || totalRegistros === 0}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              title="Página anterior"
              className="p-1 rounded border border-white/10 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-mono text-[11px]">
              Pág. <strong className="text-white">{paginaActual}</strong> / {totalPaginas}
            </span>

            <button
              type="button"
              disabled={paginaActual === totalPaginas || totalRegistros === 0}
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              title="Página siguiente"
              className="p-1 rounded border border-white/10 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={paginaActual === totalPaginas || totalRegistros === 0}
              onClick={() => setPaginaActual(totalPaginas)}
              title="Última página"
              className="p-1 rounded border border-white/10 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Crear Nueva Caja */}
      <Modal
        isOpen={modalNuevoOpen}
        onClose={() => !saving && setModalNuevoOpen(false)}
        title="➕ Registrar Nueva Caja de Mostrador"
        size="md"
      >
        <form onSubmit={handleCrearCaja} className="p-4 space-y-4 text-xs">
          <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 text-blue-200">
            Define una nueva terminal POS física. Las cajas creadas estarán inmediatamente disponibles para la apertura de turnos diarios.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-gray-300 uppercase mb-1">
                Código de la Caja <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: CAJA2, CAJA-02, CAJA-TALLER"
                value={formNuevo.codigoCaja}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, codigoCaja: e.target.value.toUpperCase() })
                }
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Identificador único de la terminal física.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 uppercase mb-1">
                Nombre Descriptivo <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Caja Principal Mostrador, Caja Secundaria Taller"
                value={formNuevo.nombre}
                onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-300 uppercase mb-1">
                Ubicación Física en Local / Planta
              </label>
              <input
                type="text"
                placeholder="Ej: Mostrador Principal, Recepción Taller, Muelle de Despacho"
                value={formNuevo.ubicacion}
                onChange={(e) => setFormNuevo({ ...formNuevo, ubicacion: e.target.value })}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => setModalNuevoOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando Caja...' : 'Guardar y Habilitar Caja'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Caja */}
      <Modal
        isOpen={Boolean(modalEditarTarget)}
        onClose={() => !saving && setModalEditarTarget(null)}
        title={`✏️ Editar Caja: ${modalEditarTarget?.codigoCaja}`}
        size="md"
      >
        <form onSubmit={handleGuardarEdicion} className="p-4 space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-gray-400 uppercase mb-1">
                Código de Caja
              </label>
              <input
                type="text"
                disabled
                value={modalEditarTarget?.codigoCaja || ''}
                className="w-full bg-gray-950/80 border border-white/5 rounded-xl px-3 py-2 text-sm text-gray-400 font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                El código de caja es inmutable para asegurar la trazabilidad de turnos pasados.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 uppercase mb-1">
                Nombre Descriptivo <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formEditar.nombre}
                onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-300 uppercase mb-1">
                Ubicación Física
              </label>
              <input
                type="text"
                value={formEditar.ubicacion}
                onChange={(e) => setFormEditar({ ...formEditar, ubicacion: e.target.value })}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => setModalEditarTarget(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando Cambios...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmación Activar / Desactivar */}
      <Modal
        isOpen={Boolean(modalToggleTarget)}
        onClose={() => !saving && setModalToggleTarget(null)}
        title={
          modalToggleTarget?.activa
            ? `⚠️ Desactivar Caja ${modalToggleTarget?.codigoCaja}`
            : `✅ Activar Caja ${modalToggleTarget?.codigoCaja}`
        }
        size="sm"
      >
        <div className="p-4 space-y-4 text-xs">
          <p className="text-sm text-gray-300">
            {modalToggleTarget?.activa ? (
              <>
                ¿Está seguro de desactivar la caja{' '}
                <strong className="text-white font-mono">{modalToggleTarget.codigoCaja}</strong> ({modalToggleTarget.nombre})?
                Al desactivarla, los cajeros no podrán seleccionarla para abrir nuevos turnos.
              </>
            ) : (
              <>
                ¿Desea activar nuevamente la caja{' '}
                <strong className="text-white font-mono">{modalToggleTarget?.codigoCaja}</strong> ({modalToggleTarget?.nombre})?
                Quedará inmediatamente visible en el selector operativo de Caja y Turnos.
              </>
            )}
          </p>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setModalToggleTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={modalToggleTarget?.activa ? 'danger' : 'primary'}
              disabled={saving}
              onClick={handleConfirmarToggleActiva}
            >
              {saving
                ? 'Actualizando...'
                : modalToggleTarget?.activa
                ? 'Sí, Desactivar Caja'
                : 'Sí, Activar Caja'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
