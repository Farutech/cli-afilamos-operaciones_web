import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal, Button, FloatingInput, Select } from '@farutech/design-system';
import { FilePlus } from 'lucide-react';
import { toast } from 'sonner';

export interface RequestModalProps {
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function RequestModal({ onClose, onSubmitSuccess }: RequestModalProps) {
  const [clientName, setClientName] = useState('');
  const [serviceType, setServiceType] = useState('Afilado');
  const [priority, setPriority] = useState('NORMAL');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Nombre de cliente requerido', {
        description: 'Por favor ingresa el nombre o razón social del cliente.',
      });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Solicitud creada exitosamente', {
        description: `Se registró la solicitud para ${clientName} (${serviceType}).`,
      });
      onSubmitSuccess?.();
      onClose();
    }, 500);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nueva Solicitud Rápida"
      subtitle="Registro preliminar de servicio para iniciar el flujo de taller o mostrador"
      icon={<FilePlus className="w-5 h-5 text-violet-400" />}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="request-quick-form"
            disabled={loading}
          >
            {loading ? 'Creando solicitud…' : 'Crear solicitud'}
          </Button>
        </>
      }
    >
      <form id="request-quick-form" onSubmit={handleSubmit}>
        <div className="client-modal-grid">
          <div className="modal-form-full">
            <FloatingInput
              name="clientName"
              label="Nombre del cliente o razón social *"
              placeholder="Ej: Muebles y Diseños S.A.S."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              tooltip="Nombre comercial o persona natural solicitante del servicio"
            />
          </div>

          <div>
            <Select
              label="Tipo de servicio *"
              value={serviceType}
              onChange={(val: any) => setServiceType(typeof val === 'string' ? val : val?.target?.value || 'Afilado')}
              options={[
                { value: 'Afilado', label: '🔪 Afilado de Precisión' },
                { value: 'Mantenimiento', label: '⚙️ Mantenimiento Preventivo' },
                { value: 'Reparación Especializada', label: '🔧 Reparación Especializada' },
                { value: 'Fabricación a Medida', label: '📐 Fabricación a Medida' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <Select
              label="Franja de entrega *"
              value={priority}
              onChange={(val: any) => setPriority(typeof val === 'string' ? val : val?.target?.value || 'NORMAL')}
              options={[
                { value: 'NORMAL', label: '🕒 Estándar (24 - 48h)' },
                { value: 'URGENTE', label: '⚡ Prioritario / Urgente (< 12h)' },
                { value: 'INMEDIATO', label: '🔥 En Espera en Mostrador' },
              ]}
              fullWidth
            />
          </div>

          <div className="modal-form-full">
            <div className="modal-form-field">
              <label htmlFor="request-description">
                Detalle técnico o alcance del trabajo
              </label>
              <textarea
                id="request-description"
                rows={3}
                placeholder="Especifica el tipo de herramienta (disco, cuchilla, fresa), medidas, dientes o anomalías detectadas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default RequestModal;
