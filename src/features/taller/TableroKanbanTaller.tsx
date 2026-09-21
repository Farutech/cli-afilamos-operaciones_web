import { useState } from 'react';

interface KanbanCard {
  id: string;
  otNumero: string;
  solicitudNumero: string;
  descripcion: string;
  cliente: string;
  etapa: 'RECEPCION_TECNICA' | 'EN_PROCESO' | 'FINALIZADO_TALLER' | 'LISTO_ENTREGA';
  franjaCompromiso: string;
}

const CARDS_INICIALES: KanbanCard[] = [
  {
    id: '1',
    otNumero: 'OT-0001',
    solicitudNumero: 'SG-0001',
    descripcion: 'Afilado Cuchillo Chef 25cm (Desbaste)',
    cliente: 'Afilados del Valle S.A.S.',
    etapa: 'RECEPCION_TECNICA',
    franjaCompromiso: 'Hoy 15:00',
  },
  {
    id: '2',
    otNumero: 'OT-0002',
    solicitudNumero: 'SG-0001',
    descripcion: 'Tijera de Peluquería Microdentada',
    cliente: 'Afilados del Valle S.A.S.',
    etapa: 'EN_PROCESO',
    franjaCompromiso: 'Hoy 16:30',
  },
  {
    id: '3',
    otNumero: 'OT-0003',
    solicitudNumero: 'SP-0001',
    descripcion: 'Disco de Sierra Widia 10" 60D',
    cliente: 'Restaurante Gourmet & Mar',
    etapa: 'EN_PROCESO',
    franjaCompromiso: 'Mañana 10:00',
  },
  {
    id: '4',
    otNumero: 'OT-0004',
    solicitudNumero: 'SG-0002',
    descripcion: 'Cuchilla Moledora #32 Inox',
    cliente: 'Carnicería La Esmeralda',
    etapa: 'FINALIZADO_TALLER',
    franjaCompromiso: 'Hoy 14:00',
  },
  {
    id: '5',
    otNumero: 'OT-0000',
    solicitudNumero: 'SG-0000',
    descripcion: 'Broca HSS Cobalto 12mm',
    cliente: 'Taller Metalmecánico Hnos.',
    etapa: 'LISTO_ENTREGA',
    franjaCompromiso: 'Listo',
  },
];

const COLUMNAS = [
  { id: 'RECEPCION_TECNICA', titulo: '📥 Recepción Técnica', color: 'border-blue-500/40 bg-blue-950/10' },
  { id: 'EN_PROCESO', titulo: '⚙️ En Proceso de Afilado', color: 'border-amber-500/40 bg-amber-950/10' },
  { id: 'FINALIZADO_TALLER', titulo: '✅ Finalizado Taller', color: 'border-emerald-500/40 bg-emerald-950/10' },
  { id: 'LISTO_ENTREGA', titulo: '📫 Listo en Mostrador', color: 'border-indigo-500/40 bg-indigo-950/10' },
];

export function TableroKanbanTaller() {
  const [cards, setCards] = useState<KanbanCard[]>(CARDS_INICIALES);

  const avanzarEtapa = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        if (c.etapa === 'RECEPCION_TECNICA') return { ...c, etapa: 'EN_PROCESO' };
        if (c.etapa === 'EN_PROCESO') return { ...c, etapa: 'FINALIZADO_TALLER' };
        if (c.etapa === 'FINALIZADO_TALLER') return { ...c, etapa: 'LISTO_ENTREGA' };
        return c;
      })
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Tablero de Etapas (Kanban de Taller)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Flujo de trabajo visual para monitoreo del avance técnico y paso entre estaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNAS.map((col) => {
          const colCards = cards.filter((c) => c.etapa === col.id);
          return (
            <div
              key={col.id}
              className={`p-3.5 rounded-2xl border ${col.color} bg-slate-900/60 backdrop-blur-md flex flex-col gap-3 min-h-[500px]`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-sm text-white">{col.titulo}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
                  {colCards.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {colCards.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-xs italic">
                    Sin órdenes en esta etapa
                  </div>
                ) : (
                  colCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 shadow-md space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-400 text-xs">{card.otNumero}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Sol: {card.solicitudNumero}</span>
                      </div>

                      <div className="font-semibold text-white text-xs leading-snug">
                        {card.descripcion}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{card.cliente}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {card.franjaCompromiso}
                        </span>

                        {col.id !== 'LISTO_ENTREGA' && (
                          <button
                            type="button"
                            onClick={() => avanzarEtapa(card.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Avanzar ➔
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
