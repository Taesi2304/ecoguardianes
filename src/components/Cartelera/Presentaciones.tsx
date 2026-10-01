import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatearHora } from '@/lib/utils';
import { BotonCalendario } from '@/components/BotonCalendario';
import { ordenarHorarios } from './cartelera';
import type { Participante } from './cartelera';

// '2026-10-02' → '02 / 10 / 2026' como en la referencia
const fechaCartelera = (fecha: string) => fecha.split('-').reverse().join(' / ');

interface Props {
  participante: Participante;
  fecha?: string | null; // Día elegido en la barra: se abre en su primer horario de ese día
}

// Una presentación a la vez, con flechas si hay varias, y su botón para agendar
export function Presentaciones({ participante, fecha }: Props) {
  const horarios = ordenarHorarios(participante.cartelera_horarios);
  const [pagina, setPagina] = useState(() => Math.max(horarios.findIndex((horario) => horario.fecha === fecha), 0));
  const horario = horarios[pagina];

  // Aún sin ninguna presentación capturada
  if (!horario) {
    return (
      <section className="border-t border-white/10 pt-4">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">Presentación</span>
        <p className="mt-2 text-white">Fecha y hora por confirmar</p>
      </section>
    );
  }

  return (
    <section className="border-t border-white/10 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">{horarios.length > 1 ? 'Presentaciones' : 'Presentación'}</span>
        {horarios.length > 1 && (
          <div className="flex items-center gap-1 text-sm text-white">
            <button type="button" onClick={() => setPagina((actual) => actual - 1)} disabled={pagina === 0} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Presentación anterior"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-12 text-center tabular-nums">{pagina + 1} de {horarios.length}</span>
            <button type="button" onClick={() => setPagina((actual) => actual + 1)} disabled={pagina === horarios.length - 1} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Siguiente presentación"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-white/50">Fecha</dt>
          <dd className="tabular-nums text-white">{fechaCartelera(horario.fecha)}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/50">Hora</dt>
          <dd className="tabular-nums text-white">{horario.hora_inicio ? `${formatearHora(horario.hora_inicio)}${horario.hora_fin ? ` – ${horario.hora_fin.slice(0, 5)}` : ''}` : 'Por confirmar'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-sm text-white/50">Sede</dt>
          <dd className="font-medium text-white">{horario.sede}</dd>
        </div>
      </dl>
      {/* Sin hora confirmada no hay nada que agendar */}
      {horario.hora_inicio && (
        <div className="mt-3">
          <BotonCalendario
            variante="oscuro"
            evento={{
              titulo: `${participante.nombre}${participante.subtitulo ? ` — ${participante.subtitulo}` : ''}`,
              fecha: horario.fecha,
              hora_inicio: horario.hora_inicio,
              hora_fin: horario.hora_fin,
              lugar: horario.sede,
              descripcion: participante.descripcion,
            }}
          />
        </div>
      )}
    </section>
  );
}
