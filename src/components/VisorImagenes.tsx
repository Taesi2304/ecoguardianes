import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface VisorProps {
  fotos: string[];
  indice: number;
  nombre?: string;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
}

// Foto completa a pantalla entera, sin abrir otra pestaña; también responde a Esc y a las flechas del teclado
export function VisorImagenes({ fotos, indice, nombre = 'Imagen', onCambiar, onCerrar }: VisorProps) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onCerrar} role="dialog" aria-modal="true" aria-label={nombre}>
      <img src={fotos[indice]} alt={`${nombre} — ${indice + 1}`} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onCerrar} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Cerrar"><X className="h-6 w-6" /></button>
      {fotos.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); anterior(); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Foto anterior"><ChevronLeft className="h-7 w-7" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); siguiente(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Foto siguiente"><ChevronRight className="h-7 w-7" /></button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm tabular-nums text-white/70">{indice + 1} / {fotos.length}</span>
        </>
      )}
    </div>
  );
}

interface ImagenAmpliableProps {
  src: string;
  alt?: string;
  className?: string;
}

// Miniatura que al hacer clic muestra la imagen completa en el visor
export function ImagenAmpliable({ src, alt = '', className = '' }: ImagenAmpliableProps) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={`shrink-0 cursor-zoom-in overflow-hidden ${className}`} title="Ver en grande">
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>
      {abierta && <VisorImagenes fotos={[src]} indice={0} nombre={alt || 'Imagen'} onCambiar={() => {}} onCerrar={() => setAbierta(false)} />}
    </>
  );
}
