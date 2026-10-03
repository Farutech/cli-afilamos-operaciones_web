import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export interface ProfileModalProps {
  name: string;
  onClose: () => void;
  onLogout: () => void;
  onSave?: (updatedName: string, updatedEmail: string) => void;
}

export function ProfileModal({ name, onClose, onLogout, onSave }: ProfileModalProps) {
  const [fullName, setFullName] = useState(name);
  const [email, setEmail] = useState('javier@afilamoshermanos.com');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Datos actualizados', {
        description: 'Tus datos personales y PIN operativo se actualizaron correctamente.',
      });
      onSave?.(fullName, email);
      onClose();
    }, 500);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <button className="close-modal" onClick={onClose} aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
        <p className="eyebrow">CUENTA DE USUARIO</p>
        <h2 id="profile-modal-title">Datos personales</h2>
        <p className="heading-copy">Actualiza tu información y el PIN operativo de forma segura.</p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            Nombre completo
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              required
            />
          </label>

          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            PIN operativo
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nuevo PIN de 4 a 6 dígitos"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '12px' }}>
            <button type="button" className="secondary-button" onClick={onLogout}>
              Cerrar sesión
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
