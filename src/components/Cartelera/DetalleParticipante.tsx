import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, X } from 'lucide-react';
import { formatearFecha, formatearHora } from '@/lib/utils';
import { BotonCalendario } from '@/components/BotonCalendario';
import { ordenarHorarios } from './cartelera';
import type { Catalogo, Participante } from './cartelera';

interface Props {
  participante: Participante;
  tipo?: Catalogo;
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
        {participante.imagenes.length > 0 && (
          // Galería horizontal: todas las fotos en un marco del mismo tamaño (3:4)
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:thin]">
            {participante.imagenes.map((url, indice) => (
              <button
                key={url}
                type="button"
                onClick={() => setFotoAbierta(indice)}
                className="aspect-[3/4] w-[75%] shrink-0 snap-start overflow-hidden rounded-xl bg-black/20 sm:w-52 lg:w-56"
                aria-label={`Ver foto ${indice + 1} en grande`}
              >
                <img
                  src={url}
                  alt={`${participante.nombre} — foto ${indice + 1}`}
                  loading={indice === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover transition hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5 px-6 pb-6 pt-2">
          {participante.descripcion && <p className="max-w-2xl leading-relaxed text-white/75">{participante.descripcion}</p>}

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
        <VisorFotos fotos={participante.imagenes} indice={fotoAbierta} nombre={participante.nombre} onCambiar={setFotoAbierta} onCerrar={() => setFotoAbierta(null)} />
      )}
    </article>
  );
}

interface VisorProps {
  fotos: string[];
  indice: number;
  nombre: string;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
}

// Foto completa a pantalla entera; también responde a Esc y a las flechas del teclado
function VisorFotos({ fotos, indice, nombre, onCambiar, onCerrar }: VisorProps) {
  const anterior = () => onCambiar((indice - 1 + fotos.length) % fotos.length);
  const siguiente = () => onCambiar((indice + 1) % fotos.length);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowLeft') anterior();
      else if (e.key === 'ArrowRight') siguiente();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={`Fotos de ${nombre}`}>
      <img src={fotos[indice]} alt={`${nombre} — foto ${indice + 1}`} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      <button onClick={onCerrar} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Cerrar"><X className="h-6 w-6" /></button>
      {fotos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); anterior(); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Foto anterior"><ChevronLeft className="h-7 w-7" /></button>
          <button onClick={(e) => { e.stopPropagation(); siguiente(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Foto siguiente"><ChevronRight className="h-7 w-7" /></button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm tabular-nums text-white/70">{indice + 1} / {fotos.length}</span>
        </>
      )}
    </div>
  );
}
