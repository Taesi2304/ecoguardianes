import { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { agregarACalendarioApple, enlaceGoogleCalendar } from '@/lib/calendario';
import type { EventoAgendable } from '@/lib/calendario';

interface Props {
  evento: EventoAgendable;
  // claro: fondos blancos · oscuro: cartelera · icono: solo el ícono hasta que se toca
  variante?: 'claro' | 'oscuro' | 'icono';
}

const ESTILOS = {
  claro: {
    principal: 'flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-[#4a3728] hover:bg-gray-50',
    opcion: 'flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-[#4a3728] hover:bg-gray-50',
    cerrar: 'rounded-xl p-3 text-gray-400 hover:bg-gray-100',
  },
  oscuro: {
    principal: 'flex items-center gap-2 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white',
    opcion: 'flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20',
    cerrar: 'rounded-lg p-2 text-white/50 hover:bg-white/10',
  },
};

export function BotonCalendario({ evento, variante = 'claro' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const estilo = variante === 'claro' ? ESTILOS.claro : ESTILOS.oscuro;

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={estilo.principal} title="Agregar a mi calendario" aria-label="Agregar a mi calendario">
        <CalendarPlus className={variante === 'claro' ? 'h-5 w-5' : 'h-4 w-4'} />
        {variante === 'claro' && 'Agregar a mi calendario'}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2" role="group" aria-label="Elegir calendario">
      <a href={enlaceGoogleCalendar(evento)} target="_blank" rel="noreferrer" onClick={() => setAbierto(false)} className={estilo.opcion}>
        Google
      </a>
      <button type="button" onClick={() => { agregarACalendarioApple(evento); setAbierto(false); }} className={estilo.opcion}>
        Apple / Outlook
      </button>
      <button type="button" onClick={() => setAbierto(false)} className={estilo.cerrar} aria-label="Cancelar"><X className="h-4 w-4" /></button>
    </div>
  );
}
