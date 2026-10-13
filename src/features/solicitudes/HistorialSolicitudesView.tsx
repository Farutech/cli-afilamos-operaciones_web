import { useState, useEffect, useMemo, useCallback } from 'react';
import { CRUDTable, Badge, Button, Modal } from '@farutech/design-system';
import { Eye, Printer, Pencil } from 'lucide-react';
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

  return (
    <div className="space-y-5">
      {/* Contenedor Principal con Loading Centrado o Tabla CRUD */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 border border-slate-800 rounded-xl bg-slate-950/60 min-h-[340px] gap-2.5 text-slate-400">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide text-slate-300">Cargando solicitudes...</span>
        </div>
      ) : (
        <CRUDTable<SolicitudHistorialItem>
          data={todasSolicitudes}
          columns={[
            {
              key: 'numeroSolicitud',
              label: 'Consecutivo',
              sortable: true,
              render: (v: any, r: SolicitudHistorialItem) => (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400">{String(v)}</span>
                  <Badge variant={r.subtipo === 'SOL-PREF' ? 'warning' : 'neutral'} size="sm">
                    {r.subtipo}
                  </Badge>
                </div>
              ),
            },
            {
              key: 'fecha',
              label: 'Fecha Emisión',
              sortable: true,
              render: (v: any) => <span className="text-slate-300 font-mono text-xs">{String(v)}</span>,
            },
            {
              key: 'clienteNombre',
              label: 'Cliente',
              sortable: true,
              render: (v: any, r: SolicitudHistorialItem) => (
                <div>
                  <div className="font-semibold text-white text-xs">{String(v)}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{r.clienteDocumento}</div>
                </div>
              ),
            },
            {
              key: 'totalItems',
              label: 'Ítems',
              align: 'center',
              render: (v: any) => <span className="font-bold text-slate-200">{Number(v)}</span>,
            },
            {
              key: 'totalNetoCop',
              label: 'Total Neto',
              align: 'right',
              sortable: true,
              render: (v: any) => <span className="font-mono font-bold text-white">{formatCOP(Number(v))}</span>,
            },
            {
              key: 'anticipoCop',
              label: 'Anticipo',
              align: 'right',
              render: (v: any) => <span className="font-mono text-emerald-400">{formatCOP(Number(v))}</span>,
            },
            {
              key: 'saldoCop',
              label: 'Saldo Pendiente',
              align: 'right',
              render: (v: any) => {
                const num = Number(v);
                return (
                  <span className={`font-mono font-bold ${num > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {num > 0 ? formatCOP(num) : 'Pagado'}
                  </span>
                );
              },
            },
            {
              key: 'estado',
              label: 'Estado',
              sortable: true,
              render: (v: any) => {
                const est = String(v);
                const variant =
                  est === 'ENTREGADA'
                    ? 'success'
                    : est === 'EN_TALLER'
                    ? 'info'
                    : est === 'ASENTADA'
                    ? 'info'
                    : est === 'BORRADOR'
                    ? 'warning'
                    : 'neutral';
                return <Badge variant={variant}>{est.replace('_', ' ')}</Badge>;
              },
            },
            {
              key: 'acciones',
              label: 'Acciones',
              align: 'right',
              render: (_: any, r: SolicitudHistorialItem) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setSolicitudDetalle(r)}
                    className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs"
                    title="Ver resumen y detalle de la solicitud"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="sr-only sm:not-sr-only">Ver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolicitudParaImprimir(r)}
                    className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-600/50 text-indigo-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs"
                    title="Imprimir comprobante o reporte de la solicitud"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="sr-only sm:not-sr-only">Imprimir</span>
                  </button>
                  {r.estado === 'BORRADOR' && onEditarSolicitud && (
                    <button
                      type="button"
                      onClick={() => onEditarSolicitud(r)}
                      className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-600/60 text-amber-300 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs"
                      title="Continuar captura y asentar solicitud"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="sr-only sm:not-sr-only">Editar</span>
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          searchable={true}
          searchPlaceholder="Buscar por consecutivo, cliente o documento..."
          pagination={true}
          pageSize={10}
          emptyMessage="No hay registros en el historial de solicitudes."
          footerSlot={
            <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
              <span className="font-semibold text-slate-300">Leyenda de Acciones:</span>
              <div className="flex flex-wrap items-center gap-4">
                <span>👁️ <strong className="text-slate-300">Ver:</strong> Consultar resumen</span>
                <span>🖨️ <strong className="text-slate-300">Comprobante:</strong> Recibo térmico / PDF</span>
                <span>✏️ <strong className="text-slate-300">Editar:</strong> Continuar borrador</span>
              </div>
            </div>
          }
        />
      )}

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
