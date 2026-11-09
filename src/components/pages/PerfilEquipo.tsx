import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CAMPOS_INTEGRANTE } from '@/components/Equipo/equipo';
import type { Integrante } from '@/components/Equipo/equipo';
import { EmprendimientoIntegrante, FotoIntegrante, RedesIntegrante } from '@/components/Equipo/EquipoUi';

export default function PerfilEquipo() {
  const { slug } = useParams();
  const [integrante, setIntegrante] = useState<Integrante | null>(null);
  const [companeros, setCompaneros] = useState<Integrante[]>([]);
  // Slug del perfil ya cargado: al pasar a otra persona vuelve a mostrar el indicador de carga
  const [slugCargado, setSlugCargado] = useState<string | null>(null);
  const cargando = slugCargado !== slug;

  useEffect(() => {
    let vigente = true;

    (async () => {
      const { data } = await supabase
        .from('directorio')
        .select(CAMPOS_INTEGRANTE)
        .eq('slug', slug ?? '')
        .eq('activo', true)
        .maybeSingle();
      const encontrado = data as Integrante | null;

      // Otras personas de la misma área, para seguir navegando
      const { data: mismaArea } = encontrado
        ? await supabase
          .from('directorio')
          .select(CAMPOS_INTEGRANTE)
          .eq('area', encontrado.area)
          .eq('activo', true)
          .neq('id', encontrado.id)
          .order('orden', { ascending: true })
          .limit(4)
        : { data: [] };

      if (!vigente) return;
      setIntegrante(encontrado);
      setCompaneros((mismaArea || []) as Integrante[]);
      if (encontrado) document.title = `FDMA | ${encontrado.nombre}`;
      setSlugCargado(slug ?? null);
    })();

    return () => { vigente = false; };
  }, [slug]);

  if (cargando) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#fcfaf2]"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
  }

  if (!integrante) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#fcfaf2] px-6 text-center">
        <p className="text-lg text-[#4a3728]">No encontramos a esta persona en el equipo.</p>
        <Link to="/directorio" className="rounded-full bg-[#2d6a4f] px-5 py-2.5 font-semibold text-white hover:bg-[#1b4332]">Ver todo el equipo</Link>
      </div>
    );
  }

  const parrafos = (integrante.trayectoria ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#fcfaf2]">
      <section className="bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] px-4 pb-12 pt-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link to="/directorio" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#2d6a4f] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Todo el equipo
          </Link>

          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:gap-12">
            <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[2rem] border-4 border-white shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
              <FotoIntegrante integrante={integrante} className="aspect-[4/5] w-full" />
            </div>

            <div className="text-center md:text-left">
              <p className="text-sm font-bold uppercase tracking-widest text-[#2d6a4f]">{integrante.area}</p>
              <h1 className="mt-2 text-4xl font-extrabold leading-tight text-[#4a3728] md:text-5xl">{integrante.nombre}</h1>
              <p className="mt-3 text-xl font-semibold text-[#2d6a4f]">{integrante.cargo}</p>
              <EmprendimientoIntegrante integrante={integrante} className="mt-3 rounded-full bg-white py-1.5 pl-2 pr-4 text-sm font-semibold text-[#4a3728] shadow-sm" />
              {integrante.resumen && <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-700 md:mx-0">{integrante.resumen}</p>}
              <div className="mt-6 flex justify-center md:justify-start">
                <RedesIntegrante redes={integrante.redes} nombre={integrante.nombre} tamano="grande" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {parrafos.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-8">
          <h2 className="mb-4 text-2xl font-extrabold text-[#4a3728]">Trayectoria</h2>
          <div className="space-y-4 text-lg leading-relaxed text-gray-700">
            {parrafos.map((parrafo, indice) => <p key={indice} className="whitespace-pre-line">{parrafo}</p>)}
          </div>
        </section>
      )}

      {companeros.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <h2 className="mb-6 text-xl font-extrabold text-[#4a3728]">También en {integrante.area}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {companeros.map((companero) => (
              <Link key={companero.id} to={`/directorio/${companero.slug}`} className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-4 text-center shadow-sm transition hover:shadow-md">
                <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-[#d8ece1] transition group-hover:ring-[#2d6a4f]">
                  <FotoIntegrante integrante={companero} className="h-full w-full transition duration-500 motion-safe:group-hover:scale-110" />
                </div>
                <div>
                  <p className="font-bold leading-tight text-[#4a3728]">{companero.nombre}</p>
                  <p className="mt-1 text-xs font-semibold text-[#2d6a4f]">{companero.cargo}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
