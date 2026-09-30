import { supabase } from '@/lib/supabase';

export type Categoria = 'campo' | 'taller' | 'composta';

export const CATEGORIAS: Record<Categoria, { nombre: string; punto: string; chip: string }> = {
  campo: { nombre: 'Reforestación y jornadas de campo', punto: 'bg-green-600', chip: 'bg-green-100 text-green-800 border-green-200' },
  taller: { nombre: 'Talleres formativos', punto: 'bg-blue-600', chip: 'bg-blue-100 text-blue-800 border-blue-200' },
  composta: { nombre: 'Sesiones en la composta de Casa Blanca III', punto: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  categoria: Categoria;
  descripcion: string | null;
  enlace_url: string | null;
}

// Eventos del calendario + talleres extraordinarios (como categoría "taller") entre dos fechas 'YYYY-MM-DD'
export async function cargarEventos(desde: string, hasta: string): Promise<EventoCalendario[]> {
  const [eventos, talleres] = await Promise.all([
    supabase
      .from('eventos_calendario')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, categoria, descripcion, enlace_url')
      .eq('activo', true)
      .gte('fecha', desde)
      .lte('fecha', hasta),
    supabase
      .from('talleres_publicos')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion')
      .gte('fecha', desde)
      .lte('fecha', hasta),
  ]);

  const deTalleres: EventoCalendario[] = (talleres.data || []).map((taller) => ({
    ...taller,
    id: `taller-${taller.id}`,
    categoria: 'taller',
    enlace_url: '/talleres',
  }));

  return [...((eventos.data || []) as EventoCalendario[]), ...deTalleres]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
}
