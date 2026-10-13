import React from 'react';
import { Modal, Button } from '@farutech/design-system';
import { Printer, CheckCircle, ArrowLeft } from 'lucide-react';

export interface ComprobanteItemLinea {
  descripcion: string;
  naturaleza?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  fechaEntregaCompromiso?: string;
  franjaCompromiso?: string;
  observaciones?: string;
}

export interface ComprobantePagoAbono {
  instrumentoNombre?: string;
  monto: number;
  referencia?: string;
}

export interface ComprobanteSolicitudData {
  numeroSolicitud: string;
  subtipo?: string;
  fecha: string;
  clienteNombre: string;
  clienteDocumento?: string;
  clienteTelefono?: string;
  canalNombre?: string;
  observaciones?: string;
  lineas?: ComprobanteItemLinea[];
  pagosAbono?: ComprobantePagoAbono[];
  totalNetoCop: number;
  anticipoCop: number;
  saldoCop: number;
  estado?: string;
}

interface ModalComprobanteSolicitudProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: ComprobanteSolicitudData | null;
  esConfirmacionAsentada?: boolean;
}

export const ModalComprobanteSolicitud: React.FC<ModalComprobanteSolicitudProps> = ({
  isOpen,
  onClose,
  solicitud,
  esConfirmacionAsentada = false,
}) => {
  if (!isOpen || !solicitud) return null;

  const handleImprimir = () => {
    window.print();
  };

  const [formato, setFormato] = React.useState<'half-letter' | 'pos-80mm'>('half-letter');

  const formatCOP = (val: number) => `$ ${Number(val || 0).toLocaleString('es-CO')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        esConfirmacionAsentada
          ? '✅ Confirmación de Asentado de Solicitud'
          : `📄 Comprobante de Solicitud: ${solicitud.numeroSolicitud}`
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Selector de formato Tirilla 80mm vs Media Carta */}
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="text-slate-400">Formato de Impresión:</span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setFormato('half-letter')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
                formato === 'half-letter'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              📄 Media Carta (140×216mm)
            </button>
            <button
              type="button"
              onClick={() => setFormato('pos-80mm')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
                formato === 'pos-80mm'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🧾 Tirilla Térmica (80mm)
            </button>
          </div>
        </div>

        {/* Banner de Pregunta / Notificación si viene de recién Asentar */}
        {esConfirmacionAsentada && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-300 m-0">
                  ¡La solicitud {solicitud.numeroSolicitud} fue asentada con éxito!
                </p>
                <p className="text-slate-300 text-xs m-0 mt-0.5">
                  ¿Desea imprimir el documento o comprobante para el cliente y taller?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleImprimir}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Imprimir Ahora
              </Button>
            </div>
          </div>
        )}

        {/* CONTENEDOR DE VISTA PREVIA / DOCUMENTO IMPRIMIBLE */}
        <div className="border border-slate-700/80 rounded-xl bg-slate-900/60 p-4 max-h-[60vh] overflow-y-auto">
          <div
            id="printable-document"
            className={`printable-document bg-white text-slate-900 rounded-lg p-6 mx-auto shadow-md font-sans ${
              formato === 'pos-80mm' ? 'max-w-[340px] text-[11px]' : 'max-w-[650px] text-xs'
            }`}
          >
            {/* Cabecera del Documento */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-base font-black tracking-wide text-slate-950 m-0 uppercase">
                  Afilamos Hermanos S.A.S.
                </h2>
                <p className="text-[11px] text-slate-600 m-0">NIT: 900.123.456-7 · Régimen Común</p>
                <p className="text-[11px] text-slate-600 m-0">Taller y Operaciones Especializadas</p>
                <p className="text-[11px] text-slate-500 m-0">Tel: (601) 555-0199 · info@afilamoshermanos.com</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Solicitud de Servicio
                </span>
                <span className="font-mono font-black text-lg text-indigo-700 block tracking-wide">
                  {solicitud.numeroSolicitud}
                </span>
                <span className="text-[11px] text-slate-600 font-mono block mt-1">
                  Fecha: {solicitud.fecha}
                </span>
                {solicitud.estado && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    {solicitud.estado}
                  </span>
                )}
              </div>
            </div>

            {/* Datos del Cliente y Canal */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 mb-4 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Cliente</span>
                <span className="font-bold text-slate-900 block">{solicitud.clienteNombre}</span>
                {solicitud.clienteDocumento && (
                  <span className="text-slate-600 font-mono block">Doc: {solicitud.clienteDocumento}</span>
                )}
                {solicitud.clienteTelefono && (
                  <span className="text-slate-600 block">Tel: {solicitud.clienteTelefono}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Canal & Subtipo</span>
                <span className="text-slate-800 font-semibold block">
                  {solicitud.canalNombre || 'Mostrador Principal'}
                </span>
                <span className="text-slate-600 block">
                  Subtipo: {solicitud.subtipo || 'Estándar'}
                </span>
              </div>
            </div>

            {/* Tabla de Líneas / Trabajos */}
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase text-slate-700 block mb-1.5">
                Detalle de Trabajos y Bienes
              </span>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 text-left bg-slate-100">
                    <th className="py-1.5 px-2 font-bold">Descripción</th>
                    <th className="py-1.5 px-2 font-bold text-center">Tipo</th>
                    <th className="py-1.5 px-2 font-bold text-center">Cant</th>
                    <th className="py-1.5 px-2 font-bold text-right">P. Unitario</th>
                    <th className="py-1.5 px-2 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(!solicitud.lineas || solicitud.lineas.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate-400 italic">
                        Sin detalle de ítems registrado.
                      </td>
                    </tr>
                  ) : (
                    solicitud.lineas.map((l, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2 px-2 text-slate-900">
                          <div className="font-semibold">{l.descripcion}</div>
                          {l.fechaEntregaCompromiso && (
                            <div className="text-[10px] text-indigo-700 font-mono mt-0.5">
                              📅 Pacto entrega: {l.fechaEntregaCompromiso} {l.franjaCompromiso ? `(${l.franjaCompromiso})` : ''}
                            </div>
                          )}
                          {l.observaciones && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              Obs: {l.observaciones}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-mono text-[10px]">
                          {l.naturaleza || 'SERVICIO'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">
                          {l.cantidad}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {formatCOP(l.precioUnitario)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCOP(l.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen Financiero y Abonos */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-3 mb-4">
              <div>
                {solicitud.pagosAbono && solicitud.pagosAbono.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Abonos Registrados
                    </span>
                    <ul className="text-[10px] space-y-1 list-none p-0 m-0">
                      {solicitud.pagosAbono.map((p, idx) => (
                        <li key={idx} className="flex justify-between text-slate-700">
                          <span>{p.instrumentoNombre || 'Efectivo'} {p.referencia ? `(${p.referencia})` : ''}:</span>
                          <strong className="font-mono text-emerald-700">{formatCOP(p.monto)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {solicitud.observaciones && (
                  <div className="mt-2 text-[10px] text-slate-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <strong className="block text-amber-900">Observaciones Generales:</strong>
                    {solicitud.observaciones}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-right font-mono text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Total Liquidado:</span>
                  <span className="font-bold text-slate-900">{formatCOP(solicitud.totalNetoCop)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Anticipo Recibido:</span>
                  <span className="font-bold">{formatCOP(solicitud.anticipoCop)}</span>
                </div>
                <div className="flex justify-between text-slate-900 text-xs border-t border-slate-300 pt-1 font-bold">
                  <span>Saldo Pendiente:</span>
                  <span className={solicitud.saldoCop > 0 ? 'text-amber-700' : 'text-slate-500'}>
                    {formatCOP(solicitud.saldoCop)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pie de Página / Firmas */}
            <div className="border-t border-slate-200 pt-3 mt-4 text-[9px] text-slate-500 text-center space-y-1">
              <p className="m-0">
                Los servicios cuentan con garantía técnica de afilado. Para reclamar sus herramientas o productos presente este comprobante.
              </p>
              <div className="flex justify-around pt-6 text-[10px] text-slate-700">
                <div className="border-t border-slate-400 px-6 pt-1">Firma Entregado / Asesor</div>
                <div className="border-t border-slate-400 px-6 pt-1">Firma Recibido / Cliente</div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> {esConfirmacionAsentada ? 'Cerrar y Continuar' : 'Cerrar'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleImprimir}
            className="bg-indigo-600 hover:bg-indigo-500 font-bold text-white flex items-center gap-1.5 shadow"
          >
            <Printer className="w-4 h-4" /> 🖨️ Imprimir Comprobante
          </Button>
        </div>
      </div>
    </Modal>
  );
};
