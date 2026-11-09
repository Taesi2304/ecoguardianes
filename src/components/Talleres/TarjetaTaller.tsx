import { CalendarDays, Clock, HandCoins, MapPin, User } from 'lucide-react';
import { lugaresDisponibles, textoCosto, textoFecha, textoHorario } from './talleres';
import type { TallerPublico } from './talleres';


interface Props {
  taller: TallerPublico;
  onRegistrarme: (taller: TallerPublico) => void;
}

export function TarjetaTaller({ taller, onRegistrarme }: Props) {
  const disponibles = lugaresDisponibles(taller);
  const agotado = disponibles === 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm">
      <div className="relative aspect-square bg-[#f8f5f2]">
        <img src={taller.imagen_url} alt={taller.titulo} loading="lazy" className="h-full w-full object-cover" />
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow ${agotado ? 'bg-red-600 text-white' : 'bg-white text-[#2d6a4f]'}`}>
          {agotado ? 'Agotado' : disponibles === null ? 'Cupo disponible' : `${disponibles} ${disponibles === 1 ? 'lugar' : 'lugares'}`}
        </span>
      </div>

      <div className="flex flex-grow flex-col p-5">
        <h3 className="mb-1 text-xl font-bold text-[#4a3728]">{taller.titulo}</h3>
        {taller.facilitador && (
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#2d6a4f]"><User className="h-4 w-4" />{taller.facilitador}</p>
        )}
        {taller.descripcion && <p className="mb-4 text-sm leading-relaxed text-[#4a3728]/75">{taller.descripcion}</p>}

        <ul className="mb-5 space-y-1.5 text-sm text-[#4a3728]/85">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-[#2d6a4f]" />{textoFecha(taller.fecha)}</li>
          <li className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-[#2d6a4f]" />{textoHorario(taller.hora_inicio, taller.hora_fin)}</li>
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6a4f]" />
            {taller.lugar_maps_url
              ? <a href={taller.lugar_maps_url} target="_blank" rel="noreferrer" className="underline decoration-[#2d6a4f]/40 hover:text-[#2d6a4f]">{taller.lugar}</a>
              : taller.lugar}
          </li>
          <li className="flex items-center gap-2 font-semibold text-[#2d6a4f]"><HandCoins className="h-4 w-4 shrink-0" />{textoCosto(taller.costo)}</li>
        </ul>

        <button
          onClick={() => onRegistrarme(taller)}
          disabled={agotado}
          className="mt-auto w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {agotado ? 'Cupo agotado' : 'Registrarme'}
        </button>
      </div>
    </article>
  );
}
