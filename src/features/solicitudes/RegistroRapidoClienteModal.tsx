import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '480px',
          padding: '1.5rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 id="modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            Registro Rápido de Cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="select-tipo-doc" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Tipo de Documento
            </label>
            <select
              id="select-tipo-doc"
              value={uuidTipoDoc || tiposDocumento[0]?.uuid || ''}
              onChange={(e) => setUuidTipoDoc(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              {tiposDocumento.map((td) => (
                <option key={td.uuid} value={td.uuid}>
                  {td.codigo} - {td.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Input
              id="input-numero-doc"
              label="Número de Documento"
              value={numeroDoc}
              onChange={(e) => setNumeroDoc(e.target.value)}
              placeholder="Ej. 1020304050"
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Input
              id="input-nombre-cliente"
              label="Nombre Completo / Razón Social"
              value={nombreRazonSocial}
              onChange={(e) => setNombreRazonSocial(e.target.value)}
              placeholder="Ej. Taller Metalmecánica SAS"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <Input
              id="input-telefono-cliente"
              label="Teléfono / Celular (WhatsApp)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 3001234567"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear y Seleccionar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
