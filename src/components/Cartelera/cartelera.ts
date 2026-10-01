import { supabase } from '@/lib/supabase';
import { textoCosto } from '@/components/Talleres/talleres';

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
  hora_inicio: string | null; // null = hora por confirmar (29_horario_por_confirmar.sql)
  hora_fin: string | null;
}

export interface Participante {
  id: string;
  nombre: string;
  subtitulo: string | null;
  descripcion: string | null;
  tipo_id: string | null;
  grupo_ids: string[];
  procedencia: string | null;
  imagenes: string[];
  enlace_url: string | null;
  costo: number | null; // null = no se muestra, 0 = gratuito (28_costo_cartelera.sql)
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

export const CAMPOS_PARTICIPANTE = 'id, nombre, subtitulo, descripcion, tipo_id, grupo_ids, procedencia, imagenes, enlace_url, costo, activo, cartelera_horarios(id, sede, fecha, hora_inicio, hora_fin)';

// Mismo texto que en Talleres; null = no se muestra
export function textoCostoCartelera(costo: number | null) {
  if (costo === null) return null;
  return Number(costo) === 0 ? 'Gratuito' : textoCosto(Number(costo));
}

// '2026-10-17' → 'Sáb 17' (se lee como fecha local para que no se recorra un día)
export function etiquetaDia(fecha: string) {
  const texto = new Date(`${fecha}T00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }).replace('.', '').replace(',', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const ordenarHorarios = (horarios: Horario[]) =>
  [...horarios].sort((a, b) => a.fecha.localeCompare(b.fecha) || claveHora(a.hora_inicio).localeCompare(claveHora(b.hora_inicio)));

// Para ordenar: lo que no tiene hora confirmada va al final del día
export const claveHora = (hora: string | null) => hora ?? '99';

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
