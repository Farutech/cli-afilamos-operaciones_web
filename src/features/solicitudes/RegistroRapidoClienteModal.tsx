import React, { useState } from 'react';
import { Modal, Button, Input, Alert } from '@farutech/design-system';
import { solicitudesApi } from '../../services/solicitudesApi';
import type { TipoDocumentoIdentidad, Cliente } from '../../types/catalogos';

interface RegistroRapidoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
  tiposDocumento: TipoDocumentoIdentidad[];
}

export const RegistroRapidoClienteModal: React.FC<RegistroRapidoClienteModalProps> = ({
  isOpen,
  onClose,
  onClienteCreado,
  tiposDocumento,
}) => {
  const [uuidTipoDoc, setUuidTipoDoc] = useState<string>(tiposDocumento[0]?.uuid || '');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroDoc.trim() || !nombreRazonSocial.trim()) {
      setError('El número de documento y nombre son obligatorios.');
      return;
    }

    const selectedTipo = uuidTipoDoc || tiposDocumento[0]?.uuid;
    if (!selectedTipo) {
      setError('Seleccione un tipo de documento.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cliente = await solicitudesApi.registroRapidoCliente({
        uuidTipoDocumento: selectedTipo,
        numeroDocumento: numeroDoc.trim(),
        nombreRazonSocial: nombreRazonSocial.trim(),
        telefono: telefono.trim(),
      });

      onClienteCreado(cliente);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registro Rápido de Cliente"
      subtitle="Ingresa la información básica para continuar con la solicitud operativa"
      size="md"
      className="border-slate-800 shadow-2xl backdrop-blur-md"
      bodyClassName="p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        <div>
          <label htmlFor="select-tipo-doc" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Tipo de Documento *
          </label>
          <select
            id="select-tipo-doc"
            value={uuidTipoDoc || tiposDocumento[0]?.uuid || ''}
            onChange={(e) => setUuidTipoDoc(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
          >
            {tiposDocumento.map((td) => (
              <option key={td.uuid} value={td.uuid} className="bg-slate-900 text-slate-100">
                {td.codigo} - {td.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Input
            id="input-numero-doc"
            label="Número de Documento *"
            value={numeroDoc}
            onChange={(e) => setNumeroDoc(e.target.value)}
            placeholder="Ej. 1020304050"
            required
            fullWidth
          />
        </div>

        <div>
          <Input
            id="input-nombre-cliente"
            label="Nombre Completo / Razón Social *"
            value={nombreRazonSocial}
            onChange={(e) => setNombreRazonSocial(e.target.value)}
            placeholder="Ej. Taller Metalmecánica SAS"
            required
            fullWidth
          />
        </div>

        <div>
          <Input
            id="input-telefono-cliente"
            label="Teléfono / Celular (WhatsApp)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 3001234567"
            fullWidth
          />
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear y Seleccionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
