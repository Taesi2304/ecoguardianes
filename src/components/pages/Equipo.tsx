import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Search, Sprout } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { agruparPorArea, CAMPOS_INTEGRANTE, crearSlug, FotoIntegrante, RedesIntegrante } from '@/components/Equipo/equipo';
import type { Integrante } from '@/components/Equipo/equipo';

const TODAS = 'Todas';

function TarjetaIntegrante({ integrante }: { integrante: Integrante }) {
  return (
    <Link
      to={`/equipo/${integrante.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[#4a3728]/10 bg-white shadow-sm transition duration-300 motion-safe:hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6a4f]/40"
    >
      {/* La foto se acerca y deja ver la semblanza corta al pasar el cursor */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#d8ece1]">
        <FotoIntegrante integrante={integrante} className="h-full w-full transition duration-500 motion-safe:group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1b4332]/90 via-[#1b4332]/50 to-transparent px-5 pb-4 pt-16 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-[#b7e4c7]">{integrante.area}</p>
          {integrante.resumen && (
            <p className="mt-2 line-clamp-3 max-h-0 text-sm leading-snug opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100 group-focus-visible:max-h-24 group-focus-visible:opacity-100">
              {integrante.resumen}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-extrabold leading-tight text-[#4a3728]">{integrante.nombre}</h3>
          <p className="mt-1 text-sm font-semibold text-[#2d6a4f]">{integrante.cargo}</p>
          {integrante.emprendimiento && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600"><Sprout className="h-4 w-4 shrink-0 text-[#2d6a4f]" />{integrante.emprendimiento}</p>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <RedesIntegrante redes={integrante.redes} nombre={integrante.nombre} />
          <span className="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold text-[#2d6a4f]">
            Ver perfil <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Equipo() {
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [area, setArea] = useState(TODAS);

  useEffect(() => {
    supabase
      .from('equipo')
      .select(CAMPOS_INTEGRANTE)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setIntegrantes((data || []) as Integrante[]);
        setCargando(false);
      });
  }, []);

  const grupos = useMemo(() => agruparPorArea(integrantes), [integrantes]);

  const gruposVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return grupos
      .filter((grupo) => area === TODAS || grupo.area === area)
      .map((grupo) => ({
        ...grupo,
        miembros: grupo.miembros.filter((miembro) => !termino || [miembro.nombre, miembro.cargo, miembro.emprendimiento ?? '']
          .some((campo) => campo.toLowerCase().includes(termino))),
      }))
      .filter((grupo) => grupo.miembros.length > 0);
  }, [grupos, area, busqueda]);

  return (
    <div className="min-h-screen bg-[#fcfaf2]">
      <section className="bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] px-6 pb-10 pt-12 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#2d6a4f]">Quiénes hacemos el festival</p>
        <h1 className="mb-4 text-4xl font-extrabold text-[#4a3728] md:text-5xl">Equipo FDMA</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-700">
          Conoce a las personas que organizan el Festival del Medio Ambiente, lo que hacen y sus proyectos.
        </p>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8">
        {cargando ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
        ) : integrantes.length === 0 ? (
          <p className="py-12 text-center text-[#4a3728]/70">Muy pronto conocerás aquí al equipo de FDMA.</p>
        ) : (
          <>
            <div className="mb-10 flex flex-col gap-4 rounded-3xl border border-[#4a3728]/10 bg-white p-4 shadow-sm sm:p-5">
              <label className="relative block">
                <span className="sr-only">Buscar en el equipo</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, cargo o emprendimiento"
                  className="w-full rounded-full border border-gray-200 bg-[#fcfaf2] py-3 pl-12 pr-4 text-[#4a3728] focus:border-[#2d6a4f] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20"
                />
              </label>
              {grupos.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por área">
                  {[TODAS, ...grupos.map((grupo) => grupo.area)].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setArea(opcion)}
                      aria-pressed={area === opcion}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${area === opcion
                        ? 'bg-[#2d6a4f] text-white'
                        : 'bg-[#d8ece1]/60 text-[#2d6a4f] hover:bg-[#d8ece1]'}`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {gruposVisibles.length === 0 ? (
              <p className="py-12 text-center text-[#4a3728]/70">No encontramos a nadie con esa búsqueda.</p>
            ) : (
              <div className="space-y-14">
                {gruposVisibles.map((grupo) => (
                  <section key={grupo.area} aria-labelledby={`area-${crearSlug(grupo.area)}`}>
                    <div className="mb-6 flex items-center gap-4">
                      <h2 id={`area-${crearSlug(grupo.area)}`} className="text-2xl font-extrabold text-[#4a3728]">{grupo.area}</h2>
                      <span className="h-px flex-1 bg-[#4a3728]/15" />
                      <span className="text-sm font-semibold text-[#2d6a4f]">{grupo.miembros.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {grupo.miembros.map((integrante) => <TarjetaIntegrante key={integrante.id} integrante={integrante} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
