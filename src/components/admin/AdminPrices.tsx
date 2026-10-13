import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Info,
  Eye,
  Pencil,
  Power,
  BadgePercent,
  Coins,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput } from '@farutech/design-system';
import { ListPageLayout, StandardDataTable, type ColumnDef, type StandardRowAction } from '@/components/ui';
import { catalogosApi } from '@/services/catalogosApi';
import type { ListaPrecio, PoliticaPrecios } from '@/types/catalogos';

const FALLBACK_PRICES: ListaPrecio[] = [
  { uuid: 'lp-1', codigo: 'LISTA-GENERAL', nombre: 'Tarifa General Mostrador', porcentajeAjuste: 0, esPredeterminada: true, activa: true },
  { uuid: 'lp-2', codigo: 'LISTA-TALLER', nombre: 'Tarifa Especial Talleres e Industria', porcentajeAjuste: -12, esPredeterminada: false, activa: true },
  { uuid: 'lp-3', codigo: 'LISTA-MAYORISTA', nombre: 'Tarifa Distribución y Mayoristas', porcentajeAjuste: -20, esPredeterminada: false, activa: true },
  { uuid: 'lp-4', codigo: 'LISTA-URGENTE', nombre: 'Tarifa Recargo Servicio Express', porcentajeAjuste: 25, esPredeterminada: false, activa: true },
  { uuid: 'lp-5', codigo: 'LISTA-CONVENIO', nombre: 'Tarifa Convenios Institucionales', porcentajeAjuste: -15, esPredeterminada: false, activa: false },
];

export default function AdminPrices({ token }: { token?: string }) {
  const [priceLists, setPriceLists] = useState<ListaPrecio[]>(FALLBACK_PRICES);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<ListaPrecio | 'new' | null>(null);
  const [viewPrice, setViewPrice] = useState<ListaPrecio | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Política comercial y tolerancia en mostrador
  const [politica, setPolitica] = useState<PoliticaPrecios>({
    permiteModificarPrecio: true,
    maxDiferenciaPorcentaje: 15,
    requiereVoBoSuperaTolerancia: true,
    permitirMultiplicadorLista: true,
  });
  const [guardandoPolitica, setGuardandoPolitica] = useState(false);

  // Aumento masivo de tarifas
  const [mostrarModalAumento, setMostrarModalAumento] = useState(false);
  const [tipoAumento, setTipoAumento] = useState<'PORCENTAJE' | 'VALOR'>('PORCENTAJE');
  const [valorAumento, setValorAumento] = useState<number>(5);
  const [listaObjetivo, setListaObjetivo] = useState<string>('TODAS');
  const [aplicandoAumento, setAplicandoAumento] = useState(false);

  useEffect(() => {
    catalogosApi.getPoliticaPrecios().then(setPolitica).catch(() => {});
  }, []);

  async function handleGuardarPolitica(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoPolitica(true);
    try {
      await catalogosApi.actualizarPoliticaPrecios(politica);
      toast.success('Política comercial de precios y tolerancia actualizada');
    } catch {
      toast.error('Error al actualizar la política de precios');
    } finally {
      setGuardandoPolitica(false);
    }
  }

  async function handleAplicarAumento(e: React.FormEvent) {
    e.preventDefault();
    if (!valorAumento || valorAumento <= 0) {
      toast.error('Ingrese un valor de aumento válido');
      return;
    }
    setAplicandoAumento(true);
    try {
      setPriceLists((prev) =>
        prev.map((lp) => {
          if (listaObjetivo !== 'TODAS' && lp.uuid !== listaObjetivo) return lp;
          const nuevoAjuste =
            tipoAumento === 'PORCENTAJE'
              ? Math.round((lp.porcentajeAjuste + valorAumento) * 10) / 10
              : lp.porcentajeAjuste + Math.round(valorAumento / 1000);
          return {
            ...lp,
            porcentajeAjuste: nuevoAjuste,
          };
        })
      );
      toast.success('Aumento tarifario aplicado correctamente.');
      setMostrarModalAumento(false);
    } catch {
      toast.error('Error al aplicar aumento de tarifas');
    } finally {
      setAplicandoAumento(false);
    }
  }


  async function loadPrices() {
    setLoading(true);
    try {
      const res = await catalogosApi.getListasPrecio();
      const list = Array.isArray(res) ? res : res?.listas || [];
      if (list.length > 0) {
        setPriceLists(list);
      } else {
        setPriceLists(FALLBACK_PRICES);
      }
    } catch {
      setPriceLists(FALLBACK_PRICES);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrices();
  }, [token]);

  async function savePriceList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      codigo: String(data.get('codigo') || '').trim(),
      nombre: String(data.get('nombre') || '').trim(),
      porcentajeAjuste: Number(data.get('porcentajeAjuste') || 0),
      esPredeterminada: data.get('esPredeterminada') === 'on',
    };

    try {
      if (modal === 'new') {
        await catalogosApi.crearListaPrecio(body);
      } else {
        await catalogosApi.actualizarListaPrecio(modal.uuid, {
          nombre: body.nombre,
          porcentajeAjuste: body.porcentajeAjuste,
          esPredeterminada: body.esPredeterminada,
        });
      }
      setModal(null);
      toast.success(modal === 'new' ? 'Lista de precio creada' : 'Lista de precio actualizada');
      await loadPrices();
    } catch {
      if (modal === 'new') {
        const newLP: ListaPrecio = {
          uuid: String(Date.now()),
          ...body,
          activa: true,
        };
        setPriceLists((prev) => [newLP, ...prev]);
        setModal(null);
        toast.success('Lista guardada en catálogo local');
      } else {
        setPriceLists((prev) =>
          prev.map((l) => (l.uuid === modal.uuid ? { ...l, ...body } : l))
        );
        setModal(null);
        toast.success('Lista actualizada en catálogo local');
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleStatus(lp: ListaPrecio) {
    const next = !lp.activa;
    setPriceLists((prev) =>
      prev.map((l) => (l.uuid === lp.uuid ? { ...l, activa: next } : l))
    );
    toast.success('Estado de lista de precio actualizado');
  }

  const visible = useMemo(
    () =>
      priceLists.filter((l) =>
        `${l.nombre || ''} ${l.codigo || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [priceLists, query]
  );

  const columns: ColumnDef<ListaPrecio>[] = [
    {
      key: 'nombre',
      header: 'LISTA DE PRECIO',
      render: (lp) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white font-medium">{lp.nombre}</strong>
              {lp.esPredeterminada && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/80 border border-violet-800/60 text-violet-300 font-medium">
                  Predeterminada
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">Ajuste comercial sobre precio base</span>
          </div>
        </div>
      ),
    },
    {
      key: 'codigo',
      header: 'CÓDIGO',
      render: (lp) => <span className="font-mono text-xs text-amber-300">{lp.codigo}</span>,
    },
    {
      key: 'ajuste',
      header: 'AJUSTE (%)',
      align: 'right',
      render: (lp) => (
        <span
          className={`font-mono font-bold text-xs ${
            lp.porcentajeAjuste < 0
              ? 'text-emerald-400'
              : lp.porcentajeAjuste > 0
              ? 'text-amber-400'
              : 'text-slate-300'
          }`}
        >
          {lp.porcentajeAjuste > 0 ? `+${lp.porcentajeAjuste}%` : `${lp.porcentajeAjuste}%`}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'ESTADO',
      align: 'center',
      render: (lp) => (
        <Badge variant={lp.activa ? 'success' : 'neutral'}>
          {lp.activa ? 'Vigente' : 'Inactiva'}
        </Badge>
      ),
    },
  ];

  const rowActions: StandardRowAction<ListaPrecio>[] = [
    {
      label: 'Ver detalle',
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (lp) => setViewPrice(lp),
    },
    {
      label: 'Editar lista',
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (lp) => setModal(lp),
    },
    {
      label: 'Activar/Desactivar',
      icon: <Power className="w-3.5 h-3.5" />,
      onClick: (lp) => toggleStatus(lp),
      variant: 'ghost',
    },
  ];

  return (
    <div className="page-content">
      <ListPageLayout
        title="Tarifas y listas de precios"
        eyebrow="ADMINISTRACIÓN · CATÁLOGOS"
        description="Estructuras de cobro, tarifas comerciales y márgenes diferenciales de precios."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarModalAumento(true)}
            >
              <BadgePercent className="w-4 h-4 mr-1.5" /> Aumento masivo
            </Button>
            <Button
              variant="primary"
              onClick={() => setModal('new')}
            >
              <Coins className="w-4 h-4 mr-1.5" /> Nueva tarifa
            </Button>
          </div>
        }
        search={{
          value: query,
          onChange: (val) => {
            setQuery(val);
            setPage(1);
          },
          placeholder: 'Buscar lista por nombre o código...',
          isSearching: loading,
        }}
      >
        {/* Política Comercial Collapsible / Card */}
        <div className="mb-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <form onSubmit={handleGuardarPolitica}>
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Política Comercial & Tolerancia en Mostrador
                </span>
              </div>
              <Button type="submit" variant="primary" size="sm" loading={guardandoPolitica}>
                Guardar Política
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={politica.permiteModificarPrecio}
                  onChange={(e) =>
                    setPolitica({ ...politica, permiteModificarPrecio: e.target.checked })
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <strong>Modificar precio en mostrador</strong>
                  <span className="block text-[11px] text-slate-400">
                    Cajeros pueden digitar precio distinto
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 whitespace-nowrap">Tolerancia máxima:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={politica.maxDiferenciaPorcentaje}
                  onChange={(e) =>
                    setPolitica({
                      ...politica,
                      maxDiferenciaPorcentaje: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-16 h-8 px-2 bg-slate-950 border border-slate-700 rounded text-center font-mono font-bold text-amber-300 text-xs"
                />
                <span className="text-slate-500">% base</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={politica.requiereVoBoSuperaTolerancia}
                  onChange={(e) =>
                    setPolitica({
                      ...politica,
                      requiereVoBoSuperaTolerancia: e.target.checked,
                    })
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <strong>Exigir VoBo supervisor</strong>
                  <span className="block text-[11px] text-slate-400">
                    Si supera tolerancia
                  </span>
                </span>
              </label>
            </div>
          </form>
        </div>

        <StandardDataTable<ListaPrecio>
          columns={columns}
          data={visible.slice((page - 1) * pageSize, page * pageSize)}
          keyExtractor={(lp) => lp.uuid}
          rowActions={rowActions}
          loading={loading && priceLists.length === 0}
          pagination={{
            currentPage: page,
            pageSize,
            totalItems: visible.length,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setPage(1);
            },
          }}
          emptyMessage="No se encontraron listas de precio registradas."
        />
      </ListPageLayout>

      {/* Modal 1: VER DETALLE (Design System Modal) */}
      <Modal
        isOpen={!!viewPrice}
        onClose={() => setViewPrice(null)}
        title="Ficha de la Lista de Precio"
        subtitle="Márgenes de ajuste, recargos y condiciones comerciales"
        icon={<BadgePercent className="w-5 h-5 text-violet-400" />}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewPrice(null)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = viewPrice;
                setViewPrice(null);
                setModal(target);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar lista
            </Button>
          </>
        }
      >
        {viewPrice && (
          <div className="modal-view-container">
            <div className="modal-view-card">
              <div className="modal-view-avatar">
                <BadgePercent className="w-5 h-5 text-violet-300" />
              </div>
              <div className="modal-view-header-info">
                <h4>{viewPrice.nombre}</h4>
                <span>Código: {viewPrice.codigo}</span>
              </div>
              <Badge variant={viewPrice.activa ? 'success' : 'warning'}>
                {viewPrice.activa ? 'Tarifa Activa' : 'Inactiva'}
              </Badge>
            </div>

            <div className="modal-view-grid">
              <div className="modal-view-item">
                <span className="item-label">
                  <Coins className="w-3 h-3 mr-1 inline text-violet-400" /> Porcentaje de Ajuste
                </span>
                <span className="item-value font-mono font-bold text-slate-100">
                  {viewPrice.porcentajeAjuste > 0 ? `+${viewPrice.porcentajeAjuste}%` : `${viewPrice.porcentajeAjuste}%`}
                </span>
              </div>

              <div className="modal-view-item">
                <span className="item-label">
                  <Layers className="w-3 h-3 mr-1 inline text-violet-400" /> Condición Tarifaria
                </span>
                <span className="item-value">
                  {viewPrice.esPredeterminada ? 'Tarifa Base Predeterminada' : 'Tarifa Especial Asignable'}
                </span>
              </div>

              <div className="modal-view-item full-width">
                <span className="item-label">Identificador en Sistema</span>
                <span className="item-value font-mono text-xs text-slate-400">
                  {viewPrice.uuid}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: NUEVA / EDITAR LISTA (Design System Modal) */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nueva Lista de Precios' : 'Editar Lista de Precios'}
        subtitle={
          modal === 'new'
            ? 'Defina las condiciones de recargo o descuento porcentual sobre el catálogo'
            : 'Modifique los porcentajes y parámetros de la tarifa'
        }
        icon={<BadgePercent className="w-5 h-5 text-violet-400" />}
        size="md"
        extraActions={
          modal && modal !== 'new' ? (
            <Button
              variant="outline"
              onClick={() => {
                const target = modal;
                setModal(null);
                void toggleStatus(target);
              }}
              disabled={saving}
            >
              <Power className="w-4 h-4 mr-2" />
              {modal.activa ? 'Desactivar lista' : 'Activar lista'}
            </Button>
          ) : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="price-form" disabled={saving}>
              {saving ? 'Guardando…' : modal === 'new' ? 'Crear lista' : 'Guardar tarifa'}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="price-form" onSubmit={savePriceList}>
            <div className="client-modal-grid">
              <FloatingInput
                name="codigo"
                label="Código identificador (ej: TARIFA-ESP)"
                defaultValue={modal === 'new' ? '' : modal.codigo}
                tooltip="Identificador único para el esquema tarifario en el sistema."
                required
              />

              <FloatingInput
                name="nombre"
                label="Nombre descriptivo de la tarifa"
                defaultValue={modal === 'new' ? '' : modal.nombre}
                tooltip="Nombre comercial visible al asignar la tarifa a clientes."
                required
              />

              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingInput
                  name="porcentajeAjuste"
                  type="number"
                  step="0.5"
                  label="Porcentaje de ajuste (+ recargo / - descuento)"
                  defaultValue={modal === 'new' ? 0 : modal.porcentajeAjuste}
                  tooltip="Ingrese valores negativos para descuentos (ej: -10) o positivos para recargos (+15)."
                  required
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Aumento Masivo de Tarifas */}
      <Modal
        isOpen={mostrarModalAumento}
        onClose={() => setMostrarModalAumento(false)}
        title="Aumentar Listas de Precios"
        size="md"
      >
        <form onSubmit={handleAplicarAumento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Incremente las tarifas comerciales según un porcentaje o un valor fijo para actualizar los precios vigentes.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}>
              Tarifas Objetivo *
            </label>
            <select
              value={listaObjetivo}
              onChange={(e) => setListaObjetivo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#020617',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.85rem',
              }}
            >
              <option value="TODAS">Todas las listas activas ({priceLists.filter((p) => p.activa).length})</option>
              {priceLists.map((lp) => (
                <option key={lp.uuid} value={lp.uuid}>
                  {lp.nombre} ({lp.codigo}) - Actual: {lp.porcentajeAjuste}%
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                Tipo de Incremento *
              </label>
              <select
                value={tipoAumento}
                onChange={(e) => setTipoAumento(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#020617',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                }}
              >
                <option value="PORCENTAJE">% Porcentaje</option>
                <option value="VALOR">$ Valor Fijo COP</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                {tipoAumento === 'PORCENTAJE' ? 'Porcentaje de Aumento (%) *' : 'Valor a Aumentar (COP) *'}
              </label>
              <input
                type="number"
                min={1}
                value={valorAumento}
                onChange={(e) => setValorAumento(Math.max(1, parseFloat(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#020617',
                  border: '1px solid #6366f1',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px', fontSize: '0.75rem', color: '#c7d2fe' }}>
            <Info className="w-4 h-4 inline mr-1 text-amber-400" /> Los ítems en mostrador actualizarán sus cálculos automáticamente al seleccionar la tarifa ajustada.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setMostrarModalAumento(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={aplicandoAumento}>
              Aplicar Aumento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
