import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Alert } from '@farutech/design-system';
import { solicitudesApi } from '../../services/solicitudesApi';
import { catalogosApi } from '../../services/catalogosApi';
import type { TipoDocumentoIdentidad, Cliente } from '../../types/catalogos';

export interface RegistroClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
  tiposDocumento?: TipoDocumentoIdentidad[];
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}

export const DEFAULT_TIPOS_DOCUMENTO: TipoDocumentoIdentidad[] = [
  { uuid: 'doc-cc', codigo: 'CC', nombre: 'Cédula de Ciudadanía', aplicaPersona: 'NATURAL', activo: true },
  { uuid: 'doc-nit', codigo: 'NIT', nombre: 'NIT / Empresa', aplicaPersona: 'JURIDICA', activo: true },
  { uuid: 'doc-ce', codigo: 'CE', nombre: 'Cédula de Extranjería', aplicaPersona: 'NATURAL', activo: true },
];

export const RegistroClienteModal: React.FC<RegistroClienteModalProps> = ({
  isOpen,
  onClose,
  onClienteCreado,
  tiposDocumento: tiposDocProp,
  title = 'Nuevo Registro de Cliente',
  subtitle = 'Completa el formulario para dar de alta un nuevo cliente en el sistema',
  submitLabel = 'Crear y Seleccionar Cliente',
}) => {
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoIdentidad[]>(
    tiposDocProp && tiposDocProp.length > 0 ? tiposDocProp : DEFAULT_TIPOS_DOCUMENTO
  );
  const [uuidTipoDoc, setUuidTipoDoc] = useState<string>(
    (tiposDocProp && tiposDocProp[0]?.uuid) || DEFAULT_TIPOS_DOCUMENTO[0].uuid
  );
  const [numeroDoc, setNumeroDoc] = useState('');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tiposDocProp && tiposDocProp.length > 0) {
      setTiposDoc(tiposDocProp);
      setUuidTipoDoc((curr) => curr || tiposDocProp[0].uuid);
    } else if (isOpen) {
      catalogosApi
        .getTiposDocumentoIdentidad()
        .then((data) => {
          const list = data?.tipos || [];
          setTiposDoc(list);
          if (list.length > 0) {
            setUuidTipoDoc((curr) => curr || list[0].uuid);
          }
        })
        .catch(() => {
          // Fallback silencioso
        });
    }
  }, [isOpen, tiposDocProp]);

  // Reset form al abrir
  useEffect(() => {
    if (isOpen) {
      setNumeroDoc('');
      setNombreRazonSocial('');
      setTelefono('');
      setEmail('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroDoc.trim() || !nombreRazonSocial.trim()) {
      setError('El número de documento y nombre / razón social son obligatorios.');
      return;
    }

    const selectedTipo = uuidTipoDoc || tiposDoc[0]?.uuid;
    if (!selectedTipo) {
      setError('Debe seleccionar un tipo de documento de identidad.');
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
        email: email.trim() || undefined,
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
      title={title}
      subtitle={subtitle}
      size="md"
      className="border-slate-800 shadow-2xl backdrop-blur-md"
      bodyClassName="p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de Documento *"
            value={uuidTipoDoc}
            onChange={(val: any) => setUuidTipoDoc(typeof val === 'string' ? val : val?.target?.value || '')}
            options={tiposDoc.map((td) => ({
              value: td.uuid,
              label: `${td.codigo} - ${td.nombre}`,
            }))}
            fullWidth
          />

          <Input
            label="Código o Documento (NIT / C.C.) *"
            required
            placeholder="Ej: 1020304050 ó 900123456"
            value={numeroDoc}
            onChange={(e) => setNumeroDoc(e.target.value)}
            fullWidth
          />
        </div>

        <Input
          label="Nombre Completo / Razón Social *"
          required
          placeholder="Ej: Juan Pérez / Distribuidora del Norte S.A.S."
          value={nombreRazonSocial}
          onChange={(e) => setNombreRazonSocial(e.target.value)}
          fullWidth
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Teléfono / WhatsApp de Contacto"
            placeholder="Ej: 3001234567"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            fullWidth
          />

          <Input
            label="Correo Electrónico (Opcional)"
            type="email"
            placeholder="cliente@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando Cliente...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
