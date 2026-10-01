import { supabase } from '@/lib/supabase';

export interface Catalogo {
  id: string;
  nombre: string;
  color: string;
  orden: number;
}

export interface Horario {
  id: string;
  sede: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
}

export interface Participante {
  id: string;
  nombre: string;
  subtitulo: string | null;
  descripcion: string | null;
  tipo_id: string | null;
  grupo_id: string | null;
  procedencia: string | null;
  imagenes: string[];
  enlace_url: string | null;
  orden: number;
  activo: boolean;
  cartelera_horarios: Horario[];
}

// Una edición por año (Festival 2026, 2027…): nombre, archivos y sus propios participantes.
// La edición actual es la que se ve en /cartelera; las anteriores en /cartelera?edicion=AÑO.
export interface Edicion {
  id: string;
  nombre: string;
  anio: number;
  es_actual: boolean;
  cartelera_fondo_url: string | null;
  cartelera_pdf_url: string | null;
  croquis_pdf_url: string | null;
}

export const CAMPOS_EDICION = 'id, nombre, anio, es_actual, cartelera_fondo_url, cartelera_pdf_url, croquis_pdf_url';

// Más reciente primero
export async function cargarEdiciones(): Promise<Edicion[]> {
  const { data } = await supabase.from('festival_ediciones').select(CAMPOS_EDICION).order('anio', { ascending: false });
  return (data || []) as Edicion[];
}

// La de ese año si se indica; si no, la actual
export async function cargarEdicion(anio?: number): Promise<Edicion | null> {
  const consulta = supabase.from('festival_ediciones').select(CAMPOS_EDICION);
  const { data } = await (anio ? consulta.eq('anio', anio) : consulta.eq('es_actual', true)).maybeSingle();
  return (data as Edicion | null) ?? null;
}

export const BUCKET_IMAGENES = 'imagenes_cartelera';
export const BUCKET_PDF = 'archivos_festival';

export const CAMPOS_PARTICIPANTE = 'id, nombre, subtitulo, descripcion, tipo_id, grupo_id, procedencia, imagenes, enlace_url, orden, activo, cartelera_horarios(id, sede, fecha, hora_inicio, hora_fin)';

export const ordenarHorarios = (horarios: Horario[]) =>
  [...horarios].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

export async function cargarCatalogos() {
  const [tipos, grupos] = await Promise.all([
    supabase.from('cartelera_tipos').select('id, nombre, color, orden').order('orden'),
    supabase.from('cartelera_grupos').select('id, nombre, color, orden').order('orden'),
  ]);
  return {
    tipos: (tipos.data || []) as Catalogo[],
    grupos: (grupos.data || []) as Catalogo[],
  };
}
