import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatearHora } from '@/lib/utils';
import { ordenarHorarios } from './cartelera';
import type { Catalogo, Participante } from './cartelera';

// '2026-10-02' → '02 / 10 / 2026' como en la referencia
const fechaCartelera = (fecha: string) => fecha.split('-').reverse().join(' / ');

interface Props {
  participante: Participante;
  tipo?: Catalogo;
  seleccionado: boolean;
  onSeleccionar: () => void;
}

export function TarjetaParticipante({ participante, tipo, seleccionado, onSeleccionar }: Props) {
  const horarios = ordenarHorarios(participante.cartelera_horarios);
  const [pagina, setPagina] = useState(0);
  const horario = horarios[pagina];

  return (
    <article
      className={`border-b border-white/10 py-5 pl-4 transition-colors ${seleccionado ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
      style={{ borderLeft: `3px solid ${seleccionado ? tipo?.color ?? '#fff' : 'transparent'}` }}
    >
      <button onClick={onSeleccionar} className="flex w-full items-center gap-4 pr-4 text-left" aria-pressed={seleccionado}>
        {participante.imagenes[0] && (
          <img src={participante.imagenes[0]} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        )}
        <span className="min-w-0 flex-1">
          <h3 className="text-2xl font-semibold tracking-tight text-white">{participante.nombre}</h3>
          {participante.subtitulo && <p className="mt-0.5 text-sm text-white/60">{participante.subtitulo}</p>}
          {/* En celular el detalle (fotos, descripción) solo se abre al tocar la tarjeta */}
          <span className="mt-1 inline-flex items-center gap-0.5 text-sm font-medium text-white/80 lg:hidden">
            Ver detalles{participante.imagenes.length > 0 ? ` y ${participante.imagenes.length} ${participante.imagenes.length === 1 ? 'foto' : 'fotos'}` : ''}
            <ChevronRight className="h-4 w-4" />
          </span>
        </span>
      </button>

      {horario && (
        <div className="mt-4 pr-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">Presentaciones</span>
            {horarios.length > 1 && (
              <div className="flex items-center gap-1 text-sm text-white">
                <button onClick={() => setPagina((actual) => actual - 1)} disabled={pagina === 0} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Presentación anterior"><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-12 text-center tabular-nums">{pagina + 1} de {horarios.length}</span>
                <button onClick={() => setPagina((actual) => actual + 1)} disabled={pagina === horarios.length - 1} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Siguiente presentación"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          <p className="mb-2 font-medium text-white">{horario.sede}</p>
          <dl className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-sm text-white/50">Fecha</dt>
              <dd className="tabular-nums text-white">{fechaCartelera(horario.fecha)}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/50">Hora</dt>
              <dd className="tabular-nums text-white">{formatearHora(horario.hora_inicio)}{horario.hora_fin ? ` – ${horario.hora_fin.slice(0, 5)}` : ''}</dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  );
}
