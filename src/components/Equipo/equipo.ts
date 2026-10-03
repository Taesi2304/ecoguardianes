// Directorio del equipo de FDMA (/equipo). Tabla: database/33_equipo_fdma.sql

export type TipoRed = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube' | 'web' | 'otro';

export interface RedIntegrante {
  tipo: TipoRed;
  url: string;
}

export interface Integrante {
  id: string;
  nombre: string;
  slug: string;
  cargo: string;
  area: string;
  resumen: string | null;
  trayectoria: string | null;
  emprendimiento: string | null;
  emprendimiento_logo_url: string | null;
  emprendimiento_url: string | null; // una de sus redes, escogida en el admin
  redes: RedIntegrante[];
  foto_url: string | null;
  orden: number;
  activo: boolean;
}

export const CAMPOS_INTEGRANTE = 'id, nombre, slug, cargo, area, resumen, trayectoria, emprendimiento, emprendimiento_logo_url, emprendimiento_url, redes, foto_url, orden, activo';

export const BUCKET_EQUIPO = 'imagenes_equipo';

export const NOMBRES_RED: Record<TipoRed, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  web: 'Sitio web',
  otro: 'Enlace',
};

// "Fabiola Flores Ñ." → "fabiola-flores-n"
export function crearSlug(texto: string) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'integrante';
}

// Las áreas en el orden en que aparece su primer integrante (los integrantes ya vienen por "orden")
export function agruparPorArea(integrantes: Integrante[]) {
  const grupos = new Map<string, Integrante[]>();
  integrantes.forEach((integrante) => {
    grupos.set(integrante.area, [...(grupos.get(integrante.area) ?? []), integrante]);
  });
  return [...grupos.entries()].map(([area, miembros]) => ({ area, miembros }));
}

export const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('');
