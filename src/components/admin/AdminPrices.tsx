import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  Search,
  BadgePercent,
  Coins,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge, FloatingInput, CrudPagination } from '@farutech/design-system';
import { catalogosApi } from '@/services/catalogosApi';
import type { ListaPrecio } from '@/types/catalogos';

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

  const totalPages = Math.max(1, Math.ceil(priceLists.length / pageSize));

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

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN · CATÁLOGOS</p>
          <h1>Tarifas y listas de precios</h1>
          <p className="heading-copy">
            Estructuras de cobro, tarifas comerciales y márgenes diferenciales de precios.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModal('new')}>
          <BadgePercent className="w-4 h-4 mr-2 inline" /> Nueva tarifa
        </button>
      </div>

      <section className="panel clients-panel">
        <div className="panel-heading">
          <div className="panel-title-row">
            <h2>Listas Tarifarias</h2>
          </div>
          <div className="client-search">
            <Search className="w-4 h-4" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar lista por nombre o código"
              aria-label="Buscar tarifas"
            />
          </div>
        </div>

        <div className="client-table-head">
          <span>LISTA DE PRECIO</span>
          <span>CÓDIGO</span>
          <span>AJUSTE (%)</span>
          <span>ESTADO</span>
          <span>ACCIONES</span>
        </div>

        {loading && priceLists.length === 0 ? (
          <div className="empty-state">Cargando listas de precio…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">No hay listas de precio registradas.</div>
        ) : (
          <div className="client-list">
            {visible.map((lp) => (
              <div className="client-row" key={lp.uuid}>
                <div className="client-avatar">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="client-main">
                  <strong>
                    {lp.nombre} {lp.esPredeterminada && <span className="text-violet-400 text-xs font-normal">(Predeterminada)</span>}
                  </strong>
                  <span>Ajuste comercial sobre precio base</span>
                </div>
                <span className="client-contact font-mono text-xs">{lp.codigo}</span>
                <span className={`client-orders font-bold ${lp.porcentajeAjuste < 0 ? 'text-emerald-400' : lp.porcentajeAjuste > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {lp.porcentajeAjuste > 0 ? `+${lp.porcentajeAjuste}%` : `${lp.porcentajeAjuste}%`}
                </span>
                <span className={`client-status ${!lp.activa ? 'is-pending' : ''}`}>
                  {lp.activa ? 'Vigente' : 'Inactiva'}
                </span>
                <div className="client-actions">
                  <button
                    className="icon-action"
                    onClick={() => setViewPrice(lp)}
                    aria-label={`Ver detalle de ${lp.nombre}`}
                    title="Ver detalle completo"
                  >
                    <Eye className="w-4 h-4 text-violet-400" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => setModal(lp)}
                    aria-label={`Editar ${lp.nombre}`}
                    title="Editar lista"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="icon-action"
                    onClick={() => toggleStatus(lp)}
                    aria-label={`Cambiar estado de ${lp.nombre}`}
                    title="Activar o desactivar"
                  >
                    <Power className="w-4 h-4" />
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
          total={priceLists.length}
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
    </div>
  );
}
