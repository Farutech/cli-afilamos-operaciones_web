import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export interface RequestModalProps {
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function RequestModal({ onClose, onSubmitSuccess }: RequestModalProps) {
  const [clientName, setClientName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Solicitud creada exitosamente', {
        description: `Se registró la solicitud para ${clientName} (${serviceType || 'Servicio estándar'}).`,
      });
      onSubmitSuccess?.();
      onClose();
    }, 600);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <button className="close-modal" onClick={onClose} aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
        <p className="eyebrow">NUEVO REGISTRO</p>
        <h2 id="request-modal-title">Nueva solicitud</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            Nombre del cliente
            <input
              placeholder="Buscar o crear cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </label>

          <label>
            Tipo de servicio
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              required
            >
              <option value="" disabled>
                Seleccionar servicio
              </option>
              <option value="Afilado">Afilado</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Reparación Especializada">Reparación Especializada</option>
              <option value="Fabricación a Medida">Fabricación a Medida</option>
            </select>
          </label>

          <label>
            Descripción
            <textarea
              rows={3}
              placeholder="Agrega los detalles del servicio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Creando...' : 'Crear solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestModal;
