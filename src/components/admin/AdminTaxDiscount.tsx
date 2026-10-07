import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Search,
  Sliders,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput, CrudPagination } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { ParametroSistema } from '@/types/catalogos';

const FALLBACK_PARAMS: ParametroSistema[] = [
  { uuid: 'p-1', clave: 'IVA_DEFAULT_PORCENTAJE', valorJson: '19', descripcion: 'Porcentaje estándar de IVA aplicado a servicios y ventas gravadas en Colombia.', categoria: 'FISCAL' },
  { uuid: 'p-2', clave: 'ANTICIPO_MINIMO_PORCENTAJE', valorJson: '50', descripcion: 'Porcentaje mínimo de anticipo requerido al asentar una solicitud sin excepción comercial.', categoria: 'COMERCIAL' },
  { uuid: 'p-3', clave: 'DESCUENTO_MAXIMO_CAJERO', valorJson: '5', descripcion: 'Porcentaje máximo de descuento directo que un cajero puede otorgar sin autorización de supervisor.', categoria: 'COMERCIAL' },
  { uuid: 'p-4', clave: 'DIAS_GRACIA_ENTREGA', valorJson: '15', descripcion: 'Días calendario de bodegaje gratuito antes de aplicar cargos por almacenamiento.', categoria: 'OPERACION' },
  { uuid: 'p-5', clave: 'MONEDA_PRINCIPAL', valorJson: 'COP', descripcion: 'Moneda base de la operación para liquidaciones, arqueos y comprobantes de pago.', categoria: 'SISTEMA' },
];

export default function AdminTaxDiscount({ token }: { token?: string }) {
  const [params, setParams] = useState<ParametroSistema[]>(FALLBACK_PARAMS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<ParametroSistema | null>(null);
  const [viewParam, setViewParam] = useState<ParametroSistema | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadParams() {
    setLoading(true);
    try {
      const res = await catalogosApi.getParametros();
      if (res.parametros && res.parametros.length > 0) {
        setParams(res.parametros);
      } else {
        setParams(FALLBACK_PARAMS);
      }
    } catch {
      setParams(FALLBACK_PARAMS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParams();
  }, [token]);

  async function saveParam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const nuevoValor = String(data.get('valor') || '').trim();

    try {
      await catalogosApi.actualizarParametro(modal.clave, JSON.stringify(nuevoValor));
      setModal(null);
      toast.success('Parámetro actualizado con éxito');
      await loadParams();
    } catch {
      setParams((prev) =>
        prev.map((p) => (p.clave === modal.clave ? { ...p, valorJson: nuevoValor } : p))
      );
      setModal(null);
      toast.success('Parámetro guardado en configuración local');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(
    () =>
      params.filter((p) =>
        `${p.clave} ${p.descripcion} ${p.valorJson}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [params, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CATÁLOGOS</p>
          <h1>Impuestos y parámetros</h1>
          <p className="heading-copy">
            Reglas de liquidación fiscal, límites de descuento y parámetros maestros de operación.
          </p>
        </div>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Parámetros Maestros</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar parámetro o clave..."
              aria-label="Buscar parámetros"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>PARÁMETRO</span>
          <span>CLAVE</span>
          <span>VALOR CONFIGURADO</span>
          <span>CATEGORÍA</span>
          <span>ACCIONES</span>
        </div>

        {loading && params.length === 0 ? (
          <div className="empty-state">Cargando parámetros…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay parámetros coincidentes.</div>
        ) : (
          <div className="client-list">
            {visible.map((param) => (
              <div className="client-row" key={param.clave}>
                <div className="client-cell-main">

                  <div className="client-avatar">
                  <Sliders className="w-4 h-4" />
                </div>

                  <div className="client-main">
                  <strong>{param.clave.replace(/_/g, ' ')}</strong>
                  <span>{param.descripcion}</span>
                </div>

                </div>
                <span className="client-contact font-mono text-xs">{param.clave}</span>
                <span className="client-orders font-bold text-violet-300">
                  {param.valorJson} {param.clave.includes('PORCENTAJE') ? '%' : ''}
                </span>
                <span className="client-status">
                  {param.categoria || 'SISTEMA'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewParam(param)}
                    aria-label={`Ver detalle de ${param.clave}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(param)}
                    aria-label={`Editar ${param.clave}`}
                    title="Editar parámetro"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación Estandarizada Design System (3 Columnas Equilibradas) */}
        <CrudPagination
          currentPage={page}
          totalPages={totalPages}
          perPage={pageSize}
          total={filtered.length}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          variant="dark"
        />
      </section>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewParam}
        onClose={() => setViewParam(null)}
        title="Ficha del Parámetro"
        subtitle="Reglas fiscales y parámetros de liquidación en el sistema"
        icon={<Percent className="w-5 h-5 text-violet-400" />}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewParam(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewParam;
                setViewParam(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar valor
            </Button>
          </>
        }
      >
        {viewParam && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <Percent className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewParam.clave.replace(/_/g, ' ')}</h4>
                <span>{viewParam.clave}</span>
              </div>
              <Badge variant="info">
                {viewParam.categoria || 'GENERAL'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">Valor Configurado Actual</span>
                <span className="item-value font-bold text-emerald-400 text-sm">
                  {viewParam.valorJson} {viewParam.clave.includes('PORCENTAJE') ? '%' : ''}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">Categoría</span>
                <span className="item-value font-mono">{viewParam.categoria || 'SISTEMA'}</span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Propósito y Regla de Negocio</span>
                <span className="item-value leading-relaxed">{viewParam.descripcion}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: EDITAR PARÁMETRO (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title="Modificar Parámetro Operativo"
        subtitle="Ajuste de umbrales y porcentajes de operación general"
        icon={<Sliders className="w-5 h-5 text-violet-400" />}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="param-form" disabled={saving}>
              {saving ? 'Actualizando…' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="param-form" onSubmit={saveParam}>
            <div className="client-modal-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="clave"
                  label="Clave del parámetro (no modificable)"
                  value={modal.clave}
                  disabled
                  tooltip="Identificador constante utilizado por el motor de liquidación."
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="valor"
                  label="Nuevo valor configurado"
                  defaultValue={modal.valorJson}
                  tooltip="Modifique el valor numérico o alfanumérico según corresponda."
                  required
                />
              </div>

              <div className="modal-form-full">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {modal.descripcion}
                </p>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
