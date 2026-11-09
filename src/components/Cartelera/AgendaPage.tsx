import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { addMonths, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cargarCategorias, cargarEventos } from '@/components/Calendario/eventos';
import { cargarEdiciones } from './cartelera';
import type { Edicion } from './cartelera';
import type { CategoriaCalendario, EventoCalendario } from '@/components/Calendario/eventos';

const clave = (fecha: Date) => format(fecha, 'yyyy-MM-dd');

export default function AgendaPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCalendario[]>([]);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [parametros] = useSearchParams();
  const verEdiciones = parametros.has('ediciones');

  useEffect(() => {
    let vigente = true;
    const hoy = startOfDay(new Date());
    Promise.all([
      verEdiciones ? Promise.resolve([]) : cargarEventos(clave(hoy), clave(addMonths(hoy, 12))),
      verEdiciones ? Promise.resolve([]) : cargarCategorias(),
      cargarEdiciones(),
    ]).then(([resultado, catalogos, anteriores]) => {
      if (!vigente) return;
      setEventos(resultado.filter((evento) => evento.fecha >= clave(hoy)));
      setCategorias(catalogos);
      setEdiciones(anteriores);
      setCargando(false);
    }).catch(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, [verEdiciones]);

  const eventosPorFecha = useMemo(() => eventos.reduce<Record<string, EventoCalendario[]>>((grupos, evento) => {
    (grupos[evento.fecha] ||= []).push(evento);
    return grupos;
  }, {}), [eventos]);

  const nombreCategoria = (categoria: CategoriaCalendario | null) => categoria?.nombre || 'Actividad';

  return (
    <main className="min-h-screen bg-[#fcfaf2] text-[#4a3728]">
      <header className="bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] px-6 pb-10 pt-14 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Eco Guardianes</p>
        <h1 className="text-4xl font-extrabold md:text-5xl">Cartelera / Agenda</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-700">
          Talleres, cursos, eventos y convocatorias para participar durante todo el año.
        </p>
        <nav aria-label="Sección de cartelera" className="mx-auto mt-7 flex w-fit flex-wrap justify-center gap-2 rounded-full bg-white/80 p-1.5 shadow-sm">
          <Link
            to="/cartelera?agenda=1"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!verEdiciones ? 'bg-[#2d6a4f] text-white' : 'text-[#2d6a4f] hover:bg-[#d8ece1]'}`}
          >
            Agenda anual
          </Link>
          <Link
            to="/cartelera?ediciones=1"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${verEdiciones ? 'bg-[#2d6a4f] text-white' : 'text-[#2d6a4f] hover:bg-[#d8ece1]'}`}
          >
            Ediciones anteriores
          </Link>
        </nav>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#4a3728]/65">
          {verEdiciones ? 'Consulta las carteleras de festivales anteriores.' : 'La agenda se actualiza durante todo el año.'}
        </p>
      </header>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-8">
        {cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#2d6a4f]" /></div>
        ) : verEdiciones ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {ediciones.map((edicion) => (
              <Link key={edicion.id} to={`/cartelera?edicion=${edicion.anio}`} className="group rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-sm font-bold uppercase tracking-wider text-[#2d6a4f]">Edición {edicion.anio}</span>
                <h2 className="mt-2 text-xl font-bold">{edicion.nombre}</h2>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-[#2d6a4f] group-hover:underline">Ver cartelera <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-[#2d6a4f]" />
            <p className="text-lg font-semibold">Aún no hay actividades programadas.</p>
            <p className="mt-2 text-gray-600">Vuelve pronto para conocer las próximas actividades.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(eventosPorFecha).map(([fecha, actividades]) => (
              <section key={fecha} className="overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm">
                <h2 className="flex items-center gap-2 bg-[#f8f5f2] px-5 py-3 font-bold capitalize">
                  <CalendarDays className="h-5 w-5 text-[#2d6a4f]" />
                  {format(new Date(`${fecha}T00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </h2>
                <ul className="divide-y divide-gray-100">
                  {actividades.map((evento) => (
                    <li key={evento.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">{nombreCategoria(evento.categoria)}</span>
                        <h3 className="mt-1 text-lg font-bold">{evento.titulo}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          {evento.hora_inicio && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{evento.hora_inicio.slice(0, 5)}{evento.hora_fin ? ` - ${evento.hora_fin.slice(0, 5)}` : ''}</span>}
                          {evento.lugar && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{evento.lugar}</span>}
                        </div>
                      </div>
                      {evento.enlace_url && (
                        <a href={evento.enlace_url} className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#2d6a4f] hover:underline">
                          {evento.texto_enlace || 'Más información'} <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
