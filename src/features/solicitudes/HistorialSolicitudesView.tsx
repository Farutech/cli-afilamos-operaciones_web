import { useState } from 'react';
import { CRUDTable, Badge, Button, Modal } from '@farutech/design-system';

interface SolicitudHistorialItem {
  numeroSolicitud: string;
  subtipo: 'SOL-GEN' | 'SOL-PREF';
  fecha: string;
  clienteNombre: string;
  clienteDocumento: string;
  totalItems: number;
  totalNetoCop: number;
  anticipoCop: number;
  saldoCop: number;
  estado: 'ASENTADA' | 'EN_TALLER' | 'FINALIZADA' | 'ENTREGADA';
}

const SOLICITUDES_MOCK: SolicitudHistorialItem[] = [
  {
    numeroSolicitud: 'SG-0001',
    subtipo: 'SOL-GEN',
    fecha: '2026-09-19',
    clienteNombre: 'Afilados del Valle S.A.S.',
    clienteDocumento: '900123456-1',
    totalItems: 4,
    totalNetoCop: 145000,
    anticipoCop: 72500,
    saldoCop: 72500,
    estado: 'EN_TALLER',
  },
  {
    numeroSolicitud: 'SG-0002',
    subtipo: 'SOL-GEN',
    fecha: '2026-09-20',
    clienteNombre: 'Carnicería La Esmeralda',
    clienteDocumento: '800987654-3',
    totalItems: 2,
    totalNetoCop: 60000,
    anticipoCop: 60000,
    saldoCop: 0,
    estado: 'ASENTADA',
  },
  {
    numeroSolicitud: 'SP-0001',
    subtipo: 'SOL-PREF',
    fecha: '2026-09-20',
    clienteNombre: 'Restaurante Gourmet & Mar',
    clienteDocumento: '901234888-0',
    totalItems: 6,
    totalNetoCop: 320000,
    anticipoCop: 200000,
    saldoCop: 120000,
    estado: 'EN_TALLER',
  },
  {
    numeroSolicitud: 'SG-0000',
    subtipo: 'SOL-GEN',
    fecha: '2026-09-18',
    clienteNombre: 'Taller Metalmecánico Hnos.',
    clienteDocumento: '1020304050',
    totalItems: 1,
    totalNetoCop: 35000,
    anticipoCop: 35000,
    saldoCop: 0,
    estado: 'ENTREGADA',
  },
];

interface HistorialSolicitudesViewProps {
  onNuevaSolicitud: () => void;
}

export function HistorialSolicitudesView({ onNuevaSolicitud }: HistorialSolicitudesViewProps) {
  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudHistorialItem | null>(null);

  const formatCOP = (val: number) => {
    return `$ ${val.toLocaleString('es-CO')}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Historial de Solicitudes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Consulta consolidada de órdenes de mostrador, saldos pendientes y estado de ejecución.
          </p>
        </div>

        <Button variant="primary" onClick={onNuevaSolicitud}>
          + Nueva Solicitud (POS)
        </Button>
      </div>

      {/* Tabla CRUD */}
      <CRUDTable<SolicitudHistorialItem>
        data={SOLICITUDES_MOCK}
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
                est === 'ENTREGADA' ? 'success' : est === 'EN_TALLER' ? 'info' : est === 'ASENTADA' ? 'warning' : 'neutral';
              return <Badge variant={variant}>{est.replace('_', ' ')}</Badge>;
            },
          },
        ]}
        rowActions={[
          {
            id: 'ver_detalle',
            label: 'Ver Detalle',
            icon: <span>👁️</span>,
            tooltip: 'Ver detalle de la solicitud y comprobante',
            variant: 'secondary',
            onClick: (r: SolicitudHistorialItem) => setSolicitudDetalle(r),
          },
        ]}
        searchable={true}
        searchPlaceholder="Buscar por consecutivo, cliente o documento..."
        pagination={true}
        pageSize={10}
        emptyMessage="No se registran solicitudes para los filtros aplicados."
      />

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

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setSolicitudDetalle(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
