import { Link } from 'react-router-dom';
import { CalendarDays, Sprout } from 'lucide-react';

interface Props {
  festival?: string;
  sinParticipantes: boolean;
}

// Panel derecho cuando no hay participante que mostrar (cartelera vacía o sin resultados)
export function Bienvenida({ festival, sinParticipantes }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/15 bg-[#10241b]/60 p-6 text-center backdrop-blur-md sm:p-10">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#fcfaf2] p-3 shadow-lg">
        <img src="/logo_fdma.svg" alt="Festival del Medio Ambiente" className="h-full w-full object-contain" />
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60">Cartelera oficial</p>
      <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{festival || 'Festival del Medio Ambiente'}</h2>

      {sinParticipantes ? (
        <>
          <p className="mb-8 max-w-md text-lg text-white/75">
            Estamos preparando el programa. Muy pronto podrás ver aquí a todos los participantes, horarios y sedes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/talleres" className="flex items-center justify-center gap-2 rounded-full bg-[#fcfaf2] px-5 py-2.5 text-sm font-bold text-[#1b4332] transition hover:scale-105">
              <Sprout className="h-4 w-4" /> Talleres de este mes
            </Link>
            <Link to="/calendario" className="flex items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              <CalendarDays className="h-4 w-4" /> Calendario de actividades
            </Link>
          </div>
        </>
      ) : (
        <p className="max-w-md text-lg text-white/75">No encontramos participantes con esos filtros. Prueba con otra búsqueda.</p>
      )}
    </div>
  );
}
