import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VisorImagenes } from '@/components/VisorImagenes';

interface ActividadRealizadaDetalle {
  id: string;
  slug: string | null;
  tipo_actividad: string;
  organizacion: string;
  proyecto_tema: string;
  descripcion: string;
  fecha: string | null;
  imagenes: string[];
  videos: string[];
}

export default function ActividadDetalle() {
  const { slug } = useParams<{ slug: string }>();
  const [actividad, setActividad] = useState<ActividadRealizadaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [visorIndice, setVisorIndice] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let vigente = true;
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const consulta = supabase.from('actividades_realizadas').select('*').eq('activo', true);

    (esUuid ? consulta.eq('id', slug) : consulta.eq('slug', slug)).maybeSingle().then(({ data, error }) => {
      if (!vigente) return;
      if (error) console.error('Error cargando actividad:', error);
      if (data) {
        setActividad({
          ...(data as ActividadRealizadaDetalle),
          imagenes: Array.isArray(data.imagenes) ? data.imagenes : [],
          videos: Array.isArray(data.videos) ? data.videos : [],
        });
      }
      setCargando(false);
    });

    return () => {
      vigente = false;
    };
  }, [slug]);

  if (cargando) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#fcfaf2]"><Loader2 className="h-8 w-8 animate-spin text-[#2d6a4f]" /></div>;
  }

  if (!actividad) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#4a3728]">Actividad no encontrada</h1>
        <p className="mt-2 text-[#4a3728]/70">Es posible que esta publicación ya no esté disponible.</p>
        <Link to="/#actividades-realizadas" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2d6a4f] px-6 py-3 text-sm font-bold text-white hover:bg-[#1b4332]"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link>
      </div>
    );
  }

  const portada = actividad.imagenes[0] || '/logo_fdma.svg';

  return (
    <article className="min-h-screen bg-[#fcfaf2] pb-16">
      <header className="relative flex min-h-[340px] w-full flex-col justify-between overflow-hidden bg-[#1b4332] px-4 py-8 text-white sm:min-h-[420px] sm:px-8">
        {actividad.imagenes.length > 0 && <img src={portada} alt={actividad.proyecto_tema} className="absolute inset-0 h-full w-full object-cover opacity-35" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <Link to="/#actividades-realizadas" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link>
        </div>
        <div className="relative z-10 mx-auto my-auto max-w-4xl py-8 text-center">
          {actividad.tipo_actividad && <span className="inline-block rounded-full bg-[#7bc35b] px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-[#1b4332] shadow-sm">{actividad.tipo_actividad}</span>}
          <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow sm:text-5xl">{actividad.organizacion}</h1>
          <p className="mt-3 text-lg font-semibold text-white/95 sm:text-2xl">{actividad.proyecto_tema}</p>
          {actividad.fecha && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80">
              <Calendar className="h-4 w-4" />
              {new Date(`${actividad.fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-8">
        {actividad.descripcion && <div className="mx-auto max-w-3xl space-y-4 whitespace-pre-line text-center text-base leading-relaxed text-[#4a3728]/85 sm:text-lg">{actividad.descripcion}</div>}
        {actividad.imagenes.length > 0 && (
          <section aria-label="Galería de fotos" className="mt-10">
            <div className="columns-2 gap-3 space-y-3 sm:columns-3 md:columns-4">
              {actividad.imagenes.map((url, idx) => (
                <button key={`${url}-${idx}`} type="button" onClick={() => { setVisorIndice(idx); setVisorAbierto(true); }} className="group block break-inside-avoid w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#4a3728]/10 bg-white shadow-sm transition hover:shadow-md">
                  <img src={url} alt={`${actividad.proyecto_tema} — foto ${idx + 1}`} loading="lazy" className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                </button>
              ))}
            </div>
          </section>
        )}
        {actividad.videos.length > 0 && (
          <section aria-label="Videos de la actividad" className="mt-10 space-y-4">
            <h2 className="text-center text-xl font-bold text-[#4a3728]">Videos de la jornada</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {actividad.videos.map((video) => <video key={video} src={video} controls className="w-full overflow-hidden rounded-2xl border border-[#4a3728]/10 bg-black shadow-sm" />)}
            </div>
          </section>
        )}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#2d6a4f]/20 bg-[#d8ece1]/75 px-6 py-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-base font-bold text-[#4a3728]">¿Quieres realizar una actividad ambiental con nosotros en tu empresa, escuela o colonia?</p>
            <p className="mt-1 text-sm text-[#4a3728]/75">Visita nuestro directorio para ponerte en contacto con el equipo de FDMA.</p>
          </div>
          <Link to="/directorio" className="shrink-0 rounded-full bg-[#2d6a4f] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1b4332]">Contactar en directorio →</Link>
        </div>
      </div>
      {visorAbierto && <VisorImagenes fotos={actividad.imagenes} indice={visorIndice} nombre={`${actividad.organizacion} — ${actividad.proyecto_tema}`} onCambiar={setVisorIndice} onCerrar={() => setVisorAbierto(false)} />}
    </article>
  );
}
