import type { ComponentType } from 'react';
import { ExternalLink, Globe, Link as LinkIcon, Sprout } from 'lucide-react';
import { iniciales, NOMBRES_RED } from './equipo';
import type { Integrante, RedIntegrante, TipoRed } from './equipo';

type Icono = ComponentType<{ className?: string }>;

const IconoInstagram: Icono = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const IconoFacebook: Icono = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const IconoTiktok: Icono = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 12a4 4 0 1 0 4 4V2c.5 2.5 2.5 4.5 5 5" />
  </svg>
);

const IconoLinkedin: Icono = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const IconoYoutube: Icono = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const ICONOS: Record<TipoRed, Icono> = {
  instagram: IconoInstagram,
  facebook: IconoFacebook,
  tiktok: IconoTiktok,
  linkedin: IconoLinkedin,
  youtube: IconoYoutube,
  web: Globe,
  otro: LinkIcon,
};

// Fila de botones redondos con las redes del integrante
export function RedesIntegrante({ redes, nombre, tamano = 'chico' }: { redes: RedIntegrante[]; nombre: string; tamano?: 'chico' | 'grande' }) {
  const validas = redes.filter((red) => red.url && ICONOS[red.tipo]);
  if (validas.length === 0) return null;

  const boton = tamano === 'grande' ? 'h-11 w-11' : 'h-9 w-9';
  const icono = tamano === 'grande' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex flex-wrap gap-2">
      {validas.map((red, indice) => {
        const Icono = ICONOS[red.tipo];
        const nombreRed = NOMBRES_RED[red.tipo];
        return (
          <a
            key={`${red.tipo}-${indice}`}
            href={red.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={nombreRed}
            aria-label={`${nombreRed} de ${nombre}`}
            className={`${boton} flex items-center justify-center rounded-full border border-[#2d6a4f]/20 bg-white text-[#2d6a4f] transition-colors hover:border-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white`}
          >
            <Icono className={icono} />
          </a>
        );
      })}
    </div>
  );
}

// Foto del integrante, o sus iniciales si aún no tiene
export function FotoIntegrante({ integrante, className = '' }: { integrante: Pick<Integrante, 'nombre' | 'foto_url'>; className?: string }) {
  return integrante.foto_url ? (
    <img src={integrante.foto_url} alt={integrante.nombre} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-[#d8ece1] font-extrabold text-[#2d6a4f] ${className}`} aria-hidden="true">
      <span className="text-3xl">{iniciales(integrante.nombre)}</span>
    </div>
  );
}

// Nombre del emprendimiento con su logo; si tiene una red escogida, abre esa red
export function EmprendimientoIntegrante({ integrante, className = '' }: {
  integrante: Pick<Integrante, 'emprendimiento' | 'emprendimiento_logo_url' | 'emprendimiento_url'>;
  className?: string;
}) {
  const { emprendimiento, emprendimiento_logo_url: logo, emprendimiento_url: url } = integrante;
  if (!emprendimiento) return null;

  const contenido = (
    <>
      {logo
        ? <img src={logo} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded-full border border-[#2d6a4f]/10 bg-white object-contain" />
        : <Sprout className="h-4 w-4 shrink-0 text-[#2d6a4f]" />}
      <span className="min-w-0 truncate">{emprendimiento}</span>
      {url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#2d6a4f]" aria-hidden="true" />}
    </>
  );
  const estilo = `inline-flex max-w-full items-center gap-2 ${className}`;

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Abrir ${emprendimiento}`}
      className={`${estilo} transition-colors hover:text-[#2d6a4f] hover:underline`}
    >
      {contenido}
    </a>
  ) : (
    <p className={estilo}>{contenido}</p>
  );
}
