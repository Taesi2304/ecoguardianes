import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';

// Categorías editables en Admin → Calendario → Categorías (tabla calendario_categorias)
export interface CategoriaCalendario {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  clave: string | null; // 'taller' = categoría con que se muestran los talleres extraordinarios
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  categoria: CategoriaCalendario | null;
  descripcion: string | null;
  enlace_url: string | null;
  es_taller?: boolean;
}

const COLOR_SIN_CATEGORIA = '#9ca3af';

// Colores con estilo en línea porque vienen de la base (hex elegido por FDMA).
// El texto siempre va oscuro para que se lea con cualquier color, incluso amarillo.
export const estiloPunto = (categoria: CategoriaCalendario | null): CSSProperties => ({
  backgroundColor: categoria?.color ?? COLOR_SIN_CATEGORIA,
});

export const estiloChip = (categoria: CategoriaCalendario | null): CSSProperties => {
  const color = categoria?.color ?? COLOR_SIN_CATEGORIA;
  return { backgroundColor: `${color}22`, borderColor: `${color}66`, color: '#3b2a1c' };
};

export async function cargarCategorias(): Promise<CategoriaCalendario[]> {
  const { data } = await supabase
    .from('calendario_categorias')
    .select('id, nombre, color, orden, clave')
    .order('orden', { ascending: true });
  return (data || []) as CategoriaCalendario[];
}

// Eventos del calendario + talleres extraordinarios entre dos fechas 'YYYY-MM-DD'
export async function cargarEventos(desde: string, hasta: string, categorias?: CategoriaCalendario[]): Promise<EventoCalendario[]> {
  const [eventos, talleres, listaCategorias] = await Promise.all([
    supabase
      .from('eventos_calendario')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, categoria_id, descripcion, enlace_url')
      .eq('activo', true)
      .gte('fecha', desde)
      .lte('fecha', hasta),
    supabase
      .from('talleres_publicos')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion')
      .gte('fecha', desde)
      .lte('fecha', hasta),
    categorias ? Promise.resolve(categorias) : cargarCategorias(),
  ]);

  const porId = new Map(listaCategorias.map((categoria) => [categoria.id, categoria]));
  const categoriaTaller = listaCategorias.find((categoria) => categoria.clave === 'taller') ?? null;

  const propios: EventoCalendario[] = (eventos.data || []).map(({ categoria_id, ...evento }) => ({
    ...evento,
    categoria: (categoria_id && porId.get(categoria_id)) || null,
  }));

  const deTalleres: EventoCalendario[] = (talleres.data || []).map((taller) => ({
    ...taller,
    id: `taller-${taller.id}`,
    categoria: categoriaTaller,
    enlace_url: '/talleres',
    es_taller: true,
  }));

  return [...propios, ...deTalleres]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
}
