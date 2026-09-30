import { ExternalLink, MapPin } from 'lucide-react';
import { formatearFecha, formatearHora } from '@/lib/utils';
import { BotonCalendario } from '@/components/BotonCalendario';
import { ordenarHorarios } from './cartelera';
import type { Catalogo, Participante } from './cartelera';

interface Props {
  participante: Participante;
  tipo?: Catalogo;
}

export function DetalleParticipante({ participante, tipo }: Props) {
  const color = tipo?.color ?? '#ffffff';
  const horarios = ordenarHorarios(participante.cartelera_horarios);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-[#10241b]/75 backdrop-blur-md" style={{ borderColor: `${color}99` }}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        {tipo
          ? <span className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: color }}>{tipo.nombre}</span>
          : <span />}
        {participante.procedencia && <span className="pt-2 text-xs font-medium uppercase tracking-[0.15em] text-white/60">{participante.procedencia}</span>}
      </div>

      <div className="px-6 pb-5 pt-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{participante.nombre}</h2>
        {participante.subtitulo && <p className="mt-1 text-lg text-white/70">{participante.subtitulo}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {participante.imagenes.length > 0 && (
          // Galería horizontal: cada foto conserva su proporción
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:thin]">
            {participante.imagenes.map((url, indice) => (
              <img
                key={url}
                src={url}
                alt={`${participante.nombre} — foto ${indice + 1}`}
                loading={indice === 0 ? 'eager' : 'lazy'}
                className={`w-auto shrink-0 snap-start rounded-xl object-cover ${indice % 2 === 1 ? 'h-80 md:h-[26rem]' : 'mt-6 h-72 md:h-96'}`}
              />
            ))}
          </div>
        )}

        <div className="space-y-5 px-6 pb-6 pt-2">
          {participante.descripcion && <p className="max-w-2xl leading-relaxed text-white/75">{participante.descripcion}</p>}

          {horarios.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {horarios.map((horario) => (
                // flex-wrap: al elegir calendario, las opciones bajan a su propia línea
                <li key={horario.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white"><MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />{horario.sede}</p>
                    <p className="text-sm tabular-nums text-white/60">{formatearFecha(horario.fecha)} · {formatearHora(horario.hora_inicio)}</p>
                  </div>
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
                </li>
              ))}
            </ul>
          )}

          {participante.enlace_url && (
            <a href={participante.enlace_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              <ExternalLink className="h-4 w-4" /> Ver en redes
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
