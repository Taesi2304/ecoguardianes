import { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import { VisorImagenes } from '@/components/VisorImagenes';
import { Presentaciones } from './Presentaciones';
import type { Catalogo, Participante } from './cartelera';

// Como en la referencia de ITCA: de frente la descripción, al voltear las fotos.
// Las dos caras ocupan la misma celda del grid, así la tarjeta mide lo que la más alta.
function TarjetaDosCaras({ nombre, descripcion, imagenes, color, onAmpliar }: {
  nombre: string;
  descripcion: string | null;
  imagenes: string[];
  color: string;
  onAmpliar: (indice: number) => void;
}) {
  const hayFotos = imagenes.length > 0;
  // Sin descripción no hay nada que voltear: se muestran las fotos directo
  const [volteada, setVolteada] = useState(!descripcion);
  const [foto, setFoto] = useState(0);

  if (!descripcion && !hayFotos) return null;

  const cara = 'col-start-1 row-start-1 flex flex-col rounded-xl border backface-hidden';
  const botonCara = 'rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10';

  return (
    <div className="perspective-[1600px]">
      <div className={`grid transition-transform duration-700 transform-3d motion-reduce:transition-none ${volteada && descripcion ? 'rotate-y-180' : ''}`}>
        {descripcion && (
          <section inert={volteada} className={`${cara} border-white/15 bg-black/20 p-5`}>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-white/50">Descripción</p>
            <p className="max-w-2xl flex-1 leading-relaxed text-white/80">{descripcion}</p>
            {hayFotos && (
              <button type="button" onClick={() => setVolteada(true)} className={`${botonCara} mt-4 self-end`}>
                Ver fotografías
              </button>
            )}
          </section>
        )}

        {hayFotos && (
          <section inert={!volteada} className={`${cara} relative overflow-hidden bg-black/30 ${descripcion ? 'rotate-y-180' : ''}`} style={{ borderColor: `${color}99` }}>
            <button type="button" onClick={() => onAmpliar(foto)} className="block aspect-[4/3] w-full cursor-zoom-in" aria-label="Ver foto en grande">
              <img src={imagenes[foto]} alt={`${nombre} — foto ${foto + 1}`} loading="lazy" className="h-full w-full object-cover" />
            </button>

            {imagenes.length > 1 && (
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-black/50 text-sm text-white">
                <button type="button" onClick={() => setFoto((actual) => (actual - 1 + imagenes.length) % imagenes.length)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Foto anterior"><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-12 text-center tabular-nums">{foto + 1} de {imagenes.length}</span>
                <button type="button" onClick={() => setFoto((actual) => (actual + 1) % imagenes.length)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Foto siguiente"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}

            {descripcion && (
              <button type="button" onClick={() => setVolteada(false)} className={`${botonCara} absolute bottom-3 right-3`}>
                Ver descripción
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function EnlaceRedes({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
      <ExternalLink className="h-4 w-4" /> Ver en redes
    </a>
  );
}

interface FichaProps {
  participante: Participante;
  tipo?: Catalogo;
  activa: boolean;
  fecha: string | null;
  onEnfocar: () => void;
}

// Una ficha de la columna derecha. En escritorio la descripción y los horarios
// se leen en el panel izquierdo; en celular la ficha lleva todo.
export function FichaParticipante({ participante, tipo, activa, fecha, onEnfocar }: FichaProps) {
  const color = tipo?.color ?? '#ffffff';
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);
  const caras = { nombre: participante.nombre, imagenes: participante.imagenes, color, onAmpliar: setFotoAbierta };

  return (
    <article
      // En escritorio, tocar una ficha tenue la trae al centro
      onClickCapture={(e) => {
        if (!activa && window.matchMedia('(min-width: 1024px)').matches) {
          e.stopPropagation();
          e.preventDefault();
          onEnfocar();
        }
      }}
      className={`origin-right transition duration-500 ease-out motion-reduce:transition-none ${activa ? '' : 'lg:scale-[0.97] lg:cursor-pointer lg:opacity-45'}`}
    >
      <div
        className="space-y-4 rounded-2xl border bg-[#10241b]/80 p-4 backdrop-blur-md transition-colors sm:p-5"
        style={{ borderColor: activa ? `${color}cc` : 'rgba(255,255,255,0.12)' }}
      >
        <div className="flex items-start justify-between gap-4">
          {tipo
            ? <span className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: color }}>{tipo.nombre}</span>
            : <span />}
          {participante.procedencia && (
            <span className="flex items-center gap-1.5 pt-1.5 text-xs font-medium uppercase tracking-[0.15em] text-white/60">
              <MapPin className="h-3.5 w-3.5" />{participante.procedencia}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{participante.nombre}</h2>
          {participante.subtitulo && <p className="mt-1 text-white/70">{participante.subtitulo}</p>}
        </div>

        {/* Celular: descripción y fotos en la tarjeta que se voltea */}
        <div className="lg:hidden">
          <TarjetaDosCaras key={`${participante.id}-movil`} descripcion={participante.descripcion} {...caras} />
        </div>
        {/* Escritorio: solo las fotos; la descripción está en el panel izquierdo */}
        <div className="hidden lg:block">
          <TarjetaDosCaras key={`${participante.id}-escritorio`} descripcion={null} {...caras} />
        </div>

        <div className="space-y-4 lg:hidden">
          <Presentaciones key={fecha ?? 'todos'} participante={participante} fecha={fecha} />
          <EnlaceRedes url={participante.enlace_url} />
        </div>
      </div>

      {fotoAbierta !== null && (
        <VisorImagenes fotos={participante.imagenes} indice={fotoAbierta} nombre={`Fotos de ${participante.nombre}`} onCambiar={setFotoAbierta} onCerrar={() => setFotoAbierta(null)} />
      )}
    </article>
  );
}

// Panel izquierdo (escritorio): lo que se lee de la ficha que está al centro de la pantalla
export function DetalleActivo({ participante, fecha }: { participante: Participante; fecha: string | null }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-white">{participante.nombre}</h3>
        {participante.subtitulo && <p className="mt-0.5 text-sm text-white/60">{participante.subtitulo}</p>}
      </div>
      {participante.descripcion && <p className="text-sm leading-relaxed text-white/75">{participante.descripcion}</p>}
      <Presentaciones key={`${participante.id}-${fecha ?? 'todos'}`} participante={participante} fecha={fecha} />
      <EnlaceRedes url={participante.enlace_url} />
    </div>
  );
}
