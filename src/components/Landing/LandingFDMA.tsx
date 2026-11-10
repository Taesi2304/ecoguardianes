import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatearFecha, formatearHora } from '../../lib/utils';
import { TarjetaTaller } from '../Talleres/TarjetaTaller';
import { ModalRegistroTaller } from '../Talleres/ModalRegistroTaller';
import { CAMPOS_TALLER_PUBLICO } from '../Talleres/talleres';
import type { TallerPublico } from '../Talleres/talleres';
import { cargarEventos, estiloPunto } from '../Calendario/eventos';
import type { EventoCalendario } from '../Calendario/eventos';
import { cargarEdicion } from '../Cartelera/cartelera';
import { VisorImagenes } from '../VisorImagenes';
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/lib/redes';

// Textos y secciones se editan en /admin/pagina; estos valores se usan mientras cargan
const PAGINA_POR_DEFECTO: PaginaInicio = {
  titulo: 'Bienvenido a FDMA',
  subtitulo: 'Festival Del Medio Ambiente',
  descripcion: 'Un espacio dedicado a la educación y la acción ambiental. Conoce nuestros proyectos activos, intégrate a nuestra red y sé parte del impacto positivo. Entérate de nuestros próximos eventos en redes sociales.',
  mostrar_convocatorias: true,
  mostrar_publicaciones: true,
  mostrar_aliados: true,
};

// Los mostrar_* de módulos cuyo SQL aún no se corre llegan como undefined (= ocultos)
interface PaginaInicio {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  mostrar_convocatorias: boolean;
  mostrar_publicaciones: boolean;
  mostrar_aliados: boolean;
  mostrar_cartelera?: boolean;
  mostrar_talleres?: boolean;
  mostrar_calendario?: boolean;
  festival_nombre?: string;
}

interface Aliado {
  id: string;
  nombre: string;
  enlace_url: string;
  imagen_url: string;
}

interface Convocatoria {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_url: string;
  enlace_url?: string;
  fecha_cierre?: string | null;
  texto_boton?: string | null; // Vacío → "Registro"
}

// "Cierra hoy", "Cierra en 3 días"… o la fecha si falta más de una semana
function textoCierre(fechaCierre: string) {
  const hoy = new Date(`${new Date().toLocaleDateString('en-CA')}T12:00:00`);
  const cierre = new Date(`${fechaCierre}T12:00:00`);
  const dias = Math.round((cierre.getTime() - hoy.getTime()) / 86400000);
  if (dias === 0) return 'Cierra hoy';
  if (dias === 1) return 'Cierra mañana';
  if (dias <= 7) return `Cierra en ${dias} días`;
  return `Cierra el ${cierre.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;
}

interface Publicacion {
  id: string;
  texto: string | null;
  imagen_url: string | null; // null: post de Facebook solo de texto
  es_video: boolean;
  red_social: 'instagram' | 'facebook';
  enlace_url: string | null;
  fecha_publicacion: string;
}

interface FdmaActividad {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  fecha: string | null;
  imagenes: string[];
  videos: string[];
  pdfs: string[];
  ganadores: Array<{ lugar: number; proyecto: string; participantes: string; asesor: string; organizacion: string; contacto: string; descripcion: string; imagen?: string }>;
  enlace_url: string | null;
}

interface FdmaSeccion {
  id: string;
  anio: number;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  fdma_actividades: FdmaActividad[];
}

function FdmaGanadorCard({ ganador }: { ganador: FdmaActividad['ganadores'][number] }) {
  const [visorAbierto, setVisorAbierto] = useState(false);

  return (
    <div className="rounded-xl bg-white/70 p-3">
      <p className="font-bold text-[#2d6a4f]">{ganador.lugar}.º lugar</p>
      {ganador.imagen && (
        <>
          <button type="button" onClick={() => setVisorAbierto(true)} className="mt-2 block w-full cursor-zoom-in overflow-hidden rounded-lg" aria-label={`Ver imagen del proyecto del ${ganador.lugar}.º lugar`}>
            <img src={ganador.imagen} alt={`Proyecto del ${ganador.lugar}.º lugar`} className="h-36 w-full object-cover transition hover:scale-105" loading="lazy" />
          </button>
          {visorAbierto && <VisorImagenes fotos={[ganador.imagen]} indice={0} nombre={`Proyecto del ${ganador.lugar}.º lugar`} onCambiar={() => {}} onCerrar={() => setVisorAbierto(false)} />}
        </>
      )}
      {ganador.proyecto && <p className="mt-2 font-semibold text-[#4a3728]">{ganador.proyecto}</p>}
      {ganador.participantes && <p className="mt-1 text-sm text-[#4a3728]/75"><strong>Participantes:</strong> {ganador.participantes}</p>}
      {ganador.asesor && <p className="text-sm text-[#4a3728]/75"><strong>Asesor:</strong> {ganador.asesor}</p>}
      {ganador.organizacion && <p className="text-sm text-[#4a3728]/75"><strong>Organización:</strong> {ganador.organizacion}</p>}
      {ganador.contacto && <p className="text-sm text-[#4a3728]/75"><strong>Contacto:</strong> {ganador.contacto}</p>}
      {ganador.descripcion && <p className="mt-1 text-sm text-[#4a3728]/75">{ganador.descripcion}</p>}
    </div>
  );
}

function FdmaCarrusel({ actividad }: { actividad: FdmaActividad }) {
  const medios = [
    ...actividad.imagenes.map((url) => ({ url, video: false })),
    ...actividad.videos.map((url) => ({ url, video: true })),
  ];
  const [indice, setIndice] = useState(0);
  const [visorIndice, setVisorIndice] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);
  useEffect(() => {
    if (medios.length < 2) return undefined;
    const intervalo = window.setInterval(() => setIndice((actual) => (actual + 1) % medios.length), 5000);
    return () => window.clearInterval(intervalo);
  }, [medios.length]);
  if (medios.length === 0) return null;
  const medio = medios[indice] || medios[0];
  const cambiar = (paso: number) => setIndice((actual) => (actual + paso + medios.length) % medios.length);

  return (
    <div className="relative overflow-hidden bg-[#d8ece1] p-2">
      <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-black/10">
        {medio.video ? <video src={medio.url} controls className="h-full w-full object-contain" /> : <button type="button" onClick={() => { setVisorIndice(actividad.imagenes.indexOf(medio.url)); setVisorAbierto(true); }} className="h-full w-full cursor-zoom-in"><img src={medio.url} alt={`${actividad.titulo} — imagen ${indice + 1}`} className="h-full w-full object-cover" loading="lazy" /></button>}
      </div>
      {medios.length > 1 && <>
        <button type="button" onClick={() => cambiar(-1)} aria-label="Medio anterior" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2d6a4f] shadow hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => cambiar(1)} aria-label="Medio siguiente" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2d6a4f] shadow hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
        <div className="mt-2 flex justify-center gap-1.5">
          {medios.map((item, posicion) => <button key={`${item.url}-${posicion}`} type="button" onClick={() => setIndice(posicion)} aria-label={`Ver medio ${posicion + 1}`} className={`h-2 rounded-full transition-all ${posicion === indice ? 'w-6 bg-[#2d6a4f]' : 'w-2 bg-[#2d6a4f]/30'}`} />)}
        </div>
      </>}
      {visorAbierto && <VisorImagenes fotos={actividad.imagenes} indice={visorIndice} nombre={actividad.titulo} onCambiar={setVisorIndice} onCerrar={() => setVisorAbierto(false)} />}
    </div>
  );
}

function FdmaCarruselGlobal({ actividades, anio }: { actividades: FdmaActividad[]; anio: number }) {
  const medios = actividades.flatMap((actividad) => [
    ...actividad.imagenes.map((url) => ({ url, video: false, titulo: actividad.titulo })),
    ...actividad.videos.map((url) => ({ url, video: true, titulo: actividad.titulo })),
  ]);
  const [indice, setIndice] = useState(0);
  const [visorIndice, setVisorIndice] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const fotosGlobales = medios.filter((item) => !item.video).map((item) => item.url);
  useEffect(() => {
    if (medios.length < 2) return undefined;
    const intervalo = window.setInterval(() => setIndice((actual) => (actual + 1) % medios.length), 5000);
    return () => window.clearInterval(intervalo);
  }, [medios.length]);
  if (medios.length === 0) return null;
  const medio = medios[indice] || medios[0];
  const cambiar = (paso: number) => setIndice((actual) => (actual + paso + medios.length) % medios.length);

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2d6a4f]">Galería FDMA {anio}</p>
          <p className="text-sm text-[#4a3728]/65">Fotos y videos de todas las actividades</p>
        </div>
        <span className="text-sm font-semibold text-[#4a3728]/60">{indice + 1} / {medios.length}</span>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-black/10">
        <div className="flex h-72 items-center justify-center bg-[#d8ece1]">
          {medio.video ? <video src={medio.url} controls className="h-full w-full object-contain" /> : <button type="button" onClick={() => { setVisorIndice(fotosGlobales.indexOf(medio.url)); setVisorAbierto(true); }} className="h-full w-full cursor-zoom-in"><img src={medio.url} alt={`${medio.titulo} — imagen ${indice + 1}`} className="h-full w-full object-contain" loading="lazy" /></button>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 text-sm font-semibold text-white">{medio.titulo}</div>
        {medios.length > 1 && <>
          <button type="button" onClick={() => cambiar(-1)} aria-label="Medio anterior de FDMA" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2d6a4f] shadow hover:bg-white"><ChevronLeft className="h-6 w-6" /></button>
          <button type="button" onClick={() => cambiar(1)} aria-label="Medio siguiente de FDMA" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2d6a4f] shadow hover:bg-white"><ChevronRight className="h-6 w-6" /></button>
        </>}
      </div>
      {medios.length > 1 && <div className="mt-3 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1">{medios.map((item, posicion) => <button key={`${item.url}-${posicion}`} type="button" onClick={() => setIndice(posicion)} aria-label={`Ver ${item.titulo}, medio ${posicion + 1}`} className={`h-2 shrink-0 rounded-full transition-all ${posicion === indice ? 'w-7 bg-[#2d6a4f]' : 'w-2 bg-[#2d6a4f]/30'}`} />)}</div>}
      {visorAbierto && <VisorImagenes fotos={fotosGlobales} indice={visorIndice} nombre={`Galería FDMA ${anio}`} onCambiar={setVisorIndice} onCerrar={() => setVisorAbierto(false)} />}
    </div>
  );
}

export const LandingFDMA = () => {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [cargandoConvocatorias, setCargandoConvocatorias] = useState(true);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargandoPublicaciones, setCargandoPublicaciones] = useState(true);
  const [pagina, setPagina] = useState<PaginaInicio>(PAGINA_POR_DEFECTO);
  // Nombre de la edición actual del festival (Admin → Cartelera → Ediciones)
  const [nombreFestival, setNombreFestival] = useState<string | null>(null);
  const [aliados, setAliados] = useState<Aliado[]>([]);
  const [talleres, setTalleres] = useState<TallerPublico[]>([]);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<TallerPublico | null>(null);
  const [cartelAbierto, setCartelAbierto] = useState<Convocatoria | null>(null);
  const [eventosSemana, setEventosSemana] = useState<EventoCalendario[]>([]);
  const [fdma, setFdma] = useState<FdmaSeccion | null>(null);

  const cargarTalleres = useCallback(() => supabase
    .from('talleres_publicos')
    .select(CAMPOS_TALLER_PUBLICO)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })
    .limit(3)
    .then(({ data, error }) => {
      if (!error) setTalleres((data || []) as TallerPublico[]);
    }), []);

  useEffect(() => {
    const cargarPagina = async () => {
      const { data, error } = await supabase
        .from('pagina_inicio')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) setPagina(data as PaginaInicio);
    };

    const hoy = new Date();
    const enUnaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    cargarEventos(hoy.toLocaleDateString('en-CA'), enUnaSemana.toLocaleDateString('en-CA')).then(setEventosSemana);
    cargarTalleres();

    const cargarAliados = async () => {
      const { data, error } = await supabase
        .from('aliados')
        .select('id, nombre, enlace_url, imagen_url')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (!error) setAliados((data || []) as Aliado[]);
    };

    const cargarConvocatorias = async () => {
      // Las vencidas se ocultan solas (fecha_cierre se edita en Admin → Convocatorias).
      // Primero las que cierran antes; las que no tienen fecha límite van al final, más nuevas primero.
      const hoy = new Date().toLocaleDateString('en-CA');
      const { data, error } = await supabase
        .from('convocatorias')
        .select('*')
        .eq('activo', true)
        .or(`fecha_cierre.is.null,fecha_cierre.gte.${hoy}`)
        .order('fecha_cierre', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!error) setConvocatorias((data || []) as Convocatoria[]);
      setCargandoConvocatorias(false);
    };

    const cargarPublicaciones = async () => {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('id, texto, imagen_url, es_video, red_social, enlace_url, fecha_publicacion')
        .eq('activo', true)
        .order('fecha_publicacion', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      if (!error) setPublicaciones((data || []) as Publicacion[]);
      setCargandoPublicaciones(false);
    };

    cargarPagina();
    cargarEdicion().then((edicion) => setNombreFestival(edicion?.nombre ?? null));
    cargarAliados();
    cargarConvocatorias();
    cargarPublicaciones();
    supabase
      .from('fdma_secciones')
      .select('id, anio, titulo, subtitulo, descripcion, fdma_actividades(id, titulo, subtitulo, descripcion, fecha, imagenes, videos, pdfs, ganadores, enlace_url)')
      .eq('activo', true)
      .order('anio', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const seccion = data as FdmaSeccion;
          setFdma({
            ...seccion,
            fdma_actividades: (seccion.fdma_actividades || []).map((actividad) => ({
              ...actividad,
              titulo: actividad.titulo || '',
              subtitulo: actividad.subtitulo || '',
              descripcion: actividad.descripcion || '',
              imagenes: Array.isArray(actividad.imagenes) ? actividad.imagenes : [],
              videos: Array.isArray(actividad.videos) ? actividad.videos : [],
              pdfs: Array.isArray(actividad.pdfs) ? actividad.pdfs : [],
              ganadores: Array.isArray(actividad.ganadores) ? actividad.ganadores : [],
            })),
          });
        }
      });
  }, [cargarTalleres]);

  return (
    <div className="min-h-screen bg-[#fcfaf2] font-sans">
      
  
      {/* Sección Hero con Degradado de Color (Adiós espacio en blanco) */}

      <section className="w-full px-6 pb-8 pt-7 text-center bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] flex flex-col items-center">
         <img
            src="/logo_fdma.svg"
            alt="Logo Festival del Medio Ambiente"
            className="mb-4 h-28 w-28 object-contain mix-blend-multiply md:h-32 md:w-32"
          />

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#4a3728] tracking-tight leading-tight mb-5 text-balance">
          {pagina.titulo} <br />
          <span className="text-[#2d6a4f]">{pagina.subtitulo}</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-700 font-medium mb-8 max-w-2xl mx-auto whitespace-pre-line">
          {pagina.descripcion}
        </p>

         <div className="mb-8 flex items-center gap-2">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook de FDMA"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm transition hover:bg-blue-50"
          >
            <img src="/fb-icon.svg" alt="Facebook" className="h-full w-full object-contain" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram de FDMA"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm transition hover:bg-pink-50"
          >
            <img src="/ig-icon.svg" alt="Instagram" className="h-full w-full object-contain" />
          </a>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <Link to="/agenda" className="rounded-full border-2 border-[#2d6a4f] px-6 py-2.5 text-center text-sm font-bold text-[#2d6a4f] transition hover:bg-[#2d6a4f] hover:text-white">
            Agenda Anual
            </Link>
            {pagina.mostrar_talleres && (
              <Link to="/talleres" className="rounded-full border-2 border-[#2d6a4f] px-6 py-2.5 text-center text-sm font-bold text-[#2d6a4f] transition hover:bg-[#2d6a4f] hover:text-white">
                Talleres y Registro
              </Link>
            )}
        </div>

        {/* Botones de Acción (Eco Guardianes) */}
        <div className="mt-6 flex w-full max-w-sm flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
          <Link
            to="/info"
            className="px-8 py-3.5 rounded-full bg-white text-[#4a3728] font-bold shadow-sm border border-gray-200 hover:bg-gray-50 hover:scale-105 transition-all text-center"
          >
            Conoce el Compostero
          </Link>
          <Link
            to="/acceso?modo=registro"
            className="px-8 py-3.5 rounded-full bg-[#2d6a4f] text-white font-bold shadow-md hover:bg-[#1b4332] hover:scale-105 transition-all text-center"
          >
            Crear Cuenta - Iniciar Sesión
          </Link>
        </div>
      </section>

      {pagina.mostrar_cartelera && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-8">
          <Link to="/cartelera" className="group flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-[#1a1716] p-6 text-white shadow-md sm:flex-row sm:items-center md:p-8">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-white/60">Cartelera oficial</p>
              <p className="text-2xl font-semibold md:text-3xl">{nombreFestival || pagina.festival_nombre || 'Festival del Medio Ambiente'}</p>
              <p className="mt-1 text-white/70">Horarios, sedes y participantes del día del festival.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1a1716] transition group-hover:scale-105">Ver cartelera →</span>
          </Link>
        </section>
      )}

      {pagina.mostrar_talleres && talleres.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-8">
          <div className="mb-8 flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-end">
            <h3 className="text-2xl font-bold text-[#4a3728] md:text-3xl">Próximos talleres</h3>
            <Link to="/talleres" className="font-semibold text-[#2d6a4f] hover:underline">Ver todos →</Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {talleres.map((taller) => (
              <TarjetaTaller key={taller.id} taller={taller} onRegistrarme={setTallerSeleccionado} />
            ))}
          </div>
        </section>
      )}

      {pagina.mostrar_calendario && eventosSemana.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-8">
          <div className="mb-6 flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-end">
            <h3 className="text-2xl font-bold text-[#4a3728] md:text-3xl">Esta semana</h3>
            <Link to="/calendario" className="font-semibold text-[#2d6a4f] hover:underline">Ver calendario →</Link>
          </div>
          {/* grid-cols-1 y min-w-0: sin ellos un título largo estira la columna más allá de la pantalla */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventosSemana.slice(0, 6).map((evento) => (
              <li key={evento.id} className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#4a3728]/10 bg-white p-4 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f8f5f2]">
                  <span className="text-xs font-bold uppercase text-[#4a3728]/60">{new Date(`${evento.fecha}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                  <span className="text-xl font-bold text-[#4a3728]">{Number(evento.fecha.slice(8))}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-start gap-2 font-semibold leading-snug text-[#4a3728]">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={estiloPunto(evento.categoria)} />
                    <span className="line-clamp-2 break-words">{evento.titulo}</span>
                  </p>
                  <p className="truncate text-sm text-[#4a3728]/60">{[formatearHora(evento.hora_inicio), evento.lugar].filter(Boolean).join(' · ')}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tallerSeleccionado && (
        <ModalRegistroTaller taller={tallerSeleccionado} onCerrar={() => setTallerSeleccionado(null)} onRegistrado={cargarTalleres} />
      )}
                  {pagina.mostrar_convocatorias && (
                  <section className="mx-auto mt-0 w-full max-w-7xl px-4 pt-6 sm:px-8">
                  <h3 className="mb-8 text-center text-2xl font-bold text-[#4a3728] md:text-3xl">Convocatorias</h3>
                  
                  {cargandoConvocatorias ? (
                    <p className="text-center text-[#4a3728]/70">Cargando convocatorias...</p>
                  ) : convocatorias.length === 0 ? (
                    <p className="text-center text-[#4a3728]/70">Próximamente habrá nuevas convocatorias.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {convocatorias.map((convocatoria) => (
                        <article 
                          key={convocatoria.id} 
                          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#4a3728]/10"
                        >
                          {/* Cartel completo (sin recorte) en 4:3; los lados se rellenan con el mismo cartel desenfocado.
                              Clic para verlo en grande y leer QR o letra chica */}
                          <button
                            type="button"
                            onClick={() => setCartelAbierto(convocatoria)}
                            className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-[#f8f5f2]"
                            title="Ver cartel completo"
                          >
                            <img src={convocatoria.imagen_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
                            <img src={convocatoria.imagen_url} alt={convocatoria.titulo} loading="lazy" className="relative h-full w-full object-contain drop-shadow-md" />
                          </button>
                          
                          <div className="flex flex-grow flex-col p-5">
                            {convocatoria.fecha_cierre && (
                              <span className="mb-2 inline-flex w-fit items-center rounded-full bg-[#db2777]/10 px-2.5 py-1 text-xs font-bold text-[#be185d]">
                                {textoCierre(convocatoria.fecha_cierre)}
                              </span>
                            )}
                            <h3 className="mb-2 text-xl font-bold text-[#4a3728]">{convocatoria.titulo}</h3>
                            <p className="mb-5 line-clamp-3 text-base leading-relaxed text-[#4a3728]/75" title={convocatoria.descripcion}>
                              {convocatoria.descripcion}
                            </p>
                            
                            {/* Botón de enlace condicional alineado siempre al fondo de la tarjeta */}
                            {convocatoria.enlace_url && (
                              <a 
                                href={convocatoria.enlace_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-auto block w-full rounded-xl bg-green-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-green-700 shadow-sm"
                              >
                                {convocatoria.texto_boton || 'Registro'}
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {cartelAbierto && (
                    <VisorImagenes fotos={[cartelAbierto.imagen_url]} indice={0} nombre={cartelAbierto.titulo} onCambiar={() => {}} onCerrar={() => setCartelAbierto(null)} />
                  )}
                  </section>
                  )}
      {fdma && fdma.fdma_actividades.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8">
          <div className="mb-7 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2d6a4f]">Edición {fdma.anio}</p>
            <h3 className="mt-1 text-2xl font-bold text-[#4a3728] md:text-3xl">{fdma.titulo || `FDMA ${fdma.anio}`}</h3>
            {fdma.subtitulo && <p className="mt-1 font-semibold text-[#2d6a4f]">{fdma.subtitulo}</p>}
            {fdma.descripcion && <p className="mx-auto mt-2 max-w-3xl text-[#4a3728]/75">{fdma.descripcion}</p>}
          </div>
          <FdmaCarruselGlobal actividades={fdma.fdma_actividades} anio={fdma.anio} />
          <div className="grid gap-6 md:grid-cols-2">
            {fdma.fdma_actividades.map((actividad) => (
              <article key={actividad.id} className="overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm">
                <FdmaCarrusel actividad={actividad} />
                <div className="p-5">
                  {actividad.fecha && <p className="text-sm font-bold uppercase tracking-wide text-[#2d6a4f]">{new Date(`${actividad.fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</p>}
                  <h4 className="mt-1 text-xl font-bold text-[#4a3728]">{actividad.titulo}</h4>
                  {actividad.subtitulo && <p className="mt-1 font-semibold text-[#2d6a4f]">{actividad.subtitulo}</p>}
                  {actividad.descripcion && <p className="mt-2 text-[#4a3728]/75">{actividad.descripcion}</p>}
                  {actividad.videos.length > 0 && <div className="mt-4 space-y-3"><p className="text-sm font-bold text-[#2d6a4f]">Videos</p>{actividad.videos.map((video) => /\.(mp4|webm|ogg)(\?|$)/i.test(video) ? <video key={video} src={video} controls className="w-full rounded-xl" /> : <a key={video} href={video} target="_blank" rel="noreferrer" className="block truncate text-sm text-blue-700 underline">Ver video</a>)}</div>}
                  {actividad.pdfs.length > 0 && <div className="mt-4 rounded-xl border border-[#2d6a4f]/20 bg-[#f4f8f2] p-4"><p className="text-sm font-bold text-[#2d6a4f]">Documentos</p><div className="mt-2 flex flex-wrap gap-2">{actividad.pdfs.map((pdf, indice) => <a key={pdf} href={pdf} target="_blank" rel="noreferrer" className="rounded-full bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white hover:bg-[#1b4332]">Ver PDF{actividad.pdfs.length > 1 ? ` ${indice + 1}` : ''}</a>)}</div></div>}
                  {actividad.ganadores.length > 0 && <div className="mt-5 rounded-xl bg-[#d8ece1] p-4"><h5 className="font-bold text-[#4a3728]">Ganadores de la Feria de Proyectos</h5><div className="mt-3 grid gap-3 md:grid-cols-3">{actividad.ganadores.map((ganador) => <FdmaGanadorCard key={ganador.lugar} ganador={ganador} />)}</div></div>}
                  {actividad.enlace_url && <a href={actividad.enlace_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white hover:bg-[#1b4332]">Ver actividad</a>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {/* Últimas publicaciones de FB / IG (se administran en /admin/publicaciones) */}
      {pagina.mostrar_publicaciones && (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <h3 className="text-2xl font-bold text-[#4a3728] md:text-3xl">Comunidad FDMA en Acción</h3>
          <div className="flex gap-2">
            <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-[#4a3728]/10 bg-white px-4 py-2 text-sm font-semibold text-[#4a3728] shadow-sm transition hover:bg-blue-50">
              <img src="/fb-icon.svg" alt="" className="h-5 w-5" /> Facebook
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-[#4a3728]/10 bg-white px-4 py-2 text-sm font-semibold text-[#4a3728] shadow-sm transition hover:bg-pink-50">
              <img src="/ig-icon.svg" alt="" className="h-5 w-5" /> @fdma.mx
            </a>
          </div>
        </div>

        {cargandoPublicaciones ? (
          <p className="text-center text-[#4a3728]/70">Cargando publicaciones...</p>
        ) : publicaciones.length === 0 ? (
          <p className="text-center text-[#4a3728]/70">Síguenos en redes sociales para enterarte de nuestras actividades.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {publicaciones.map((publicacion) => (
              <a
                key={publicacion.id}
                href={publicacion.enlace_url || (publicacion.red_social === 'facebook' ? FACEBOOK_URL : INSTAGRAM_URL)}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-[#f8f5f2]">
                  {publicacion.imagen_url ? (
                    <img src={publicacion.imagen_url} alt={publicacion.texto || 'Publicación de FDMA'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    // Post solo de texto: el texto ocupa el cuadro, con el logo de FDMA de fondo
                    <div className="flex h-full w-full items-center bg-gradient-to-br from-[#2d6a4f] to-[#1b4332] p-4 pt-11">
                      <img src="/logo_fdma.svg" alt="" className="absolute bottom-2 right-2 h-14 w-14 opacity-20" />
                      <p className="relative line-clamp-6 text-sm font-medium leading-snug text-white md:text-base">{publicacion.texto}</p>
                    </div>
                  )}
                  <img src={publicacion.red_social === 'facebook' ? '/fb-icon.svg' : '/ig-icon.svg'} alt="" className="absolute left-2 top-2 h-7 w-7 rounded-full bg-white p-1 shadow" />
                  {publicacion.es_video && (
                    <span aria-label="Video" className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl text-white shadow-lg transition group-hover:bg-black/70">
                      <span className="ml-1">▶</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-grow flex-col p-3">
                  {publicacion.texto && publicacion.imagen_url && <p className="mb-2 line-clamp-3 text-sm leading-snug text-[#4a3728]/80">{publicacion.texto}</p>}
                  <span className="mt-auto text-xs font-medium text-[#2d6a4f]">{formatearFecha(publicacion.fecha_publicacion)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
      )}

                  {/* SECCIÓN ALIADOS Y COMUNIDAD (se administran en /admin/aliados) */}
                {pagina.mostrar_aliados && aliados.length > 0 && (
                <section className="w-full bg-[#2d6a4f] py-12 overflow-hidden">
                  <div className="impact-inner">
                    <div className="impact-header">
                      <p className="impact-kicker">Aliados de la comunidad</p>
                      <h2 className="impact-title">FDMA</h2>
                    </div>
                    </div>

                  <div className="partner-marquee overflow-hidden w-full relative">
                    <div className="partner-track">
                      {[...aliados, ...aliados].map((aliado, idx) => (
                        <a
                          key={`${aliado.id}-${idx}`}
                          href={aliado.enlace_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-white transition hover:bg-white/20 backdrop-blur-sm"
                        >
                          <img src={aliado.imagen_url} alt={aliado.nombre} className="h-7 w-7 rounded-full object-cover bg-white" />
                          <span className="font-semibold text-sm">{aliado.nombre}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
                )}


    </div>
  );
};

export default LandingFDMA;