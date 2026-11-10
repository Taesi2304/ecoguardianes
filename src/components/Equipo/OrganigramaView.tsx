import { useMemo, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { FotoIntegrante } from './EquipoUi';
import type { Integrante } from './equipo';

export const ORGANIGRAMA_AREAS = [
  {
    id: 'talento',
    nombre: 'Coordinación de Talento y Expositores',
    color: 'bg-[#8b5cf6]',
    ring: 'ring-[#8b5cf6]',
    texto: 'text-[#6d28d9]',
    palabrasClave: ['talento', 'expositor', 'taller', 'conferencia', 'alianza'],
  },
  {
    id: 'logistica',
    nombre: 'Logística y Espacios',
    color: 'bg-[#21a6c7]',
    ring: 'ring-[#21a6c7]',
    texto: 'text-[#087f9d]',
    palabrasClave: ['logistica', 'logística', 'espacio', 'infraestructura', 'operativa', 'administracion', 'administración'],
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación y Marketing',
    color: 'bg-[#d58b3f]',
    ring: 'ring-[#d58b3f]',
    texto: 'text-[#a55b16]',
    palabrasClave: ['comunicacion', 'comunicación', 'marketing', 'redes', 'digital', 'difusion', 'difusión', 'diseño'],
  },
] as const;

type AreaOrganigrama = typeof ORGANIGRAMA_AREAS[number];

export function agruparParaOrganigrama(integrantes: Integrante[]) {
  return ORGANIGRAMA_AREAS.map((area) => ({
    ...area,
    miembros: integrantes.filter((integrante) => {
      const nombreArea = integrante.area.toLocaleLowerCase();
      return area.palabrasClave.some((palabra) => nombreArea.includes(palabra));
    }),
  }));
}

function TarjetaOrganigrama({ integrante, area }: { integrante: Integrante; area: AreaOrganigrama }) {
  return (
    <article className={`flex min-h-20 items-center gap-3 rounded-xl bg-[#e8edf1] p-2.5 pr-4 shadow-sm ring-2 ${area.ring}`}>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#d8ece1]">
        <FotoIntegrante integrante={integrante} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#4a3728]">{integrante.nombre}</p>
        <p className={`mt-1 text-[0.65rem] font-extrabold uppercase leading-tight ${area.texto}`}>{integrante.cargo}</p>
      </div>
    </article>
  );
}

export async function exportarOrganigrama(elemento: HTMLElement, nombreArchivo = 'organigrama-fdma.png') {
  const canvas = await html2canvas(elemento, {
    backgroundColor: '#f8f1e4',
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    logging: false,
  });

  const enlace = document.createElement('a');
  enlace.download = nombreArchivo;
  enlace.href = canvas.toDataURL('image/png');
  enlace.click();
}

export function OrganigramaView({ integrantes }: { integrantes: Integrante[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const grupos = useMemo(() => agruparParaOrganigrama(integrantes), [integrantes]);
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    if (!contenedorRef.current || descargando) return;

    setDescargando(true);
    try {
      await exportarOrganigrama(contenedorRef.current);
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
        <div className="min-w-[900px]">
          <div className="relative mx-auto w-fit rounded-xl bg-[#7bc35b] px-10 py-4 text-center text-sm font-extrabold uppercase leading-tight text-white shadow-sm after:absolute after:bottom-0 after:left-1/2 after:h-8 after:w-px after:translate-y-full after:border-l-2 after:border-dotted after:border-[#a9b5b8]">
            Coordinación
            <br />
            General
          </div>

          <div className="relative mt-16 grid grid-cols-3 gap-8 before:absolute before:left-[16.66%] before:right-[16.66%] before:top-0 before:border-t-2 before:border-dotted before:border-[#a9b5b8]">
            {grupos.map((area) => (
              <section key={area.id} className="relative pt-8 before:absolute before:left-1/2 before:top-0 before:h-8 before:border-l-2 before:border-dotted before:border-[#a9b5b8]">
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

