import React, { useState, useMemo } from "react";
import { Modal, Button, Badge } from "@farutech/design-system";
import { Search, UserCheck, Phone, FileText, UserPlus, X } from "lucide-react";
import type { Cliente } from "../../types/catalogos";

interface ClienteBuscarModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onSeleccionarCliente: (cliente: Cliente) => void;
  onCrearNuevoCliente?: () => void;
}

export const ClienteBuscarModal: React.FC<ClienteBuscarModalProps> = ({
  isOpen,
  onClose,
  clientes,
  onSeleccionarCliente,
  onCrearNuevoCliente,
}) => {
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroDocumento, setFiltroDocumento] = useState("");
  const [filtroTelefono, setFiltroTelefono] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const matchTexto =
        !filtroTexto.trim() ||
        c.nombreRazonSocial.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        c.numeroDocumento.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchDoc =
        !filtroDocumento.trim() ||
        c.numeroDocumento.toLowerCase().includes(filtroDocumento.toLowerCase());
      const matchTel =
        !filtroTelefono.trim() ||
        (c.telefono && c.telefono.toLowerCase().includes(filtroTelefono.toLowerCase()));
      return matchTexto && matchDoc && matchTel;
    });
  }, [clientes, filtroTexto, filtroDocumento, filtroTelefono]);

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / porPagina));
  const itemsPagina = useMemo(() => {
    const inicio = (pagina - 1) * porPagina;
    return clientesFiltrados.slice(inicio, inicio + porPagina);
  }, [clientesFiltrados, pagina, porPagina]);

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroDocumento("");
    setFiltroTelefono("");
    setPagina(1);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔍 Búsqueda Avanzada de Clientes"
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-slate-100">
        {/* Panel de Filtros */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Nombre / Razón Social
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez o Ferretería..."
                  value={filtroTexto}
                  onChange={(e) => {
                    setFiltroTexto(e.target.value);
                    setPagina(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                No. Documento (NIT / CC)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 12345678"
                  value={filtroDocumento}
                  onChange={(e) => {
                    setFiltroDocumento(e.target.value);
                    setPagina(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Teléfono / Celular
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 3001234567"
                  value={filtroTelefono}
                  onChange={(e) => {
                    setFiltroTelefono(e.target.value);
                    setPagina(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">
              Coincidencias encontradas: <strong className="text-indigo-400">{clientesFiltrados.length}</strong>
            </span>
            <div className="flex items-center gap-2">
              {(filtroTexto || filtroDocumento || filtroTelefono) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
              {onCrearNuevoCliente && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onCrearNuevoCliente();
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> + Nuevo Cliente
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Resultados Estandarizada tipo CRUD */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 flex flex-col">
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto pb-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Documento</th>
                  <th className="py-2.5 px-3 font-semibold">Nombre / Razón Social</th>
                  <th className="py-2.5 px-3 font-semibold">Teléfono</th>
                  <th className="py-2.5 px-3 font-semibold">Estado</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {itemsPagina.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No se encontraron clientes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  itemsPagina.map((cli) => (
                    <tr
                      key={cli.uuid}
                      className="hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                      onClick={() => {
                        onSeleccionarCliente(cli);
                        onClose();
                      }}
                    >
                      <td className="py-2.5 px-3 font-mono text-amber-300 font-semibold">
                        {cli.numeroDocumento}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white group-hover:text-indigo-300 transition-colors">
                        {cli.nombreRazonSocial}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {cli.telefono || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={cli.activo ? "success" : "neutral"}>
                          {cli.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-[11px] transition-colors"
                        >
                          <UserCheck className="w-3 h-3" /> Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación Estandarizada */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2.5 bg-slate-900/80 border-t border-slate-800">
            <span>
              Mostrando {clientesFiltrados.length === 0 ? 0 : (pagina - 1) * porPagina + 1} - {Math.min(pagina * porPagina, clientesFiltrados.length)} de <strong>{clientesFiltrados.length}</strong> registros
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Pág. {pagina} / {totalPaginas}</span>
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                ◀ Anterior
              </button>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
