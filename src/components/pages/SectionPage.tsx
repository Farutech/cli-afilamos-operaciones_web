import { Settings2 } from 'lucide-react';

export interface SectionPageProps {
  title: string;
  description?: string;
  onRefresh?: () => void;
}

export function SectionPage({
  title,
  description = 'Este módulo está conectado y listo para consultar y actualizar datos mediante los contratos de la API de Ordeon.',
  onRefresh,
}: SectionPageProps) {
  return (
    <div className="page-content">
      <p className="eyebrow">MÓDULO ORDEON</p>
      <h1>{title}</h1>
      <section className="panel empty-section">
        <div className="metric-icon" style={{ margin: '0 auto 16px' }}>
          <Settings2 className="w-5 h-5" />
        </div>
        <h2>{title} conectado a Ordeon API</h2>
        <p style={{ maxWidth: '480px', margin: '8px auto 20px' }}>
          {description}
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            onRefresh?.();
            alert(`Sincronizando datos de ${title}...`);
          }}
        >
          Actualizar datos
        </button>
      </section>
    </div>
  );
}

export default SectionPage;
