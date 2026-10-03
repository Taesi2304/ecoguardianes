import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, HandCoins } from 'lucide-react';
import { VisorImagenes } from '@/components/VisorImagenes';
import { Presentaciones } from './Presentaciones';
import { textoCostoCartelera } from './cartelera';
import type { Catalogo, Participante } from './cartelera';

// Tarjeta de dos caras: fotos y descripción, se voltea con un botón.
// Las dos caras ocupan la misma celda del grid, así la tarjeta mide lo que la más alta.
const SEGUNDOS_POR_FOTO = 1.5;

function TarjetaDosCaras({ nombre, descripcion, imagenes, color, animar, onAmpliar }: {
  nombre: string;
  descripcion: string | null;
  imagenes: string[];
  color: string;
  animar: boolean; // Solo la ficha activa pasa sus fotos sola
  onAmpliar: (indice: number) => void;
}) {
  const hayFotos = imagenes.length > 0;
  // Empieza en las fotos porque llaman más la atención; la descripción queda al voltear.
  // Sin fotos se muestra la descripción
  const [volteada, setVolteada] = useState(hayFotos || !descripcion);
  const [foto, setFoto] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Carrusel automático: avanza mientras las fotos están a la vista y nadie tiene el cursor encima.
  // Se respeta "reducir movimiento" del sistema
  const carrusel = imagenes.length > 1 && volteada && animar && !pausado;
  useEffect(() => {
    if (!carrusel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const temporizador = window.setInterval(() => setFoto((actual) => (actual + 1) % imagenes.length), SEGUNDOS_POR_FOTO * 1000);
    return () => window.clearInterval(temporizador);
  }, [carrusel, imagenes.length, foto]);

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
          <section
            inert={!volteada}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            className={`${cara} relative overflow-hidden bg-black/40 ${descripcion ? 'rotate-y-180' : ''}`}
            style={{ borderColor: `${color}99` }}
          >
            {/* Alto fijo y moderado; la foto se ve completa (sin recortar) sobre una copia difuminada de sí misma */}
            <button type="button" onClick={() => onAmpliar(foto)} className="relative block h-64 w-full cursor-zoom-in overflow-hidden sm:h-72 lg:h-80" aria-label="Ver foto en grande">
              <img src={imagenes[foto]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl transition-all duration-500" />
              {imagenes.map((url, indice) => (
                <img
                  key={url}
                  src={url}
                  alt={indice === foto ? `${nombre} — foto ${indice + 1}` : ''}
                  loading={indice === 0 ? 'eager' : 'lazy'}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 motion-reduce:transition-none ${indice === foto ? 'opacity-100' : 'opacity-0'}`}
                />
              ))}
            </button>

            {imagenes.length > 1 && (
              <>
                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-black/50 text-sm text-white">
                  <button type="button" onClick={() => setFoto((actual) => (actual - 1 + imagenes.length) % imagenes.length)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Foto anterior"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-12 text-center tabular-nums">{foto + 1} de {imagenes.length}</span>
                  <button type="button" onClick={() => setFoto((actual) => (actual + 1) % imagenes.length)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Foto siguiente"><ChevronRight className="h-4 w-4" /></button>
                </div>
                {/* Puntos: cuál foto se ve y acceso directo a cualquiera */}
                <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-full bg-black/40 px-2 py-1.5">
                  {imagenes.map((url, indice) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setFoto(indice)}
                      aria-label={`Ver foto ${indice + 1}`}
                      className={`h-1.5 rounded-full transition-all ${indice === foto ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              </>
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

// Gratuito o cuota de recuperación, como en Talleres
function Costo({ costo }: { costo: number | null }) {
  const texto = textoCostoCartelera(costo);
  if (!texto) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
      <HandCoins className="h-4 w-4 shrink-0 text-[#95d5b2]" />{texto}
    </p>
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
  const caras = { nombre: participante.nombre, imagenes: participante.imagenes, color, animar: activa && fotoAbierta === null, onAmpliar: setFotoAbierta };

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
          {/* De dónde viene el participante; el lugar de cada presentación es la sede */}
          {participante.procedencia && (
            <span className="pt-1.5 text-right text-xs font-medium uppercase tracking-[0.15em] text-white/60">
              De {participante.procedencia}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{participante.nombre}</h2>
          {participante.subtitulo && <p className="mt-1 text-white/70">{participante.subtitulo}</p>}
          <Costo costo={participante.costo} />
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
