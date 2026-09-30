import { useEffect, useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, ExternalLink, Loader2, MapPin, X } from 'lucide-react';
import { enlaceGoogleCalendar, formatearFecha, formatearHora } from '@/lib/utils';
import { CATEGORIAS, cargarEventos } from '@/components/Calendario/eventos';
import type { Categoria, EventoCalendario } from '@/components/Calendario/eventos';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const aClave = (fecha: Date) => format(fecha, 'yyyy-MM-dd');

export default function Calendario() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [mesCargado, setMesCargado] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<EventoCalendario | null>(null);

  // La cuadrícula empieza en lunes e incluye días de los meses vecinos
  const dias = useMemo(() => eachDayOfInterval({
    start: startOfWeek(mes, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(mes), { weekStartsOn: 1 }),
  }), [mes]);

  const claveMes = aClave(mes);
  const cargando = mesCargado !== claveMes;

  useEffect(() => {
    let vigente = true;
    cargarEventos(aClave(dias[0]), aClave(dias[dias.length - 1])).then((resultado) => {
      if (!vigente) return;
      setEventos(resultado);
      setMesCargado(claveMes);
    });
    return () => { vigente = false; };
  }, [dias, claveMes]);

  const eventosPorDia = useMemo(() => eventos.reduce<Record<string, EventoCalendario[]>>((grupos, evento) => {
    (grupos[evento.fecha] ||= []).push(evento);
    return grupos;
  }, {}), [eventos]);

  const diasDelMesConEventos = dias.filter((dia) => isSameMonth(dia, mes) && eventosPorDia[aClave(dia)]);

  return (
    <div className="min-h-screen bg-[#fcfaf2]">
      <section className="bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] px-6 pb-8 pt-12 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#2d6a4f]">Comunidad y formación</p>
        <h1 className="mb-4 text-4xl font-extrabold text-[#4a3728] md:text-5xl">Calendario de actividades</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-700">Lo que hace el equipo del festival durante todo el año.</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMes((actual) => subMonths(actual, 1))} className="rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm hover:bg-gray-50" aria-label="Mes anterior">
            <ChevronLeft className="h-5 w-5 text-[#4a3728]" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold capitalize text-[#4a3728]">{format(mes, 'MMMM yyyy', { locale: es })}</h2>
            {!isSameMonth(mes, new Date()) && (
              <button onClick={() => setMes(startOfMonth(new Date()))} className="text-sm font-semibold text-[#2d6a4f] hover:underline">Ir a hoy</button>
            )}
          </div>
          <button onClick={() => setMes((actual) => addMonths(actual, 1))} className="rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm hover:bg-gray-50" aria-label="Mes siguiente">
            <ChevronRight className="h-5 w-5 text-[#4a3728]" />
          </button>
        </div>

        <ul className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[#4a3728]/80">
          {(Object.keys(CATEGORIAS) as Categoria[]).map((clave) => (
            <li key={clave} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${CATEGORIAS[clave].punto}`} />{CATEGORIAS[clave].nombre}</li>
          ))}
        </ul>

        <div className="relative">
          {cargando && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          )}

          {/* Escritorio: cuadrícula mensual */}
          <div className="hidden overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm md:block">
            <div className="grid grid-cols-7 border-b bg-[#f8f5f2] text-center text-xs font-bold uppercase tracking-wider text-[#4a3728]/60">
              {DIAS_SEMANA.map((dia) => <div key={dia} className="py-2">{dia}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((dia) => {
                const delDia = eventosPorDia[aClave(dia)] || [];
                return (
                  <div key={aClave(dia)} className={`min-h-28 border-b border-r border-[#4a3728]/5 p-1.5 ${isSameMonth(dia, mes) ? '' : 'bg-gray-50/70 text-gray-400'}`}>
                    <span className={`mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday(dia) ? 'bg-[#2d6a4f] text-white' : ''}`}>
                      {format(dia, 'd')}
                    </span>
                    <div className="space-y-1">
                      {delDia.map((evento) => (
                        <button
                          key={evento.id}
                          onClick={() => setSeleccionado(evento)}
                          className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-xs font-medium ${CATEGORIAS[evento.categoria].chip}`}
                          title={evento.titulo}
                        >
                          {evento.hora_inicio && <span className="font-bold">{evento.hora_inicio.slice(0, 5)} </span>}
                          {evento.titulo}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Celular: lista de días con actividades */}
          <div className="space-y-4 md:hidden">
            {!cargando && diasDelMesConEventos.length === 0 && (
              <p className="rounded-2xl bg-white p-8 text-center text-[#4a3728]/70 shadow-sm">No hay actividades programadas este mes.</p>
            )}
            {diasDelMesConEventos.map((dia) => (
              <div key={aClave(dia)} className="overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm">
                <h3 className={`px-4 py-2 text-sm font-bold capitalize ${isToday(dia) ? 'bg-[#2d6a4f] text-white' : 'bg-[#f8f5f2] text-[#4a3728]'}`}>
                  {format(dia, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <ul className="divide-y divide-gray-100">
                  {eventosPorDia[aClave(dia)].map((evento) => (
                    <li key={evento.id}>
                      <button onClick={() => setSeleccionado(evento)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <span className={`h-3 w-3 shrink-0 rounded-full ${CATEGORIAS[evento.categoria].punto}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[#4a3728]">{evento.titulo}</span>
                          {(evento.hora_inicio || evento.lugar) && (
                            <span className="block truncate text-sm text-[#4a3728]/60">{[formatearHora(evento.hora_inicio), evento.lugar].filter(Boolean).join(' · ')}</span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {seleccionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setSeleccionado(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-evento" className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div>
                <span className={`mb-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORIAS[seleccionado.categoria].chip}`}>{CATEGORIAS[seleccionado.categoria].nombre}</span>
                <h2 id="titulo-evento" className="text-xl font-bold text-[#4a3728]">{seleccionado.titulo}</h2>
              </div>
              <button onClick={() => setSeleccionado(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <ul className="space-y-2 text-sm text-[#4a3728]/85">
                <li className="flex items-center gap-2 capitalize"><CalendarPlus className="h-4 w-4 text-[#2d6a4f]" />{formatearFecha(seleccionado.fecha)}</li>
                {seleccionado.hora_inicio && (
                  <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#2d6a4f]" />{formatearHora(seleccionado.hora_inicio)}{seleccionado.hora_fin ? ` – ${formatearHora(seleccionado.hora_fin)}` : ''}</li>
                )}
                {seleccionado.lugar && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#2d6a4f]" />{seleccionado.lugar}</li>}
              </ul>
              {seleccionado.descripcion && <p className="text-sm leading-relaxed text-[#4a3728]/75">{seleccionado.descripcion}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                {seleccionado.enlace_url && (
                  <a href={seleccionado.enlace_url} target={seleccionado.enlace_url.startsWith('/') ? undefined : '_blank'} rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700">
                    <ExternalLink className="h-4 w-4" /> {seleccionado.categoria === 'taller' && seleccionado.enlace_url === '/talleres' ? 'Registrarme' : 'Más información'}
                  </a>
                )}
                {seleccionado.hora_inicio && (
                  <a href={enlaceGoogleCalendar({ ...seleccionado, hora_inicio: seleccionado.hora_inicio })} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-[#4a3728] hover:bg-gray-50">
                    <CalendarPlus className="h-4 w-4" /> Agregar a mi calendario
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
