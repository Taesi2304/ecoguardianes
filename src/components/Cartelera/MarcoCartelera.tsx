import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Map as MapIcon, Menu, X } from 'lucide-react';
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/lib/redes';
import type { Edicion } from './cartelera';

// Menú y pie propios de la cartelera: mismos enlaces que el sitio, con su estilo oscuro

const ENLACES = [
  { ruta: '/', nombre: 'Inicio' },
  { ruta: '/calendario', nombre: 'Calendario' },
  { ruta: '/talleres', nombre: 'Talleres' },
];

const botonArchivo = 'flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-white/85 hover:bg-white/20 hover:text-white';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="FDMA, ir al inicio">
      <img src="/logo_fdma.svg" alt="" className="h-9 w-9 rounded-full bg-[#fcfaf2] p-0.5" />
      <span className="leading-tight">
        <span className="block font-semibold text-white">FDMA</span>
        <span className="hidden text-xs text-white/60 sm:block">Festival del Medio Ambiente</span>
      </span>
    </Link>
  );
}

export function NavCartelera({ edicion }: { edicion: Edicion | null }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="relative z-40 mb-4 rounded-2xl border border-white/10 bg-[#0c1f16]/75 px-3 py-2 backdrop-blur-md sm:px-4">
      <div className="flex items-center gap-3">
        <Logo />

        <nav aria-label="Sitio" className="ml-4 hidden items-center gap-1 md:flex">
          {ENLACES.map(({ ruta, nombre }) => (
            <Link key={ruta} to={ruta} className="rounded-full px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">{nombre}</Link>
          ))}
          <span aria-current="page" className="rounded-full bg-white/15 px-3 py-2 text-sm font-medium text-white">Cartelera</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {edicion?.cartelera_pdf_url && (
            <a href={edicion.cartelera_pdf_url} target="_blank" rel="noreferrer" className={botonArchivo} title="Descargar cartelera en PDF">
              <Download className="h-4 w-4" /><span className="hidden lg:inline">Cartelera PDF</span>
            </a>
          )}
          {edicion?.croquis_pdf_url && (
            <a href={edicion.croquis_pdf_url} target="_blank" rel="noreferrer" className={botonArchivo} title="Croquis de stands">
              <MapIcon className="h-4 w-4" /><span className="hidden lg:inline">Croquis</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setAbierto((actual) => !actual)}
            aria-expanded={abierto}
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            className="rounded-full p-2 text-white/85 hover:bg-white/10 md:hidden"
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Celular: los enlaces se despliegan bajo la barra */}
      {abierto && (
        <nav aria-label="Sitio" className="mt-2 grid gap-1 border-t border-white/10 pt-2 md:hidden">
          {ENLACES.map(({ ruta, nombre }) => (
            <Link key={ruta} to={ruta} className="rounded-lg px-3 py-2.5 text-white/85 hover:bg-white/10">{nombre}</Link>
          ))}
          <span aria-current="page" className="rounded-lg bg-white/10 px-3 py-2.5 font-medium text-white">Cartelera</span>
        </nav>
      )}
    </header>
  );
}

function Red({ url, icono, nombre }: { url: string; icono: string; nombre: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3 text-sm text-white/85 hover:bg-white/20 hover:text-white">
      <img src={icono} alt="" className="h-6 w-6 rounded-full bg-white p-0.5" />
      {nombre}
    </a>
  );
}

export function PieCartelera() {
  const enlacePie = 'text-white/60 hover:text-white hover:underline';
  return (
    <footer className="mt-10 rounded-2xl border border-white/10 bg-[#0c1f16]/75 p-6 text-sm backdrop-blur-md">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <div className="flex flex-wrap gap-2">
          <Red url={FACEBOOK_URL} icono="/fb-icon.svg" nombre="Facebook" />
          <Red url={INSTAGRAM_URL} icono="/ig-icon.svg" nombre="Instagram" />
        </div>
      </div>
      <nav aria-label="Enlaces del pie" className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4">
        {ENLACES.map(({ ruta, nombre }) => <Link key={ruta} to={ruta} className={enlacePie}>{nombre}</Link>)}
        <Link to="/aviso-privacidad" className={enlacePie}>Aviso de privacidad</Link>
        <Link to="/terminos-condiciones" className={enlacePie}>Términos y condiciones</Link>
      </nav>
      <div className="mt-4 flex flex-col gap-1 text-xs text-white/45 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} FDMA · Festival del Medio Ambiente</p>
        <p>
          Desarrollado por{' '}
          <a href="https://www.instagram.com/ijessiyou/" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white hover:underline">@ijessiyou</a>
        </p>
      </div>
    </footer>
  );
}
