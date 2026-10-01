import { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import { VisorImagenes } from '@/components/VisorImagenes';
import { formatearFecha, formatearHora } from '@/lib/utils';
import { BotonCalendario } from '@/components/BotonCalendario';
import { ordenarHorarios } from './cartelera';
import type { Catalogo, Participante } from './cartelera';

interface Props {
  participante: Participante;
  tipo?: Catalogo;
}

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
            <button type="button" onClick={() => onAmpliar(foto)} className="block aspect-[4/3] w-full" aria-label="Ver foto en grande">
              <img src={imagenes[foto]} alt={`${nombre} — foto ${foto + 1}`} className="h-full w-full object-cover" />
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

export function DetalleParticipante({ participante, tipo }: Props) {
  const color = tipo?.color ?? '#ffffff';
  const horarios = ordenarHorarios(participante.cartelera_horarios);
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-[#10241b]/75 backdrop-blur-md" style={{ borderColor: `${color}99` }}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        {tipo
          ? <span className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: color }}>{tipo.nombre}</span>
          : <span />}
        {participante.procedencia && <span className="pt-2 text-xs font-medium uppercase tracking-[0.15em] text-white/60">{participante.procedencia}</span>}
      </div>

      <div className="px-6 pb-5 pt-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{participante.nombre}</h2>
        {participante.subtitulo && <p className="mt-1 text-lg text-white/70">{participante.subtitulo}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 pb-6">
          <TarjetaDosCaras
            key={participante.id}
            nombre={participante.nombre}
            descripcion={participante.descripcion}
            imagenes={participante.imagenes}
            color={color}
            onAmpliar={setFotoAbierta}
          />

          {horarios.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {horarios.map((horario) => (
                // flex-wrap: al elegir calendario, las opciones bajan a su propia línea
                <li key={horario.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white"><MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />{horario.sede}</p>
                    <p className="text-sm tabular-nums text-white/60">{formatearFecha(horario.fecha)} · {formatearHora(horario.hora_inicio)}</p>
                  </div>
                  <BotonCalendario
                    variante="oscuro"
                    evento={{
                      titulo: `${participante.nombre}${participante.subtitulo ? ` — ${participante.subtitulo}` : ''}`,
                      fecha: horario.fecha,
                      hora_inicio: horario.hora_inicio,
                      hora_fin: horario.hora_fin,
                      lugar: horario.sede,
                      descripcion: participante.descripcion,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          {participante.enlace_url && (
            <a href={participante.enlace_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              <ExternalLink className="h-4 w-4" /> Ver en redes
            </a>
          )}
        </div>
      </div>

      {fotoAbierta !== null && (
        <VisorImagenes fotos={participante.imagenes} indice={fotoAbierta} nombre={`Fotos de ${participante.nombre}`} onCambiar={setFotoAbierta} onCerrar={() => setFotoAbierta(null)} />
      )}
    </article>
  );
}
