import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Sliders,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
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

  const columns: ColumnDef<ParametroSistema>[] = [
    {
      key: 'parametro',
      header: 'PARÁMETRO / DESCRIPCIÓN',
      render: (param) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <strong className="text-white font-medium block">
              {param.clave.replace(/_/g, ' ')}
            </strong>
            <span className="text-[11px] text-slate-400">{param.descripcion}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clave',
      header: 'CLAVE TÉCNICA',
      render: (param) => <span className="font-mono text-xs text-amber-300">{param.clave}</span>,
    },
    {
      key: 'valorJson',
      header: 'VALOR CONFIGURADO',
      align: 'right',
      render: (param) => (
        <span className="font-mono font-bold text-xs text-violet-300">
          {param.valorJson} {param.clave.includes('PORCENTAJE') ? '%' : ''}
        </span>
      ),
    },
    {
      key: 'categoria',
      header: 'CATEGORÍA',
      align: 'center',
      render: (param) => (
        <Badge variant={param.categoria === 'FISCAL' ? 'info' : 'neutral'}>
          {param.categoria || 'SISTEMA'}
        </Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<ParametroSistema>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (param) => setViewParam(param),
    },
    {
      label: 'Editar valor',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (param) => setModal(param),
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Impuestos y parámetros"
        eyebrow="ADMINISTRACIÓN · CATÁLOGOS"
        description="Reglas de liquidación fiscal, límites de descuento y parámetros maestros de operación."
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar parámetro o clave...',
          isSearching: loading,
        }}
      >
        <StandardDataTable<ParametroSistema>
          columns={columns}
          data={filtered.slice((page - 1) * pageSize, page * pageSize)}
          keyExtractor={(param) => param.clave}
          rowActions={rowActions}
          loading={loading && params.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems: filtered.length,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No hay parámetros coincidentes."
        />
      </ListPageLayout>

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
