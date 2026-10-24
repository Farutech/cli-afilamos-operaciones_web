import React, { useState } from 'react';
import { Printer, Download, FileText } from 'lucide-react';
import { Modal, Button } from '@farutech/design-system';

export type DocumentPrintFormat = 'pos-80mm' | 'media-carta';

export interface DocumentPrintData {
  tipoDocumento: string; // "SOLICITUD DE SERVICIO", "COMPROBANTE DE ENTREGA", "REMISIÓN"
  numeroDocumento: string;
  fechaEmision: string;
  cliente: {
    nombre: string;
    documento: string;
    telefono?: string;
    direccion?: string;
  };
  observaciones?: string;
  items: {
    codigo?: string;
    descripcion: string;
    naturaleza?: 'INVENTARIO' | 'SERVICIO';
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    franjaCompromiso?: string;
  }[];
  totales: {
    subtotalNeto: number;
    totalInventario?: number;
    totalServicios?: number;
    descuento?: number;
    iva?: number;
    totalDocumento: number;
    totalAbonado: number;
    saldoPendiente: number;
  };
  pagos?: {
    medio: string;
    monto: number;
    referencia?: string;
  }[];
  emisor?: {
    razonSocial: string;
    nit: string;
    direccion: string;
    telefono: string;
    ciudad: string;
  };
}

export interface DocumentPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: DocumentPrintData | null;
  defaultFormat?: DocumentPrintFormat;
}

const EMISOR_DEFAULT = {
  razonSocial: 'AFILAMOS HERMANOS S.A.S.',
  nit: '900.123.456-7',
  direccion: 'Calle 45 # 28-34, Zona Industrial',
  telefono: '(+57) 310 555 4321',
  ciudad: 'Bucaramanga, Santander',
};

/**
 * DocumentPrintPreviewModal
 * Modal unificado de previsualización, impresión y descarga de documentos.
 * Soporta Tirilla 80mm POS (impresora térmica) y Media Carta (140x216mm).
 */
export const DocumentPrintPreviewModal: React.FC<DocumentPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  documentData,
  defaultFormat = 'pos-80mm',
}) => {
  const [formato, setFormato] = useState<DocumentPrintFormat>(defaultFormat);

  if (!isOpen || !documentData) return null;

  const emisor = documentData.emisor || EMISOR_DEFAULT;
  const formatCOP = (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`;

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargar = () => {
    const element = document.getElementById('printable-document');
    if (!element) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${documentData.tipoDocumento} - ${documentData.numeroDocumento}</title>
        <style>
          body { font-family: ${formato === 'pos-80mm' ? 'monospace' : 'sans-serif'}; padding: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 11px; }
          th { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentData.numeroDocumento}_${formato}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Barra Superior con Acciones en Fila Única */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Previsualización de Documento
              </h2>
              <p className="text-xs text-slate-400">
                {documentData.tipoDocumento}: {documentData.numeroDocumento}
              </p>
            </div>
          </div>

          {/* Selector de Formato y Botones de Acción */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs flex items-center">
              <button
                type="button"
                onClick={() => setFormato('pos-80mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  formato === 'pos-80mm'
                    ? 'bg-slate-800 text-primary-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tirilla 80mm
              </button>
              <button
                type="button"
                onClick={() => setFormato('media-carta')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  formato === 'media-carta'
                    ? 'bg-slate-800 text-primary-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Media Carta
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDescargar}
              className="h-8 px-2.5 text-xs border-slate-700 bg-slate-900 text-slate-200"
              title="Descargar documento"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Descargar
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handleImprimir}
              className="h-8 px-3 text-xs font-semibold"
              title="Enviar a impresora"
            >
              <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Contenedor de Vista Previa */}
        <div className="max-h-[68vh] overflow-y-auto bg-slate-950/80 p-4 sm:p-6 rounded-xl border border-slate-800 flex justify-center">
          <div
            id="printable-document"
            className={`bg-white text-black shadow-2xl transition-all ${
              formato === 'pos-80mm'
                ? 'w-[320px] p-4 font-mono text-[11px] leading-tight rounded-sm print-format-pos-80mm'
                : 'w-full max-w-[560px] p-6 font-sans text-xs leading-normal rounded-sm print-format-media-carta'
            }`}
          >
            {/* Encabezado Fiscal / Membrete */}
            <div className="text-center pb-3 border-b border-gray-300 space-y-1">
              <div className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                {emisor.razonSocial}
              </div>
              <div className="text-[10px] text-gray-700">NIT: {emisor.nit}</div>
              <div className="text-[10px] text-gray-700">{emisor.direccion}</div>
              <div className="text-[10px] text-gray-700">Tel: {emisor.telefono} — {emisor.ciudad}</div>
              <div className="pt-2">
                <span className="inline-block border border-black px-2 py-0.5 font-bold text-[11px] uppercase">
                  {documentData.tipoDocumento}
                </span>
                <div className="font-mono font-bold text-sm pt-0.5">{documentData.numeroDocumento}</div>
              </div>
            </div>

            {/* Datos del Cliente y Emisión */}
            <div className="py-2.5 border-b border-gray-300 text-[11px] space-y-0.5">
              <div><span className="font-bold">Fecha:</span> {documentData.fechaEmision}</div>
              <div><span className="font-bold">Cliente:</span> {documentData.cliente.nombre}</div>
              <div><span className="font-bold">NIT/CC:</span> {documentData.cliente.documento}</div>
              {documentData.cliente.telefono && (
                <div><span className="font-bold">Teléfono:</span> {documentData.cliente.telefono}</div>
              )}
            </div>

            {/* Tabla de Ítems */}
            <div className="py-2 border-b border-gray-300">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-400 font-bold">
                    <th className="text-left py-1">Cant.</th>
                    <th className="text-left py-1">Descripción</th>
                    <th className="text-right py-1">V. Unit</th>
                    <th className="text-right py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documentData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1 font-mono">{it.cantidad}</td>
                      <td className="py-1 pr-1">
                        <div className="font-semibold">{it.descripcion}</div>
                        {it.franjaCompromiso && (
                          <div className="text-[9px] text-gray-600">Entrega: {it.franjaCompromiso}</div>
                        )}
                      </td>
                      <td className="py-1 text-right font-mono">{formatCOP(it.precioUnitario)}</td>
                      <td className="py-1 text-right font-mono font-bold">{formatCOP(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen Financiero y Pagos */}
            <div className="py-2 border-b border-gray-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Total Bruto:</span>
                <span className="font-mono">{formatCOP(documentData.totales.subtotalNeto)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono">{formatCOP(documentData.totales.totalDocumento)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Abonos / Pagado:</span>
                <span className="font-mono">{formatCOP(documentData.totales.totalAbonado)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-0.5 border-t border-dashed border-gray-400">
                <span>SALDO PENDIENTE:</span>
                <span className="font-mono text-red-700">{formatCOP(documentData.totales.saldoPendiente)}</span>
              </div>
            </div>

            {/* Desglose de Medios de Pago */}
            {documentData.pagos && documentData.pagos.length > 0 && (
              <div className="py-2 border-b border-gray-300 text-[10px]">
                <div className="font-bold mb-1">Medios de Pago Aplicados:</div>
                {documentData.pagos.map((p, pIdx) => (
                  <div key={pIdx} className="flex justify-between">
                    <span>{p.medio} {p.referencia ? `(Ref: ${p.referencia})` : ''}:</span>
                    <span className="font-mono font-semibold">{formatCOP(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Observaciones */}
            {documentData.observaciones && (
              <div className="py-2 border-b border-gray-300 text-[10px] italic">
                <span className="font-bold not-italic">Notas: </span>{documentData.observaciones}
              </div>
            )}

            {/* Pie de Página: Tirilla vs Media Carta */}
            {formato === 'media-carta' ? (
              <div className="pt-8 pb-2 grid grid-cols-2 gap-8 text-center text-[10px]">
                <div className="border-t border-black pt-1">
                  <div className="font-bold">ENTREGADO POR</div>
                  <div className="text-[9px] text-gray-600">Afilamos Hermanos S.A.S.</div>
                </div>
                <div className="border-t border-black pt-1">
                  <div className="font-bold">RECIBIDO A CONFORMIDAD</div>
                  <div className="text-[9px] text-gray-600">Firma y C.C. del Cliente</div>
                </div>
              </div>
            ) : (
              <div className="pt-3 text-center text-[9px] text-gray-600 space-y-1">
                <div>Conserve este comprobante para reclamos y garantías.</div>
                <div className="font-bold">¡Gracias por confiar en nuestros servicios!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
