import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge, Button, Modal } from '@farutech/design-system';
import { Eye, Printer, Pencil } from 'lucide-react';
import { ListPageLayout, StandardDataTable, type ColumnDef } from '@/components/ui';
import { solicitudesApi } from '@/services/solicitudesApi';
import { ModalComprobanteSolicitud } from './ModalComprobanteSolicitud';

export interface SolicitudHistorialItem {
  id?: string;
  numeroSolicitud: string;
  subtipo: string;
  fecha: string;
  clienteNombre: string;
  clienteDocumento: string;
  clienteUuid?: string;
  canalUuid?: string;
  tipoDocumentoUuid?: string;
  subtipoUuid?: string;
  observaciones?: string;
  lineas?: any[];
  pagosAbono?: any[];
  totalItems: number;
  totalNetoCop: number;
  anticipoCop: number;
  saldoCop: number;
  estado: 'BORRADOR' | 'PENDIENTE_APROBACION' | 'ASENTADA' | 'EN_TALLER' | 'FINALIZADA' | 'ENTREGADA';
}

interface HistorialSolicitudesViewProps {
  onNuevaSolicitud: () => void;
  onEditarSolicitud?: (solicitud: SolicitudHistorialItem) => void;
  solicitudesExtra?: SolicitudHistorialItem[];
  token?: string;
}

export function HistorialSolicitudesView({
  onNuevaSolicitud: _onNuevaSolicitud,
  onEditarSolicitud,
  solicitudesExtra = [],
  token,
}: HistorialSolicitudesViewProps) {
  const [solicitudesApiList, setSolicitudesApiList] = useState<SolicitudHistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudHistorialItem | null>(null);
  const [solicitudParaImprimir, setSolicitudParaImprimir] = useState<SolicitudHistorialItem | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await solicitudesApi.getSolicitudes({ page: 1, pageSize: 50 }, token);
      if (res?.items && Array.isArray(res.items)) {
        const mapeadas: SolicitudHistorialItem[] = res.items.map((dto) => ({
          id: dto.publicId,
          numeroSolicitud: dto.codigo || dto.numeroDocumentoVisible || 'SOL',
          subtipo: dto.subtipoCodigo === 'PREF' ? 'SOL-PREF' : 'SOL-GEN',
          fecha: dto.fechaEmision ? dto.fechaEmision.split('T')[0] : new Date().toISOString().split('T')[0],
          clienteNombre: dto.clienteNombre || 'Mostrador',
          clienteDocumento: dto.clienteNumeroDocumento || '—',
          clienteUuid: dto.clientePublicId,
          canalUuid: dto.canalPublicId,
          observaciones: dto.notas,
          lineas: (dto.items || []).map((it) => ({
            idTemp: it.publicId,
            lineaId: it.lineaId || it.publicId,
            itemCatalogoId: it.itemCatalogoId,
            naturaleza: it.naturaleza,
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal,
            stockReferencial: it.stockReferencialDisponible,
            exigeAnticipo: it.exigeAnticipoObligatorio,
            porcentajeAnticipoMinimo: it.porcentajeAnticipoMinimo,
            anticipoMinimo: it.anticipoMinimoRequerido,
            anticipoImputado: it.anticipoDirectoImputado,
            franjaCompromiso: it.franjaCompromiso,
            observaciones: '',
          })),
          totalItems: dto.items?.length || 0,
          totalNetoCop: dto.totalNeto || 0,
          anticipoCop: dto.totalAnticiposImputados || 0,
          saldoCop: dto.saldoPendiente || 0,
          estado: dto.estado === 'ASENTADO' ? 'ASENTADA' : dto.estado === 'BORRADOR' ? 'BORRADOR' : 'ASENTADA',
        }));
        setSolicitudesApiList(mapeadas);
      } else {
        setSolicitudesApiList([]);
      }
    } catch (err) {
      console.warn('No se pudieron cargar solicitudes desde backend:', err);
      setSolicitudesApiList([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const todasSolicitudes = useMemo(() => {
    const list = [...solicitudesExtra];
    solicitudesApiList.forEach((s) => {
      if (!list.some((e) => e.numeroSolicitud === s.numeroSolicitud)) {
        list.push(s);
      }
    });
    return list;
  }, [solicitudesExtra, solicitudesApiList]);

  const formatCOP = (val: number) => {
    return `$ ${val.toLocaleString('es-CO')}`;
  };

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  const filteredSolicitudes = useMemo(() => {
    let result = todasSolicitudes;
    if (filtroEstado !== 'TODOS') {
      result = result.filter((s) => s.estado === filtroEstado);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.numeroSolicitud.toLowerCase().includes(q) ||
          s.clienteNombre.toLowerCase().includes(q) ||
          s.clienteDocumento.toLowerCase().includes(q)
      );
    }
    return result;
  }, [todasSolicitudes, filtroEstado, query]);

  const pagedSolicitudes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSolicitudes.slice(start, start + pageSize);
  }, [filteredSolicitudes, page, pageSize]);

  const columns: ColumnDef<SolicitudHistorialItem>[] = [
    {
      key: 'numeroSolicitud',
      header: 'CONSECUTIVO',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-indigo-400">{r.numeroSolicitud}</span>
          <Badge variant={r.subtipo === 'SOL-PREF' ? 'warning' : 'neutral'} size="sm">
            {r.subtipo}
          </Badge>
        </div>
      ),
    },
    {
      key: 'fecha',
      header: 'FECHA EMISIÓN',
      render: (r) => <span className="text-slate-300 font-mono text-xs">{r.fecha}</span>,
    },
    {
      key: 'clienteNombre',
      header: 'CLIENTE',
      render: (r) => (
        <div>
          <div className="font-semibold text-white text-xs">{r.clienteNombre}</div>
          <div className="text-[11px] text-slate-500 font-mono">{r.clienteDocumento}</div>
        </div>
      ),
    },
    {
      key: 'totalItems',
      header: 'ÍTEMS',
      align: 'center',
      render: (r) => <span className="font-bold text-slate-200 text-xs">{r.totalItems}</span>,
    },
    {
      key: 'totalNetoCop',
      header: 'TOTAL NETO',
      align: 'right',
      render: (r) => (
        <span className="font-mono font-bold text-white text-xs">{formatCOP(r.totalNetoCop)}</span>
      ),
    },
    {
      key: 'anticipoCop',
      header: 'ANTICIPO',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-emerald-400 text-xs">{formatCOP(r.anticipoCop)}</span>
      ),
    },
    {
      key: 'saldoCop',
      header: 'SALDO',
      align: 'right',
      render: (r) => (
        <span
          className={`font-mono font-bold text-xs ${
            r.saldoCop > 0 ? 'text-amber-400' : 'text-slate-500'
          }`}
        >
          {r.saldoCop > 0 ? formatCOP(r.saldoCop) : 'Pagado'}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'ESTADO',
      align: 'center',
      render: (r) => {
        const est = r.estado;
        const variant =
          est === 'ENTREGADA' || est === 'FINALIZADA'
            ? 'success'
            : est === 'EN_TALLER' || est === 'ASENTADA'
            ? 'info'
            : est === 'BORRADOR'
            ? 'warning'
            : 'neutral';
        return <Badge variant={variant}>{est.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'acciones',
      header: 'ACCIONES',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSolicitudDetalle(r)}
            className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
            title="Ver resumen y detalle de la solicitud"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver</span>
          </button>
          <button
            type="button"
            onClick={() => setSolicitudParaImprimir(r)}
            className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-600/50 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
            title="Imprimir comprobante o reporte de la solicitud"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          {r.estado === 'BORRADOR' && onEditarSolicitud && (
            <button
              type="button"
              onClick={() => onEditarSolicitud(r)}
              className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-600/60 text-amber-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs cursor-pointer"
              title="Continuar captura y asentar solicitud"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ListPageLayout
        title="Historial de Solicitudes"
        eyebrow="OPERACIÓN · SOLICITUDES"
        description="Consulta y seguimiento integral de solicitudes de servicio, borradores y órdenes asentadas."
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar por consecutivo, cliente o documento...',
          isSearching: loading,
        }}
        filters={
          <div className="flex items-center gap-1.5">
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="BORRADOR">Borradores</option>
              <option value="ASENTADA">Asentadas</option>
              <option value="EN_TALLER">En Taller</option>
              <option value="FINALIZADA">Finalizadas</option>
              <option value="ENTREGADA">Entregadas</option>
            </select>
          </div>
        }
      >
        <StandardDataTable<SolicitudHistorialItem>
          columns={columns}
          data={pagedSolicitudes}
          keyExtractor={(s) => s.numeroSolicitud}
          loading={loading && todasSolicitudes.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems: filteredSolicitudes.length,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No hay registros en el historial de solicitudes."
        />
      </ListPageLayout>

      {/* Modal de Detalle */}
      {solicitudDetalle && (
        <Modal
          isOpen={Boolean(solicitudDetalle)}
          onClose={() => setSolicitudDetalle(null)}
          title={`📄 Solicitud ${solicitudDetalle.numeroSolicitud}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{solicitudDetalle.clienteNombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Documento:</span>
                <span className="font-mono text-slate-300">{solicitudDetalle.clienteDocumento}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fecha de Registro:</span>
                <span className="font-mono text-slate-300">{solicitudDetalle.fecha}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado:</span>
                <Badge variant={solicitudDetalle.estado === 'BORRADOR' ? 'warning' : 'info'}>
                  {solicitudDetalle.estado}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Total Neto</div>
                <div className="font-mono font-bold text-white mt-0.5">{formatCOP(solicitudDetalle.totalNetoCop)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                <div className="text-emerald-400 text-[10px]">Anticipo</div>
                <div className="font-mono font-bold text-emerald-300 mt-0.5">{formatCOP(solicitudDetalle.anticipoCop)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40">
                <div className="text-amber-400 text-[10px]">Saldo</div>
                <div className="font-mono font-bold text-amber-300 mt-0.5">{formatCOP(solicitudDetalle.saldoCop)}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const target = solicitudDetalle;
                  setSolicitudDetalle(null);
                  setSolicitudParaImprimir(target);
                }}
                className="text-indigo-300 hover:text-white"
              >
                🖨️ Imprimir Comprobante
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSolicitudDetalle(null)}>
                  Cerrar
                </Button>
                {solicitudDetalle.estado === 'BORRADOR' && onEditarSolicitud && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 font-bold text-white"
                    onClick={() => {
                      const target = solicitudDetalle;
                      setSolicitudDetalle(null);
                      onEditarSolicitud(target);
                    }}
                  >
                    ✏️ Continuar / Editar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Impresión / Comprobante */}
      {solicitudParaImprimir && (
        <ModalComprobanteSolicitud
          isOpen={Boolean(solicitudParaImprimir)}
          onClose={() => setSolicitudParaImprimir(null)}
          solicitud={{
            numeroSolicitud: solicitudParaImprimir.numeroSolicitud,
            subtipo: solicitudParaImprimir.subtipo,
            fecha: solicitudParaImprimir.fecha,
            clienteNombre: solicitudParaImprimir.clienteNombre,
            clienteDocumento: solicitudParaImprimir.clienteDocumento,
            observaciones: solicitudParaImprimir.observaciones,
            lineas: solicitudParaImprimir.lineas?.map((l: any) => ({
              descripcion: l.descripcion,
              naturaleza: l.naturaleza,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              subtotal: l.subtotal || l.cantidad * l.precioUnitario,
              fechaEntregaCompromiso: l.fechaEntregaCompromiso,
              franjaCompromiso: l.franjaCompromiso,
              observaciones: l.observaciones,
            })),
            pagosAbono: solicitudParaImprimir.pagosAbono?.map((p: any) => ({
              instrumentoNombre: p.instrumentoNombre,
              monto: p.monto,
              referencia: p.referencia,
            })),
            totalNetoCop: solicitudParaImprimir.totalNetoCop,
            anticipoCop: solicitudParaImprimir.anticipoCop,
            saldoCop: solicitudParaImprimir.saldoCop,
            estado: solicitudParaImprimir.estado,
          }}
        />
      )}
    </div>
  );
}
