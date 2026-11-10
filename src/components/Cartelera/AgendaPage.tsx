import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Clock, ExternalLink, Loader2, MapPin, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { addMonths, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cargarEventos } from '@/components/Calendario/eventos';
import { cargarEdiciones } from './cartelera';
import type { Edicion } from './cartelera';
import type { CategoriaCalendario, EventoCalendario } from '@/components/Calendario/eventos';
import { NavCartelera, PieCartelera } from './MarcoCartelera';

const clave = (fecha: Date) => format(fecha, 'yyyy-MM-dd');
const FONDO_POR_DEFECTO = '/galeria/foto9.jpeg';

export default function AgendaPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [parametros] = useSearchParams();
  const verEdiciones = parametros.has('ediciones');

  useEffect(() => {
    let vigente = true;
    const hoy = startOfDay(new Date());
    Promise.all([
      verEdiciones ? Promise.resolve([]) : cargarEventos(clave(hoy), clave(addMonths(hoy, 12))),
      cargarEdiciones(),
    ]).then(([resultado, anteriores]) => {
      if (!vigente) return;
      setEventos(resultado.filter((evento) => evento.fecha >= clave(hoy)));
      setEdiciones(anteriores);
      setCargando(false);
    }).catch(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, [verEdiciones]);

  const categoriasDisponibles = useMemo(() => {
    const unicas = new Map<string, CategoriaCalendario>();
    eventos.forEach((evento) => {
      if (evento.categoria) unicas.set(evento.categoria.id, evento.categoria);
    });
    return [...unicas.values()].sort((a, b) => a.orden - b.orden);
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return eventos.filter((evento) => {
      if (categoriaActiva && evento.categoria?.id !== categoriaActiva) return false;
      if (!termino) return true;
      return [evento.titulo, evento.descripcion, evento.lugar, evento.categoria?.nombre]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(termino);
    });
  }, [eventos, busqueda, categoriaActiva]);

  const eventosPorFecha = useMemo(() => eventosFiltrados.reduce<Record<string, EventoCalendario[]>>((grupos, evento) => {
    (grupos[evento.fecha] ||= []).push(evento);
    return grupos;
  }, {}), [eventosFiltrados]);

  const nombreCategoria = (categoria: CategoriaCalendario | null) => categoria?.nombre || 'Actividad';

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#12261d] font-sans text-white">
      <img src={FONDO_POR_DEFECTO} alt="" aria-hidden="true" className="fixed inset-0 h-full w-full object-cover" />
      <div className="fixed inset-0 bg-gradient-to-br from-[#0c1f16]/90 via-[#0c1f16]/70 to-[#0c1f16]/90" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-4 lg:px-8">
        <NavCartelera edicion={null} />
        <header className="px-2 pb-10 pt-10 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white/75">Eco Guardianes</p>
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">Agenda Anual - Cartelera de ediciones anteriores</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
          Talleres, cursos, eventos y convocatorias para participar durante todo el año.
        </p>
        <nav aria-label="Sección de cartelera" className="mx-auto mt-7 flex w-fit flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-[#0c1f16]/85 p-1.5 shadow-lg backdrop-blur-md">
          <Link
            to="/cartelera?agenda=1"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!verEdiciones ? 'bg-white/90 text-[#1a1716]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            Agenda anual
          </Link>
          <Link
            to="/cartelera?ediciones=1"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${verEdiciones ? 'bg-white/90 text-[#1a1716]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
           Cartelera de Ediciones anteriores
          </Link>
        </nav>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
          {verEdiciones ? 'Consulta las carteleras de festivales anteriores.' : 'La agenda se actualiza durante todo el año.'}
        </p>
        </header>

      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-8">
        {cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/75" /></div>
        ) : verEdiciones ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {ediciones.map((edicion) => (
              <Link key={edicion.id} to={`/cartelera?edicion=${edicion.anio}`} className="group rounded-2xl border border-white/10 bg-[#10241b]/80 p-6 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#173526]">
                <span className="text-sm font-bold uppercase tracking-wider text-white/65">Edición {edicion.anio}</span>
                <h2 className="mt-2 text-xl font-bold text-white">{edicion.nombre}</h2>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-white/85 group-hover:text-white group-hover:underline">Ver cartelera <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#10241b]/80 p-10 text-center shadow-sm backdrop-blur-md">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-white/75" />
            <p className="text-lg font-semibold">Aún no hay actividades programadas.</p>
            <p className="mt-2 text-white/65">Vuelve pronto para conocer las próximas actividades.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#10241b]/80 p-4 shadow-sm backdrop-blur-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                <input
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar actividad, sede o categoría"
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-11 pr-10 text-white placeholder:text-white/40 outline-none transition focus:border-white/35"
                />
                {busqueda && (
                  <button type="button" onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" aria-label="Limpiar búsqueda">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button type="button" onClick={() => setCategoriaActiva(null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${!categoriaActiva ? 'bg-white text-[#1a1716]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  Todas <span className="ml-1 text-xs opacity-60">{eventos.length}</span>
                </button>
                {categoriasDisponibles.map((categoria) => (
                  <button key={categoria.id} type="button" onClick={() => setCategoriaActiva(categoria.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${categoriaActiva === categoria.id ? 'bg-white text-[#1a1716]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                    {categoria.nombre}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-white/45">
                {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'actividad encontrada' : 'actividades encontradas'}
              </p>
            </div>
            {eventosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#10241b]/80 p-10 text-center text-white/70 backdrop-blur-md">
                No encontramos actividades con esos filtros.
              </div>
            ) : null}
            {Object.entries(eventosPorFecha).map(([fecha, actividades]) => (
              <section key={fecha} className="overflow-hidden rounded-2xl border border-white/10 bg-[#10241b]/80 shadow-sm backdrop-blur-md">
                <h2 className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-5 py-3 font-bold capitalize text-white/90">
                  <CalendarDays className="h-5 w-5 text-white/75" />
                  {format(new Date(`${fecha}T00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </h2>
                <ul className="divide-y divide-white/10">
                  {actividades.map((evento) => (
                    <li key={evento.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-white/60">{nombreCategoria(evento.categoria)}</span>
                        <h3 className="mt-1 text-lg font-bold text-white">{evento.titulo}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/65">
                          {evento.hora_inicio && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{evento.hora_inicio.slice(0, 5)}{evento.hora_fin ? ` - ${evento.hora_fin.slice(0, 5)}` : ''}</span>}
                          {evento.lugar && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{evento.lugar}</span>}
                        </div>
                      </div>
                      {evento.enlace_url && (
                        <a href={evento.enlace_url} className="inline-flex shrink-0 items-center gap-1 font-semibold text-white/85 hover:text-white hover:underline">
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
      <div className="pb-10">
        <PieCartelera />
      </div>
      </div>
    </main>
  );
}
