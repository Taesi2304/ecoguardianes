import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';

// Categorías editables en Admin → Calendario → Categorías (tabla calendario_categorias)
export interface CategoriaCalendario {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  // Categorías que el Calendario llena solo: 'taller' (Talleres), 'festival' (días con
  // horarios en la Cartelera) y 'convocatoria' (fecha de cierre de convocatorias)
  clave: string | null;
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
  texto_enlace?: string; // Texto del botón en el detalle; por defecto "Más información"
}

interface HorarioCartelera {
  fecha: string;
  sede: string;
  hora_inicio: string;
  hora_fin: string | null;
  edicion: { nombre: string; anio: number } | null; // null si aún no se corre 18_ediciones_festival.sql
}

type Relacion<T> = T | T[] | null;
const primero = <T,>(valor: Relacion<T>) => (Array.isArray(valor) ? valor[0] : valor) ?? null;

// Horarios de participantes activos con la edición del festival a la que pertenecen
async function cargarHorariosFestival(desde: string, hasta: string): Promise<HorarioCartelera[]> {
  const conEdicion = await supabase
    .from('cartelera_horarios')
    .select('fecha, sede, hora_inicio, hora_fin, cartelera_participantes!inner(activo, festival_ediciones(nombre, anio))')
    .eq('cartelera_participantes.activo', true)
    .gte('fecha', desde)
    .lte('fecha', hasta);

  if (!conEdicion.error) {
    return (conEdicion.data || []).map(({ cartelera_participantes, ...horario }) => ({
      ...horario,
      edicion: primero(primero(cartelera_participantes as Relacion<{ festival_ediciones: Relacion<{ nombre: string; anio: number }> }>)?.festival_ediciones ?? null),
    }));
  }

  // Sin la tabla de ediciones: todos los horarios con el nombre de Página de inicio
  const { data } = await supabase
    .from('cartelera_horarios')
    .select('fecha, sede, hora_inicio, hora_fin, cartelera_participantes!inner(activo)')
    .eq('cartelera_participantes.activo', true)
    .gte('fecha', desde)
    .lte('fecha', hasta);
  return (data || []).map(({ fecha, sede, hora_inicio, hora_fin }) => ({ fecha, sede, hora_inicio, hora_fin, edicion: null }));
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

// Un evento por día del festival, con el nombre de su edición (Festival 2026, 2027…)
function eventosDelFestival(horarios: HorarioCartelera[], nombrePorDefecto: string, categoria: CategoriaCalendario | null): EventoCalendario[] {
  const porDia = new Map<string, HorarioCartelera[]>();
  horarios.forEach((horario) => porDia.set(horario.fecha, [...(porDia.get(horario.fecha) || []), horario]));

  return [...porDia.entries()].map(([fecha, delDia]) => {
    const inicios = delDia.map((h) => h.hora_inicio).sort();
    const fines = delDia.map((h) => h.hora_fin || h.hora_inicio).sort();
    const edicion = delDia.find((h) => h.edicion)?.edicion;
    return {
      id: `festival-${fecha}`,
      titulo: edicion?.nombre ?? nombrePorDefecto,
      fecha,
      hora_inicio: inicios[0],
      hora_fin: fines[fines.length - 1],
      lugar: [...new Set(delDia.map((h) => h.sede))].join(' · '),
      categoria,
      descripcion: `${delDia.length} actividad${delDia.length === 1 ? '' : 'es'} en la cartelera de este día.`,
      enlace_url: edicion ? `/cartelera?edicion=${edicion.anio}` : '/cartelera',
      texto_enlace: 'Ver cartelera',
    };
  });
}

// Eventos del calendario + talleres + días del festival + cierres de convocatoria
// entre dos fechas 'YYYY-MM-DD'
export async function cargarEventos(desde: string, hasta: string, categorias?: CategoriaCalendario[]): Promise<EventoCalendario[]> {
  const [eventos, talleres, horarios, pagina, convocatorias, listaCategorias] = await Promise.all([
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
    cargarHorariosFestival(desde, hasta),
    supabase
      .from('pagina_inicio')
      .select('mostrar_cartelera, festival_nombre')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('convocatorias')
      .select('id, titulo, descripcion, enlace_url, fecha_cierre')
      .eq('activo', true)
      .gte('fecha_cierre', desde)
      .lte('fecha_cierre', hasta),
    categorias ? Promise.resolve(categorias) : cargarCategorias(),
  ]);

  const porId = new Map(listaCategorias.map((categoria) => [categoria.id, categoria]));
  const porClave = (clave: string) => listaCategorias.find((categoria) => categoria.clave === clave) ?? null;
  const categoriaTaller = porClave('taller');

  const propios: EventoCalendario[] = (eventos.data || []).map(({ categoria_id, ...evento }) => ({
    ...evento,
    categoria: (categoria_id && porId.get(categoria_id)) || null,
  }));

  const deTalleres: EventoCalendario[] = (talleres.data || []).map((taller) => ({
    ...taller,
    id: `taller-${taller.id}`,
    categoria: categoriaTaller,
    enlace_url: '/talleres',
    texto_enlace: 'Registrarme',
  }));

  // Si la Cartelera está oculta en la página de inicio, el festival tampoco sale
  const deFestival = pagina.data?.mostrar_cartelera
    ? eventosDelFestival(horarios, pagina.data.festival_nombre, porClave('festival'))
    : [];

  const deConvocatorias: EventoCalendario[] = (convocatorias.data || []).map((convocatoria) => ({
    id: `convocatoria-${convocatoria.id}`,
    titulo: `Cierra convocatoria: ${convocatoria.titulo}`,
    fecha: convocatoria.fecha_cierre,
    hora_inicio: null,
    hora_fin: null,
    lugar: null,
    categoria: porClave('convocatoria'),
    descripcion: convocatoria.descripcion,
    enlace_url: convocatoria.enlace_url || '/',
    texto_enlace: convocatoria.enlace_url ? 'Participar' : 'Ver convocatoria',
  }));

  return [...propios, ...deTalleres, ...deFestival, ...deConvocatorias]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
}
