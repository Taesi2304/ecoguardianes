import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MetaPagina {
  titulo: string;
  descripcion?: string;
}

const DESCRIPCION_GENERAL = 'Festival del Medio Ambiente: cartelera, talleres, calendario de actividades y el proyecto de composta comunitaria Eco Guardianes.';
const DESCRIPCION_PANEL = 'Panel de Eco Guardianes para registrar y dar seguimiento a los composteros comunitarios.';

// Rutas en minúsculas: React Router no distingue mayúsculas y el menú usa /Mi-Historial, /Comunidad, etc.
const PUBLICAS: Record<string, MetaPagina> = {
  '/': { titulo: 'Inicio' },
  '/ecoguardianes': {
    titulo: 'Eco Guardianes',
    descripcion: 'Eco Guardianes: composta comunitaria en tu colonia. Únete, registra tus aportes y cuida la tierra con tus vecinas y vecinos.',
  },
  '/info': { titulo: 'Información' },
  '/manuales': { titulo: 'Manuales', descripcion: 'Manuales y guías de composta del proyecto Eco Guardianes.' },
  '/login': { titulo: 'Iniciar sesión' },
  '/registro': { titulo: 'Registro', descripcion: 'Regístrate como Eco Guardián con el código de tu colonia.' },
  '/aviso-privacidad': { titulo: 'Aviso de privacidad' },
  '/terminos-condiciones': { titulo: 'Términos y condiciones' },
  '/conectar-redes': { titulo: 'Conectar redes' },
  '/talleres': { titulo: 'Talleres', descripcion: 'Talleres del Festival del Medio Ambiente: consulta fechas y regístrate.' },
  '/calendario': { titulo: 'Calendario', descripcion: 'Calendario de actividades del Festival del Medio Ambiente.' },
  '/cartelera': { titulo: 'Cartelera', descripcion: 'Cartelera del Festival del Medio Ambiente.' },
  '/equipo': { titulo: 'Directorio', descripcion: 'Conoce al equipo que organiza el Festival del Medio Ambiente: sus áreas, trayectoria y proyectos.' },
};

const PANEL: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/nueva-bitacora': 'Registrar visita',
  '/dashboard/mi-historial': 'Historial',
  '/dashboard/comunidad': 'Comunidad',
  '/dashboard/perfil': 'Mi perfil',
};

const ADMIN: Record<string, string> = {
  '/admin': 'Resumen',
  '/admin/composteros': 'Composteros',
  '/admin/usuarios': 'Usuarios',
  '/admin/historial': 'Historial',
  '/admin/reportes': 'Reportes',
  '/admin/nueva-bitacora': 'Registrar visita',
  '/admin/perfil': 'Mi perfil',
  '/admin/pagina': 'Página de inicio',
  '/admin/convocatorias': 'Convocatorias',
  '/admin/publicaciones': 'Publicaciones',
  '/admin/aliados': 'Aliados',
  '/admin/equipo': 'Equipo',
  '/admin/talleres': 'Talleres',
  '/admin/calendario': 'Calendario',
  '/admin/cartelera': 'Cartelera',
  '/admin/colonias': 'Colonias',
};

function metaDe(ruta: string): MetaPagina & { seccion: string } {
  if (ruta.startsWith('/admin')) {
    return { seccion: 'FDMA Admin', titulo: ADMIN[ruta] ?? 'Panel', descripcion: DESCRIPCION_PANEL };
  }
  if (ruta.startsWith('/dashboard')) {
    return { seccion: 'Eco Guardianes', titulo: PANEL[ruta] ?? 'Panel', descripcion: DESCRIPCION_PANEL };
  }
  return { seccion: 'FDMA', ...(PUBLICAS[ruta] ?? { titulo: 'Festival del Medio Ambiente' }) };
}

// Actualiza el título de la pestaña y la meta description en cada cambio de ruta: "FDMA | Talleres"
export default function TituloPagina() {
  const { pathname } = useLocation();

  useEffect(() => {
    const ruta = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const { seccion, titulo, descripcion } = metaDe(ruta);

    document.title = `${seccion} | ${titulo}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', descripcion ?? DESCRIPCION_GENERAL);
  }, [pathname]);

  return null;
}
