import { useMemo, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FotoIntegrante } from './EquipoUi';
import type { Integrante } from './equipo';
import { AREA_GENERAL, agruparParaOrganigrama, exportarOrganigrama, type AreaOrganigrama } from './organigrama';

function TarjetaOrganigrama({ integrante, area }: { integrante: Integrante; area: AreaOrganigrama }) {
  return (
    <article className={`flex min-h-20 items-center gap-3 rounded-xl bg-[#e8edf1] p-2.5 pr-4 shadow-sm ring-2 ${area.ring}`}>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#d8ece1]">
        <FotoIntegrante integrante={integrante} className="h-full w-full" />
      </div>
      <div className="min-w-0 pb-2">
        <p className="truncate pb-1 text-sm font-bold leading-relaxed text-[#4a3728]">{integrante.nombre}</p>
        <p className={`mt-1 pb-1 text-[0.65rem] font-extrabold uppercase leading-relaxed ${area.texto}`}>{integrante.cargo}</p>
      </div>
    </article>
  );
}

export function OrganigramaView({ integrantes }: { integrantes: Integrante[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLDivElement>(null);
  const { general, grupos } = useMemo(() => agruparParaOrganigrama(integrantes), [integrantes]);
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    if (!lienzoRef.current || descargando) return;

    setDescargando(true);
    try {
      await exportarOrganigrama(lienzoRef.current);
    } catch (error) {
      console.error('No se pudo exportar el organigrama.', error);
      window.alert('No se pudo descargar el organigrama. Intenta nuevamente.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-organigrama">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#2d6a4f]">Estructura del equipo</p>
          <h1 id="titulo-organigrama" className="mt-1 text-3xl font-extrabold text-[#4a3728]">Organigrama FDMA</h1>
        </div>
        <button
          type="button"
          onClick={descargar}
          disabled={descargando}
          className="inline-flex items-center gap-2 rounded-full bg-[#2d6a4f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b4332] disabled:cursor-wait disabled:opacity-70"
        >
          {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {descargando ? 'Preparando imagen...' : 'Descargar Organigrama'}
        </button>
      </div>

      <div ref={contenedorRef} id="organigrama-container" className="overflow-x-auto rounded-3xl bg-[#f8f1e4] p-5 shadow-sm sm:p-8">
        <div ref={lienzoRef} className="box-border w-[1152px] bg-[#f8f1e4] p-8">
          <div className="relative z-10 mx-auto w-fit rounded-xl bg-[#7bc35b] px-10 py-4 text-center text-sm font-extrabold uppercase leading-tight text-white shadow-sm">
            Coordinación
            <br />
            General
          </div>

          {general.length > 0 && (
            <>
              <svg
                className="mt-4 block h-10 w-full"
                viewBox="0 0 1100 40"
                role="img"
                aria-label="Conexiones de Coordinación General"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker id="flecha-general" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#84949a" />
                  </marker>
                </defs>
                <path d="M550 0 V12 M382 12 H718 M382 12 V38 M718 12 V38" fill="none" stroke="#84949a" strokeWidth="3" strokeDasharray="8 6" />
                <path d="M382 38 V40 M718 38 V40" fill="none" stroke="#84949a" strokeWidth="3" markerEnd="url(#flecha-general)" />
              </svg>
              <div className="mx-auto grid max-w-2xl grid-cols-2 gap-4">
              {general.map((integrante) => (
                <TarjetaOrganigrama
                  key={integrante.id}
                  integrante={integrante}
                  area={AREA_GENERAL}
                />
              ))}
              </div>
            </>
          )}

          <svg
            className="mt-12 block h-16 w-full"
            viewBox="0 0 1100 64"
            role="img"
            aria-label="Conexiones hacia las coordinaciones"
            preserveAspectRatio="none"
          >
            <defs>
              <marker id="flecha-ramas" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#84949a" />
              </marker>
            </defs>
            <path d="M550 0 V16 M173 16 H927 M173 16 V60 M550 16 V60 M927 16 V60" fill="none" stroke="#84949a" strokeWidth="3" strokeDasharray="8 6" />
            <path d="M173 58 V64 M550 58 V64 M927 58 V64" fill="none" stroke="#84949a" strokeWidth="3" markerEnd="url(#flecha-ramas)" />
          </svg>

          <div className="grid grid-cols-3 gap-8">
            {grupos.map((area) => (
              <section key={area.id}>
                <h2 className={`mx-auto flex min-h-14 max-w-[230px] items-center justify-center px-4 py-3 text-center text-sm font-extrabold uppercase leading-tight text-white shadow-sm ${area.color}`}>
                  {area.nombre}
                </h2>
                <div className="mt-6 space-y-4">
                  {area.miembros.length > 0 ? area.miembros.map((integrante) => (
                    <TarjetaOrganigrama key={integrante.id} integrante={integrante} area={area} />
                  )) : (
                    <p className="rounded-xl border border-dashed border-[#a9b5b8] p-4 text-center text-sm text-[#74625a]">
                      Sin integrantes registrados
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
